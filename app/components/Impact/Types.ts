export interface OurImpactArticle {
    id: string;
    href: string;
    title: string;
    tagOrCategory: string;
    section: 'our-impact';
    model: 'article';
    type: 'default';
    index: number;
    /** Vignette du post. Meme forme que les autres zones (cf. buildImage
     *  dans wpApi.ts). Optionnelle : un post sans image mise en avant
     *  s'affiche sans vignette, la carte reste valide. */
    image?: {
        src: string;
        srcSet?: string;
        width: number;
        height: number;
        blurDataURL?: string;
        fetchPriority?: 'high' | 'low' | 'auto';
    };
}