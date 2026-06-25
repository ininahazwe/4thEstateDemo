export async function getSpotifyShowEpisodes() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const showId = "4YWOssmCac8ulV9LzDZIDp";

    if (!clientId || !clientSecret) {
        console.error("getSpotifyShowEpisodes: variables d'environnement Spotify manquantes.");
        return { items: [] };
    }

    // 1. Authentification pour obtenir le token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
        body: "grant_type=client_credentials",
        next: { revalidate: 3600 } // Cache le token pendant 1h
    });

    if (!tokenResponse.ok) {
        console.error(`getSpotifyShowEpisodes: échec d'authentification (status ${tokenResponse.status}).`);
        return { items: [] };
    }

    const { access_token } = await tokenResponse.json();

    // 2. Récupération des épisodes du Show
    const dataResponse = await fetch(`https://api.spotify.com/v1/shows/${showId}/episodes?limit=10`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        next: { revalidate: 86400 } // Mise à jour automatique du flux toutes les 24h
    });

    if (!dataResponse.ok) {
        console.error(`getSpotifyShowEpisodes: échec de récupération des épisodes (status ${dataResponse.status}).`);
        return { items: [] };
    }

    return dataResponse.json();
}

// ---------------------------------------------------------------------------
// getLatestPodcastEpisode — utilisée par LatestPodcastWidget.tsx (aside de
// la page article). Réutilise getSpotifyShowEpisodes() ci-dessus, donc le
// même client/token Spotify, plutôt que de dupliquer l'authentification.
// Trie explicitement par release_date décroissant avant de prendre le
// premier élément, par sécurité si l'API ne garantit pas l'ordre
// chronologique (comportement standard de l'API Spotify Shows : déjà du
// plus récent au plus ancien, mais le tri explicite coûte peu et protège
// contre un changement de comportement côté Spotify).
// ---------------------------------------------------------------------------

import { type PodcastEpisode } from '@/app/components/Podcasts/Types';

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

export async function getLatestPodcastEpisode(): Promise<PodcastEpisode | null> {
    try {
        const data = await getSpotifyShowEpisodes();
        const episodes: SpotifyEpisode[] = data?.items ?? [];
        if (!episodes.length) return null;

        const sorted = [...episodes].sort(
            (a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
        );

        return mapToPodcastEpisode(sorted[0]);
    } catch (error) {
        console.error('getLatestPodcastEpisode:', error);
        return null;
    }
}