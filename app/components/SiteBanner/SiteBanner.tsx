import { bannerStaticTag } from './bannerData';
import { type ArticleDataBanner } from './types';
import { type BannerCategory } from '@/app/services/wpApi';

interface SiteBannerProps {
    articles: ArticleDataBanner[];
    categories: BannerCategory[];
}

export default function SiteBanner({ articles, categories }: SiteBannerProps) {
    return (
        <div className="site-banner">
            {/* Section des catégories (Tags) — dynamiques (WP) + TV en dur à la fin */}
            <div className="banner-hot-tags">
                <div className="item-list">
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

                    <a
                        href={bannerStaticTag.href}
                        className={`item ${bannerStaticTag.type ? bannerStaticTag.type : ''} ithalc`.trim()}
                        data-ithalc="[cta_nav_banner]"
                        data-ithal={bannerStaticTag.ithal}
                    >
                        {bannerStaticTag.icon && (
                            <bannerStaticTag.icon size={16} style={{ marginRight: 6 }} aria-hidden="true" />
                        )}
                        {bannerStaticTag.label}
                    </a>
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