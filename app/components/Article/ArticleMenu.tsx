import {bannerTags} from "@/app/components/SiteBanner/bannerData";

export default function ArticleMenu() {
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

        </div>
    );
}