'use client';

import { type GeneralNewsArticle } from './types';
import { Globe } from 'lucide-react';
import Image from "next/image";
import TTSButton from "@/app/components/UI/TTSButton";

interface GeneralNewsCardProps {
    article: GeneralNewsArticle;
    index: number;
}

export default function GeneralNewsCard({ article, index }: GeneralNewsCardProps) {
    const titleId = `title-${article.id}-${index}`;

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
                        <Image
                            src={article.image.src}
                            width={article.image.width}
                            height={article.image.height}
                            placeholder="blur"
                            blurDataURL={article.image.blurDataURL}
                            fetchPriority={article.image.fetchPriority as 'high' | 'auto' | 'low'}
                            loading={article.image.fetchPriority === 'high' ? 'eager' : 'lazy'}
                            onError={handleImageError}
                            alt=""
                        />
                    </div>
                )}

                <div className="item-text">
                    <div className="heading">
                        {/*{article.tagOrCategory && (
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
            </div>
        </article>
    );
}