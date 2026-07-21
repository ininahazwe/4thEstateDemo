export interface PodcastEpisode {
    id: string;
    title: string;
    description: string;
    cover: string; // URL de la cover (carrée)
    publishedAt: string; // pré-formatée pour l'affichage
    publishedAtISO: string; // date brute (release_date Spotify), pour tri/filtre année
    spotifyUrl: string; // lien externe vers Spotify (fallback / "Open in Spotify")
}