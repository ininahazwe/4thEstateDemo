import Image from 'next/image';
import { SearchArticle } from './Types';

interface SearchArticleCardProps {
    article: SearchArticle;
    highlight?: boolean;
}

export default function SearchArticleCard({ article, highlight = false }: SearchArticleCardProps) {
    const { href, title, source, publishedAt, image, imagePriority = 'auto' } = article;

    return (
        <article
            className={highlight ? 'item highlight' : 'item'}
            data-model={highlight ? 'article-vertical' : 'article'}
            data-type="article"
            data-item-id={article.id}
        >
            <a href={href}>
                {image && (
                    <div className="item-image">
                        <picture>
                            <Image
                                src={image.src}
                                alt={title}
                                width={image.width}
                                height={image.height}
                                fetchPriority={imagePriority === 'high' ? 'high' : undefined}
                                loading={imagePriority === 'high' ? 'eager' : 'lazy'}
                                placeholder={image.blurDataURL ? 'blur' : undefined}
                                blurDataURL={image.blurDataURL}
                            />
                        </picture>
                    </div>
                )}

                <div className="item-text">
                    <div className="heading">
                        <span className="strapline">{source} -</span>
                        <p id={`title-${article.id}`} className="title">
                            {title}
                        </p>
                    </div>

                    <div className="infos">
                        <div className="wrapper">
                            <span className="source" data-icon="earth-americas">
                                {source}
                            </span>
                            <span className="date" data-icon="calendar-days">
                                {publishedAt}
                            </span>
                        </div>
                        <div className="placeholders">
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </a>
        </article>
    );
}
