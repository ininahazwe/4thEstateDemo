// ---------------------------------------------------------------------------
// wpApi.spotlight.ts — articles mis en avant dans le Hero de la homepage.
//
// Fichier autonome (pas d'import croisé wpApi.ts), même convention que
// wpApi.archives.ts / wpApi.highlight.ts.
//
// SOURCE : le mu-plugin `tfe-composition.php` côté WordPress. Il expose une
// entrée unique du type de contenu `composition` portant un champ ACF
// Relationship par zone. Le champ stocke une LISTE ORDONNÉE d'IDs d'articles,
// et l'ordre de la liste EST l'ordre d'affichage :
//
//   GET /wp-json/wp/v2/composition?_fields=id,zones
//   → { "id": 123, "zones": { "spotlight": [24080, 23947, 24038, …] } }
//
// Deux requêtes au total : la composition (les IDs), puis les articles avec
// `orderby=include`, qui demande à WordPress de respecter l'ordre des IDs
// passés dans `include` au lieu de retomber sur un tri par date. C'est ce
// paramètre qui évite d'avoir à retrier côté JS.
//
// L'édito choisit et réordonne par glisser-déposer dans le menu "Composition"
// de l'admin WP. Aucun article n'est modifié au passage.
// ---------------------------------------------------------------------------

import { decode } from 'html-entities';

const WP_BASE = process.env.NEXT_PUBLIC_WP_API_URL || 'https://cms.thefourthestategh.com/wp-json/wp/v2';

/** Clé de zone dans `zones` — doit correspondre à tfe_composition_zones() côté PHP. */
const SPOTLIGHT_ZONE = 'spotlight';

/**
 * Forme minimale consommée par le Hero. Volontairement plus étroite que
 * ArticleData (NewsZone) : pas de section / model / type / index, qui n'ont
 * pas de sens ici et obligeraient à inventer des valeurs.
 */
export interface SpotlightArticle {
    id: string;
    href: string;
    title: string;
    /** Date de publication brute (ISO, post.date) — formatage laissé au composant. */
    publishedAtISO: string;
    /** Rang dans la composition, 1 = première position choisie en admin. */
    position: number;
    image?: {
        src: string;
        width: number;
        height: number;
        blurDataURL: string;
    };
}

