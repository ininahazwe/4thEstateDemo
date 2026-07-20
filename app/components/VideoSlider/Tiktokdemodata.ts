// ---------------------------------------------------------------------------
// Types du slider "Video Stories" — alimenté par le CPT "video-story"
// (voir app/services/wpApi.videoStory.ts). Multi-plateforme : TikTok,
// YouTube… détecté automatiquement depuis l'URL, pas besoin de champ dédié.
// ---------------------------------------------------------------------------

export type VideoPlatform = 'tiktok' | 'youtube' | 'unknown';

export interface VideoStoryItem {
    id: string;
    url: string;
    platform: VideoPlatform;
    /** Optionnel : si absent, rempli automatiquement (oEmbed TikTok, ou vide pour YouTube — voir TikTokStoriesSlider.tsx). */
    caption?: string;
    /** Image de fond affichée derrière l'embed pendant son chargement. */
    thumbnail?: string;
    /** Durée affichée façon "1:42", purement visuelle. */
    duration?: string;
}

export function detectPlatform(url: string): VideoPlatform {
    if (/tiktok\.com/i.test(url)) return 'tiktok';
    if (/(youtube\.com|youtu\.be)/i.test(url)) return 'youtube';
    return 'unknown';
}

const YOUTUBE_ID_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/;

export function extractYouTubeId(url: string): string {
    return url.match(YOUTUBE_ID_REGEX)?.[1] ?? '';
}

/** Thumbnail YouTube prévisible, pas besoin d'appel oEmbed contrairement à TikTok. */
export function getYouTubeThumbnail(url: string): string | undefined {
    const id = extractYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
}
