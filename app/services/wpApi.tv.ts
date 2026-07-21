import { type TvData, type TvVideo } from '../components/TV/Types';

// ---------------------------------------------------------------------------
// wpApi.tv.ts — dedicated file for /tv page, completely independent of
// wpApi.ts/wpApi.article.ts/wpApi.author.ts (no WordPress data here,
// only YouTube Data API v3).
//
// Channel: The Fourth Estate (Media Foundation for West Africa)
// Channel ID: UCpBu6CkAnlvCAM4CSF9ZKBg
// Handle: @thefourthestate2372
//
// Requires YOUTUBE_API_KEY environment variable (Google Cloud API key
// with YouTube Data API v3 enabled, restricted to this API).
// ---------------------------------------------------------------------------

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_ID = 'UCpBu6CkAnlvCAM4CSF9ZKBg';
const VIDEOS_PER_PAGE = 12; // 3-column x 4-row grid

interface YouTubeThumbnail {
    url: string;
    width: number;
    height: number;
}

interface YouTubeSearchItem {
    id: { videoId: string };
    snippet: {
        title: string;
        publishedAt: string;
        thumbnails: {
            high?: YouTubeThumbnail;
            medium?: YouTubeThumbnail;
            default?: YouTubeThumbnail;
        };
    };
}

interface YouTubeSearchResponse {
    items: YouTubeSearchItem[];
    nextPageToken?: string;
    prevPageToken?: string;
    pageInfo: { totalResults: number; resultsPerPage: number };
}

function formatDisplayDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Filtres natifs YouTube search.list — pas de filtrage client possible ici
 * (contrairement à /podcasts) : search.list coûte 100 unités de quota par
 * appel (10k/jour = 100 appels max), et la pagination est par curseur
 * opaque (pageToken), pas par offset. Charger tout le catalogue en mémoire
 * pour filtrer côté client exploserait le quota pour rien alors que YouTube
 * supporte déjà nativement recherche/tri/plage de dates côté serveur.
 */
export interface TvFilters {
    query?: string;
    /** YouTube ne supporte pas de tri chronologique ascendant natif — seulement 'date' (récent d'abord). */
    order?: 'date' | 'viewCount' | 'title';
    publishedAfter?: string;  // RFC 3339, ex: 2026-01-01T00:00:00Z
    publishedBefore?: string; // RFC 3339
}

/**
 * Fetch une page de vidéos de la chaîne, filtrée/triée selon `filters`.
 * Navigation via pageToken (voir Pagination.tsx pour la contrainte API).
 *
 * search.list coûte 100 unités de quota par appel (free quota: 10k/jour =
 * 100 appels/jour). Pas de React.cache() ici puisque chaque combinaison
 * (page, token, filtres) est déjà une variation distincte — la vraie
 * protection quota est `revalidate` ci-dessous (cache HTTP partagé entre
 * tous les visiteurs, pas par session).
 *
 * pageInfo.totalResults (retourné par CET appel, déjà filtré) remplace
 * l'ancien appel séparé à channels.list?part=statistics : plus précis
 * quand un filtre est actif, et une requête réseau en moins.
 */
export async function getTvPageData(
    page: number = 1,
    pageToken?: string,
    filters: TvFilters = {}
): Promise<TvData | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error('wpApi.tv [getTvPageData]: YOUTUBE_API_KEY missing from environment variables');
        return null;
    }

    const { query, order = 'date', publishedAfter, publishedBefore } = filters;

    const url =
        `${YOUTUBE_API_BASE}/search` +
        `?part=snippet` +
        `&channelId=${CHANNEL_ID}` +
        `&order=${order}` +
        `&type=video` +
        `&maxResults=${VIDEOS_PER_PAGE}` +
        (query ? `&q=${encodeURIComponent(query)}` : '') +
        (publishedAfter ? `&publishedAfter=${publishedAfter}` : '') +
        (publishedBefore ? `&publishedBefore=${publishedBefore}` : '') +
        (pageToken ? `&pageToken=${pageToken}` : '') +
        `&key=${apiKey}`;

    // revalidate 1h : les nouvelles vidéos n'ont pas besoin d'apparaître à la
    // seconde près, et ça réduit fortement la consommation de quota.
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
        console.error(`Erreur wpApi.tv [getTvPageData]: ${res.status}`);
        return null;
    }

    const data: YouTubeSearchResponse = await res.json();

    const videos: TvVideo[] = data.items.map((item) => {
        const thumb =
            item.snippet.thumbnails.high ??
            item.snippet.thumbnails.medium ??
            item.snippet.thumbnails.default;

        return {
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: thumb?.url ?? '',
            publishedAt: formatDisplayDate(item.snippet.publishedAt),
            href: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        };
    });

    const totalResults = data.pageInfo?.totalResults ?? 0;
    const totalPages = totalResults > 0 ? Math.ceil(totalResults / VIDEOS_PER_PAGE) : 0;

    return {
        videos,
        pagination: {
            currentPage: page,
            totalPages,
            basePath: '/tv',
        },
        nextPageToken: data.nextPageToken ?? null,
        prevPageToken: data.prevPageToken ?? null,
    };
}
