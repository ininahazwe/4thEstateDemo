export interface HumanRightsArticle {
    id: string;
    href: string;
    title: string;
    tagOrCategory: string;
    source?: string;
    section: 'human-gith';
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