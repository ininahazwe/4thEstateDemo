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
 * Fetch total public videos from channel, used only to estimate page count
 * in UI (YouTube API doesn't provide "totalPages" — only total results).
 * Long cache (videos published rarely enough to justify 1h).
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
 * Fetch one page of channel videos, sorted by date (newest first).
 * Navigation via pageToken (see Pagination.tsx for YouTube API constraint details).
 *
 * search.list costs 100 quota units per call (free quota: 10k/day = 100 calls/day).
 * No React.cache() here since each (page, token) is already different variation.
 * Real quota protection is `revalidate` below (shared HTTP cache across all
 * visitors, not per-session).
 */
export async function getTvPageData(
    page: number = 1,
    pageToken?: string
): Promise<TvData | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error('wpApi.tv [getTvPageData]: YOUTUBE_API_KEY missing from environment variables');
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