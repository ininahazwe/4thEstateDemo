export interface CategoryArticleImage {
    src: string;
    srcSet?: string;
    width: number;
    height: number;
    fetchPriority?: 'high' | 'auto' | 'low';
    blurDataURL?: string;
}

export interface CategoryArticle {
    id: string;
    href: string;
    title: string;
    /** Catégorie/tag affiché en strapline au-dessus du titre (ex: "Politics") */
    source: string;
    publishedAt: string; // pré-formatée pour l'affichage, ex. "22 June 2026"
    image?: CategoryArticleImage;
    isPremium?: boolean;
    imagePriority?: 'high' | 'auto' | 'low';
}

export interface CategoryTag {
    label: string;
    href: string;
}

export interface CategoryPagination {
    currentPage: number;
    totalPages: number;
    basePath: string; // ex: /category/anti-corruption
}

export interface CategoryData {
    title: string;
    slug: string;
    seoDescription?: string;
    tags: CategoryTag[];
    articles: CategoryArticle[];
    /** true s'il reste des articles au-delà de ce premier lot (pilote le bouton "Load more") */
    hasMore: boolean;
    /**
     * Offset WordPress à envoyer au prochain "Load more" = nombre de posts
     * RÉELLEMENT consommés côté WP pour produire `articles`.
     *
     * ⚠️ Ce n'est pas `articles.length` : les posts `format=video` sont écartés
     * après la requête, donc WP en sert plus qu'on n'en affiche. Recalculer
     * l'offset depuis la longueur de la liste affichée re-servait les posts
     * filtrés au clic suivant (doublons de key React, articles répétés).
     */
    nextOffset: number;
    /** Pagination classique (page/totalPages) — plus utilisée côté UI, "Load more" s'appuie sur hasMore. Conservée pour usage interne éventuel. */
    pagination: CategoryPagination;
}