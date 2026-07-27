import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Statut "sauvegardé" pour plusieurs articles en un seul appel — utile pour
 * une page qui affiche N cartes (évite N appels /api/is-saved). Pas encore
 * branché sur un composant : BookmarkButton fait pour l'instant un check
 * individuel via /api/is-saved (plus simple, pas de refactor des pages
 * Server Components pour propager la liste d'IDs). À utiliser si un futur
 * composant liste (ex. page "Saved articles" côté éditorial) a besoin
 * d'hydrater plusieurs cartes d'un coup.
 */
export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ saved_article_ids: [] });
    }

    let body: { articleIds?: Array<number | string> };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const articleIds = body.articleIds;
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    try {
        const res = await fetch(`${process.env.TFE_MEMBERSHIP_API_URL}/saved-status`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-TFE-API-Key": process.env.TFE_MEMBERSHIP_API_KEY!,
            },
            body: JSON.stringify({
                user_id: session.user.id,
                article_ids: articleIds,
            }),
        });

        if (!res.ok) {
            console.error(`saved-status : WP a renvoyé ${res.status}`);
            return NextResponse.json({ saved_article_ids: [] });
        }

        const data = (await res.json()) as { saved_article_ids?: Array<string> };
        return NextResponse.json({ saved_article_ids: data.saved_article_ids ?? [] });
    } catch (err) {
        console.error("saved-status : fetch vers WP échoué", err);
        return NextResponse.json({ saved_article_ids: [] });
    }
}
