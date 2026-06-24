export interface TvVideo {
    id: string; // YouTube video ID
    title: string;
    thumbnail: string; // URL miniature haute résolution
    publishedAt: string; // pré-formatée pour l'affichage
    href: string; // /tv/{videoId} ou lien YouTube direct, selon décision plus tard
}

export interface TvPagination {
    currentPage: number;
    /**
     * L'API YouTube fonctionne par pageToken, pas par numéro de page — on ne
     * connaît jamais le nombre total réel de pages à l'avance (YouTube ne le
     * fournit pas). totalPages ici est une ESTIMATION haute basée sur le
     * nombre total de vidéos de la chaîne (channel.statistics.videoCount),
     * suffisante pour afficher une pagination numérotée classique, mais la
     * navigation réelle reste pilotée par les tokens (voir TvData.nextPageToken).
     */
    totalPages: number;
    basePath: string; // /tv
}

export interface TvData {
    videos: TvVideo[];
    pagination: TvPagination;
    /** Token à utiliser pour récupérer la page suivante. null si dernière page. */
    nextPageToken: string | null;
    /** Token à utiliser pour récupérer la page précédente. null si première page. */
    prevPageToken: string | null;
}