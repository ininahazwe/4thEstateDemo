import { cache } from 'react';
import { type AuthorData, type AuthorArticle } from '../components/Author/Types';

// ---------------------------------------------------------------------------
// wpApi.author.ts — fichier dédié à la page /author/[slug], séparé de
// wpApi.ts (homepage) et wpApi.article.ts (page article) pour ne pas les
// alourdir. Mêmes helpers internes que wpApi.ts (buildHref/buildImage/etc.)
// mais réimplémentés ici en miniature pour rester 100% autonome — pas
// d'import croisé vers wpApi.ts, donc aucun risque de casser les pages qui
// en dépendent déjà (homepage, article).
//
// IMPORTANT — architecture réelle confirmée par les données API (et non plus
// une hypothèse) : le site utilise le plugin Publishpress Authors, PAS le
// système d'auteurs natif de WordPress (/users). Chaque post expose :
//   - author (number)        → compte WP technique qui a publié, sans intérêt ici
//   - ppma_author (number[]) → IDs des "vrais" auteurs éditoriaux (taxonomie)
//   - authors (object[])     → objets complets déjà embarqués dans la réponse
//                              ({ term_id, slug, display_name, avatar_url, ... })
// La taxonomie elle-même s'appelle "author" en interne mais est exposée côté
// REST sous /wp-json/wp/v2/ppma_author (confirmé par _links.wp:term sur les
// posts ET par un fetch direct : /ppma_author?slug=... retourne bien
// { id, name, slug, taxonomy: "author", _links.wp:post_type } avec l'URL
// exacte à utiliser pour les posts : /posts?ppma_author={id}).
// ---------------------------------------------------------------------------

const WP_BASE =
    process.env.NEXT_PUBLIC_WP_API_URL ?? 'https://thefourthestategh.com/wp-json/wp/v2';

const AUTHOR_PER_PAGE = 13; // même convention que la page catégorie (2 highlight + 11 standard)

interface WPAuthorTerm {
    id: number;
    name: string;
    slug: string;
    taxonomy: string;
}

interface WPPostMinimal {
    id: number;
    slug: string;
    title: { rendered: string };
    date: string;
    categories: number[];
    featured_media: number;
    format?: string;
}

interface WPMediaMinimal {
    id: number;
    source_url: string;
    media_details?: { width?: number; height?: number };
}

interface WPCategoryMinimal {
    id: number;
    name: string;
}

/**
 * Résout un slug en terme auteur ppma_author (id + name + slug).
 * La taxonomie est exposée sous /ppma_author côté REST (confirmé par requête
 * directe), même si son nom interne WordPress est "author".
 */
async function resolveAuthor(slug: string): Promise<WPAuthorTerm | null> {
    const res = await fetch(
        `${WP_BASE}/ppma_author?slug=${encodeURIComponent(slug)}`,
        { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const terms: WPAuthorTerm[] = await res.json();
    return terms[0] ?? null;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').trim();
}

function formatDisplayDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

async function fetchMediaBatch(ids: number[]): Promise<Map<number, WPMediaMinimal>> {
    if (!ids.length) return new Map();
    const res = await fetch(`${WP_BASE}/media?include=${ids.join(',')}&per_page=${ids.length}`, {
        next: { revalidate: 3600 },
    });
    if (!res.ok) return new Map();
    const media: WPMediaMinimal[] = await res.json();
    return new Map(media.map((m) => [m.id, m]));
}

async function fetchCategoryBatch(ids: number[]): Promise<Map<number, string>> {
    if (!ids.length) return new Map();
    const res = await fetch(`${WP_BASE}/categories?include=${ids.join(',')}&per_page=${ids.length}`, {
        next: { revalidate: 3600 },
    });
    if (!res.ok) return new Map();
    const cats: WPCategoryMinimal[] = await res.json();
    return new Map(cats.map((c) => [c.id, c.name]));
}

function buildImage(media: WPMediaMinimal, index: number): AuthorArticle['image'] {
    return {
        src: media.source_url,
        width: media.media_details?.width ?? 640,
        height: media.media_details?.height ?? 426,
        fetchPriority: index === 0 ? 'high' : index <= 2 ? 'auto' : 'low',
    };
}

function buildArticleHref(post: WPPostMinimal): string {
    const date = new Date(post.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `/${year}/${month}/${post.slug}`;
}

/**
 * Récupère les données paginées de la page auteur : nom + liste d'articles.
 * Enveloppée dans React.cache() pour dédupliquer l'appel entre
 * generateMetadata() et la page elle-même (même slug + même page).
 */
export const getAuthorPageData = cache(async (
    slug: string,
    page: number = 1
): Promise<AuthorData | null> => {
    const author = await resolveAuthor(slug);
    if (!author) return null;

    const url =
        `${WP_BASE}/posts` +
        `?ppma_author=${author.id}` +
        `&page=${page}` +
        `&per_page=${AUTHOR_PER_PAGE}` +
        `&status=publish` +
        `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format`;

    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
        if (res.status === 400) {
            // Page hors limites -> WP renvoie 400 au-delà de la dernière page.
            return {
                name: author.name,
                slug,
                articles: [],
                pagination: { currentPage: page, totalPages: 0, basePath: `/author/${slug}` },
            };
        }
        console.error(`Erreur wpApi.author [getAuthorPageData]: ${res.status}`);
        return null;
    }

    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
    const rawPosts: WPPostMinimal[] = await res.json();

    // Exclut les contenus "stories"/vidéo, même logique éditoriale que la page catégorie.
    const posts = rawPosts.filter((p) => p.format !== 'video');
    if (!posts.length) {
        return {
            name: author.name,
            slug,
            articles: [],
            pagination: { currentPage: page, totalPages, basePath: `/author/${slug}` },
        };
    }

    const mediaIds = posts.map((p) => p.featured_media).filter(Boolean);
    const categoryIds = [...new Set(posts.flatMap((p) => p.categories))];
    const [mediaMap, categoryMap] = await Promise.all([
        fetchMediaBatch(mediaIds),
        fetchCategoryBatch(categoryIds),
    ]);

    const articles: AuthorArticle[] = posts.map((post, index) => {
        const media = mediaMap.get(post.featured_media);

        let source = 'The Fourth Estate';
        if (post.categories.length > 0) {
            const cat = categoryMap.get(post.categories[0]);
            if (cat) source = cat;
        }

        const article: AuthorArticle = {
            id: `post-${post.id}`,
            href: buildArticleHref(post),
            title: stripHtml(post.title.rendered),
            source,
            publishedAt: formatDisplayDate(post.date),
            imagePriority: index === 0 ? 'high' : index <= 2 ? 'auto' : 'low',
        };

        if (media) article.image = buildImage(media, index);

        return article;
    });

    return {
        name: author.name,
        slug,
        articles,
        pagination: {
            currentPage: page,
            totalPages,
            basePath: `/author/${slug}`,
        },
    };
});