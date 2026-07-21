import { type VideoItem } from '../components/VideoZone/types';

// ---------------------------------------------------------------------------
// wpApi.videoZone.ts — dédié à la section "Vidéo" de la homepage (VideoZone).
// Fichier indépendant, aucune donnée WordPress ici — uniquement YouTube Data
// API v3 (playlistItems.list), même convention que wpApi.tv.ts.
//
// Playlist dédiée (curée dans YouTube Studio — ajouter/retirer/réordonner
// une vidéo suffit, pas de post WP à créer) :
// https://www.youtube.com/playlist?list=PLtAIl5lP0w8uYuyh-w7EHdm39cNtX0I95
//
// Durée volontairement pas récupérée : nécessiterait un second appel
// (videos.list?part=contentDetails) pour un gain jugé pas pertinent ici.
// Le champ VideoItem.duration reste simplement vide (déjà optionnel,
// VideoZone.tsx masque déjà la ligne durée quand absente).
// ---------------------------------------------------------------------------

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const PLAYLIST_ID = 'PLtAIl5lP0w8uYuyh-w7EHdm39cNtX0I95';
const MAX_RESULTS = 10;

interface YouTubePlaylistItem {
    snippet: {
        title: string;
        resourceId: { videoId: string };
    };
}

interface YouTubePlaylistItemsResponse {
    items: YouTubePlaylistItem[];
}

export async function getVideoZoneItems(): Promise<VideoItem[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error('wpApi.videoZone [getVideoZoneItems]: YOUTUBE_API_KEY missing from environment variables');
        return [];
    }

    try {
        const res = await fetch(
            `${YOUTUBE_API_BASE}/playlistItems` +
            `?part=snippet` +
            `&playlistId=${PLAYLIST_ID}` +
            `&maxResults=${MAX_RESULTS}` +
            `&key=${apiKey}`,
            { next: { revalidate: 3600 } }
        );

        if (!res.ok) {
            const body = await res.text();
            console.error(`Erreur wpApi.videoZone [getVideoZoneItems]: ${res.status} — ${body}`);
            return [];
        }

        const data: YouTubePlaylistItemsResponse = await res.json();

        return data.items
            .filter((item) => !!item.snippet.resourceId.videoId)
            .map((item) => ({
                id: item.snippet.resourceId.videoId,
                youtubeId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
            }));

    } catch (error) {
        console.error('Erreur wpApi.videoZone [getVideoZoneItems]:', error);
        return [];
    }
}
