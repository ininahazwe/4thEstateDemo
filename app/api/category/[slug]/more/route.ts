import { NextRequest, NextResponse } from "next/server";
import { getCategoryArticlesOffset } from "@/app/services/wpApi";

// Alimente le bouton "Load more" de la page catégorie (remplace la
// pagination classique). GET /api/category/{slug}/more?offset=13&limit=5
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "5");

    if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(limit) || limit <= 0) {
        return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }

    const result = await getCategoryArticlesOffset(slug, offset, limit);
    return NextResponse.json(result);
}
