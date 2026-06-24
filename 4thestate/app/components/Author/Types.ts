// Réutilise le même type d'article que la page catégorie (CategoryArticle) :
// même carte, même river, même pagination. On ne réimporte pas tout depuis
// Category/Types.ts pour garder Author/ totalement indépendant et facile à
// faire évoluer séparément (ex: si la page auteur a besoin d'un champ propre
// plus tard, comme une bio, on ne touche pas à Category/Types.ts).

export interface AuthorArticleImage {
    src: string;
    srcSet?: string;
    width: number;
    height: number;
    fetchPriority?: 'high' | 'auto' | 'low';
    blurDataURL?: string;
}

export interface AuthorArticle {
    id: string;
    href: string;
    title: string;
    /** Catégorie/tag affiché en strapline au-dessus du titre (ex: "Analysis") */
    source: string;
    publishedAt: string; // pré-formatée pour l'affichage, ex. "23 June 2026"
    image?: AuthorArticleImage;
    isPremium?: boolean;
    imagePriority?: 'high' | 'auto' | 'low';
}

export interface AuthorPagination {
    currentPage: number;
    totalPages: number;
    basePath: string; // ex: /author/mamavi-sephakor-tay
}

export interface AuthorData {
    name: string;
    slug: string;
    articles: AuthorArticle[];
    pagination: AuthorPagination;
}