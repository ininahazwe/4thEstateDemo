import { cache } from 'react';
import { type ArticleData }          from '../components/NewsZone/types';
import { type ArticleDataBanner }     from '../components/SiteBanner/types';
import { type GeneralNewsArticle }    from '../components/GeneralNews/types';
import { type EnvironmentArticle }    from '../components/Environmentzone/Types';
import { type AntiCorruptionArticle } from '../components/AntiCorruption/Types';
import { type OurImpactArticle }      from '../components/Impact/Types';
import {type StoriesArticle} from "../components/Stories/types";
import {type HumanRightsArticle} from "../components/HumanRights/Types";
import {type HealthArticle} from "../components/Health/Types";
import {CategoryArticle, CategoryData, CategoryTag} from "@/app/components/Category/Types";
import {getCategoryConfig} from "@/app/components/Category/categoryConfig";
import { decode } from 'html-entities';

// ---------------------------------------------------------------------------
// Interfaces WordPress
// ---------------------------------------------------------------------------

export interface WPPost {
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
    'impact-category'?: number[]; // taxonomie custom, rest_base = "impact-category"
}
interface WPMediaSize {
    source_url: string;
    width: number;
    height: number;
}

interface WPMedia {
    id: number;
    source_url: string;
    media_details?: {
        width?: number;
        height?: number;
        sizes?: Record<string, WPMediaSize>;
    };
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

// Lit NEXT_PUBLIC_WP_API_URL comme tous les autres services (wpApi.article,
// .search, .archives, .highlight…). Le fallback ne sert qu'au dev local sans
// .env : en production la variable DOIT être fournie au build (les
// NEXT_PUBLIC_* sont inlinées à la compilation, pas lues au runtime).
const WP_BASE =
    process.env.NEXT_PUBLIC_WP_API_URL || 'https://cms.thefourthestategh.com/wp-json/wp/v2';

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
    // Vérifié le 2026-08-11 : GET /wp-json/wp/v2/categories?slug=health → id 105.
    health:         105  as number,
    // Catégorie WP standard depuis le 19/08/2026 : la zone "Our Impact" de la
    // home et la page /category/our-impact lisent cette catégorie, plus la
    // taxonomie custom "impact-category".
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

export function buildHref(post: WPPost): string {
    const date = new Date(post.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `/${year}/${month}/${post.slug}`;
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
    return decode(title).replace(/<[^>]*>/g, '').trim();
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
/**
 * Fragment `&exclude=` a coller a une requete /posts.
 *
 * Sert a retirer des zones de la home les articles deja affiches ailleurs
 * (typiquement les 3 du Hero, cf. getSpotlightIds). Filtre cote WP et non
 * cote JS : `per_page` reste respecte, donc une zone de 5 affiche toujours
 * 5 articles au lieu de 5 moins les doublons.
 */
function excludeParam(exclude?: number[]): string {
    if (!exclude?.length) return '';
    return `&exclude=${exclude.join(',')}`;
}

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
    cats.forEach(c => map.set(c.id, decode(c.name)));
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
    tags.forEach(t => map.set(t.id, decode(t.name)));
    return map;
}

// fetchImpactCategoryBatch / getImpactCategoryIds ont été retirés le 19/08/2026 :
// plus aucun appelant depuis que la home et /category/our-impact lisent la
// catégorie WP 229. La taxonomie custom "impact-category" reste servie par les
// pages /impact-category/[slug], qui ont leurs propres helpers plus bas
// (getImpactCategorySlugMap / resolveImpactCategory).

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
 * Contextes d'usage des images dans le site — déterminent quelle taille
 * WordPress demander plutôt que de toujours télécharger le full-size.
 *
 * - 'hero'  : image principale d'article, ~3/4 largeur écran desktop
 * - 'card'  : cartes de zones homepage / catégorie (grille 2-3 colonnes)
 * - 'thumb' : petites vignettes (avatars, listes compactes)
 */
type ImageContext = 'hero' | 'card' | 'thumb';

/**
 * Ordre de préférence des tailles WP par contexte. La première taille
 * disponible dans media_details.sizes est utilisée ; fallback sur
 * source_url (full-size) si aucune des tailles candidates n'existe
 * (rare : image très petite à l'origine, WP ne génère pas de plus grand).
 *
 * Tailles WP confirmées sur l'install (thème Foxiz) : thumbnail (150),
 * medium (300), medium_large (768), large (1024), 1536x1536, 2048x2048, full.
 * Les tailles foxiz_crop_* sont des CROPS à ratio fixe — jamais utilisées
 * ici, on veut garder le ratio original de l'image.
 */
const IMAGE_SIZE_PRIORITY: Record<ImageContext, string[]> = {
    hero:  ['large', 'medium_large', '1536x1536'],
    card:  ['medium_large', 'large', 'medium'],
    thumb: ['medium', 'thumbnail', 'medium_large'],
};

/**
 * Choisit l'URL de la taille WP la plus adaptée au contexte d'affichage,
 * au lieu de toujours servir le full-size (souvent 2000px+, jusqu'à 4 Mo).
 */
function pickImageUrl(media: WPMedia, context: ImageContext): string {
    const sizes = media.media_details?.sizes;
    if (!sizes) return media.source_url;

    for (const sizeName of IMAGE_SIZE_PRIORITY[context]) {
        const candidate = sizes[sizeName];
        if (candidate?.source_url) return candidate.source_url;
    }
    return media.source_url;
}

/**
 * Choisit les dimensions (width/height) correspondant à la taille réellement
 * servie — important pour que Next.js <Image> calcule le bon ratio et évite
 * un layout shift (les dimensions de la taille choisie diffèrent de celles
 * du full-size dans media_details.width/height).
 */
function pickImageDimensions(
    media: WPMedia,
    context: ImageContext
): { width: number; height: number } {
    const sizes = media.media_details?.sizes;
    if (sizes) {
        for (const sizeName of IMAGE_SIZE_PRIORITY[context]) {
            const candidate = sizes[sizeName];
            if (candidate) return { width: candidate.width, height: candidate.height };
        }
    }
    return {
        width:  media.media_details?.width  ?? 640,
        height: media.media_details?.height ?? 426,
    };
}

/**
 * Construit l'objet image avec blurDataURL pour le placeholder immédiat.
 * blurDataURL est lu par Next.js <Image placeholder="blur">.
 *
 * context détermine quelle taille WP est demandée plutôt que le full-size
 * (jusqu'à 2500px / 4 Mo) — 'card' par défaut pour ne pas changer le
 * comportement des appels existants ; passer 'hero' explicitement pour
 * les images pleine largeur (~3/4 écran).
 *
 * srcSet retiré : vestige incohérent avec la règle du projet
 * (Next.js <Image> gère lui-même le srcSet, ne jamais le passer en prop).
 */
function buildImage(
    media: WPMedia,
    index: number,
    context: ImageContext = 'card'
): NonNullable<ArticleData['image']> {
    const { width, height } = pickImageDimensions(media, context);
    return {
        src: pickImageUrl(media, context),
        width,
        height,
        fetchPriority: imagePriority(index),
        blurDataURL: BLUR_PLACEHOLDER,
        srcSet: '',
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
                publishedAtISO: post.date,
            };

            if (media) article.image = buildImage(media, index);

            return article;
        });

