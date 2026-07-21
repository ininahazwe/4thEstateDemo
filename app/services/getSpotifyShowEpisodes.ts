import { type PodcastEpisode } from '@/app/components/Podcasts/Types';

const SPOTIFY_SHOW_ID = "4YWOssmCac8ulV9LzDZIDp";

async function getSpotifyAccessToken(): Promise<string | null> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("getSpotifyShowEpisodes: variables d'environnement Spotify manquantes.");
        return null;
    }

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
        return null;
    }

    const { access_token } = await tokenResponse.json();
    return access_token;
}

/**
 * Retour brut de l'endpoint GET /shows/{id}/episodes (limité aux champs
 * utilisés côté front — voir doc complète Spotify Web API pour le reste :
 * duration_ms, audio_preview_url, languages, etc. non exploités ici).
 */
export interface SpotifyEpisode {
    id: string;
    name: string;
    description: string;
    release_date: string;
    images: { url: string }[];
    external_urls: { spotify: string };
}

interface SpotifyEpisodesPage {
    items: SpotifyEpisode[];
    next: string | null;
}

/**
 * Récupère les N derniers épisodes (par défaut 10) — utilisée là où on n'a
 * besoin que d'un aperçu récent (widget "dernier épisode" par ex.), sans
 * payer le coût de paginer tout le catalogue.
 */
export async function getSpotifyShowEpisodes(limit: number = 10): Promise<SpotifyEpisodesPage> {
    const token = await getSpotifyAccessToken();
    if (!token) return { items: [], next: null };

    const dataResponse = await fetch(
        `https://api.spotify.com/v1/shows/${SPOTIFY_SHOW_ID}/episodes?limit=${limit}`,
        {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 86400 } // Mise à jour automatique du flux toutes les 24h
        }
    );

    if (!dataResponse.ok) {
        console.error(`getSpotifyShowEpisodes: échec de récupération des épisodes (status ${dataResponse.status}).`);
        return { items: [], next: null };
    }

    return dataResponse.json();
}

/**
 * Récupère TOUT le catalogue d'épisodes du show (pagination automatique via
 * offset, 50 par page = maximum autorisé par Spotify). Nécessaire pour que
 * recherche/tri/filtre année sur /podcasts portent sur l'ensemble des
 * épisodes, pas seulement le dernier lot chargé.
 *
 * Mise en cache 24h comme getSpotifyShowEpisodes — un nouvel épisode n'a pas
 * besoin d'apparaître à la minute près.
 */
export async function getAllSpotifyEpisodes(): Promise<SpotifyEpisode[]> {
    const token = await getSpotifyAccessToken();
    if (!token) return [];

    const PAGE_SIZE = 50;
    const all: SpotifyEpisode[] = [];
    let offset = 0;

    while (true) {
        const res = await fetch(
            `https://api.spotify.com/v1/shows/${SPOTIFY_SHOW_ID}/episodes?limit=${PAGE_SIZE}&offset=${offset}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                next: { revalidate: 86400 }
            }
        );

        if (!res.ok) {
            console.error(`getAllSpotifyEpisodes: échec (status ${res.status}, offset ${offset}).`);
            break;
        }

        const data: SpotifyEpisodesPage = await res.json();
        const items = data.items ?? [];
        all.push(...items);

        if (!data.next || items.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return all;
}

// ---------------------------------------------------------------------------
// Mapping SpotifyEpisode -> PodcastEpisode (format d'affichage front)
// ---------------------------------------------------------------------------

function formatDisplayDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function mapToPodcastEpisode(episode: SpotifyEpisode): PodcastEpisode {
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
 * Catalogue complet, mappé et trié du plus récent au plus ancien — utilisée
 * par /podcasts (recherche/tri/filtre année côté client sur la liste
 * complète, voir PodcastFilterRiver.tsx).
 */
export async function getAllPodcastEpisodes(): Promise<PodcastEpisode[]> {
    const episodes = await getAllSpotifyEpisodes();
    return episodes
        .map(mapToPodcastEpisode)
        .sort((a, b) => new Date(b.publishedAtISO).getTime() - new Date(a.publishedAtISO).getTime());
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
