import { NextRequest, NextResponse } from "next/server";
import { getOurImpactArticlesOffset } from "@/app/services/wpApi";

// Alimente le scroll infini de /category/our-impact, avec filtre optionnel
// sur la taxonomie impact-category. Route littérale distincte de
// /api/category/[slug]/more : le paramètre `filter` n'a de sens que sur
// cette page, inutile d'en charger les ~20 autres pages catégorie.
// GET /api/category/our-impact/more?offset=13&limit=5&filter=honours
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "5");
    const filter = searchParams.get("filter") || undefined;

    if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(limit) || limit <= 0) {
        return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }

    const result = await getOurImpactArticlesOffset(offset, limit, filter);
    return NextResponse.json(result);
}
