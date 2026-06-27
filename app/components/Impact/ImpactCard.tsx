'use client';

import { type OurImpactArticle } from './Types';

interface OurImpactCardProps {
    article: OurImpactArticle;
}

export default function OurImpactCard({ article }: OurImpactCardProps) {
    return (
        <article
            className="item"
            data-model={article.model}
            data-type={article.type}
            data-index={article.index}
        >
            <a href={article.href}>
                <div className="item-text impact">
                    <div className="heading">
                        {article.tagOrCategory && (
                            <span className="strapline">{article.tagOrCategory} -</span>
                        )}
                        <p className="title">{article.title}</p>
                    </div>
                </div>
            </a>
        </article>
    );
}