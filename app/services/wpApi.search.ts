import { cache } from 'react';
import { type SearchData, type SearchArticle } from '../components/Search/Types';

// ---------------------------------------------------------------------------
// wpApi.search.ts — fichier dédié à la page /search, séparé de wpApi.ts pour
// ne pas l'alourdir. Mêmes helpers internes que wpApi.ts
// (buildHref/buildImage/cleanHtmlTitle/…) mais réimplémentés ici en miniature
// pour rester 100 % autonome — pas d'import croisé vers wpApi.ts, donc aucun
// risque de casser les pages qui en dépendent déjà (homepage, article,
// catégorie).
//
// Recherche WordPress native :
//   - `search=<q>`   → plein texte sur titre + contenu (équivalent de /?s=q)
//   - `after=<ISO>`  → publiés APRÈS cette date (inclus, borne basse)
//   - `before=<ISO>` → publiés AVANT cette date (inclus, borne haute)
// Les dates du formulaire arrivent au format `YYYY-MM-DD` ; on les convertit
// en ISO8601 en élargissant à la journée entière (00:00:00 → 23:59:59) pour
// que `to` inclue bien tous les articles du jour choisi.
// ---------------------------------------------------------------------------

const WP_BASE =
    process.env.NEXT_PUBLIC_WP_API_URL ?? 'https://thefourthestategh.com/wp-json/wp/v2';

const SEARCH_PER_PAGE = 13; // même convention que catégorie/auteur (2 highlight + 11 standard)

interface WPPostMinimal {
    id: number;
    slug: string;
    title: { rendered: string };
    date: string;
    categories: number[];
    featured_media: number;
    format?: string;
    status?: string;
}

interface WPMediaMinimal {
    id: number;
    source_url: string;
    media_details?: {
        width?: number;
        height?: number;
        sizes?: Record<string, { source_url: string; width: number; height: number }>;
    };
}

interface WPCategoryMinimal {
    id: number;
    name: string;
}

// ---------------------------------------------------------------------------
// Helpers miniatures (autonomes)
// ---------------------------------------------------------------------------

const BLUR_PLACEHOLDER =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iNDI2Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNjYmQ1ZTEiIGZvbnQtc2l6ZT0iMjQiPuKWqTwvdGV4dD48L3N2Zz4=';

const IMAGE_SIZE_PRIORITY = ['medium_large', 'large', 'medium'];

function buildHref(post: WPPostMinimal): string {
    const date = new Date(post.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `/${year}/${month}/${post.slug}`;
}

function formatWpDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-EN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function cleanHtmlTitle(title: string): string {
    return title
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '“')
        .replace(/&#8221;/g, '”')
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&')
        .replace(/<[^>]*>/g, '')
        .trim();
}

function imagePriority(index: number): 'high' | 'auto' | 'low' {
    if (index === 0) return 'high';
    if (index < 3) return 'auto';
    return 'low';
}

function pickImage(media: WPMediaMinimal, index: number): SearchArticle['image'] {
    const sizes = media.media_details?.sizes;
    let src = media.source_url;
    let width = media.media_details?.width ?? 640;
    let height = media.media_details?.height ?? 426;

    if (sizes) {
        for (const name of IMAGE_SIZE_PRIORITY) {
            const s = sizes[name];
            if (s?.source_url) {
                src = s.source_url;
                width = s.width;
                height = s.height;
                break;
            }
        }
    }

    return { src, width, height, fetchPriority: imagePriority(index), blurDataURL: BLUR_PLACEHOLDER };
}

async function fetchMediaBatch(mediaIds: number[]): Promise<Map<number, WPMediaMinimal>> {
    const map = new Map<number, WPMediaMinimal>();
    if (!mediaIds.length) return map;
    const res = await fetch(
        `${WP_BASE}/media?include=${mediaIds.join(',')}&per_page=100`,
        { next: { revalidate: 600 } }
    );
    if (!res.ok) return map;
    const medias: WPMediaMinimal[] = await res.json();
    medias.forEach((m) => map.set(m.id, m));
    return map;
}

async function fetchCategoryBatch(categoryIds: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!categoryIds.length) return map;
    const res = await fetch(
        `${WP_BASE}/categories?include=${categoryIds.join(',')}&per_page=100`,
        { next: { revalidate: 600 } }
    );
    if (!res.ok) return map;
    const cats: WPCategoryMinimal[] = await res.json();
    cats.forEach((c) => map.set(c.id, c.name));
    return map;
}

