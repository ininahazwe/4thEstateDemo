// ---------------------------------------------------------------------------
// DEPRECATED — plus utilisé. getLatestPodcastEpisode a bien été fusionnée
// dans app/services/getSpotifyShowEpisodes.ts comme prévu ci-dessous ;
// ArticleAside.tsx importe désormais cette version canonique. Fichier
// conservé pour référence, non importé nulle part.
// ---------------------------------------------------------------------------

import { type PodcastEpisode } from '@/app/components/Podcasts/Types';
import {getSpotifyShowEpisodes} from "@/app/services/getSpotifyShowEpisodes";

interface SpotifyEpisode {
    id: string;
    name: string;
    description: string;
    release_date: string;
    images: { url: string }[];
    external_urls: { spotify: string };
}

function formatDisplayDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function mapToPodcastEpisode(episode: SpotifyEpisode): PodcastEpisode {
    return {
        id: episode.id,
        title: episode.name,
        description: episode.description,
        cover: episode.images?.[0]?.url ?? '',
        publishedAt: formatDisplayDate(episode.release_date),
        publishedAtISO: episode.release_date,
        spotifyUrl: episode.external_urls.spotify,
    };
}

/**
 * Récupère uniquement le dernier épisode publié, pour le widget aside de la
 * page article. Réutilise getSpotifyShowEpisodes() déjà existante plutôt
 * que d'appeler l'API Spotify séparément — pas de requête réseau
 * supplémentaire si cette fonction est déjà appelée ailleurs sur la même page.
 */
export async function getLatestPodcastEpisode(): Promise<PodcastEpisode | null> {
    try {
        const data = await getSpotifyShowEpisodes();
        const episodes = data?.items ?? [];
        if (!episodes.length) return null;

        // Si l'API ne garantit pas l'ordre chronologique, trie explicitement
        // par date de publication décroissante avant de prendre le premier.
        const sorted = [...episodes].sort(
            (a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
        );

        return mapToPodcastEpisode(sorted[0]);
    } catch (error) {
        console.error('Erreur getLatestPodcastEpisode:', error);
        return null;
    }
}