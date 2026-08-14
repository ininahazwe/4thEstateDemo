import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

// Connecte le formulaire NewsletterSignup à une audience Mailchimp.
//
// Variables d'environnement requises :
// - MAILCHIMP_API_KEY     : clé API Mailchimp, format "xxxxxxxx…-us21"
//                           (le suffixe après le tiret est le datacenter, ex. "us21")
// - MAILCHIMP_AUDIENCE_ID : ID de l'audience cible
//                           (Audience > Settings > Audience name and defaults)
//
// ATTENTION DÉPLOIEMENT : `.env.local` est couvert par `.gitignore` (`.env*`),
// il n'est donc JAMAIS déployé. Sur l'hébergement cPanel, ces deux variables
// doivent être saisies dans « Setup Node.js App > Environment variables », puis
// l'application redémarrée. Sans ça la route répond `not_configured` et le
// formulaire affiche « Something went wrong » à chaque tentative — c'est la
// cause la plus fréquente de ce symptôme. Le GET ci-dessous permet de le
// vérifier en une requête, sans accès aux logs.
//
// `runtime` explicite : la route utilise `node:crypto` et `Buffer`, absents du
// runtime Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Statut appliqué aux NOUVEAUX contacts uniquement.
// - "subscribed" : inscription immédiate (simple opt-in). Légitime ici, le
//   consentement explicite étant recueilli dans le modal avant l'appel.
// - "pending"    : double opt-in, Mailchimp envoie un email de confirmation.
// Basculer cette constante suffit ; adapter alors le message de succès du
// composant, qui dit aujourd'hui que l'inscription est effective.
const STATUS_IF_NEW = "subscribed";

// Tag posé sur le contact pour tracer le recueil du consentement (page
// /privacy acceptée dans le modal). Best-effort : un échec de tag ne doit pas
// faire échouer l'inscription elle-même.
const CONSENT_TAG = "privacy-accepted";

interface MailchimpConfig {
    apiKey: string;
    audienceId: string;
    datacenter: string;
}

function readConfig(): MailchimpConfig | { missing: string[] } {
    const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();

    const missing: string[] = [];
    if (!apiKey) missing.push("MAILCHIMP_API_KEY");
    if (!audienceId) missing.push("MAILCHIMP_AUDIENCE_ID");
    if (missing.length) return { missing };

    // Le datacenter est le suffixe de la clé API, après le tiret. Une clé
    // recopiée sans son suffixe est une erreur de saisie fréquente : on la
    // signale comme un défaut de configuration et non comme une panne réseau.
    const datacenter = apiKey!.includes("-") ? apiKey!.split("-").pop()! : "";
    if (!datacenter) return { missing: ["MAILCHIMP_API_KEY (suffixe datacenter manquant, ex. « -us6 »)"] };

    return { apiKey: apiKey!, audienceId: audienceId!, datacenter };
}

function authHeader(apiKey: string): string {
    // Mailchimp accepte n'importe quel username en Basic Auth, seule la clé compte.
    return `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;
}

/**
 * Diagnostic de configuration — ne renvoie QUE des booléens et le datacenter
 * (qui n'est pas un secret : il apparaît dans l'URL de n'importe quel
 * formulaire Mailchimp embarqué). Aucune clé, aucun ID d'audience.
 * Ouvrir /api/newsletter/subscribe dans le navigateur répond en une requête à
 * « les variables sont-elles bien vues par le runtime ? ». Supprimable une
 * fois le déploiement stabilisé.
 */
export async function GET() {
    const config = readConfig();
    const configured = !("missing" in config);

    return NextResponse.json({
        configured,
        missing: configured ? [] : config.missing,
        datacenter: configured ? config.datacenter : null,
    });
}

export async function POST(req: Request) {
    let body: { email?: string; consent?: boolean };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    // Normalisation en minuscules AVANT le hash : Mailchimp identifie un
    // contact par le MD5 de son adresse en minuscules. Un hash calculé sur
    // "Foo@Bar.com" ne désigne pas le même contact que "foo@bar.com" et
    // créerait un doublon.
    const email = body.email?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    // Le consentement est recueilli dans le modal côté client, mais il est
    // revalidé ici : une route publique ne fait jamais confiance à son appelant.
    if (body.consent !== true) {
        return NextResponse.json({ error: "consent_required" }, { status: 400 });
    }

    const config = readConfig();
    if ("missing" in config) {
        console.error("newsletter/subscribe : configuration manquante —", config.missing.join(", "));
        return NextResponse.json({ error: "not_configured", missing: config.missing }, { status: 500 });
    }

    const { apiKey, audienceId, datacenter } = config;
    const subscriberHash = createHash("md5").update(email).digest("hex");
    const memberUrl = `https://${datacenter}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;

    try {
        // PUT (upsert) et non POST /members.
        //
        // POST échoue avec « Member Exists » (400) dès que l'adresse est déjà
        // CONNUE de l'audience — y compris quand elle y est archivée,
        // désabonnée ou « cleaned ». L'ancienne version interceptait ce cas et
        // renvoyait ok:true : le lecteur voyait « Thanks for subscribing! »
        // alors que rien n'avait été écrit. PUT crée ou met à jour dans les
        // deux cas, ce faux succès disparaît.
        //
        // `status_if_new` et non `status` : `status` forcerait le statut d'un
        // contact existant, ce que Mailchimp refuse (400) pour un contact
        // précédemment désabonné — il doit se réinscrire lui-même. Avec
        // `status_if_new`, un contact déjà présent est laissé intact.
        const res = await fetch(memberUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader(apiKey),
            },
            body: JSON.stringify({
                email_address: email,
                status_if_new: STATUS_IF_NEW,
            }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            console.error("newsletter/subscribe : Mailchimp a renvoyé", res.status, data);
            return NextResponse.json(
                {
                    error: "upstream_error",
                    // `title` est un libellé générique de Mailchimp (« API Key
                    // Invalid », « Resource Not Found », « Forbidden »…) : il ne
                    // contient aucun secret et permet de trancher côté navigateur
                    // sans accès aux logs du serveur.
                    reason: data?.title ?? `HTTP ${res.status}`,
                    // `detail` peut citer l'adresse saisie : réservé au dev.
                    detail: process.env.NODE_ENV === "production" ? undefined : data?.detail,
                },
                { status: 502 }
            );
        }

        // Tag de consentement — best-effort, hors du chemin critique.
        // L'endpoint /tags fonctionne aussi bien sur un contact créé que sur un
        // contact déjà existant, contrairement au champ `tags` du corps du PUT
        // qui n'est appliqué qu'à la création.
        try {
            await fetch(`${memberUrl}/tags`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader(apiKey),
                },
                body: JSON.stringify({ tags: [{ name: CONSENT_TAG, status: "active" }] }),
            });
        } catch (err) {
            console.error("newsletter/subscribe : pose du tag de consentement échouée", err);
        }

        // `status` renvoyé au client : un contact qui s'était désabonné reste
        // "unsubscribed" (cf. status_if_new ci-dessus). L'UI peut alors le lui
        // dire au lieu d'annoncer une inscription qui n'a pas eu lieu.
        return NextResponse.json({ ok: true, status: data?.status ?? STATUS_IF_NEW });
    } catch (err) {
        console.error("newsletter/subscribe : fetch vers Mailchimp échoué", err);
        return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
    }
}