/**
 * Convertit une date `YYYY-MM-DD` (input type=date) en ISO8601. `endOfDay`
 * étend `to` à 23:59:59 pour inclure toute la journée. Retourne undefined si
 * l'entrée est vide ou mal formée (le filtre est alors simplement ignoré).
 */
function toIso(date: string | undefined, endOfDay = false): string | undefined {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
    return endOfDay ? `${date}T23:59:59` : `${date}T00:00:00`;
}

// ---------------------------------------------------------------------------
// getSearchPageData
// ---------------------------------------------------------------------------

export interface SearchParams {
    query: string;
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    page?: number;
}

export const getSearchPageData = cache(async (
    { query, from, to, page = 1 }: SearchParams
): Promise<SearchData> => {
    const trimmed = query.trim();

    const empty: SearchData = {
        query: trimmed,
        from: from ?? '',
        to: to ?? '',
        articles: [],
        total: 0,
        pagination: { currentPage: page, totalPages: 0 },
    };

    // Pas de mot-clé -> page vide (formulaire seul), aucun fetch inutile.
    if (!trimmed) return empty;

    const afterIso = toIso(from, false);
    const beforeIso = toIso(to, true);

    const params = new URLSearchParams({
        search: trimmed,
        page: String(page),
        per_page: String(SEARCH_PER_PAGE),
        status: 'publish',
        orderby: 'date',
        order: 'desc',
        _fields: 'id,slug,title,date,categories,featured_media,format',
    });
    if (afterIso) params.set('after', afterIso);
    if (beforeIso) params.set('before', beforeIso);

    const res = await fetch(`${WP_BASE}/posts?${params.toString()}`, { next: { revalidate: 300 } });

    if (!res.ok) {
        // WP renvoie 400 au-delà de la dernière page — on retourne une page vide
        // en conservant le contexte (query/dates) plutôt que de planter.
        if (res.status === 400) return { ...empty, articles: [] };
        console.error(`Erreur wpApi [getSearchPageData]: ${res.status}`);
        return empty;
    }

    const total = Number(res.headers.get('X-WP-Total') ?? '0');
    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '0');
    const rawPosts: WPPostMinimal[] = await res.json();
    const posts = rawPosts.filter((p) => !p.status || p.status === 'publish');

    if (!posts.length) {
        return { ...empty, total, pagination: { currentPage: page, totalPages } };
    }

    const mediaIds = Array.from(new Set(posts.map((p) => p.featured_media).filter((id) => id > 0)));
    const categoryIds = Array.from(new Set(posts.flatMap((p) => p.categories).filter((id) => id > 0)));

    const [mediaMap, categoryMap] = await Promise.all([
        fetchMediaBatch(mediaIds),
        fetchCategoryBatch(categoryIds),
    ]);

    const articles: SearchArticle[] = posts.map((post, index) => {
        const media = mediaMap.get(post.featured_media);

        let source = 'The Fourth Estate';
        if (post.categories.length > 0) {
            const cat = categoryMap.get(post.categories[0]);
            if (cat) source = cleanHtmlTitle(cat);
        }

        const article: SearchArticle = {
            id: `search-post-${post.id}`,
            href: buildHref(post),
            title: cleanHtmlTitle(post.title.rendered),
            source,
            publishedAt: formatWpDate(post.date),
            imagePriority: imagePriority(index),
        };

        if (media) article.image = pickImage(media, index);

        return article;
    });

    return {
        query: trimmed,
        from: from ?? '',
        to: to ?? '',
        articles,
        total,
        pagination: { currentPage: page, totalPages },
    };
});
