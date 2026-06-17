'use client';

import { type AntiCorruptionArticle } from './types';
import { Globe, Headphones, Bookmark } from 'lucide-react';

interface AntiCorruptionCardProps {
    article: AntiCorruptionArticle;
}

export default function AntiCorruptionCard({ article }: AntiCorruptionCardProps) {
    const titleId = `title-${article.id}-${article.index}`;

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.classList.add('img--error');
    };

    const handlePlayAudio = () => {
        const titleEl = document.getElementById(titleId);
        const articleText = titleEl?.closest('article')?.querySelector('.item-text')?.textContent;
        if (!articleText) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(articleText);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
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
                            <img
                                src={article.image.src}
                                srcSet={article.image.srcSet}
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
                        {article.tagOrCategory && (
                            <span className="strapline">{article.tagOrCategory}.</span>
                        )}
                        <p id={titleId} className="title">
                            {article.title}
                        </p>
                    </div>

                    <div className="infos">
                        <div className="wrapper">
                            {article.source && (
                                <span className="source">
                                    <Globe
                                        size={14}
                                        strokeWidth={2}
                                        aria-hidden="true"
                                        style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}
                                    />
                                    <span style={{ verticalAlign: 'middle' }}>{article.source}</span>
                                </span>
                            )}
                        </div>
                        <div className="placeholders">
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </a>

            <div className="item-buttons">
                <button
                    type="button"
                    className="tts"
                    title="Écouter l'article"
                    aria-describedby={titleId}
                    onClick={handlePlayAudio}
                >
                    <Headphones size={18} strokeWidth={2} aria-hidden="true" />
                    <span className="sr-only">Listen</span>
                </button>

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