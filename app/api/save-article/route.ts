import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await auth();

    // Bookmark réservé aux membres connectés.
    if (!session?.user?.id) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    let body: {
        articleId?: number | string;
        slug?: string;
        title?: string;
        imageUrl?: string;
        link?: string;
        category?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { articleId, slug, title, imageUrl, link, category } = body;
    if (articleId === undefined || articleId === null || !slug) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    try {
        // user_id vient de la SESSION, jamais du client.
        const res = await fetch(
            `${process.env.TFE_MEMBERSHIP_API_URL}/save-article`,
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
                    title: title ?? "",
                    image_url: imageUrl ?? "",
                    link: link ?? "",
                    category: category ?? "",
                }),
            }
        );

        if (!res.ok) {
            console.error(`save-article : WP a renvoyé ${res.status}`);
            return NextResponse.json({ error: "upstream_error" }, { status: 502 });
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("save-article : fetch vers WP échoué", err);
        return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
    }
}
