export interface ArticleImage {
    src: string;
    srcSet?: string;
    width: number;
    height: number;
    fetchPriority?: "high" | "low" | "auto";
}

export interface ArticleDataBanner {
    id: string;
    href: string;
    title: string;
    tagOrCategory: string;
    source?: string;
    section: 'geopolitique' | 'economie' | 'societe' | 'politique' | 'culture';
    model: 'article' | 'article-vertical';
    type: 'article' | 'sirius-live';
    index: number;
    image?: ArticleImage;
}