'use client';

import { type ArticleData } from './types';
import Image from "next/image";
import TTSButton from "@/app/components/UI/TTSButton";
import BookmarkButton from "@/app/components/UI/BookmarkButton";

interface ArticleCardProps {
    article: ArticleData;
    headingLevel: 'h1' | 'h2' | 'h3';
    /** Largeur d'affichage reelle du slot, pour le srcset next/image. */
    sizes?: string;
}

export default function ArticleCard({ article, headingLevel: Heading, sizes = '(max-width: 759px) 100vw, 640px' }: ArticleCardProps) {
    const slug = article.href.split("/").filter(Boolean).pop() ?? String(article.id);

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
                                sizes={sizes}
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
                {/*<TTSButton
                    titleId={`title-${article.id}`}
                    showLabel={false}
                    showStopButton={false}
                />*/}
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