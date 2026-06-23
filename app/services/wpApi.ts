import { cache } from 'react';
import { type ArticleData }          from '../components/NewsZone/types';
import { type ArticleDataBanner }     from '../components/SiteBanner/types';
import { type GeneralNewsArticle }    from '../components/GeneralNews/types';
import { type EnvironmentArticle }    from '../components/Environmentzone/Types';
import { type AntiCorruptionArticle } from '../components/AntiCorruption/Types';
import { type OurImpactArticle }      from '../components/Impact/Types';
import {type StoriesArticle} from "../components/Stories/types";
import {type HumanRightsArticle} from "../components/HumanRights/Types";
import {CategoryArticle, CategoryData} from "@/app/components/Category/Types";
import {getCategoryConfig} from "@/app/components/Category/categoryConfig";


// ---------------------------------------------------------------------------
// Interfaces WordPress
// ---------------------------------------------------------------------------

interface WPPost {
    id: number;
    slug: string;
    link: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    featured_media: number;
    categories: number[];
    tags: number[];
    date: string;
    status?: string; // présent sur requêtes authentifiées ; absent en public (déjà filtré par WP)
}

interface WPMedia {
    id: number;
    source_url: string;
    media_details?: { width?: number; height?: number };
}

interface WPTerm {
    id: number;
    name: string;
}

interface WPCategoryWithCount extends WPTerm {
    slug: string;
    count: number;
}

export interface FooterCategory {
    id: number;
    label: string;
    href: string;
    ithal: string;
}

// ---------------------------------------------------------------------------
// Configuration centrale
// ---------------------------------------------------------------------------

const WP_BASE = 'https://thefourthestategh.com/wp-json/wp/v2';

/**
 * IDs de catégories WordPress.
 * Pour trouver un ID : GET /wp-json/wp/v2/categories?slug=<votre-slug>
 * Renseigner les valeurs null dès que les IDs sont connus.
 */
const CATEGORY_IDS = {
    politique:      3    as number,
    economie:       5    as number,
    generalNews:    109  as number,
    environment:    131  as number,
    antiCorruption: 111  as number,
    humanRight:     121  as number,
    ourImpact:      229  as number,
};

/**
 * Placeholder LQIP générique (SVG gris 640×426, base64).
 * Affiché immédiatement par Next.js <Image placeholder="blur"> avant le chargement.
 *
 * Pour un vrai blur par image (couleurs dominantes réelles) :
 *   npm install plaiceholder sharp
 * puis décommenter generateBlurDataURL ci-dessous et l'utiliser dans buildImage.
 */
const BLUR_PLACEHOLDER =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iNDI2Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNjYmQ1ZTEiIGZvbnQtc2l6ZT0iMjQiPuKWqTwvdGV4dD48L3N2Zz4=';

/*
 * import { getPlaiceholder } from 'plaiceholder';
 *
 * async function generateBlurDataURL(src: string): Promise<string> {
 *     try {
 *         const { base64 } = await getPlaiceholder(src, { size: 4 });
 *         return base64;
 *     } catch {
 *         return BLUR_PLACEHOLDER;
 *     }
 * }
 */

function buildHref(post: WPPost): string {
    return `/article/${post.slug}`;
}


// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function formatWpDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-EN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

