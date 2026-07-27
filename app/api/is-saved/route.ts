import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
    const session = await auth();

    // Pas de session → jamais sauvegardé du point de vue de ce lecteur.
    // Pas une erreur : un visiteur anonyme regarde la même page qu'un membre.
    if (!session?.user?.id) {
        return NextResponse.json({ saved: false });
    }

    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get("articleId");
    if (!articleId) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    try {
        const url = new URL(`${process.env.TFE_MEMBERSHIP_API_URL}/is-saved`);
        url.searchParams.set("user_id", session.user.id);
        url.searchParams.set("article_id", articleId);

        const res = await fetch(url.toString(), {
            headers: { "X-TFE-API-Key": process.env.TFE_MEMBERSHIP_API_KEY! },
        });

        if (!res.ok) {
            console.error(`is-saved : WP a renvoyé ${res.status}`);
            return NextResponse.json({ saved: false });
        }

        const data = (await res.json()) as { saved?: boolean };
        return NextResponse.json({ saved: !!data.saved });
    } catch (err) {
        console.error("is-saved : fetch vers WP échoué", err);
        // Best-effort : en cas de panne WP, on affiche "non sauvegardé"
        // plutôt que de casser l'affichage de la carte/article.
        return NextResponse.json({ saved: false });
    }
}
