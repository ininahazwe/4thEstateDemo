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
    /** @deprecated pagination classique remplacée par "Load more", champ conservé côté data only */
    pagination: CategoryPagination;
}