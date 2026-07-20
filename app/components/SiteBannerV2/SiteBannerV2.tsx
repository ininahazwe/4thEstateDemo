import { type ArticleDataBanner } from './types';
import { type BannerCategory } from '@/app/services/wpApi';
import { bannerStaticTags } from "@/app/components/SiteBannerV2/bannerData";
import { getHighlights } from '@/app/services/wpApi.highlight';
import Image from 'next/image';
import { HeadphonesIcon, PlayCircleIcon } from 'lucide-react';

interface SiteBannerProps {
    articles: ArticleDataBanner[];
    categories: BannerCategory[];
}

/** Icône par défaut quand pas de thumbnail (type podcast/video uniquement — serie/upcoming ont une vraie image). */
function HighlightFallbackIcon({ type }: { type: 'podcast' | 'video' }) {
    const Icon = type === 'podcast' ? HeadphonesIcon : PlayCircleIcon;
    return <Icon size={20} aria-hidden="true" />;
}

export default async function SiteBannerV2({ categories }: SiteBannerProps) {
    const highlights = await getHighlights(4);
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
                    {highlights.map((item) => (
                        <div className="item" key={item.id}>
                            <div className="item-thumb">
                                {item.thumbnail ? (
                                    <Image
                                        src={item.thumbnail}
                                        alt=""
                                        width={44}
                                        height={44}
                                    />
                                ) : (item.type === 'podcast' || item.type === 'video') ? (
                                    <Image
                                        src="/assets/img/podcast.jpg"
                                        alt=""
                                        width={44}
                                        height={44}
                                    />
                                ) : null}
                            </div>

                            <a href={item.href} className="item-title">
                                <div className="item-tag">
                                    <span className="time">{item.badge}</span>
                                </div>
                                {item.title}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}