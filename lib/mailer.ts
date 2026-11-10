import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";

// ---------------------------------------------------------------------------
// Transport email partagé par /api/whistleblower et /api/contact.
//
// Trois modes, par ordre de priorité :
//
//  1. SMTP explicite — si SMTP_HOST est défini :
//       SMTP_HOST, SMTP_PORT (défaut 465), SMTP_USER, SMTP_PASSWORD
//
//  2. API Gmail en HTTPS (OAuth2) — si GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET
//     et GMAIL_REFRESH_TOKEN sont définis (+ GMAIL_USER = adresse expéditrice).
//     Le refresh token doit avoir le scope https://www.googleapis.com/auth/gmail.send
//     (ou gmail.modify / mail.google.com).
//     Pourquoi l'API plutôt que SMTP : l'hébergeur (secureserver.net) intercepte
//     les connexions sortantes vers smtp.gmail.com et présente son propre
//     certificat ("Hostname/IP does not match certificate's altnames" -> 502).
//     L'API passe par le port 443, non intercepté.
//
//  3. Gmail SMTP + mot de passe d'application — GMAIL_USER + GMAIL_APP_PASSWORD
//     (développement local uniquement).
// ---------------------------------------------------------------------------

export interface MailSetup {
    transporter: { sendMail(options: SendMailOptions): Promise<unknown> };
    /** Adresse expéditrice ; sert aussi de destinataire par défaut. */
    user: string;
}

class MailError extends Error {
    code?: string;
    responseCode?: number;
    constructor(message: string, code: string, responseCode?: number) {
        super(message);
        this.code = code;
        this.responseCode = responseCode;
    }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });
    const data = (await res.json().catch(() => ({}))) as {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
    };

    if (!res.ok || !data.access_token) {
        throw new MailError(
            `OAuth token refused: ${data.error ?? "unknown"} ${data.error_description ?? ""}`.trim(),
            "EOAUTH",
            res.status
        );
    }

    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return cachedToken.token;
}

function createGmailApiSetup(user: string, clientId: string, clientSecret: string, refreshToken: string): MailSetup {
    // Nodemailer ne sert ici qu'à construire le message MIME (pièces jointes,
    // en-têtes encodés, replyTo) ; l'envoi lui-même passe par l'API Gmail.
    const builder = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });

    return {
        user,
        transporter: {
            async sendMail(options: SendMailOptions) {
                const built = (await builder.sendMail(options)) as { message: Buffer };
                const raw = built.message.toString("base64url");
                const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

                const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ raw }),
                });

                if (!res.ok) {
                    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
                    // Token périmé/révoqué entre-temps : on l'oublie pour le prochain essai.
                    if (res.status === 401) cachedToken = null;
                    throw new MailError(
                        `Gmail API ${res.status}: ${body.error?.status ?? ""} ${body.error?.message ?? ""}`.trim(),
                        "EGMAILAPI",
                        res.status
                    );
                }
                return res.json();
            },
        },
    };
}

/** Renvoie null si aucune configuration complète n'est disponible. */
export function createMailSetup(): MailSetup | null {
    // 1. SMTP explicite
    const host = process.env.SMTP_HOST;
    if (host) {
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASSWORD;
        if (!user || !pass) return null;

        const port = Number(process.env.SMTP_PORT) || 465;
        return {
            user,
            transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }),
        };
    }

    const gmailUser = process.env.GMAIL_USER;

    // 2. API Gmail (OAuth2, HTTPS)
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
    if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
        if (!gmailUser) return null;
        return createGmailApiSetup(gmailUser, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN);
    }

    // 3. Gmail SMTP + mot de passe d'application
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !pass) return null;
    return {
        user: gmailUser,
        transporter: nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass } }),
    };
}

/** Détail utile au diagnostic (code réseau/SMTP/HTTP), sans jamais logguer d'identifiants. */
export function describeMailError(err: unknown): string {
    const e = err as { code?: string; responseCode?: number; command?: string; message?: string };
    return [e?.code, e?.responseCode, e?.command, e?.message].filter(Boolean).join(" | ");
}
