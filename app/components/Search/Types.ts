export interface SearchArticleImage {
    src: string;
    width: number;
    height: number;
    fetchPriority?: 'high' | 'auto' | 'low';
    blurDataURL?: string;
}

export interface SearchArticle {
    id: string;
    href: string;
    title: string;
    /** Catégorie/tag affiché en strapline au-dessus du titre (ex: "Politics") */
    source: string;
    publishedAt: string; // pré-formatée pour l'affichage, ex. "22 Jun 2026"
    image?: SearchArticleImage;
    imagePriority?: 'high' | 'auto' | 'low';
}

export interface SearchPagination {
    currentPage: number;
    totalPages: number;
}

export interface SearchData {
    query: string;
    from: string; // YYYY-MM-DD (renvoyé tel quel pour re-remplir le formulaire)
    to: string;   // YYYY-MM-DD
    articles: SearchArticle[];
    total: number; // nombre total de résultats (header X-WP-Total)
    pagination: SearchPagination;
    /**
     * Présent uniquement si la requête telle que saisie n'a donné aucun
     * résultat et qu'une correction orthographique (fautes de frappe) a été
     * retentée avec succès — contient alors le texte original saisi, tandis
     * que `query` porte la version corrigée effectivement utilisée.
     */
    correctedFrom?: string;
}
