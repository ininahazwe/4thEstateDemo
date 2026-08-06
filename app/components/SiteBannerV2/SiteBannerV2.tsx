import { type ArticleDataBanner } from './types';
import { type BannerCategory } from '@/app/services/wpApi';
import { bannerStaticTags } from "@/app/components/SiteBannerV2/bannerData";
import BannerHighlights from './BannerHighlights'; // Adaptez le chemin si nécessaire

interface SiteBannerProps {
    articles?: ArticleDataBanner[];
    categories: BannerCategory[];
    showHighlights?: boolean; // Prop pour contrôler l'affichage
}

export default async function SiteBannerV2({
                                               categories,
                                               showHighlights = true
                                           }: SiteBannerProps) {
    return (
        <div className="site-banner">
            {/* Section des catégories (Tags) — dynamiques (WP) + Tags statiques en dur à la fin */}
            <div className="banner-hot-tags" style={{ marginBottom: "20px" }}>
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
                            key={tag.ithal}
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

            {/* Affichage conditionnel du composant des articles / highlights */}
            {showHighlights && <BannerHighlights />}
        </div>
    );
}