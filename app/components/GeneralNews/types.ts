export interface GeneralNewsImage {
    src: string;
    srcSet?: string;
    width: number;
    height: number;
    fetchPriority?: 'high' | 'low' | 'auto';
}

export interface GeneralNewsArticle {
    id: string;
    href: string;
    title: string;
    tagOrCategory: string;
    source?: string;
    section: 'general-news' | 'politics' | 'economy' | 'society' | 'culture';
    model: 'article-vertical';
    type: 'article' | 'sirius-live';
    index: number;
    image?: GeneralNewsImage;
}