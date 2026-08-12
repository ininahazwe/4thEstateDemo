'use client';

import { type HealthArticle } from './Types';
import Image from 'next/image';
import TTSButton from '@/app/components/UI/TTSButton';
import BookmarkButton from '@/app/components/UI/BookmarkButton';

interface HealthCardProps {
    article: HealthArticle;
}

/**
 * Carte de la zone Health — copie conforme de HumanRightCard.
 *
 * Deux nettoyages par rapport à l'original : les imports lucide-react
 * (Globe, Headphones, Bookmark) qui n'étaient plus utilisés, et les blocs
 * JSX commentés (strapline, source) qu'ils servaient. Le rendu est identique.
 */
export default function HealthCard({ article }: HealthCardProps) {
    const titleId = `title-${article.id}-${article.index}`;
    const slug = article.href.split('/').filter(Boolean).pop() ?? String(article.id);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.classList.add('img--error');
    };

    return (
        <article
            className="item"
            data-model={article.model}
            data-type={article.type}
            data-section={article.section}
            data-index={article.index}
            data-item-id={article.id}
        >
            <a href={article.href}>
                {article.image && (
                    <div className="item-image">
                        <picture>
                            <Image
                                src={article.image.src}
                                width={article.image.width}
                                height={article.image.height}
                                placeholder="blur"
                                blurDataURL={article.image.blurDataURL}
                                fetchPriority={article.image.fetchPriority as 'high' | 'auto' | 'low'}
                                loading={article.image.fetchPriority === 'high' ? 'eager' : 'lazy'}
                                alt=""
                                onError={handleImageError}
                            />
                        </picture>
                    </div>
                )}

                <div className="item-text">
                    <div className="heading">
                        <p id={titleId} className="title">
                            {article.title}
                        </p>
                    </div>

                    <div className="infos">
                        <div className="wrapper"></div>
                        <div className="placeholders">
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </a>

            <div className="item-buttons">
                <TTSButton
                    titleId={titleId}
                    showLabel={false}
                    showStopButton={false}
                />
                <BookmarkButton
                    articleId={article.id}
                    slug={slug}
                    title={article.title}
                    link={article.href}
                    imageUrl={article.image?.src}
                    category={article.tagOrCategory}
                />
            </div>
        </article>
    );
}