function cleanHtmlTitle(title: string): string {
    if (typeof window === 'undefined') {
        return title
            .replace(/&#8217;/g, "'")
            .replace(/&#8220;/g, '\u201C')
            .replace(/&#8221;/g, '\u201D')
            .replace(/&amp;/g,   '&')
            .replace(/&#038;/g,  '&');
    }
    const doc = new DOMParser().parseFromString(title, 'text/html');
    return doc.body.textContent || title;
}

/**
 * fetchPriority selon la position dans la page :
 * - 0     → 'high'  (hero, au-dessus du fold)
 * - 1–2   → 'auto'  (souvent encore visible)
 * - 3+    → 'low'   (sous le fold, peut attendre)
 */
function imagePriority(index: number): 'high' | 'auto' | 'low' {
    if (index === 0) return 'high';
    if (index  < 3) return 'auto';
    return 'low';
}

// ---------------------------------------------------------------------------
// Helpers fetch groupés
// ---------------------------------------------------------------------------

async function fetchPosts(url: string, revalidate = 600): Promise<WPPost[]> {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return [];
    const posts: WPPost[] = await res.json();
    return posts.filter(p => !p.status || p.status === 'publish');
}

/**
 * Médias : UNE seule requête ?include=id1,id2,… au lieu d'une par image.
 * Réduit getFourthEstateArticles de ~15 requêtes à 1.
 */
async function fetchMediaBatch(mediaIds: number[], revalidate = 600): Promise<Map<number, WPMedia>> {
    const map = new Map<number, WPMedia>();
    if (!mediaIds.length) return map;
    const res = await fetch(
        `${WP_BASE}/media?include=${mediaIds.join(',')}&per_page=100`,
        { next: { revalidate } }
    );
    if (!res.ok) return map;
    const medias: WPMedia[] = await res.json();
    medias.forEach(m => map.set(m.id, m));
    return map;
}

async function fetchCategoryBatch(categoryIds: number[], revalidate = 600): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!categoryIds.length) return map;
    const res = await fetch(
        `${WP_BASE}/categories?include=${categoryIds.join(',')}&per_page=100`,
        { next: { revalidate } }
    );
    if (!res.ok) return map;
    const cats: WPTerm[] = await res.json();
    cats.forEach(c => map.set(c.id, c.name));
    return map;
}

async function fetchTagBatch(tagIds: number[], revalidate = 600): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!tagIds.length) return map;
    const res = await fetch(
        `${WP_BASE}/tags?include=${tagIds.join(',')}&per_page=100`,
        { next: { revalidate } }
    );
    if (!res.ok) return map;
    const tags: WPTerm[] = await res.json();
    tags.forEach(t => map.set(t.id, t.name));
    return map;
}

function extractIds(posts: WPPost[]) {
    return {
        mediaIds:    Array.from(new Set(posts.map(p => p.featured_media).filter(id => id > 0))),
        categoryIds: Array.from(new Set(posts.flatMap(p => p.categories).filter(id => id > 0))),
        tagIds:      Array.from(new Set(posts.flatMap(p => p.tags).filter(id => id > 0))),
    };
}

/**
 * Résout un ID de catégorie.
 * Si déjà connu dans CATEGORY_IDS : retour immédiat, zéro fetch.
 * Sinon : fetch mis en cache 1h.
 */
async function resolveCategoryId(knownId: number | null, slug: string): Promise<number | null> {
    if (knownId !== null) return knownId;
    const res = await fetch(`${WP_BASE}/categories?slug=${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const cats: WPTerm[] = await res.json();
    return cats[0]?.id ?? null;
}

/**
 * Construit l'objet image avec blurDataURL pour le placeholder immédiat.
 * blurDataURL est lu par Next.js <Image placeholder="blur">.
 */
function buildImage(media: WPMedia, index: number): NonNullable<ArticleData['image']> {
    return {
        src:           media.source_url,
        srcSet:        `${media.source_url} 2x`,
        width:         media.media_details?.width  ?? 640,
        height:        media.media_details?.height ?? 426,
        fetchPriority: imagePriority(index),
        blurDataURL:   BLUR_PLACEHOLDER,
    };
}

// ---------------------------------------------------------------------------
// getFourthEstateArticles
// ---------------------------------------------------------------------------

export async function getFourthEstateArticles(): Promise<{ zone1: ArticleData[]; zone2: ArticleData[] }> {
    try {
        const posts = await fetchPosts(`${WP_BASE}/posts?per_page=15&status=publish`);
        if (!posts.length) return { zone1: [], zone2: [] };

        const { mediaIds, categoryIds, tagIds } = extractIds(posts);

        const [mediaMap, categoryMap, tagMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
            fetchTagBatch(tagIds),
        ]);

        const mappedArticles: ArticleData[] = posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Investigation';
            if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) tagOrCategory = cat;
            }

            let section: ArticleData['section'] = 'societe';
            if (post.categories.includes(CATEGORY_IDS.politique)) section = 'politique';
            if (post.categories.includes(CATEGORY_IDS.economie))  section = 'economie';

            const article: ArticleData = {
                id:            `wp-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source:        'The Fourth Estate',
                section,
                model:         index === 0 ? 'article-vertical' : 'article',
                type:          index === 2 ? 'sirius-live' : 'article',
                index:         index + 1,
            };

            if (media) article.image = buildImage(media, index);

            return article;
        });

        return {
            zone1: mappedArticles.slice(0, 5),
            zone2: mappedArticles.slice(5, 11),
        };

    } catch (error) {
        console.error('Erreur wpApi [getFourthEstateArticles]:', error);
        return { zone1: [], zone2: [] };
    }
}

