'use client';

import { type ArticleData } from './types';
import {Globe, Headphones} from "lucide-react";
import Image from "next/image";

interface ArticleCardProps {
    article: ArticleData;
    headingLevel: 'h1' | 'h2' | 'h3';
}

const handlePlayAudio = () => {
    // 1. Get article text (via ID or class)
    const articleText = document.getElementById('article-content')?.innerText;

    if (!articleText) return;

    // 2. Stop any ongoing playback
    window.speechSynthesis.cancel();

    // 3. Create utterance
    const utterance = new SpeechSynthesisUtterance(articleText);
    utterance.lang = 'en-GB'; // English language
    utterance.rate = 1.0;     // Reading speed (0.5 to 2)

    // 4. Start playback
    window.speechSynthesis.speak(utterance);
};

export default function ArticleCard({ article, headingLevel: Heading }: ArticleCardProps) {
    const isLive = article.type === 'sirius-live';

    // Handle image error (React-native version of HTML onerror attribute)
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
                {/* Conditional image render if it exists */}
                {article.image && (
                    <div className="item-image">
                        <picture>
                            <Image
                                src={article.image.src}
                                width={article.image.width}
                                height={article.image.height}
                                placeholder="blur"
                                blurDataURL={article.image.blurDataURL}
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
                        {/* Strapline replaced by tagOrCategory from WordPress
                        {article.tagOrCategory && <span className="strapline">{article.tagOrCategory} -</span>}*/}
                        {/*{isLive && <div className="live">Live</div>}*/}

                        {/* Dynamic heading level to respect CSS/SEO rules */}
                        <Heading id={`title-${article.id}`} className="title">
                            {article.title}
                        </Heading>
                    </div>

                    <div className="infos">
                        <div className="wrapper">
                            {/*{article.source && (
                                <span className="source">
                                    <Globe size={14} strokeWidth={2} aria-hidden="true" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                                    <span style={{ verticalAlign: 'middle' }}>{article.source}</span>
                                </span>
                            )}*/}
                        </div>
                        <div className="placeholders">
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </a>

            {/* Action bar (Listen / Favorites) */}
            <div className="item-buttons">
                {!isLive && (
                    <button
                        type="button"
                        className="tts" // Adjust class according to your CSS
                        title="Listen to article"
                        onClick={handlePlayAudio} // Handler for click event
                    >
                        <Headphones size={18} strokeWidth={2} aria-hidden="true" />
                        <span className="sr-only">Listen to article</span>
                    </button>
                )}
            </div>
        </article>
    );
}