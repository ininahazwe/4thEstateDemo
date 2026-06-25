// ---------------------------------------------------------------------------
// getLatestPodcastEpisode — À ajouter dans le même fichier que
// getSpotifyShowEpisodes (app/services/getSpotifyShowEpisodes.ts) pour
// réutiliser le même client/token Spotify déjà en place, plutôt que de
// dupliquer l'authentification dans un fichier séparé.
//
// Hypothèse à vérifier : getSpotifyShowEpisodes() retourne déjà les épisodes
// triés du plus récent au plus ancien (comportement standard de l'API
// Spotify Shows /episodes). Si ce n'est pas le cas chez toi, trie par
// release_date avant de prendre le premier élément.
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