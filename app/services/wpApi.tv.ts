import { type TvData, type TvVideo } from '../components/TV/Types';

// ---------------------------------------------------------------------------
// wpApi.tv.ts — fichier dédié à la page /tv, totalement indépendant de
// wpApi.ts/wpApi.article.ts/wpApi.author.ts (aucune donnée WordPress ici,
// uniquement la YouTube Data API v3).
//
// Chaîne : The Fourth Estate (Media Foundation for West Africa)
// Channel ID confirmé : UCpBu6CkAnlvCAM4CSF9ZKBg
// Handle : @thefourthestate2372
//
// Nécessite la variable d'environnement YOUTUBE_API_KEY (clé API Google
// Cloud avec YouTube Data API v3 activée, restreinte à cette API).
// ---------------------------------------------------------------------------

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_ID = 'UCpBu6CkAnlvCAM4CSF9ZKBg';
const VIDEOS_PER_PAGE = 12; // grille 3 colonnes x 4 lignes

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

interface YouTubeChannelStatsResponse {
    items: Array<{ statistics: { videoCount: string } }>;
}

function formatDisplayDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Récupère le nombre total de vidéos publiques de la chaîne, utilisé
 * uniquement pour estimer un nombre de pages indicatif côté UI (l'API
 * YouTube ne fournit pas de "totalPages" — seulement un total de résultats).
 * Mise en cache longue (vidéos publiées rarement assez pour justifier 1h).
 */
async function getChannelVideoCount(apiKey: string): Promise<number> {
    const res = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=statistics&id=${CHANNEL_ID}&key=${apiKey}`,
        { next: { revalidate: 3600 } }
    );
    if (!res.ok) return 0;
    const data: YouTubeChannelStatsResponse = await res.json();
    return Number(data.items[0]?.statistics.videoCount ?? 0);
}

/**
 * Récupère une page de vidéos de la chaîne, triées par date (plus récentes
 * d'abord). Navigation via pageToken (voir Pagination.tsx pour le détail de
 * cette contrainte de l'API YouTube).
 *
 * search.list coûte 100 quota units par appel (sur un quota gratuit de
 * 10 000/jour, soit 100 appels/jour) — pas de React.cache() ici car chaque
 * (page, token) est déjà une variation différente ; le vrai garde-fou contre
 * l'épuisement du quota est le `revalidate` ci-dessous (cache HTTP partagé
 * entre tous les visiteurs, pas par session).
 */
export async function getTvPageData(
    page: number = 1,
    pageToken?: string
): Promise<TvData | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error('wpApi.tv [getTvPageData]: YOUTUBE_API_KEY manquante dans les variables d\'environnement');
        return null;
    }

    const url =
        `${YOUTUBE_API_BASE}/search` +
        `?part=snippet` +
        `&channelId=${CHANNEL_ID}` +
        `&order=date` +
        `&type=video` +
        `&maxResults=${VIDEOS_PER_PAGE}` +
        (pageToken ? `&pageToken=${pageToken}` : '') +
        `&key=${apiKey}`;

    const [searchRes, videoCount] = await Promise.all([
        // revalidate 1h : les nouvelles vidéos n'ont pas besoin d'apparaître
        // à la seconde près, et ça réduit fortement la consommation de quota.
        fetch(url, { next: { revalidate: 3600 } }),
        getChannelVideoCount(apiKey),
    ]);

    if (!searchRes.ok) {
        console.error(`Erreur wpApi.tv [getTvPageData]: ${searchRes.status}`);
        return null;
    }

    const data: YouTubeSearchResponse = await searchRes.json();

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

    const totalPages = videoCount > 0 ? Math.ceil(videoCount / VIDEOS_PER_PAGE) : 0;

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