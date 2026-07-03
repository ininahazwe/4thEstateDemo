import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await auth();

    // Tracking réservé aux membres connectés.
    if (!session?.user?.id) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    let body: { articleId?: number | string; slug?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { articleId, slug } = body;
    if (articleId === undefined || articleId === null || !slug) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Pays du lecteur : dérivé par Vercel depuis l'IP entrante et exposé via
    // l'en-tête x-vercel-ip-country (code ISO-3166-1 alpha-2, ex. "GH").
    // On ne manipule JAMAIS l'IP brute — seulement le pays déjà dérivé.
    const countryHeader = req.headers.get("x-vercel-ip-country");
    const country =
        countryHeader && /^[A-Z]{2}$/i.test(countryHeader)
            ? countryHeader.toUpperCase()
            : null;

    // --- DIAGNOSTIC TEMPORAIRE (à retirer après debug) ---------------------
    const vercelGeoHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
        if (key.startsWith("x-vercel-ip")) vercelGeoHeaders[key] = value;
    });
    console.log("[track-read] DIAG", {
        vercelGeoHeaders,               // vide = Vercel n'injecte AUCUN en-tête géo
        countryHeaderRaw: countryHeader, // valeur brute de x-vercel-ip-country
        countryComputed: country,        // ce qu'on relaiera (null = non envoyé)
    });
    // ----------------------------------------------------------------------

    try {
        // user_id vient de la SESSION, jamais du client.
        const res = await fetch(
            `${process.env.TFE_MEMBERSHIP_API_URL}/track-read`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-TFE-API-Key": process.env.TFE_MEMBERSHIP_API_KEY!,
                },
                body: JSON.stringify({
                    user_id: session.user.id,
                    article_id: articleId,
                    slug,
                    ...(country ? { country } : {}),
                }),
            }
        );

        if (!res.ok) {
            console.error(`track-read : WP a renvoyé ${res.status}`);
            return NextResponse.json({ error: "upstream_error" }, { status: 502 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("track-read : fetch vers WP échoué", err);
        return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
    }
}