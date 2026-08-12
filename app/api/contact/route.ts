import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// POST /api/contact — reçoit le formulaire de la page /contact-us et l'envoie
// par email à la rédaction via SMTP Gmail.
//
// Même mécanique que /api/whistleblower (nodemailer + mot de passe
// d'application Google), à deux différences près :
//   - corps en JSON et non en multipart : pas de pièce jointe ici ;
//   - name / email / subject sont requis (le formulaire de contact n'a pas
//     vocation à être anonyme, contrairement à l'appel à témoignage).
//
// Variables d'environnement (.env.local / secrets CI) :
//   GMAIL_USER          : adresse Gmail expéditrice
//   GMAIL_APP_PASSWORD  : mot de passe d'application Google (PAS le mot de
//                         passe du compte — nécessite la 2FA activée, voir
//                         https://myaccount.google.com/apppasswords)
//   CONTACT_TO          : destinataire(s), séparés par des virgules.
//                         Optionnel : défaut = GMAIL_USER.
// ---------------------------------------------------------------------------

// Nodemailer a besoin du runtime Node (sockets SMTP) — indisponible en Edge.
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Longueurs maximales. Un formulaire public est une porte ouverte : sans
 * borne, rien n'empêche d'envoyer plusieurs mégaoctets de texte par requête.
 */
const MAX_LENGTHS = {
    name: 200,
    email: 200,
    subject: 300,
    message: 10000,
} as const;

interface ContactPayload {
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
    consent?: unknown;
    /** Champ piège, invisible pour un humain — voir plus bas. */
    website?: unknown;
}

function asString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
    let payload: ContactPayload;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    // ── Honeypot ────────────────────────────────────────────────────────
    // Champ masqué en CSS et retiré du parcours clavier : un visiteur ne peut
    // pas le remplir, un robot qui remplit aveuglément le formulaire si. On
    // renvoie un succès plutôt qu'une erreur, pour ne pas lui indiquer ce qui
    // l'a trahi — mais aucun mail n'est envoyé.
    if (asString(payload.website)) {
        return NextResponse.json({ ok: true });
    }

    const name = asString(payload.name);
    const email = asString(payload.email);
    const subject = asString(payload.subject);
    const message = asString(payload.message);

    if (!name || !email || !subject) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (!EMAIL_RE.test(email)) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    // Le consentement est aussi verrouillé côté client, mais une requête peut
    // arriver sans passer par le formulaire — on revalide ici.
    if (payload.consent !== true) {
        return NextResponse.json({ error: "missing_consent" }, { status: 400 });
    }

    if (
        name.length > MAX_LENGTHS.name ||
        email.length > MAX_LENGTHS.email ||
        subject.length > MAX_LENGTHS.subject ||
        message.length > MAX_LENGTHS.message
    ) {
        return NextResponse.json({ error: "too_long" }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
        console.error("contact : GMAIL_USER ou GMAIL_APP_PASSWORD manquant");
        return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    const recipients = process.env.CONTACT_TO || gmailUser;

    const lines = [
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject}`,
        "",
        "Message:",
        message || "(empty)",
    ];

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: gmailUser, pass: gmailPassword },
        });

        await transporter.sendMail({
            // L'expéditeur reste la boîte Gmail du site : usurper l'adresse du
            // visiteur ferait échouer SPF/DKIM et enverrait le mail en spam.
            // C'est replyTo qui permet à la rédaction de répondre directement.
            from: `"The Fourth Estate — Contact form" <${gmailUser}>`,
            to: recipients,
            replyTo: `"${name}" <${email}>`,
            subject: `[Contact] ${subject}`,
            text: lines.join("\n"),
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("contact : envoi SMTP échoué", err);
        return NextResponse.json({ error: "send_failed" }, { status: 502 });
    }
}
