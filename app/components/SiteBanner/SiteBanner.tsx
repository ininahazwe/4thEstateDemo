import { bannerTags } from './bannerData';
// 1. Importez le bon type utilisé par votre fonction API
import { type ArticleDataBanner } from './types';

// 2. Mettez à jour l'interface des props ici
interface SiteBannerProps {
    articles: ArticleDataBanner[]; // Remplacement de HotArticle[] par ArticleDataBanner[]
}

export default function SiteBanner({ articles }: SiteBannerProps) {
    return (
        <div className="site-banner">
            {/* Section des catégories (Tags) */}
            <div className="banner-hot-tags">
                <div className="item-list">
                    {bannerTags.map((tag, index) => {
                        const className = `item ${tag.type ? tag.type : ''} ithalc`.trim();

                        return (
                            <a
                                key={index}
                                href={tag.href}
                                className={className}
                                data-ithalc="[cta_nav_banner]"
                                data-ithal={tag.ithal}
                                {...(tag.icon && { 'data-icon': tag.icon })}
                            >
                                {tag.label}
                            </a>
                        );
                    })}
                </div>
            </div>

            {/* Section des articles récents */}
            <div className="banner-hot-articles">
                <div className="item-list">
                    {articles && articles.length > 0 ? (
                        articles.map((article) => (
                            <div className="item" key={article.id}>
                                <div className="item-tag">
                                    {/* On affiche la date formatée qui est stockée dans 'source' */}
                                    <span className="time">{article.source}</span>
                                </div>
                                <a href={article.href} className="item-title">
                                    {article.title}
                                </a>
                            </div>
                        ))
                    ) : (
                        <p className="no-articles" style={{ padding: '0 10px', fontSize: '14px', color: '#888' }}>
                            Aucune actualité récente.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}