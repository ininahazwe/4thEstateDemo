export interface StoriesArticle {
    id: string;
    href: string;
    title: string;
    tagOrCategory: string;
    section: 'stories';
    model: 'story' | 'story light';
    type: 'stories';
    index: number;
    image?: {
        src: string;
        width: number;
        height: number;
        fetchPriority?: 'high' | 'low' | 'auto';
        blurDataURL?: string;
    };

}