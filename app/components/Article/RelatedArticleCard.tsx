import Link from "next/link";
import {WpArticleCard} from "@/app/services/wpApi.article";

export default function RelatedArticleCard({
    category,
    title,
    href,
    image,
}: WpArticleCard) {
    return (
        <article className="item" data-model="article-vertical" data-type="default">
            <Link href={href}>
                {image && (
                    <div className="item-image">
                        <picture>
                            <img src={image} alt="" loading="lazy" />
                        </picture>
                    </div>
                )}
                <div className="item-text">
                    <div className="heading">
                        <p className="title">{category && <span className="strapline">{category}. </span>}
                        {title}</p>
                    </div>
                </div>
            </Link>
        </article>
    );
}
