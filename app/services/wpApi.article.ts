import { cache } from "react";
import { decode } from "html-entities";
import { buildHref, WPPost } from "./wpApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WpArticleAuthor {
    displayName: string;
    slug: string;
    avatarUrl?: string;
}

export interface WpArticle {
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    strapline?: string;
    source?: string;
    authors: WpArticleAuthor[];
    readTime?: string;
    publishedAt: string;
    publishedAtISO: string;
    featuredImage?: string;
    imageCaption?: string;
    imageCredit?: string;
    category?: { name: string; slug: string };
    country?: { name: string; slug: string };
    tags: Array<{ label: string; href: string }>;
    // IDs bruts pour les requêtes de recommandation
    tagIds: number[];
    categoryIds: number[];
}

export interface WpArticleCard {
    id: number;
    slug: string;
    strapline?: string;
    title: string;
    href: string;
    image?: string;
    isPremium?: boolean;
    category?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const WP_API =
    process.env.NEXT_PUBLIC_WP_API_URL ?? "https://thefourthestategh.com/wp-json/wp/v2";

// ─── Helpers privés ───────────────────────────────────────────────────────────

function stripHtml(html: string): string {
    // decode() convertit les entités HTML (&#8220;, &#8217;, &hellip;, etc.)
    // en caractères réels — sans ça, WordPress renvoie l'entité brute et
    // React l'affiche telle quelle puisque le texte n'est pas injecté en HTML.
    return decode(html.replace(/<[^>]+>/g, "")).trim();
}

/**
 * Tailles WP disponibles sur l'install (thème Foxiz) : thumbnail (150),
 * medium (300), medium_large (768), large (1024), 1536x1536, 2048x2048, full.
 * Les foxiz_crop_* sont des crops à ratio fixe — ignorées, on garde le ratio
 * original de l'image.
 *
 * 'hero' (featuredImage, ~3/4 écran desktop) → large (1024px), suffisant en
 * netteté pour cet usage et nettement plus léger que le full-size (souvent
 * 2500px / plusieurs Mo).
 * 'card' (vignettes ReadMore/Related/MostRead) → medium_large (768px).
 */
function pickWpImageUrl(
    media: Record<string, unknown> | undefined,
    sizePriority: string[]
): string | undefined {
    if (!media) return undefined;
    const mediaDetails = media.media_details as
        | { sizes?: Record<string, { source_url: string }> }
        | undefined;
    const sizes = mediaDetails?.sizes;
    if (sizes) {
        for (const sizeName of sizePriority) {
            const url = sizes[sizeName]?.source_url;
            if (url) return url;
        }
    }
    return (media.source_url as string) ?? undefined;
}

const HERO_SIZE_PRIORITY = ['large', 'medium_large', '1536x1536'];
const CARD_SIZE_PRIORITY = ['medium_large', 'large', 'medium'];

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-EN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function estimateReadTime(htmlContent: string): string {
    const words = stripHtml(htmlContent).split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `Reading time ${minutes} min.`;
}

function buildArticleCard(post: Record<string, unknown>): WpArticleCard {
    const acf = (post.acf ?? {}) as Record<string, unknown>;
    const embedded = (post._embedded ?? {}) as Record<string, unknown>;
    const media = (
        embedded["wp:featuredmedia"] as Array<Record<string, unknown>>
    )?.[0];
    const terms = (
        embedded["wp:term"] as Array<Array<Record<string, unknown>>>
    )?.[0] ?? [];

    return {
        id: post.id as number,
        slug: post.slug as string,
        title: (post.title as { rendered: string }).rendered,
        href: buildHref(post as unknown as WPPost),
        image: pickWpImageUrl(media, CARD_SIZE_PRIORITY),
        strapline: (acf.strapline as string) ?? undefined,
        isPremium: (acf.is_premium as boolean) ?? false,
        category: (terms[0]?.name as string) ?? undefined,
    };
}

// ─── Exports publics ──────────────────────────────────────────────────────────

/**
 * Récupère un article complet par son slug.
 *
 * Enveloppé dans React.cache() : si generateMetadata() ET la page elle-même
 * appellent getArticleBySlug(slug) durant le même rendu serveur, le fetch
 * réseau n'est exécuté QU'UNE FOIS — le second appel reçoit le résultat
 * déjà résolu en mémoire. Élimine un fetch WordPress redondant à chaque
 * chargement de page article.
 */
export const getArticleBySlug = cache(async (slug: string): Promise<WpArticle | null> => {
    try {
        const res = await fetch(
            `${WP_API}/posts?slug=${encodeURIComponent(slug)}&_embed=1`,
            // revalidate passé de 60s à 600s : le contenu éditorial change rarement
            // après publication, donc une fenêtre de cache plus longue réduit la
            // fréquence des "cache miss" qui déclenchent le fetch réseau lent
            // (Frankfort ↔ Ghana). Un article déjà visité reste donc rapide
            // beaucoup plus longtemps qu'avant.
            { next: { revalidate: 600 } }
        );
        if (!res.ok) return null;

        const posts = (await res.json()) as Array<Record<string, unknown>>;
        if (!posts.length) return null;

        const post = posts[0];
        const acf = (post.acf ?? {}) as Record<string, unknown>;
        const embedded = (post._embedded ?? {}) as Record<string, unknown>;
        const media = (
            embedded["wp:featuredmedia"] as Array<Record<string, unknown>>
        )?.[0];
        const allTerms = (
            embedded["wp:term"] as Array<Array<Record<string, unknown>>>
        ) ?? [];
        const categoryTerms = allTerms[0] ?? [];
        const tagTerms = allTerms[1] ?? [];
        const rawAuthors = (post.authors as Array<Record<string, unknown>>) ?? [];

        return {
            id: post.id as number,
            slug: post.slug as string,
            title: (post.title as { rendered: string }).rendered,
            excerpt: stripHtml((post.excerpt as { rendered: string }).rendered),
            content: (post.content as { rendered: string }).rendered,
            strapline: (acf.strapline as string) ?? undefined,
            source: (acf.source as string) ?? undefined,
            authors: rawAuthors.map((a) => ({
                displayName: a.display_name as string,
                slug: a.slug as string,
                avatarUrl: (a.avatar_url as string) ?? undefined,
            })),
            readTime:
                (acf.read_time as string) ??
                estimateReadTime((post.content as { rendered: string }).rendered),
            publishedAt: formatDate(post.date as string),
            publishedAtISO: post.date as string,
            featuredImage: pickWpImageUrl(media, HERO_SIZE_PRIORITY),
            imageCaption: (media?.caption as { rendered: string })?.rendered
                ? stripHtml((media.caption as { rendered: string }).rendered)
                : undefined,
            imageCredit: (acf.image_credit as string) ?? undefined,
            category: categoryTerms[0]
                ? {
                    name: categoryTerms[0].name as string,
                    slug: categoryTerms[0].slug as string,
                }
                : undefined,
            country:
                acf.country_name && acf.country_slug
                    ? {
                        name: acf.country_name as string,
                        slug: acf.country_slug as string,
                    }
                    : undefined,
            tags: tagTerms.map((t) => ({
                label: t.name as string,
                href: `/sujet/${t.slug as string}`,
            })),
            // IDs bruts pour les requêtes getReadMoreArticles
            tagIds: (post.tags as number[]) ?? [],
            categoryIds: (post.categories as number[]) ?? [],
        };
    } catch {
        return null;
    }
});

/**
 * Récupère des articles partageant les mêmes tags ou catégorie.
 * Utilisé à la fois pour les encarts "À lire aussi" et la grille "Sur le même sujet".
 *
 * Les deux fetches (tags puis catégorie) restent séquentiels par nécessité :
 * le second ne se déclenche QUE si le premier n'a pas donné assez de résultats.
 * Pour limiter l'impact, le fetch par tags est prioritaire et suffit dans la
 * majorité des cas (count=3 atteint dès le premier fetch si l'article a des tags).
 */
export async function getReadMoreArticles(
    currentId: number,
    tagIds: number[],
    categoryIds: number[],
    count = 3
): Promise<WpArticleCard[]> {
    const results: WpArticleCard[] = [];
    const seen = new Set<number>([currentId]);

    // 1. Par tags (plus précis)
    if (tagIds.length > 0) {
        try {
            const res = await fetch(
                `${WP_API}/posts?tags=${tagIds.join(",")}&exclude=${currentId}&per_page=${count}&_embed=1`,
                { next: { revalidate: 300 } }
            );
            if (res.ok) {
                const posts = (await res.json()) as Array<Record<string, unknown>>;
                for (const post of posts) {
                    if (results.length >= count) break;
                    if (!seen.has(post.id as number)) {
                        seen.add(post.id as number);
                        results.push(buildArticleCard(post));
                    }
                }
            }
        } catch { /* continue */ }
    }

    // 2. Compléter par catégorie si besoin
    if (results.length < count && categoryIds.length > 0) {
        try {
            const remaining = count - results.length;
            const excludeIds = [...seen].join(",");
            const res = await fetch(
                `${WP_API}/posts?categories=${categoryIds.join(",")}&exclude=${excludeIds}&per_page=${remaining}&_embed=1`,
                { next: { revalidate: 300 } }
            );
            if (res.ok) {
                const posts = (await res.json()) as Array<Record<string, unknown>>;
                for (const post of posts) {
                    if (results.length >= count) break;
                    if (!seen.has(post.id as number)) {
                        seen.add(post.id as number);
                        results.push(buildArticleCard(post));
                    }
                }
            }
        } catch { /* continue */ }
    }

    return results;
}

/**
 * Récupère les articles les plus lus pour la sidebar.
 */
export async function getMostReadArticles(count = 4): Promise<WpArticleCard[]> {
    try {
        const res = await fetch(
            `${WP_API}/posts?per_page=${count}&orderby=date&order=desc&_embed=1`,
            { next: { revalidate: 300 } }
        );
        if (!res.ok) return [];

        const posts = (await res.json()) as Array<Record<string, unknown>>;
        return posts.map(buildArticleCard);
    } catch {
        return [];
    }
}

/**
 * Récupère des articles liés (alias de getReadMoreArticles, conservé pour compatibilité).
 */
export async function getRelatedArticles(
    currentSlug: string,
    count = 3
): Promise<WpArticleCard[]> {
    try {
        const res = await fetch(
            `${WP_API}/posts?per_page=${count + 1}&_embed=1`,
            { next: { revalidate: 300 } }
        );
        if (!res.ok) return [];

        const posts = (await res.json()) as Array<Record<string, unknown>>;
        return posts
            .filter((p) => p.slug !== currentSlug)
            .slice(0, count)
            .map(buildArticleCard);
    } catch {
        return [];
    }
}