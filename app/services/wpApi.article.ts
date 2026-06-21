import { cache } from "react";

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
    featuredImage?: string;
    imageCaption?: string;
    imageCredit?: string;
    category?: { name: string; slug: string };
    country?: { name: string; slug: string };
    tags: Array<{ label: string; href: string }>;
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

// Interfaces internes pour le mapping WP natif (sans _embed)
interface WPPostRaw {
    id: number;
    slug: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    date: string;
    featured_media: number;
    categories: number[];
    tags: number[];
    author: number; // ID de l'auteur uniquement
    acf?: Record<string, any>;
}

interface WPTerm { id: number; name: string; slug: string; }
interface WPMedia { id: number; source_url: string; caption?: { rendered: string }; }
interface WPUser { id: number; name: string; slug: string; avatar_urls?: Record<string, string>; }

// ─── Config ───────────────────────────────────────────────────────────────────

const WP_API = process.env.NEXT_PUBLIC_WP_API_URL ?? "https://thefourthestategh.com/wp-json/wp/v2";

// ─── Helpers Privés de Batching (Ultra Rapides) ───────────────────────────────

async function fetchMediaBatch(ids: number[]): Promise<Map<number, WPMedia>> {
    const map = new Map<number, WPMedia>();
    // On ne garde que les ID strictement supérieurs à 0
    const cleanIds = Array.from(new Set(ids.filter(id => id && id > 0)));

    // SÉCURITÉ CRITIQUE : Si aucun ID valide, on ne contacte JAMAIS WordPress
    if (cleanIds.length === 0) return map;

    try {
        const res = await fetch(`${WP_API}/media?include=${cleanIds.join(",")}&per_page=100`, { next: { revalidate: 600 } });
        if (res.ok) {
            const medias: WPMedia[] = await res.json();
            if (Array.isArray(medias)) {
                medias.forEach(m => map.set(m.id, m));
            }
        }
    } catch {}
    return map;
}

async function fetchCategoryBatch(ids: number[]): Promise<Map<number, WPTerm>> {
    const map = new Map<number, WPTerm>();
    const cleanIds = Array.from(new Set(ids.filter(id => id && id > 0)));

    if (cleanIds.length === 0) return map; // SÉCURITÉ CRITIQUE

    try {
        const res = await fetch(`${WP_API}/categories?include=${cleanIds.join(",")}&per_page=100`, { next: { revalidate: 3600 } });
        if (res.ok) {
            const cats: WPTerm[] = await res.json();
            if (Array.isArray(cats)) {
                cats.forEach(c => map.set(c.id, c));
            }
        }
    } catch {}
    return map;
}

async function fetchTagBatch(ids: number[]): Promise<Map<number, WPTerm>> {
    const map = new Map<number, WPTerm>();
    const cleanIds = Array.from(new Set(ids.filter(id => id && id > 0)));

    if (cleanIds.length === 0) return map; // SÉCURITÉ CRITIQUE

    try {
        const res = await fetch(`${WP_API}/tags?include=${cleanIds.join(",")}&per_page=100`, { next: { revalidate: 3600 } });
        if (res.ok) {
            const tags: WPTerm[] = await res.json();
            if (Array.isArray(tags)) {
                tags.forEach(t => map.set(t.id, t));
            }
        }
    } catch {}
    return map;
}

