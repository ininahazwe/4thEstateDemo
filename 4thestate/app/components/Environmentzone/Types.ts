export interface EnvironmentArticleImage {
    src: string;
    srcSet?: string;
    width: number;
    height: number;
    blurDataURL?: string;
    fetchPriority?: 'high' | 'low' | 'auto';
}

export interface EnvironmentArticle {
    id: string;
    href: string;
    title: string;
    tagOrCategory: string;
    source?: string;
    section: 'environment';
    model: 'article-vertical';
    type: 'article';
    index: number;
    image?: EnvironmentArticleImage;
}