interface WPCompositionEntry {
    id: number;
    zones?: Record<string, number[]>;
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

interface WPSpotlightPost {
    id: number;
    slug: string;
    date: string;
    title: { rendered: string };
    featured_media: number;
}

/** Même placeholder LQIP que wpApi.ts (SVG gris 640×426) — dupliqué, fichier autonome. */
const BLUR_PLACEHOLDER =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iNDI2Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNjYmQ1ZTEiIGZvbnQtc2l6ZT0iMjQiPuKWqTwvdGV4dD48L3N2Zz4=';

/**
 * Le Hero affiche de grandes cartes verticales (~1/3 de largeur écran) :
 * 'large' d'abord, pas medium_large, pour éviter un upscale visible.
 */
const IMAGE_SIZE_PRIORITY = ['large', 'medium_large', '1536x1536'];

function cleanHtmlTitle(title: string): string {
    return decode(title).replace(/<[^>]*>/g, '').trim();
}

/** Même schéma d'URL que buildHref() de wpApi.ts : /{année}/{mois}/{slug}. */
function buildHref(post: WPSpotlightPost): string {
    const date = new Date(post.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `/${year}/${month}/${post.slug}`;
}

function pickImageUrl(media: WPMedia): string {
    const sizes = media.media_details?.sizes;
    if (!sizes) return media.source_url;
    for (const sizeName of IMAGE_SIZE_PRIORITY) {
        const candidate = sizes[sizeName];
        if (candidate?.source_url) return candidate.source_url;
    }
    return media.source_url;
}

function pickImageDimensions(media: WPMedia): { width: number; height: number } {
    const sizes = media.media_details?.sizes;
    if (sizes) {
        for (const sizeName of IMAGE_SIZE_PRIORITY) {
            const candidate = sizes[sizeName];
            if (candidate) return { width: candidate.width, height: candidate.height };
        }
    }
    return {
        width: media.media_details?.width ?? 640,
        height: media.media_details?.height ?? 426,
    };
}

/** Médias en UNE requête ?include=id1,id2,… plutôt qu'une par image. */
async function fetchMediaBatch(mediaIds: number[]): Promise<Map<number, WPMedia>> {
    const map = new Map<number, WPMedia>();
    if (!mediaIds.length) return map;
    const res = await fetch(
        `${WP_BASE}/media?include=${mediaIds.join(',')}&per_page=100`,
        { next: { revalidate: 600 } }
    );
    if (!res.ok) return map;
    const medias: WPMedia[] = await res.json();
    medias.forEach((m) => map.set(m.id, m));
    return map;
}

/**
 * IDs d'articles d'une zone, dans l'ordre choisi en admin.
 *
 * revalidate court (5 min) : c'est le seul appel qui porte un choix éditorial,
 * on veut qu'un changement de Hero se voie vite. Les articles et les médias
 * derrière restent sur 10 min, ils bougent moins.
 */
async function getZoneIds(zone: string): Promise<number[]> {
    const res = await fetch(
        `${WP_BASE}/composition?per_page=1&_fields=id,zones`,
        { next: { revalidate: 300 } }
    );

    if (!res.ok) {
        console.error(`Erreur wpApi.spotlight [composition]: ${res.status}`);
        return [];
    }

    const entries: WPCompositionEntry[] = await res.json();
    const ids = entries[0]?.zones?.[zone];

    if (!Array.isArray(ids)) return [];

    return ids.filter((id) => Number.isInteger(id) && id > 0);
}

/**
 * Articles mis en avant, dans l'ordre défini en admin.
 *
 * Renvoie [] si la composition est vide ou injoignable — le Hero se masque
 * alors de lui-même (`if (!articles.length) return null`).
 *
 * Un article dépublié ou supprimé entre-temps disparaît simplement de la
 * liste : l'API ne le renvoie plus, on se retrouve avec moins d'articles que
 * demandé plutôt qu'avec un lien mort.
 *
 * @param limit Nombre d'articles renvoyés (Hero = 3, la zone en accepte 5).
 */
export async function getSpotlightArticles(limit: number = 3): Promise<SpotlightArticle[]> {
    try {
        const ids = (await getZoneIds(SPOTLIGHT_ZONE)).slice(0, limit);
        if (!ids.length) return [];

        // orderby=include : WordPress renvoie les articles dans l'ordre exact
        // des IDs passés à `include`. Sans ce paramètre, le tri par défaut
        // (date décroissante) écraserait le choix éditorial.
        const res = await fetch(
            `${WP_BASE}/posts?include=${ids.join(',')}&orderby=include&per_page=${ids.length}` +
                `&status=publish&_fields=id,slug,date,title,featured_media`,
            { next: { revalidate: 600 } }
        );

        if (!res.ok) {
            console.error(`Erreur wpApi.spotlight [getSpotlightArticles]: ${res.status}`);
            return [];
        }

        const posts: WPSpotlightPost[] = await res.json();
        if (!posts.length) return [];

        const mediaIds = Array.from(
            new Set(posts.map((p) => p.featured_media).filter((id) => id > 0))
        );
        const mediaMap = await fetchMediaBatch(mediaIds);

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            const article: SpotlightArticle = {
                id: `wp-post-${post.id}`,
                href: buildHref(post),
                title: cleanHtmlTitle(post.title.rendered),
                publishedAtISO: post.date,
                position: index + 1,
            };

            if (media) {
                const { width, height } = pickImageDimensions(media);
                article.image = {
                    src: pickImageUrl(media),
                    width,
                    height,
                    blurDataURL: BLUR_PLACEHOLDER,
                };
            }

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi.spotlight [getSpotlightArticles]:', error);
        return [];
    }
}