// ---------------------------------------------------------------------------
// getLatestBannerArticles
// ---------------------------------------------------------------------------

export async function getLatestBannerArticles(): Promise<ArticleDataBanner[]> {
    try {
        const posts = await fetchPosts(`${WP_BASE}/posts?per_page=4&status=publish`, 300);
        if (!posts.length) return [];

        const { categoryIds, tagIds } = extractIds(posts);

        const [categoryMap, tagMap] = await Promise.all([
            fetchCategoryBatch(categoryIds, 300),
            fetchTagBatch(tagIds, 300),
        ]);

        return posts.map((post, idx) => {
            let resolvedTag = 'Investigation';
            if (post.tags.length > 0) {
                const tag = tagMap.get(post.tags[0]);
                if (tag) resolvedTag = tag;
            } else if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) resolvedTag = cat;
            }

            return {
                id:            String(post.id),
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: resolvedTag,
                section:       'politique' as const,
                model:         'article'   as const,
                type:          'article'   as const,
                index:         idx,
                source:        formatWpDate(post.date),
            };
        });

    } catch (error) {
        console.error('Erreur wpApi [getLatestBannerArticles]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getGeneralNewsArticles
// ---------------------------------------------------------------------------

export async function getGeneralNewsArticles(perPage = 9): Promise<GeneralNewsArticle[]> {
    try {
        const posts = await fetchPosts(
            `${WP_BASE}/posts?per_page=${perPage}&categories=${CATEGORY_IDS.generalNews}&status=publish`
        );
        if (!posts.length) return [];

        const { mediaIds, categoryIds } = extractIds(posts);

        const [mediaMap, categoryMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
        ]);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'General News';
            if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) tagOrCategory = cat;
            }

            const article: GeneralNewsArticle = {
                id:            `gn-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source:        'The Fourth Estate',
                section:       'general-news',
                model:         'article-vertical',
                type:          'article',
                index:         index + 1,
            };

            if (media) article.image = buildImage(media, index);

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getGeneralNewsArticles]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getEnvironmentArticles
// ---------------------------------------------------------------------------

export async function getEnvironmentArticles(perPage = 6): Promise<EnvironmentArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.environment, 'environment');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=${perPage}&categories=${categoryId}&status=publish`
            : `${WP_BASE}/posts?per_page=${perPage}&status=publish`;

        const posts = await fetchPosts(url);
        if (!posts.length) return [];

        const { mediaIds, categoryIds } = extractIds(posts);

        const [mediaMap, categoryMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
        ]);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Environment';
            if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) tagOrCategory = cat;
            }

            const article: EnvironmentArticle = {
                id:            `env-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source:        'The Fourth Estate',
                section:       'environment',
                model:         'article-vertical',
                type:          'article',
                index:         index + 1,
            };

            if (media) article.image = buildImage(media, index);

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getEnvironmentArticles]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getAntiCorruptionArticles
// ---------------------------------------------------------------------------

export async function getAntiCorruptionArticles(): Promise<AntiCorruptionArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.antiCorruption, 'anti-corruption');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=5&categories=${categoryId}&status=publish`
            : `${WP_BASE}/posts?per_page=5&status=publish`;

        const posts = await fetchPosts(url);
        if (!posts.length) return [];

        const { mediaIds, categoryIds } = extractIds(posts);

        const [mediaMap, categoryMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
        ]);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Anti-Corruption';
            if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) tagOrCategory = cat;
            }

            const article: AntiCorruptionArticle = {
                id:            `ac-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source:        'The Fourth Estate',
                section:       'anti-corruption',
                model:         index === 0 ? 'article-vertical' : 'article',
                type:          'article',
                index:         index + 1,
            };

            if (media) article.image = buildImage(media, index);

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getAntiCorruptionArticles]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getHumanRightArticles
// ---------------------------------------------------------------------------

export async function getHumanRightArticles(): Promise<HumanRightsArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.humanRight, 'human-right');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=5&categories=${categoryId}&status=publish`
            : `${WP_BASE}/posts?per_page=5&status=publish`;

        const posts = await fetchPosts(url);
        if (!posts.length) return [];

        const { mediaIds, categoryIds } = extractIds(posts);

        const [mediaMap, categoryMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
        ]);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Human-Right';
            if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) tagOrCategory = cat;
            }

            const article: HumanRightsArticle = {
                id:            `hr-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source:        'The Fourth Estate',
                section:       'human-right',
                model:         index === 0 ? 'article-vertical' : 'article',
                type:          'article',
                index:         index + 1,
            };

            if (media) article.image = buildImage(media, index);

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getHumanRightArticles]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getOurImpactArticles  (pas d'images dans cette zone)
// ---------------------------------------------------------------------------

export async function getOurImpactArticles(): Promise<OurImpactArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.ourImpact, 'our-impact');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=6&categories=${categoryId}&status=publish`
            : `${WP_BASE}/posts?per_page=6&status=publish`;

        const posts = await fetchPosts(url);
        if (!posts.length) return [];

        const { categoryIds } = extractIds(posts);
        const categoryMap = await fetchCategoryBatch(categoryIds);

        return posts.map((post, index) => {
            let tagOrCategory = 'Our Impact';
            if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) tagOrCategory = cat;
            }

            return {
                id:            `oi-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                section:       'our-impact' as const,
                model:         'article'    as const,
                type:          'default'    as const,
                index:         index + 1,
            };
        });

    } catch (error) {
        console.error('Erreur wpApi [getOurImpactArticles]:', error);
        return [];
    }
}

export async function getStoriesArticles(perPage: number = 6): Promise<StoriesArticle[]> {
    try {
        // Recherche par mot-clé "video" — équivalent de /?s=video
        // Utilise fetchPosts() comme toutes les autres fonctions : applique déjà
        // le filtre défensif status=publish, donc plus besoin de le refaire ici.
        const posts = await fetchPosts(
            `${WP_BASE}/posts?search=video&per_page=${perPage}&status=publish`,
            600
        );
        if (!posts.length) return [];

        // Médias et catégories récupérés en 2 requêtes groupées au lieu de N+1
        // (alignement sur fetchMediaBatch/fetchCategoryBatch utilisés partout ailleurs).
        const { mediaIds, categoryIds } = extractIds(posts);

        const [mediaMap, categoryMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
        ]);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Stories';
            if (post.categories.length > 0) {
                const firstCat = categoryMap.get(post.categories[0]);
                if (firstCat) tagOrCategory = firstCat;
            }

            const article: StoriesArticle = {
                id: `stories-post-${post.id}`,
                href: buildHref(post),
                title: cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                section: 'stories',
                // Alterne story / story light comme dans le HTML de référence (index pair = light)
                model: index % 2 === 0 ? 'story' : 'story light',
                type: 'stories',
                index: index + 1,
            };

            if (media) {
                article.image = {
                    src: media.source_url,
                    // Dimensions portrait — format Stories
                    width: media.media_details?.width ?? 640,
                    height: media.media_details?.height ?? 1138,
                    fetchPriority: index === 0 ? 'high' : 'auto',
                    blurDataURL: BLUR_PLACEHOLDER,
                };
            }

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getStoriesArticles]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getTopCategories
// ---------------------------------------------------------------------------

/**
 * Retourne les catégories ayant le plus d'articles publiés (champ `count`
 * natif de l'API WP, déjà calculé côté serveur — aucun scan de posts requis).
 * `hide_empty=true` exclut les catégories vides ; `orderby=count&order=desc`
 * trie par popularité décroissante.
 */
export async function getTopCategories(limit = 10): Promise<FooterCategory[]> {
    try {
        const res = await fetch(
            `${WP_BASE}/categories?orderby=count&order=desc&hide_empty=true&per_page=${limit}`,
            { next: { revalidate: 3600 } }
        );
        if (!res.ok) return [];

        const cats: WPCategoryWithCount[] = await res.json();

        return cats.map(cat => ({
            id:    cat.id,
            label: cat.name,
            href:  `/category/${cat.slug}`,
            ithal: cat.slug,
        }));

    } catch (error) {
        console.error('Erreur wpApi [getTopCategories]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getCategoryPageData
//
// Optimisations perf (alignées sur celles déjà faites pour getArticleBySlug,
// la page article) :
//
// 1. React.cache() — generateMetadata() ET la page elle-même appellent
//    getCategoryPageData(slug, page) durant le même rendu serveur. Sans
//    cache(), ça déclenchait TOUS les fetches internes deux fois par
//    chargement de page (resolveCategory + posts + médias + catégories =
//    jusqu'à 5 requêtes WordPress en double). Avec cache(), le second appel
//    avec les mêmes arguments lit le résultat déjà résolu en mémoire.
//
// 2. Fetch redondant supprimé — l'ancienne version refaisait un fetch séparé
//    vers /categories/{id} (getCategoryDisplayName) uniquement pour .name,
//    alors que resolveCategory récupère déjà l'objet catégorie complet
//    (id + name + slug) en un seul appel. getCategoryDisplayName retirée.
//
// 3. revalidate du fetch posts passé de 300s à 600s, cohérent avec
//    getArticleBySlug (contenu éditorial change rarement après publication).
// ---------------------------------------------------------------------------

interface WPCategoryResolved {
    id: number;
    name: string;
    slug: string;
}

/**
 * Résout un slug en objet catégorie complet (id + name + slug) en un seul
 * fetch — remplace l'usage de resolveCategoryId pour la page catégorie,
 * qui ne retournait que l'id et forçait un second fetch ailleurs pour le nom.
 * Mise en cache 1h.
 */
async function resolveCategory(slug: string): Promise<WPCategoryResolved | null> {
    const res = await fetch(`${WP_BASE}/categories?slug=${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const cats: WPCategoryResolved[] = await res.json();
    return cats[0] ?? null;
}

const CATEGORY_PER_PAGE = 13;

export const getCategoryPageData = cache(async (
    slug: string,
    page: number = 1
): Promise<CategoryData | null> => {
    const category = await resolveCategory(slug);
    if (!category) return null;

    const config = getCategoryConfig(slug);
    // category.name déjà disponible ici — plus besoin d'un 2e fetch pour l'avoir.
    const title = config.title ?? category.name;

    const url =
        `${WP_BASE}/posts` +
        `?categories=${category.id}` +
        `&page=${page}` +
        `&per_page=${CATEGORY_PER_PAGE}` +
        `&status=publish` +
        `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link`;

    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
        if (res.status === 400) {
            // Page hors limites -> WP renvoie 400 au-delà de la dernière page.
            return {
                title,
                slug,
                seoDescription: config.seoDescription,
                tags: config.tags ?? [],
                articles: [],
                pagination: { currentPage: page, totalPages: 0, basePath: `/category/${slug}` },
            };
        }
        console.error(`Erreur wpApi [getCategoryPageData]: ${res.status}`);
        return null;
    }

    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
    const rawPosts: WPPost[] = await res.json();

    // Exclut les contenus "stories"/vidéo de cette liste (décision produit).
    const posts = rawPosts.filter((p) => (p as WPPost & { format?: string }).format !== 'video');
    if (!posts.length) {
        return {
            title,
            slug,
            seoDescription: config.seoDescription,
            tags: config.tags ?? [],
            articles: [],
            pagination: { currentPage: page, totalPages, basePath: `/category/${slug}` },
        };
    }

    const { mediaIds, categoryIds } = extractIds(posts);
    const [mediaMap, categoryMap] = await Promise.all([
        fetchMediaBatch(mediaIds),
        fetchCategoryBatch(categoryIds),
    ]);

    const articles: CategoryArticle[] = posts.map((post, index) => {
        const media = mediaMap.get(post.featured_media);

        let source = 'The Fourth Estate';
        if (post.categories.length > 0) {
            const cat = categoryMap.get(post.categories[0]);
            if (cat) source = cat;
        }

        const article: CategoryArticle = {
            id: `post-${post.id}`,
            href: buildHref(post),
            title: cleanHtmlTitle(post.title.rendered),
            source,
            publishedAt: formatWpDate(post.date),
            imagePriority: imagePriority(index),
        };

        if (media) article.image = buildImage(media, index);

        return article;
    });

    return {
        title,
        slug,
        seoDescription: config.seoDescription,
        tags: config.tags ?? [],
        articles,
        pagination: {
            currentPage: page,
            totalPages,
            basePath: `/category/${slug}`,
        },
    };
});

// ---------------------------------------------------------------------------
// getBannerCategories — à coller dans wpApi.ts
//
// Résout une liste ORDONNÉE de slugs (BANNER_CATEGORY_SLUGS) en vraies
// catégories WordPress (nom + slug + lien /category/{slug}). Contrairement à
// getTopCategories (tri par popularité), ici l'ordre et la sélection sont
// pilotés manuellement par bannerCategorySlugs.ts — pas de tri serveur WP.
//
// Une seule requête groupée (slug=a,b,c) plutôt que N requêtes individuelles,
// puis remappage dans l'ordre d'entrée (WP ne garantit pas l'ordre en sortie
// quand on filtre par plusieurs slugs à la fois).
// ---------------------------------------------------------------------------

export interface BannerCategory {
    label: string;
    href: string;
    slug: string;
}

export async function getBannerCategories(slugs: string[]): Promise<BannerCategory[]> {
    if (!slugs.length) return [];

    try {
        const res = await fetch(
            `${WP_BASE}/categories?slug=${slugs.join(',')}&per_page=${slugs.length}`,
            { next: { revalidate: 3600 } }
        );
        if (!res.ok) return [];

        const cats: WPCategoryWithCount[] = await res.json();
        const bySlug = new Map(cats.map((c) => [c.slug, c]));

        // Remappage dans l'ordre de bannerCategorySlugs.ts ; les slugs introuvables
        // côté WP (catégorie pas encore créée, faute de frappe…) sont silencieusement
        // omis plutôt que de casser le rendu du banner.
        return slugs
            .map((slug) => {
                const cat = bySlug.get(slug);
                if (!cat) return null;
                return {
                    label: cat.name,
                    href: `/category/${cat.slug}`,
                    slug: cat.slug,
                };
            })
            .filter((c): c is BannerCategory => c !== null);

    } catch (error) {
        console.error('Erreur wpApi [getBannerCategories]:', error);
        return [];
    }
}