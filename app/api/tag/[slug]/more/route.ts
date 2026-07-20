import { NextRequest, NextResponse } from "next/server";
import { getTagArticlesOffset } from "@/app/services/wpApi";

// Alimente le bouton "Load more" de la page tag (miroir de /api/category/[slug]/more).
// GET /api/tag/{slug}/more?offset=13&limit=5
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

    const result = await getTagArticlesOffset(slug, offset, limit);
    return NextResponse.json(result);
}
