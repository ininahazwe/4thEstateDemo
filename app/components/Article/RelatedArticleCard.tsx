import Link from "next/link";
import {WpArticleCard} from "@/app/services/wpApi.article";

export default function RelatedArticleCard({
    strapline,
    title,
    href,
    image,
    isPremium,
}: WpArticleCard) {
    return (
        <article className="related-card">
            <Link href={href}>
                {image && (
                    <div className="related-card-img">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="" loading="lazy" />
                    </div>
                )}
                <div className="related-card-body">
                    {isPremium && <span className="badge-premium">Abonnés</span>}
                    {strapline && <p className="related-card-strapline">{strapline}</p>}
                    <p className="related-card-title">{title}</p>
                </div>
            </Link>
        </article>
    );
}
