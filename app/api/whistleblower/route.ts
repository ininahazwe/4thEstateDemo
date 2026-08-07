import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// POST /api/whistleblower — reçoit le formulaire d'appel à témoignage et
// l'envoie par email à la rédaction via SMTP Gmail.
//
// Variables d'environnement requises (.env.local / secrets CI) :
//   GMAIL_USER          : adresse Gmail expéditrice (ex. tips@…)
//   GMAIL_APP_PASSWORD  : mot de passe d'application Google (PAS le mot de
//                         passe du compte — nécessite la 2FA activée, voir
//                         https://myaccount.google.com/apppasswords)
//   WHISTLEBLOWER_TO    : destinataire(s), séparés par des virgules.
//                         Optionnel : défaut = GMAIL_USER.
//
// Le corps est envoyé en multipart/form-data (pièce jointe image possible),
// pas en JSON — d'où req.formData() plutôt que req.json().
// ---------------------------------------------------------------------------

// Nodemailer a besoin du runtime Node (sockets SMTP) — indisponible en Edge.
export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 Mo
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        return NextResponse.json({ error: "invalid_form" }, { status: 400 });
    }

    const videoLink = asString(form.get("videoLink"));
    const name = asString(form.get("name"));
    const email = asString(form.get("email"));
    const subject = asString(form.get("subject"));
    const message = asString(form.get("message"));

    // Seul "subject" est requis, comme sur le formulaire WordPress d'origine
    // (l'anonymat est le principe : name/email restent optionnels).
    if (!subject) {
        return NextResponse.json({ error: "missing_subject" }, { status: 400 });
    }

    // Email optionnel, mais s'il est fourni il doit être exploitable —
    // sinon la rédaction ne peut pas recontacter la source.
    if (email && !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    // ── Pièce jointe (optionnelle) ──────────────────────────────────────
    const attachments: Array<{ filename: string; content: Buffer }> = [];
    const file = form.get("attachment");

    if (file && typeof file !== "string" && file.size > 0) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
            return NextResponse.json({ error: "file_too_large" }, { status: 400 });
        }
        attachments.push({
            filename: file.name || "attachment",
            content: Buffer.from(await file.arrayBuffer()),
        });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
        console.error("whistleblower : GMAIL_USER ou GMAIL_APP_PASSWORD manquant");
        return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    const recipients = process.env.WHISTLEBLOWER_TO || gmailUser;

    const lines = [
        `Subject: ${subject}`,
        `Name: ${name || "(not provided)"}`,
        `Email: ${email || "(not provided)"}`,
        `Video link: ${videoLink || "(none)"}`,
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
            from: `"The Fourth Estate — Whistleblower" <${gmailUser}>`,
            to: recipients,
            // replyTo seulement si la source a laissé un email : sinon Gmail
            // renverrait les réponses vers la boîte d'envoi elle-même.
            ...(email ? { replyTo: email } : {}),
            subject: `[Whistleblower] ${subject}`,
            text: lines.join("\n"),
            attachments,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("whistleblower : envoi SMTP échoué", err);
        return NextResponse.json({ error: "send_failed" }, { status: 502 });
    }
}
