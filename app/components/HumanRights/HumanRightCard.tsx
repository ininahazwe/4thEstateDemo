'use client';

import { type HumanRightsArticle } from './Types';
import { Globe, Headphones, Bookmark } from 'lucide-react';
import Image from "next/image";
import TTSButton from "@/app/components/UI/TTSButton";
import BookmarkButton from "@/app/components/UI/BookmarkButton";

interface HumanRightsCardProps {
    article: HumanRightsArticle;
    /** Largeur d'affichage reelle du slot, pour le srcset next/image. */
    sizes?: string;
}

export default function HumanRightsCard({ article, sizes = '(max-width: 759px) 100vw, 420px' }: HumanRightsCardProps) {
    const titleId = `title-${article.id}-${article.index}`;
    const slug = article.href.split("/").filter(Boolean).pop() ?? String(article.id);

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
                                sizes={sizes}
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
                       {/* {article.tagOrCategory && (
                            <span className="strapline">{article.tagOrCategory} -</span>
                        )}*/}
                        <p id={titleId} className="title">
                            {article.title}
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