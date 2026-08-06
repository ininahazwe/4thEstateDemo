import Image from 'next/image';
import { CategoryArticle } from './Types';
import TTSButton from '@/app/components/UI/TTSButton';
import BookmarkButton from '@/app/components/UI/BookmarkButton';

interface CategoryArticleCardProps {
    article: CategoryArticle;
    highlight?: boolean;
}

export default function CategoryArticleCard({ article, highlight = false }: CategoryArticleCardProps) {
    const { href, title, source, publishedAt, image, isPremium, imagePriority = 'auto' } = article;
    const titleId = `title-${article.id}`;
    const slug = href.split('/').filter(Boolean).pop() ?? String(article.id);

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
                        <p id={titleId} className="title">
                            {title}
                        </p>
                    </div>

                    <div className="infos">
                        <div className="wrapper">
                            {/*{article.source && (
                                <span className="source">
                                    <Globe
                                        size={14}
                                        strokeWidth={2}
                                        aria-hidden="true"
                                        style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}
                                    />
                                    <span style={{ verticalAlign: 'middle' }}>{article.source}</span>
                                </span>
                            )}*/}
                        </div>
                        <div className="placeholders">
                            <TTSButton
                                titleId={titleId}
                                showLabel={false}
                                showStopButton={false}
                            />
                            <BookmarkButton
                                articleId={article.id}
                                slug={slug}
                                title={title}
                                link={href}
                                imageUrl={image?.src}
                                category={source}
                            />
                        </div>
                    </div>
                </div>
            </a>
        </article>
    );
}