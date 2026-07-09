import { type ArticleDataBanner } from './types';
import { type BannerCategory } from '@/app/services/wpApi';
import { bannerStaticTags } from "@/app/components/SiteBannerV2/bannerData";
import Image from 'next/image';

interface SiteBannerProps {
    articles: ArticleDataBanner[];
    categories: BannerCategory[];
}

// Données statiques temporaires — 4 items, le temps de valider la maquette
// avec vignette carrée. À remplacer par les vraies données (WP) une fois validé.
const staticThumbArticles = [
    {
        id: 'static-1',
        href: '#',
        title: 'Inside the big push contracts',
        description: 'All all our investigations and articles on the Gov\'t flagship road projects',
        image: '/assets/thumbnails/1.png',
    },
    {
        id: 'static-2',
        href: '#',
        title: 'Podcast',
        description: 'Listen to our latest podcast story or episode',
        image: '/assets/thumbnails/podcast.jpg',
    },
    {
        id: 'static-3',
        href: '#',
        title: 'Upcoming stories & exclusives',
        description: 'Le gouvernement annonce une réforme majeure des retraites',
        image: '/assets/thumbnails/news.png',
    },
    {
        id: 'static-4',
        href: '#',
        title: 'Upcoming stories & exclusives',
        description: 'Le gouvernement annonce une réforme majeure des retraites',
        image: '/assets/thumbnails/journalists.jpeg',
    },
];

export default function SiteBannerV2({ categories }: SiteBannerProps) {
    return (
        <div className="site-banner">
            {/* Section des catégories (Tags) — dynamiques (WP) + Tags statiques en dur à la fin */}
            <div className="banner-hot-tags" style={{marginBottom: "20px"}}>
                <div className="item-list">
                    {/* 1. Vos catégories dynamiques WordPress */}
                    {categories.map((cat) => (
                        <a
                            key={cat.slug}
                            href={cat.href}
                            className="item ithalc"
                            data-ithalc="[cta_nav_banner]"
                            data-ithal={cat.slug}
                        >
                            {cat.label}
                        </a>
                    ))}

                    {/* 2. Vos tags statiques (TV, Podcasts, etc.) bouclés dynamiquement */}
                    {bannerStaticTags.map((tag) => (
                        <a
                            key={tag.ithal} // Utilisation de ithal ou href comme clé unique
                            href={tag.href}
                            className={`item ${tag.type ? tag.type : ''} ithalc`.trim()}
                            data-ithalc="[cta_nav_banner]"
                            data-ithal={tag.ithal}
                        >
                            {tag.icon && (
                                <tag.icon size={16} style={{ marginRight: 6, marginBottom: -3 }} aria-hidden="true" color={tag.iconColor}/>
                            )}
                            {tag.label}
                        </a>
                    ))}
                </div>
            </div>

            <div className="banner-hot-articles banner-hot-articles--thumbs">
                <div className="item-list">
                    {staticThumbArticles.map((article) => (
                        <div className="item" key={article.id}>
                            {/* item-tag masqué le temps de valider la maquette vignette */}
                            {/* <div className="item-tag">
                                <span className="time">{article.source}</span>
                            </div> */}
                            <div className="item-thumb">
                                <Image
                                    src={article.image}
                                    alt=""
                                    width={44}
                                    height={44}
                                />
                            </div>

                            <a href={article.href} className="item-title">
                                <div className="item-tag">
                                    <span className="time">{article.title}</span>
                                </div>
                                {article.description}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}