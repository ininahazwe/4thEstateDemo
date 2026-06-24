'use client';

import { type StoriesArticle } from './types';
import { Bookmark } from 'lucide-react';
import Image from "next/image";

interface StoriesCardProps {
    article: StoriesArticle;
}

export default function StoriesCard({ article }: StoriesCardProps) {
    const titleId = `title-${article.id}-${article.index}`;

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
                                placeholder="blur"
                                blurDataURL={article.image.blurDataURL}
                                width={article.image.width}
                                height={article.image.height}
                                fetchPriority={article.image.fetchPriority}
                                loading={article.image.fetchPriority === 'high' ? undefined : 'lazy'}
                                onError={handleImageError}
                                alt=""
                            />
                        </picture>
                    </div>
                )}

                <div className="item-text">
                    <div className="heading">
                        <span className="sr-only">The Fourth Estate Stories</span>
                        {article.tagOrCategory && (
                            <span className="strapline">{article.tagOrCategory} -</span>
                        )}
                        <p id={titleId} className="title">
                            {article.title}
                        </p>
                    </div>

                    <div className="infos">
                        <div className="wrapper"></div>
                        <div className="placeholders">
                            <span></span>
                        </div>
                    </div>
                </div>
            </a>

            {/* Stories : pas de bouton TTS, uniquement favoris */}
            <div className="item-buttons">
                <button
                    type="button"
                    className="favorites"
                    title="Ajouter aux favoris"
                    aria-describedby={titleId}
                    data-article-id={article.id}
                >
                    <Bookmark size={18} strokeWidth={2} aria-hidden="true" />
                    <span className="action sr-only">Ajouter aux favoris</span>
                </button>
            </div>
        </article>
    );
}