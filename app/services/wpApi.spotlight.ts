// ---------------------------------------------------------------------------
// wpApi.spotlight.ts — lecture de l'onglet SPOTLIGHT du plugin WordPress
// "CapEDx Composition" (dossier Weave, composition.php v3.4), consommé par le
// composant Hero de la homepage.
//
// Fichier autonome (pas d'import croisé wpApi.ts), même convention que
// wpApi.archives.ts / wpApi.highlight.ts.
//
// COMMENT LE PLUGIN STOCKE L'ONGLET SPOTLIGHT
// À chaque clic sur "Update", cp_make_spotlight() :
//   1. retire la catégorie `spotlight` + le tag `cp_spotlight` de TOUS les
//      anciens posts spotlight ;
//   2. sur les 5 posts sélectionnés : pose la catégorie `spotlight`, le tag
//      `cp_spotlight`, et écrit l'ordre en post meta `cp_order_home`.
//
// SENS DE L'ORDRE — le tableau des <select> passe par array_reverse() avant la
// boucle qui incrémente $i : la 1re position de l'UI admin reçoit donc la
// valeur cp_order_home la PLUS HAUTE. L'ordre d'affichage est
// `cp_order_home` DESC, ce que fait aussi le plugin lui-même côté admin avec
// orderby=meta_value_num (DESC par défaut de get_posts).
//
// PRÉREQUIS CÔTÉ WORDPRESS
// `cp_order_home` doit être déclarée show_in_rest, sinon elle est absente de la
// réponse REST → voir le mu-plugin `tfe-composition-rest.php`
// (wp-content/mu-plugins/). Sans lui, cette fonction renvoie quand même les
// articles de la catégorie spotlight, mais dans l'ordre WP par défaut (date
// desc) au lieu de l'ordre éditorial : dégradation silencieuse, pas de crash.
//
// Le tri est fait ici et non côté API car le paramètre `orderby` de l'API REST
// WP est un enum fermé (date, title, id, modified…) et n'accepte pas de meta
// arbitraire. Volume concerné : 5 posts — coût négligeable.
// ---------------------------------------------------------------------------

import { decode } from 'html-entities';

const WP_BASE = process.env.NEXT_PUBLIC_WP_API_URL || 'https://thefourthestategh.com/wp-json/wp/v2';

/** Slug de la catégorie WP posée par le plugin sur les posts de l'onglet SPOTLIGHT. */
const SPOTLIGHT_CATEGORY_SLUG = 'spotlight';

/** Meta d'ordre écrite par cp_make_spotlight() (onglet SPOTLIGHT uniquement). */
const SPOTLIGHT_ORDER_META = 'cp_order_home';

/**
 * Le plugin gère 5 positions. On en demande un peu plus pour rester correct si
 * la catégorie contient des résidus (post ajouté à la main en admin, etc.) :
 * le tri + le slice(limit) final tranchent de toute façon.
 */
const SPOTLIGHT_FETCH_SIZE = 10;

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
    /** Valeur brute de cp_order_home, exposée pour debug/log. */
    order: number;
    image?: {
        src: string;
        width: number;
        height: number;
        blurDataURL: string;
    };
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
    meta?: Record<string, unknown>;
}

interface WPTerm {
    id: number;
    slug: string;
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
 * ID du terme `spotlight`. Résolu dynamiquement (pas d'ID en dur) et mis en
 * cache 1h : la catégorie existe déjà en prod, mais un ID codé en dur casserait
 * silencieusement sur un autre environnement (staging, réinstall).
 */
async function resolveSpotlightCategoryId(): Promise<number | null> {
    const res = await fetch(
        `${WP_BASE}/categories?slug=${SPOTLIGHT_CATEGORY_SLUG}`,
        { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const terms: WPTerm[] = await res.json();
    return terms[0]?.id ?? null;
}

/** Lit cp_order_home en tolérant l'absence de meta ou une valeur en string. */
function readOrder(post: WPSpotlightPost): number {
    const raw = post.meta?.[SPOTLIGHT_ORDER_META];
    const value = typeof raw === 'string' ? Number(raw) : raw;
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Articles de l'onglet SPOTLIGHT, dans l'ordre défini en admin.
 *
 * @param limit Nombre d'articles renvoyés (Hero = 3, plugin en gère 5).
 */
export async function getSpotlightArticles(limit: number = 3): Promise<SpotlightArticle[]> {
    try {
        const categoryId = await resolveSpotlightCategoryId();
        if (categoryId === null) {
            console.error(
                `Erreur wpApi.spotlight : catégorie "${SPOTLIGHT_CATEGORY_SLUG}" introuvable`
            );
            return [];
        }

        const res = await fetch(
            `${WP_BASE}/posts?categories=${categoryId}&per_page=${SPOTLIGHT_FETCH_SIZE}` +
                `&status=publish&_fields=id,slug,date,title,featured_media,meta`,
            { next: { revalidate: 600 } }
        );

        if (!res.ok) {
            console.error(`Erreur wpApi.spotlight [getSpotlightArticles]: ${res.status}`);
            return [];
        }

        const posts: WPSpotlightPost[] = await res.json();
        if (!posts.length) return [];

        // Tri cp_order_home DESC (voir en-tête : 1re position admin = valeur la
        // plus haute). Départage par date desc pour un ordre déterministe quand
        // deux posts partagent la même valeur — cas d'un résidu sans meta, qui
        // vaut 0 et se retrouve donc en fin de liste.
        const ordered = [...posts].sort((a, b) => {
            const delta = readOrder(b) - readOrder(a);
            if (delta !== 0) return delta;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        const selected = ordered.slice(0, limit);

        const mediaIds = Array.from(
            new Set(selected.map((p) => p.featured_media).filter((id) => id > 0))
        );
        const mediaMap = await fetchMediaBatch(mediaIds);

        return selected.map((post) => {
            const media = mediaMap.get(post.featured_media);

            const article: SpotlightArticle = {
                id: `wp-post-${post.id}`,
                href: buildHref(post),
                title: cleanHtmlTitle(post.title.rendered),
                publishedAtISO: post.date,
                order: readOrder(post),
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
