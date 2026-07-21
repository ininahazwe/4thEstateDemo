// ---------------------------------------------------------------------------
// wpApi.highlight.ts — dédié au CPT "highlight" (créé via ACF, rest_base
// "highlight"), consommé par le bandeau vignettes de SiteBannerV2.
// Fichier indépendant, même convention que wpApi.tv.ts / wpApi.videoStory.ts.
//
// Champs ACF (voir GET /wp-json/wp/v2/highlight) :
//   acf.type      — 'serie' | 'podcast' | 'video' | 'upcoming', requis
//   acf.tag       — slug d'un tag WP (string), optionnel. Si présent, le lien
//                   pointe vers /tag/{slug} et le libellé affiché = nom du tag.
//   acf.title     — texte libre affiché, optionnel
//   acf.href      — lien utilisé seulement si acf.tag vide
//   acf.thumbnail — ID média WP (nombre) ou "" si vide. Utilisée pour tous
//                   les types sauf podcast (icône fixe côté composant).
//                   Pour "video" sans thumbnail renseignée : fallback icône
//                   video (voir showThumbnail plus bas).
//
// Limite éditoriale : 4 entrées, pas une limite technique côté API.
// ---------------------------------------------------------------------------

import { decode } from 'html-entities';

export type HighlightType = 'serie' | 'podcast' | 'video' | 'upcoming';

export interface HighlightItem {
    id: string;
    type: HighlightType;
    /** Texte libre affiché (acf.title) — peut être vide si l'éditeur a tout laissé au tag. */
    title: string;
    href: string;
    /** Libellé badge : nom du tag si présent, sinon libellé générique du type. */
    badge: string;
    /** Absente pour type=podcast (icône fixe côté composant), et pour video sans image renseignée. */
    thumbnail?: string;
}

const WP_BASE = process.env.NEXT_PUBLIC_WP_API_URL || 'https://thefourthestategh.com/wp-json/wp/v2';

interface WPHighlightPost {
    id: number;
    acf: {
        type?: HighlightType;
        tag?: string;
        title?: string;
        href?: string;
        thumbnail?: number | string;
    };
}

interface WPTagTerm {
    id: number;
    name: string;
    slug: string;
}

interface WPMediaItem {
    id: number;
    source_url: string;
}

const TYPE_BADGE_FALLBACK: Record<HighlightType, string> = {
    serie: 'Series',
    podcast: 'Podcast',
    video: 'Video',
    upcoming: 'Coming soon',
};

async function fetchTagsBySlug(slugs: string[]): Promise<Map<string, WPTagTerm>> {
    const map = new Map<string, WPTagTerm>();
    if (!slugs.length) return map;
    const res = await fetch(
        `${WP_BASE}/tags?slug=${slugs.join(',')}&per_page=${slugs.length}`,
        { next: { revalidate: 3600 } }
    );
    if (!res.ok) return map;
    const terms: WPTagTerm[] = await res.json();
    terms.forEach((t) => map.set(t.slug, { ...t, name: decode(t.name) }));
    return map;
}

async function fetchMediaUrls(ids: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!ids.length) return map;
    const res = await fetch(
        `${WP_BASE}/media?include=${ids.join(',')}&per_page=100`,
        { next: { revalidate: 600 } }
    );
    if (!res.ok) return map;
    const medias: WPMediaItem[] = await res.json();
    medias.forEach((m) => map.set(m.id, m.source_url));
    return map;
}

export async function getHighlights(limit: number = 4): Promise<HighlightItem[]> {
    try {
        const res = await fetch(
            `${WP_BASE}/highlight?per_page=${limit}&status=publish&orderby=date&order=desc&_fields=id,acf`,
            { next: { revalidate: 600 } }
        );

        if (!res.ok) {
            console.error(`Erreur wpApi.highlight [getHighlights]: ${res.status}`);
            return [];
        }

        const posts: WPHighlightPost[] = await res.json();
        const valid = posts.filter((p) => p.acf?.type);

        const tagSlugs = Array.from(new Set(valid.map((p) => p.acf.tag).filter((s): s is string => !!s)));
        const thumbnailIds = Array.from(
            new Set(
                valid
                    .map((p) => p.acf.thumbnail)
                    .filter((id): id is number => typeof id === 'number' && id > 0)
            )
        );

        const [tagMap, mediaMap] = await Promise.all([
            fetchTagsBySlug(tagSlugs),
            fetchMediaUrls(thumbnailIds),
        ]);

        return valid.map((post) => {
            const type = post.acf.type!;
            const tagSlug = post.acf.tag;
            const tag = tagSlug ? tagMap.get(tagSlug) : undefined;

            const href = tag ? `/tag/${tag.slug}` : (post.acf.href || '#');
            const badge = tag ? tag.name : TYPE_BADGE_FALLBACK[type];

            const thumbnailId = typeof post.acf.thumbnail === 'number' ? post.acf.thumbnail : undefined;
            // Thumbnail dispo pour tous les types sauf podcast (icône fixe).
            // "video" l'utilise désormais aussi ; fallback sur l'icône video si absente.
            const showThumbnail = type !== 'podcast';
            const thumbnail = showThumbnail && thumbnailId ? mediaMap.get(thumbnailId) : undefined;

            return {
                id: `highlight-${post.id}`,
                type,
                title: post.acf.title ?? '',
                href,
                badge,
                thumbnail,
            };
        });

    } catch (error) {
        console.error('Erreur wpApi.highlight [getHighlights]:', error);
        return [];
    }
}
