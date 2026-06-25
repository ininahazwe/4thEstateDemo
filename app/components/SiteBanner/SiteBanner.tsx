import { type ArticleDataBanner } from './types';
import { type BannerCategory } from '@/app/services/wpApi';
import { bannerStaticTags } from "@/app/components/SiteBanner/bannerData";

interface SiteBannerProps {
    articles: ArticleDataBanner[];
    categories: BannerCategory[];
}

export default function SiteBanner({ articles, categories }: SiteBannerProps) {
    return (
        <div className="site-banner">
            {/* Section des catégories (Tags) — dynamiques (WP) + Tags statiques en dur à la fin */}
            <div className="banner-hot-tags">
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

            {/* Section des articles récents */}
            <div className="banner-hot-articles">
                <div className="item-list">
                    {articles && articles.length > 0 ? (
                        articles.map((article) => (
                            <div className="item" key={article.id}>
                                <div className="item-tag">
                                    <span className="time">{article.source}</span>
                                </div>
                                <a href={article.href} className="item-title">
                                    {article.title}
                                </a>
                            </div>
                        ))
                    ) : (
                        <p className="no-articles" style={{ padding: '0 10px', fontSize: '14px', color: '#888' }}>
                            No recent news.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}