async function fetchUsersBatch(ids: number[]): Promise<Map<number, WPUser>> {
    const map = new Map<number, WPUser>();
    const cleanIds = Array.from(new Set(ids.filter(id => id && id > 0)));

    if (cleanIds.length === 0) return map; // SÉCURITÉ CRITIQUE

    try {
        const res = await fetch(`${WP_API}/users?include=${cleanIds.join(",")}&per_page=100`, { next: { revalidate: 3600 } });
        if (res.ok) {
            const users: WPUser[] = await res.json();
            if (Array.isArray(users)) {
                users.forEach(u => map.set(u.id, u));
            }
        }
    } catch {}
    return map;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").trim();
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function estimateReadTime(htmlContent: string): string {
    const words = htmlContent.replace(/<[^>]+>/g, "").split(/\s+/).length;
    return `Reading time ${Math.max(1, Math.round(words / 200))} min.`;
}

// ─── Exports Publics Optimisés ───────────────────────────────────────────────

/**
 * Récupère un article complet par son slug sans encombrer l'API WordPress avec _embed
 */
export const getArticleBySlug = cache(async (slug: string): Promise<WpArticle | null> => {
    try {
        // Étape 1 : Requête brute ultra légère sans _embed
        const res = await fetch(`${WP_API}/posts?slug=${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
        if (!res.ok) return null;

        const posts = (await res.json()) as WPPostRaw[];
        if (!posts.length) return null;
        const post = posts[0];

        // Étape 2 : Lancement des requêtes secondaires ciblées en parallèle
        const [mediaMap, catMap, tagMap, userMap] = await Promise.all([
            fetchMediaBatch([post.featured_media]),
            fetchCategoryBatch(post.categories),
            fetchTagBatch(post.tags),
            fetchUsersBatch([post.author])
        ]);

        const acf = post.acf ?? {};
        const media = mediaMap.get(post.featured_media);
        const authorRaw = userMap.get(post.author);

        // Construction des auteurs
        const authors: WpArticleAuthor[] = authorRaw ? [{
            displayName: authorRaw.name,
            slug: authorRaw.slug,
            avatarUrl: authorRaw.avatar_urls?.[ "96" ] ?? undefined
        }] : [];

        // Traitement de la catégorie principale
        const mainCat = post.categories[0] ? catMap.get(post.categories[0]) : undefined;

        return {
            id: post.id,
            slug: post.slug,
            title: post.title.rendered,
            excerpt: stripHtml(post.excerpt.rendered),
            content: post.content.rendered,
            strapline: acf.strapline ?? undefined,
            source: acf.source ?? undefined,
            authors,
            readTime: acf.read_time ?? estimateReadTime(post.content.rendered),
            publishedAt: formatDate(post.date),
            featuredImage: media?.source_url ?? undefined,
            imageCaption: media?.caption?.rendered ? stripHtml(media.caption.rendered) : undefined,
            imageCredit: acf.image_credit ?? undefined,
            category: mainCat ? { name: mainCat.name, slug: mainCat.slug } : undefined,
            country: acf.country_name && acf.country_slug ? { name: acf.country_name, slug: acf.country_slug } : undefined,
            tags: post.tags.map(id => {
                const t = tagMap.get(id);
                return t ? { label: t.name, href: `/sujet/${t.slug}` } : null;
            }).filter((t): t is { label: string; href: string } => t !== null),
            tagIds: post.tags,
            categoryIds: post.categories,
        };
    } catch {
        return null;
    }
});

/**
 * Construit un lot de cartes à partir de posts bruts en résolvant les dépendances d'un seul coup
 */
async function processArticleCards(posts: WPPostRaw[]): Promise<WpArticleCard[]> {
    if (!posts.length) return [];

    const mediaIds = posts.map(p => p.featured_media);
    const catIds = posts.flatMap(p => p.categories);

    const [mediaMap, catMap] = await Promise.all([
        fetchMediaBatch(mediaIds),
        fetchCategoryBatch(catIds)
    ]);

    return posts.map(post => {
        const acf = post.acf ?? {};
        const media = mediaMap.get(post.featured_media);
        const mainCat = post.categories[0] ? catMap.get(post.categories[0]) : undefined;

        return {
            id: post.id,
            slug: post.slug,
            title: post.title.rendered,
            href: `/article/${post.slug}`,
            image: media?.source_url ?? undefined,
            strapline: acf.strapline ?? undefined,
            isPremium: acf.is_premium ?? false,
            category: mainCat?.name ?? undefined,
        };
    });
}

/**
 * Récupère des articles partageant les mêmes tags ou catégorie (Optimisé sans _embed)
 */
export async function getReadMoreArticles(
    currentId: number,
    tagIds: number[],
    categoryIds: number[],
    count = 3
): Promise<WpArticleCard[]> {
    let rawPosts: WPPostRaw[] = [];
    const seen = new Set<number>([currentId]);

    // 1. Essai par tags
    if (tagIds.length > 0) {
        try {
            const res = await fetch(`${WP_API}/posts?tags=${tagIds.join(",")}&exclude=${currentId}&per_page=${count}`, { next: { revalidate: 300 } });
            if (res.ok) {
                const posts = (await res.json()) as WPPostRaw[];
                posts.forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); rawPosts.push(p); } });
            }
        } catch {}
    }

    // 2. Compléter par catégorie si nécessaire
    if (rawPosts.length < count && categoryIds.length > 0) {
        try {
            const remaining = count - rawPosts.length;
            const excludeIds = [...seen].join(",");
            const res = await fetch(`${WP_API}/posts?categories=${categoryIds.join(",")}&exclude=${excludeIds}&per_page=${remaining}`, { next: { revalidate: 300 } });
            if (res.ok) {
                const posts = (await res.json()) as WPPostRaw[];
                posts.forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); rawPosts.push(p); } });
            }
        } catch {}
    }

    return processArticleCards(rawPosts);
}

/**
 * Les plus lus (Optimisé sans _embed)
 */
export async function getMostReadArticles(count = 4): Promise<WpArticleCard[]> {
    try {
        const res = await fetch(`${WP_API}/posts?per_page=${count}&orderby=date&order=desc`, { next: { revalidate: 300 } });
        if (!res.ok) return [];
        const posts = (await res.json()) as WPPostRaw[];
        return processArticleCards(posts);
    } catch {
        return [];
    }
}

/**
 * Articles liés (Optimisé sans _embed)
 */
export async function getRelatedArticles(currentSlug: string, count = 3): Promise<WpArticleCard[]> {
    try {
        const res = await fetch(`${WP_API}/posts?per_page=${count + 1}`, { next: { revalidate: 300 } });
        if (!res.ok) return [];
        const posts = (await res.json()) as WPPostRaw[];
        const filtered = posts.filter(p => p.slug !== currentSlug).slice(0, count);
        return processArticleCards(filtered);
    } catch {
        return [];
    }
}