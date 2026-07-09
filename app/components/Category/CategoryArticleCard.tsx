import Image from 'next/image';
import { CategoryArticle } from './Types';

interface CategoryArticleCardProps {
    article: CategoryArticle;
    highlight?: boolean;
}

export default function CategoryArticleCard({ article, highlight = false }: CategoryArticleCardProps) {
    const { href, title, source, publishedAt, image, isPremium, imagePriority = 'auto' } = article;

    return (
        <article
            className={highlight ? 'item highlight' : 'item'}
            data-model={highlight ? 'article-vertical' : 'article'}
            data-type="article"
            data-premium={isPremium ? '' : undefined}
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
                        {isPremium && <span className="sr-only">Subscriber-only article</span>}
                        {/*<span className="strapline">{source} -</span>*/}
                        <p id={`title-${article.id}`} className="title">
                            {title}
                        </p>
                    </div>

                    {/*<div className="infos">
                        <div className="wrapper">
                            <span className="source" data-icon="earth-americas">{source}</span>
                            <span className="date" data-icon="calendar-days">{publishedAt}</span>
                        </div>
                        <div className="placeholders">
                            <span></span>
                            <span></span>
                        </div>
                    </div>*/}
                </div>
            </a>

            <div className="item-buttons">
                <button
                    className="tts"
                    title="Listen to the article"
                    aria-describedby={`title-${article.id}`}
                    data-modal-open="tts-reserved"
                    data-audio-url=""
                    data-need-js=""
                >
              <span data-icon="headphones">
                <span className="sr-only">Listen to the article</span>
              </span>
                </button>
                <button
                    className="favorites"
                    data-article-favorite=""
                    data-in-favorites="false"
                    data-article-id={article.id}
                    data-modal-open="favorites-reserved"
                    title="Add to favorites"
                    aria-describedby={`title-${article.id}`}
                    data-icon="bookmark-off"
                    data-need-js=""
                >
                    <span className="action sr-only">Add to favorites</span>
                </button>
            </div>
        </article>
    );
}