import { NextResponse } from "next/server";

// Connecte le formulaire NewsletterSignup à une audience Mailchimp.
//
// Variables d'environnement requises (.env.local / Vercel) :
// - MAILCHIMP_API_KEY    : clé API Mailchimp, format "xxxxxxxx...-us21"
//                          (le suffixe après le tiret est le datacenter, ex. "us21")
// - MAILCHIMP_AUDIENCE_ID : l'ID de l'audience/liste cible (Audience > Settings > Audience name and defaults)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    let body: { email?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const email = body.email?.trim();
    if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

    if (!apiKey || !audienceId) {
        console.error("newsletter/subscribe : MAILCHIMP_API_KEY ou MAILCHIMP_AUDIENCE_ID manquant");
        return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    // Le datacenter Mailchimp (ex. "us21") est le suffixe de la clé API, après le tiret.
    const datacenter = apiKey.split("-").pop();
    if (!datacenter) {
        console.error("newsletter/subscribe : impossible d'extraire le datacenter de MAILCHIMP_API_KEY");
        return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    try {
        const res = await fetch(
            `https://${datacenter}.api.mailchimp.com/3.0/lists/${audienceId}/members`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Mailchimp accepte n'importe quel username en Basic Auth, seule la clé API compte.
                    Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
                },
                body: JSON.stringify({
                    email_address: email,
                    // 'subscribed' = inscription directe. Passer à 'pending' pour un
                    // double opt-in (email de confirmation envoyé par Mailchimp).
                    status: "subscribed",
                }),
            }
        );

        if (res.ok) {
            return NextResponse.json({ ok: true });
        }

        const data = await res.json().catch(() => null);

        // Un membre déjà inscrit ne doit pas être traité comme une erreur côté UI.
        if (data?.title === "Member Exists") {
            return NextResponse.json({ ok: true, alreadySubscribed: true });
        }

        console.error("newsletter/subscribe : Mailchimp a renvoyé", res.status, data);
        return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    } catch (err) {
        console.error("newsletter/subscribe : fetch vers Mailchimp échoué", err);
        return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
    }
}