        return {
            zone1: mappedArticles.slice(0, 3),
            zone2: mappedArticles.slice(3, 9),
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

export async function getGeneralNewsArticles(perPage = 9, exclude?: number[]): Promise<GeneralNewsArticle[]> {
    try {
        const posts = await fetchPosts(
            `${WP_BASE}/posts?per_page=${perPage}&categories=${CATEGORY_IDS.generalNews}&status=publish${excludeParam(exclude)}`
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

export async function getEnvironmentArticles(perPage = 6, exclude?: number[]): Promise<EnvironmentArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.environment, 'environment');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=${perPage}&categories=${categoryId}&status=publish${excludeParam(exclude)}`
            : `${WP_BASE}/posts?per_page=${perPage}&status=publish${excludeParam(exclude)}`;

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

export async function getAntiCorruptionArticles(exclude?: number[]): Promise<AntiCorruptionArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.antiCorruption, 'anti-corruption');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=5&categories=${categoryId}&status=publish${excludeParam(exclude)}`
            : `${WP_BASE}/posts?per_page=5&status=publish${excludeParam(exclude)}`;

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

export async function getHumanRightArticles(exclude?: number[]): Promise<HumanRightsArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.humanRight, 'human-right');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=5&categories=${categoryId}&status=publish${excludeParam(exclude)}`
            : `${WP_BASE}/posts?per_page=5&status=publish${excludeParam(exclude)}`;

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
// getHealthArticles
// ---------------------------------------------------------------------------
// Calqué sur getHumanRightArticles : même forme de retour, même découpage
// [1, 2, 2] côté composant. Seules changent la catégorie visée et l'étiquette
// de repli.
// ---------------------------------------------------------------------------

export async function getHealthArticles(exclude?: number[]): Promise<HealthArticle[]> {
    try {
        const categoryId = await resolveCategoryId(CATEGORY_IDS.health, 'health');
        const url = categoryId
            ? `${WP_BASE}/posts?per_page=5&categories=${categoryId}&status=publish${excludeParam(exclude)}`
            : `${WP_BASE}/posts?per_page=5&status=publish${excludeParam(exclude)}`;

        const posts = await fetchPosts(url);
        if (!posts.length) return [];

        const { mediaIds, categoryIds } = extractIds(posts);

        const [mediaMap, categoryMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
        ]);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Health';
            if (post.categories.length > 0) {
                const cat = categoryMap.get(post.categories[0]);
                if (cat) tagOrCategory = cat;
            }

            const article: HealthArticle = {
                id:            `health-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source:        'The Fourth Estate',
                section:       'health',
                model:         index === 0 ? 'article-vertical' : 'article',
                type:          'article',
                index:         index + 1,
            };

            if (media) article.image = buildImage(media, index);

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getHealthArticles]:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// getOurImpactArticles  (pas d'images dans cette zone)
// ---------------------------------------------------------------------------

export async function getOurImpactArticles(exclude?: number[]): Promise<OurImpactArticle[]> {
    try {
        // Catégorie WP "our-impact" (id 229), comme les autres zones de la home
        // (cf. getHealthArticles). La taxonomie custom "impact-category" n'est
        // plus lue ici : la zone et la page /category/our-impact doivent montrer
        // le même contenu, sinon un clic sur "Our Impact" affiche autre chose.
        const categoryId = await resolveCategoryId(CATEGORY_IDS.ourImpact, 'our-impact');
        // Pas de repli sur "tous les derniers posts du site" : mieux vaut une
        // zone absente qu'une zone qui étiquette "Our Impact" du contenu qui ne
        // l'est pas. Le composant renvoie null sur une liste vide.
        if (!categoryId) return [];

        const posts = await fetchPosts(
            `${WP_BASE}/posts?per_page=6&categories=${categoryId}&status=publish${excludeParam(exclude)}`
        );
        if (!posts.length) return [];

        const { mediaIds, categoryIds } = extractIds(posts);
        const [mediaMap, categoryMap] = await Promise.all([
            fetchMediaBatch(mediaIds),
            fetchCategoryBatch(categoryIds),
        ]);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            // Étiquette = catégorie thématique du post (Anti-Corruption,
            // Environment…), en ignorant "our-impact" lui-même : afficher six
            // fois "Our Impact" sous le titre "Our Impact" n'apporte rien.
            // Repli sur "Our Impact" si le post n'a pas d'autre catégorie.
            const otherId = post.categories.find((id) => id !== categoryId);
            const tagOrCategory =
                (otherId !== undefined ? categoryMap.get(otherId) : undefined) ?? 'Our Impact';

            const article: OurImpactArticle = {
                id:            `oi-post-${post.id}`,
                href:          buildHref(post),
                title:         cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                section:       'our-impact' as const,
                model:         'article'    as const,
                type:          'default'    as const,
                index:         index + 1,
            };

            // Contexte 'thumb' et non 'card' : la vignette est affichee a 96px
            // de cote, demander `medium_large` (768px) serait du gaspillage.
            if (media) article.image = buildImage(media, index, 'thumb');

            return article;
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
                const { width, height } = pickImageDimensions(media, 'card');
                article.image = {
                    src: pickImageUrl(media, 'card'),
                    // Dimensions portrait — format Stories (fallback si la taille
                    // choisie n'a pas de media_details, cas très rare)
                    width: media.media_details?.sizes ? width : 640,
                    height: media.media_details?.sizes ? height : 1138,
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
        // +1 : compense le filtre "uncategorized" ci-dessous pour garder
        // exactement `limit` catégories affichables, pas limit-1.
        const res = await fetch(
            `${WP_BASE}/categories?orderby=count&order=desc&hide_empty=true&per_page=${limit + 1}`,
            { next: { revalidate: 3600 } }
        );
        if (!res.ok) return [];

        const cats: WPCategoryWithCount[] = await res.json();

        return cats
            .filter(cat => cat.slug !== 'uncategorized')
            .slice(0, limit)
            .map(cat => ({
                id:    cat.id,
                label: decode(cat.name),
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
    const cat = cats[0];
    return cat ? { ...cat, name: decode(cat.name) } : null;
}

/**
 * Map slug -> {id, name} de TOUTES les catégories, en UNE seule requête mise
 * en cache 24h et partagée par toutes les pages catégorie (React cache() +
 * data cache Next). Remplace resolveCategory (1 fetch PAR slug, cache 1h) :
 * une seule entrée de cache réchauffée au build par generateStaticParams,
 * réutilisée pour toutes les catégories → l'étape "slug → id" sort du chemin
 * critique côté utilisateur (elle tourne au build/revalidation, pas à chaque
 * requête). resolveCategory reste en fallback pour un slug absent du map
 * (catégorie créée entre deux revalidations).
 */
export const getCategorySlugMap = cache(async (): Promise<Map<string, { id: number; name: string }>> => {
    const map = new Map<string, { id: number; name: string }>();
    const res = await fetch(
        `${WP_BASE}/categories?per_page=100&hide_empty=true&_fields=id,slug,name`,
        { next: { revalidate: 86400 } }
    );
    if (!res.ok) return map;
    const cats: Array<{ id: number; slug: string; name: string }> = await res.json();
    cats.forEach((c) => map.set(c.slug, { id: c.id, name: decode(c.name) }));
    return map;
});

/**
 * Liste des slugs de catégories pour generateStaticParams (prébuild ISR).
 */
export async function getAllCategorySlugs(): Promise<string[]> {
    const map = await getCategorySlugMap();
    return Array.from(map.keys());
}

const CATEGORY_PER_PAGE = 13;

/**
 * Les listes "river" (catégorie, tag, impact-category) n'affichent pas les
 * contenus vidéo — décision produit, ils ont leurs propres zones. Le filtre est
 * appliqué APRÈS la requête (l'API REST ne sait pas filtrer sur `format`), d'où
 * la nécessité de compter séparément les posts consommés et les posts affichés.
 */
function isVideoPost(post: WPPost): boolean {
    return (post as WPPost & { format?: string }).format === 'video';
}

/**
 * Tranche "Load more" : renvoie jusqu'à `limit` posts AFFICHABLES à partir de
 * l'offset WP `offset`, et surtout le `nextOffset` exact à réutiliser au clic
 * suivant.
 *
 * Pourquoi ce n'est pas un simple `fetch(?offset=…&per_page=limit+1)` :
 *
 * 1. **Décalage.** Le filtre vidéo retire des posts après coup. Si le client
 *    recalcule l'offset depuis le nombre d'articles affichés, chaque vidéo
 *    écartée décale la fenêtre vers l'arrière et re-sert des posts déjà vus.
 *    On renvoie donc `nextOffset = offset + posts consommés`.
 * 2. **Lot court.** Avec `per_page = limit + 1`, trois vidéos dans le lot
 *    donnaient 2 articles au lieu de 5, et un `hasMore` faux (`length > limit`
 *    devenait faux alors que WP avait encore du contenu) : le bouton
 *    disparaissait au milieu de la liste. On re-requête donc jusqu'à remplir le
 *    lot.
 *
 * `MAX_ROUNDS` borne le coût d'un clic (au pire 4 requêtes). Si le lot n'est pas
 * plein au bout des 4 tours, `hasMore` reste vrai tant que WP n'est pas épuisé :
 * le clic suivant repart de `nextOffset`, donc la liste progresse toujours.
 *
 * @param buildUrl (wpOffset, perPage) -> URL REST complète
 */
async function fetchDisplayableSlice(
    buildUrl: (wpOffset: number, perPage: number) => string,
    offset: number,
    limit: number,
    revalidate = 600,
): Promise<{ posts: WPPost[]; nextOffset: number; hasMore: boolean }> {
    const MAX_ROUNDS = 4;
    const perPage = limit + 1; // le +1 sert de sentinelle "il reste des posts"

    const kept: WPPost[] = [];
    let consumed = 0;
    let exhausted = false;

    for (let round = 0; round < MAX_ROUNDS && !exhausted; round++) {
        const res = await fetch(buildUrl(offset + consumed, perPage), { next: { revalidate } });

        if (!res.ok) {
            // 400 = offset au-delà du dernier post, c'est la fin normale de liste.
            if (res.status !== 400) {
                console.error(`Erreur wpApi [fetchDisplayableSlice]: ${res.status}`);
            }
            exhausted = true;
            break;
        }

        const raw: WPPost[] = await res.json();
        if (!raw.length) {
            exhausted = true;
            break;
        }

        for (const post of raw) {
            if (kept.length === limit) {
                // Lot plein et un post de plus existe : on s'arrête sans le
                // consommer, il ouvrira le prochain lot.
                return { posts: kept, nextOffset: offset + consumed, hasMore: true };
            }
            consumed++;
            if (!isVideoPost(post)) kept.push(post);
        }

        // Moins de posts que demandé = on a touché le fond de la liste.
        if (raw.length < perPage) exhausted = true;
    }

    return { posts: kept, nextOffset: offset + consumed, hasMore: !exhausted };
}

/** Retour commun des trois endpoints "Load more". */
interface OffsetSlice {
    articles: CategoryArticle[];
    hasMore: boolean;
    /** Offset WP à renvoyer au clic suivant — voir CategoryData.nextOffset. */
    nextOffset: number;
}

/**
 * Corps commun des trois "Load more" (catégorie, tag, impact-category) : seules
 * l'URL construite et l'étiquette `source` changeaient d'une version à l'autre,
 * le reste était dupliqué à trois exemplaires — donc corrigé à trois endroits,
 * ou oublié dans deux.
 *
 * @param sourceLabel étiquette fixe (page impact-category = nom du terme). Si
 *                    absente, on résout la première catégorie WP du post.
 */
async function loadMoreSlice(
    buildUrl: (wpOffset: number, perPage: number) => string,
    offset: number,
    limit: number,
    sourceLabel?: string,
): Promise<OffsetSlice> {
    const { posts, nextOffset, hasMore } = await fetchDisplayableSlice(buildUrl, offset, limit);
    if (!posts.length) return { articles: [], hasMore, nextOffset };

    const { mediaIds, categoryIds } = extractIds(posts);
    const [mediaMap, categoryMap] = await Promise.all([
        fetchMediaBatch(mediaIds),
        sourceLabel ? Promise.resolve(new Map<number, string>()) : fetchCategoryBatch(categoryIds),
    ]);

    const articles: CategoryArticle[] = posts.map((post, index) => {
        const media = mediaMap.get(post.featured_media);

        let source = sourceLabel ?? 'The Fourth Estate';
        if (!sourceLabel && post.categories.length > 0) {
            const cat = categoryMap.get(post.categories[0]);
            if (cat) source = cat;
        }

        const article: CategoryArticle = {
            id: `post-${post.id}`,
            href: buildHref(post),
            title: cleanHtmlTitle(post.title.rendered),
            source,
            publishedAt: formatWpDate(post.date),
            imagePriority: imagePriority(offset + index),
        };

        if (media) article.image = buildImage(media, offset + index);

        return article;
    });

    return { articles, hasMore, nextOffset };
}

/**
 * Tags "section-tags" d'une catégorie = vrais tags WP les plus fréquents parmi
 * ses posts récents, ordonnés par fréquence décroissante. Deux requêtes cachées
 * 1h : (1) tags des 50 derniers posts de la catégorie, (2) résolution id ->
 * {slug,name}. Chaque tag pointe vers /tag/<slug>. `limit` >= 15 pour couvrir
 * l'attente "au moins les 15 premiers tags" au clic sur See more.
 */
async function getCategoryTags(categoryId: number, limit = 20): Promise<CategoryTag[]> {
    const res = await fetch(
        `${WP_BASE}/posts?categories=${categoryId}&per_page=50&status=publish&_fields=tags`,
        { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];

    const posts: Array<{ tags?: number[] }> = await res.json();
    const counts = new Map<number, number>();
    for (const p of posts) {
        for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    if (!counts.size) return [];

    const topIds = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

    const tagRes = await fetch(
        `${WP_BASE}/tags?include=${topIds.join(',')}&per_page=${topIds.length}&_fields=id,slug,name`,
        { next: { revalidate: 3600 } }
    );
    if (!tagRes.ok) return [];

    const terms: Array<{ id: number; slug: string; name: string }> = await tagRes.json();
    const byId = new Map(terms.map((t) => [t.id, t]));

    // Remappe dans l'ordre de fréquence (WP renvoie ?include= trié par id).
    return topIds
        .map((id) => byId.get(id))
        .filter((t): t is { id: number; slug: string; name: string } => !!t)
        .map((t) => ({ label: decode(t.name), href: `/tag/${t.slug}` }));
}

export const getCategoryPageData = cache(async (
    slug: string,
    page: number = 1
): Promise<CategoryData | null> => {
    // Aucun slug n'a de traitement particulier ici : "our-impact" est une
    // catégorie WP standard (id 229) comme les autres. La taxonomie custom
    // "impact-category" reste utilisée ailleurs (ImpactZone de la home et pages
    // /impact-category/[slug]), mais plus par cette route.
    //
    // Slug -> id via le map catégories caché 24h (1 requête partagée) plutôt
    // qu'un resolveCategory par slug. Fallback resolveCategory si le slug n'est
    // pas encore dans le map (catégorie récente, ou catégorie sans post — le
    // map est construit avec hide_empty=true).
    let categoryId: number;
    let categoryName: string;

    const slugMap = await getCategorySlugMap();
    const mapped = slugMap.get(slug);
    if (mapped) {
        categoryId = mapped.id;
        categoryName = mapped.name;
    } else {
        const category = await resolveCategory(slug);
        if (!category) return null;
        categoryId = category.id;
        categoryName = category.name;
    }

    const url =
        `${WP_BASE}/posts` +
        `?categories=${categoryId}` +
        `&page=${page}` +
        `&per_page=${CATEGORY_PER_PAGE}` +
        `&status=publish` +
        `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link`;

    const config = getCategoryConfig(slug);
    const title = config.title ?? categoryName;

    // Tags de la section-tags : config.tags si fourni (override manuel), sinon
    // les vrais tags WP les plus fréquents de la catégorie (>=15 visés). Fetch
    // en parallèle des posts pour ne pas rallonger le chemin critique.
    const [res, sectionTags] = await Promise.all([
        fetch(url, { next: { revalidate: 600 } }),
        config.tags
            ? Promise.resolve<CategoryTag[]>(config.tags)
            : getCategoryTags(categoryId),
    ]);

    if (!res.ok) {
        if (res.status === 400) {
            // Page hors limites -> WP renvoie 400 au-delà de la dernière page.
            return {
                title,
                slug,
                seoDescription: config.seoDescription,
                tags: sectionTags,
                articles: [],
                hasMore: false,
                nextOffset: 0,
                pagination: { currentPage: page, totalPages: 0, basePath: `/category/${slug}` },
            };
        }
        console.error(`Erreur wpApi [getCategoryPageData]: ${res.status}`);
        return null;
    }

    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
    const rawPosts: WPPost[] = await res.json();

    // Offset de reprise pour le "Load more" : posts consommés côté WP, pas
    // articles affichés (voir CategoryData.nextOffset et fetchDisplayableSlice).
    const nextOffset = (page - 1) * CATEGORY_PER_PAGE + rawPosts.length;

    // Exclut les contenus "stories"/vidéo de cette liste (décision produit).
    const posts = rawPosts.filter((p) => !isVideoPost(p));
    if (!posts.length) {
        return {
            title,
            slug,
            seoDescription: config.seoDescription,
            tags: sectionTags,
            articles: [],
            hasMore: page < totalPages,
            nextOffset,
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
        tags: sectionTags,
        articles,
        hasMore: page < totalPages,
        nextOffset,
        pagination: {
            currentPage: page,
            totalPages,
            basePath: `/category/${slug}`,
        },
    };
});

/**
 * Batch supplémentaire pour le bouton "Load more" de la page catégorie
 * (remplace la pagination classique). Utilise `offset` plutôt que `page` pour
 * permettre des tranches de taille arbitraire (5 par clic) qui ne correspondent
 * pas forcément aux limites de page WP.
 *
 * `offset` doit être le `nextOffset` renvoyé par l'appel précédent, PAS le
 * nombre d'articles déjà affichés — voir fetchDisplayableSlice.
 */
export const getCategoryArticlesOffset = cache(async (
    slug: string,
    offset: number,
    limit: number = 5
): Promise<OffsetSlice> => {
    const category = await resolveCategory(slug);
    if (!category) return { articles: [], hasMore: false, nextOffset: offset };

    return loadMoreSlice(
        (wpOffset, perPage) =>
            `${WP_BASE}/posts` +
            `?categories=${category.id}` +
            `&offset=${wpOffset}` +
            `&per_page=${perPage}` +
            `&status=publish` +
            `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link`,
        offset,
        limit,
    );
});

// ---------------------------------------------------------------------------
// impact-category — /impact-category/[slug]
//
// Taxonomie custom "impact-category" (termes de "Our Impact" : Honours,
// Accountability, Government Action, …). Miroir de getCategoryPageData /
// getCategoryArticlesOffset mais sur ?impact-category=<id> au lieu de
// ?categories=<id>. Route dédiée /impact-category/[slug] calquée sur la
// structure d'URL WordPress (/impact-category/honours/). Réutilise le type
// CategoryData et le composant CategoryRiverLoadMore (apiBasePath dédié).
// ---------------------------------------------------------------------------

interface WPImpactCategoryResolved {
    id: number;
    name: string;
    slug: string;
}

/**
 * Map slug -> {id, name} de tous les termes impact-category, en 1 requête
 * cachée 24h (même stratégie anti-waterfall que getCategorySlugMap).
 */
export const getImpactCategorySlugMap = cache(async (): Promise<Map<string, { id: number; name: string }>> => {
    const map = new Map<string, { id: number; name: string }>();
    const res = await fetch(
        `${WP_BASE}/impact-category?per_page=100&_fields=id,slug,name`,
        { next: { revalidate: 86400 } }
    );
    if (!res.ok) return map;
    const terms: Array<{ id: number; slug: string; name: string }> = await res.json();
    terms.forEach((t) => map.set(t.slug, { id: t.id, name: decode(t.name) }));
    return map;
});

export async function getAllImpactCategorySlugs(): Promise<string[]> {
    const map = await getImpactCategorySlugMap();
    return Array.from(map.keys());
}

async function resolveImpactCategory(slug: string): Promise<WPImpactCategoryResolved | null> {
    const map = await getImpactCategorySlugMap();
    const m = map.get(slug);
    if (m) return { id: m.id, name: m.name, slug };
    // Fallback : terme récent absent du map caché.
    const res = await fetch(`${WP_BASE}/impact-category?slug=${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const terms: WPImpactCategoryResolved[] = await res.json();
    const t = terms[0];
    return t ? { ...t, name: decode(t.name) } : null;
}

export const getImpactCategoryPageData = cache(async (slug: string): Promise<CategoryData | null> => {
    const term = await resolveImpactCategory(slug);
    if (!term) return null;

    const basePath = `/impact-category/${slug}`;
    const emptyBase = { title: term.name, slug, tags: [] as CategoryTag[], articles: [] as CategoryArticle[] };

    const url =
        `${WP_BASE}/posts` +
        `?impact-category=${term.id}` +
        `&page=1` +
        `&per_page=${CATEGORY_PER_PAGE}` +
        `&status=publish` +
        `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link`;

    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
        if (res.status === 400) {
            return { ...emptyBase, hasMore: false, nextOffset: 0, pagination: { currentPage: 1, totalPages: 0, basePath } };
        }
        console.error(`Erreur wpApi [getImpactCategoryPageData]: ${res.status}`);
        return null;
    }

    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
    const rawPosts: WPPost[] = await res.json();
    // Posts consommés côté WP, pas articles affichés (voir CategoryData.nextOffset).
    const nextOffset = rawPosts.length;
    const posts = rawPosts.filter((p) => !isVideoPost(p));

    if (!posts.length) {
        return { ...emptyBase, hasMore: false, nextOffset, pagination: { currentPage: 1, totalPages, basePath } };
    }

    const { mediaIds } = extractIds(posts);
    const mediaMap = await fetchMediaBatch(mediaIds);

    const articles: CategoryArticle[] = posts.map((post, index) => {
        const media = mediaMap.get(post.featured_media);
        const article: CategoryArticle = {
            id: `post-${post.id}`,
            href: buildHref(post),
            title: cleanHtmlTitle(post.title.rendered),
            source: term.name,
            publishedAt: formatWpDate(post.date),
            imagePriority: imagePriority(index),
        };
        if (media) article.image = buildImage(media, index);
        return article;
    });

    return {
        ...emptyBase,
        articles,
        hasMore: 1 < totalPages,
        nextOffset,
        pagination: { currentPage: 1, totalPages, basePath },
    };
});

export const getImpactCategoryArticlesOffset = cache(async (
    slug: string,
    offset: number,
    limit: number = 5
): Promise<OffsetSlice> => {
    const term = await resolveImpactCategory(slug);
    if (!term) return { articles: [], hasMore: false, nextOffset: offset };

    return loadMoreSlice(
        (wpOffset, perPage) =>
            `${WP_BASE}/posts` +
            `?impact-category=${term.id}` +
            `&offset=${wpOffset}` +
            `&per_page=${perPage}` +
            `&status=publish` +
            `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link`,
        offset,
        limit,
        term.name, // toute la page porte le nom du terme, pas la catégorie WP du post
    );
});

// ---------------------------------------------------------------------------
// Filtres secondaires de /category/our-impact — 31/08/2026
//
// La page liste les posts de la catégorie WP "our-impact" (id 229, voir
// CATEGORY_IDS plus haut), avec un filtre optionnel sur la taxonomie custom
// "impact-category" — les mêmes termes que /impact-category/[slug]
// (Government Action, Policy Change, Public Awareness, Accountability,
// Honours). Les deux se combinent en AND côté WP REST
// (?categories=229&impact-category=<id>) : un post n'apparaît sous un filtre
// que s'il porte À LA FOIS la catégorie "our-impact" ET ce terme
// impact-category. "All" = pas de filtre, comportement identique à
// getCategoryPageData('our-impact') d'avant le 31/08.
//
// Fonctions dédiées (plutôt qu'un paramètre optionnel sur
// getCategoryPageData/getCategoryArticlesOffset) : cette page est la SEULE à
// avoir des filtres, inutile d'alourdir les ~20 autres pages catégorie qui
// n'en ont pas.
// ---------------------------------------------------------------------------

const OUR_IMPACT_FIELDS =
    '&status=publish' +
    '&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link';

/**
 * Les 5 filtres demandés, résolus contre les VRAIS termes impact-category de
 * WordPress (par nom, insensible à la casse) plutôt que sur des slugs
 * devinés — un terme renommé ou re-sluggé còté CMS ne casse pas les onglets.
 * Un filtre dont le terme n'existe pas (encore) côté WP est simplement omis
 * plutôt que de produire un onglet mort.
 */
const OUR_IMPACT_FILTER_LABELS = [
    'Government Action',
    'Policy Change',
    'Public Awareness',
    'Accountability',
    'Honours',
];

export interface OurImpactFilter {
    slug: string;
    label: string;
}

export const getOurImpactFilters = cache(async (): Promise<OurImpactFilter[]> => {
    const map = await getImpactCategorySlugMap(); // slug -> {id, name}, cache 24h
    const slugByName = new Map<string, string>();
    for (const [slug, term] of map) slugByName.set(term.name.toLowerCase(), slug);

    return OUR_IMPACT_FILTER_LABELS
        .map((label) => {
            const slug = slugByName.get(label.toLowerCase());
            return slug ? { slug, label } : null;
        })
        .filter((f): f is OurImpactFilter => f !== null);
});

/** slug de filtre -> id du terme impact-category. `null`/absent/inconnu =
 *  traité comme "All" plutôt que de renvoyer une erreur. */
async function resolveOurImpactFilterId(filterSlug?: string | null): Promise<number | null> {
    if (!filterSlug) return null;
    const term = await resolveImpactCategory(filterSlug);
    return term ? term.id : null;
}

/** Résout la catégorie WP "our-impact" via le map caché 24h, avec repli
 *  resolveCategory — même stratégie que getCategoryPageData. */
async function resolveOurImpactCategory(): Promise<WPCategoryResolved | null> {
    const slugMap = await getCategorySlugMap();
    const mapped = slugMap.get('our-impact');
    if (mapped) return { id: mapped.id, name: mapped.name, slug: 'our-impact' };
    return resolveCategory('our-impact');
}

export const getOurImpactPageData = cache(async (filterSlug?: string | null): Promise<CategoryData | null> => {
    const category = await resolveOurImpactCategory();
    if (!category) return null;

    const impactCategoryId = await resolveOurImpactFilterId(filterSlug);
    const basePath = '/category/our-impact';
    const config = getCategoryConfig('our-impact');
    const title = config.title ?? category.name;

    const url =
        `${WP_BASE}/posts` +
        `?categories=${category.id}` +
        (impactCategoryId ? `&impact-category=${impactCategoryId}` : '') +
        `&page=1` +
        `&per_page=${CATEGORY_PER_PAGE}` +
        OUR_IMPACT_FIELDS;

    // Les tags "section-tags" restent ceux de la catégorie our-impact dans son
    // ensemble (pas recalculés par filtre) : c'est un outil de navigation pour
    // toute la page, pas une facette du filtre actif.
    const [res, sectionTags] = await Promise.all([
        fetch(url, { next: { revalidate: 600 } }),
        config.tags ? Promise.resolve<CategoryTag[]>(config.tags) : getCategoryTags(category.id),
    ]);

    const emptyBase = {
        title,
        slug: 'our-impact',
        seoDescription: config.seoDescription,
        tags: sectionTags,
        articles: [] as CategoryArticle[],
    };

    if (!res.ok) {
        if (res.status === 400) {
            return { ...emptyBase, hasMore: false, nextOffset: 0, pagination: { currentPage: 1, totalPages: 0, basePath } };
        }
        console.error(`Erreur wpApi [getOurImpactPageData]: ${res.status}`);
        return null;
    }

    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
    const rawPosts: WPPost[] = await res.json();
    // Posts consommés côté WP, pas articles affichés (voir CategoryData.nextOffset).
    const nextOffset = rawPosts.length;
    const posts = rawPosts.filter((p) => !isVideoPost(p));

    if (!posts.length) {
        return { ...emptyBase, hasMore: 1 < totalPages, nextOffset, pagination: { currentPage: 1, totalPages, basePath } };
    }

    const { mediaIds, categoryIds } = extractIds(posts);
    const [mediaMap, categoryMap] = await Promise.all([
        fetchMediaBatch(mediaIds),
        fetchCategoryBatch(categoryIds),
    ]);

    const articles: CategoryArticle[] = posts.map((post, index) => {
        const media = mediaMap.get(post.featured_media);

        // Étiquette de carte = catégorie thématique du post (Anti-Corruption,
        // Environment…), "our-impact" (229) exclu — même règle que la zone
        // "Our Impact" de la home (getOurImpactArticles) : sinon toutes les
        // cartes répéteraient "Our Impact" sous une section déjà titrée
        // "Our Impact".
        let source = category.name;
        const thematic = post.categories.find((id) => id !== category.id);
        if (thematic) {
            const cat = categoryMap.get(thematic);
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
        slug: 'our-impact',
        seoDescription: config.seoDescription,
        tags: sectionTags,
        articles,
        hasMore: 1 < totalPages,
        nextOffset,
        pagination: { currentPage: 1, totalPages, basePath },
    };
});

/**
 * "Load more" de /category/our-impact, avec le même filtre optionnel que
 * getOurImpactPageData. Pas un simple appel à loadMoreSlice() (le helper
 * partagé par catégorie/tag/impact-category) : son étiquette de carte par
 * défaut est `post.categories[0]`, qui peut être 229 (our-impact) lui-même —
 * ça reproduirait exactement le bug d'incohérence corrigé le 19/08 (page 1 et
 * "Load more" affichant deux étiquettes différentes), cette fois entre le
 * premier lot (règle "catégorie thématique" ci-dessus) et les suivants.
 */
export const getOurImpactArticlesOffset = cache(async (
    offset: number,
    limit: number = 5,
    filterSlug?: string | null,
): Promise<OffsetSlice> => {
    const category = await resolveOurImpactCategory();
    if (!category) return { articles: [], hasMore: false, nextOffset: offset };

    const impactCategoryId = await resolveOurImpactFilterId(filterSlug);

    const buildUrl = (wpOffset: number, perPage: number) =>
        `${WP_BASE}/posts` +
        `?categories=${category.id}` +
        (impactCategoryId ? `&impact-category=${impactCategoryId}` : '') +
        `&offset=${wpOffset}` +
        `&per_page=${perPage}` +
        OUR_IMPACT_FIELDS;

    const { posts, nextOffset, hasMore } = await fetchDisplayableSlice(buildUrl, offset, limit);
    if (!posts.length) return { articles: [], hasMore, nextOffset };

    const { mediaIds, categoryIds } = extractIds(posts);
    const [mediaMap, categoryMap] = await Promise.all([
        fetchMediaBatch(mediaIds),
        fetchCategoryBatch(categoryIds),
    ]);

    const articles: CategoryArticle[] = posts.map((post, index) => {
        const media = mediaMap.get(post.featured_media);

        // Même règle "catégorie thématique" que getOurImpactPageData — voir le
        // commentaire ci-dessus sur pourquoi loadMoreSlice() ne convient pas ici.
        let source = category.name;
        const thematic = post.categories.find((id) => id !== category.id);
        if (thematic) {
            const cat = categoryMap.get(thematic);
            if (cat) source = cat;
        }

        const article: CategoryArticle = {
            id: `post-${post.id}`,
            href: buildHref(post),
            title: cleanHtmlTitle(post.title.rendered),
            source,
            publishedAt: formatWpDate(post.date),
            imagePriority: imagePriority(offset + index),
        };
        if (media) article.image = buildImage(media, offset + index);
        return article;
    });

    return { articles, hasMore, nextOffset };
});

// ---------------------------------------------------------------------------
// getTagPageData / getTagArticlesOffset — /tag/[slug]
//
// Miroir exact de getCategoryPageData/getCategoryArticlesOffset, mais sur la
// taxonomie post_tag (?tags=id) au lieu de category (?categories=id).
// Nécessaire pour les liens du CPT "highlight" qui référencent des tags WP
// (ex: acf.tag = "big-push-contract-list") plutôt que des catégories.
// ---------------------------------------------------------------------------

interface WPTagResolved {
    id: number;
    name: string;
    slug: string;
}

async function resolveTag(slug: string): Promise<WPTagResolved | null> {
    const res = await fetch(`${WP_BASE}/tags?slug=${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const tags: WPTagResolved[] = await res.json();
    const tag = tags[0];
    return tag ? { ...tag, name: decode(tag.name) } : null;
}

/**
 * Slugs des tags les plus utilisés, pour generateStaticParams (prébuild ISR de
 * la page /tag/[slug]). Contrairement aux catégories (~13, map complet caché),
 * les tags se comptent en centaines/milliers : on ne prébuild que le top `limit`
 * par nombre d'articles ; les tags rares restent rendus à la demande
 * (dynamicParams). `hide_empty=true` exclut les tags sans article publié.
 */
export async function getTopTagSlugs(limit = 100): Promise<string[]> {
    const res = await fetch(
        `${WP_BASE}/tags?orderby=count&order=desc&hide_empty=true&per_page=${limit}&_fields=slug`,
        { next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const tags: Array<{ slug: string }> = await res.json();
    return tags.map((t) => t.slug);
}

const TAG_PER_PAGE = 13;

export const getTagPageData = cache(async (
    slug: string,
    page: number = 1
): Promise<CategoryData | null> => {
    const tag = await resolveTag(slug);
    if (!tag) return null;

    const title = tag.name;

    const url =
        `${WP_BASE}/posts` +
        `?tags=${tag.id}` +
        `&page=${page}` +
        `&per_page=${TAG_PER_PAGE}` +
        `&status=publish` +
        `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link`;

    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
        if (res.status === 400) {
            return {
                title,
                slug,
                tags: [],
                articles: [],
                hasMore: false,
                nextOffset: 0,
                pagination: { currentPage: page, totalPages: 0, basePath: `/tag/${slug}` },
            };
        }
        console.error(`Erreur wpApi [getTagPageData]: ${res.status}`);
        return null;
    }

    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '1');
    const rawPosts: WPPost[] = await res.json();
    // Posts consommés côté WP, pas articles affichés (voir CategoryData.nextOffset).
    const nextOffset = (page - 1) * TAG_PER_PAGE + rawPosts.length;

    const posts = rawPosts.filter((p) => !isVideoPost(p));
    if (!posts.length) {
        return {
            title,
            slug,
            tags: [],
            articles: [],
            hasMore: page < totalPages,
            nextOffset,
            pagination: { currentPage: page, totalPages, basePath: `/tag/${slug}` },
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
        tags: [],
        articles,
        hasMore: page < totalPages,
        nextOffset,
        pagination: {
            currentPage: page,
            totalPages,
            basePath: `/tag/${slug}`,
        },
    };
});

export const getTagArticlesOffset = cache(async (
    slug: string,
    offset: number,
    limit: number = 5
): Promise<OffsetSlice> => {
    const tag = await resolveTag(slug);
    if (!tag) return { articles: [], hasMore: false, nextOffset: offset };

    return loadMoreSlice(
        (wpOffset, perPage) =>
            `${WP_BASE}/posts` +
            `?tags=${tag.id}` +
            `&offset=${wpOffset}` +
            `&per_page=${perPage}` +
            `&status=publish` +
            `&_fields=id,slug,title,excerpt,date,categories,tags,featured_media,format,link`,
        offset,
        limit,
    );
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
                    label: decode(cat.name),
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