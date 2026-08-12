export interface HealthArticle {
    id: string;
    href: string;
    title: string;
    tagOrCategory: string;
    source?: string;
    section: 'health';
    model: 'article' | 'article-vertical';
    type: 'article';
    index: number;
    image?: {
        src: string;
        srcSet?: string;
        width: number;
        height: number;
        blurDataURL?: string;
        fetchPriority?: 'high' | 'low' | 'auto';
    };
}
