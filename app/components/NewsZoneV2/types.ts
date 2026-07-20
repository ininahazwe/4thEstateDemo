export interface ArticleImage {
    src: string;
    srcSet?: string;
    width: number;
    height: number;
    blurDataURL?: string;
    fetchPriority?: "high" | "low" | "auto";
}

export interface ArticleData {
    id: string;
    href: string;
    title: string;
    // Remplacement de strapline par une gestion de tags / catégories
    tagOrCategory: string;
    source?: string;
    section: 'geopolitique' | 'economie' | 'societe' | 'politique' | 'culture';
    model: 'article' | 'article-vertical';
    type: 'article' | 'sirius-live';
    index: number;
    image?: {
        src: string;
        srcSet: string;
        width: number;
        height: number;
        blurDataURL?: string;
        fetchPriority?: 'high' | 'low' | 'auto';
    };
    // Premium a été supprimé ici
}