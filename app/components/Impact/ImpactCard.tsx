'use client';

import Image from 'next/image';
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
                {/* Vignette a gauche, titre a droite : la mise en ligne est
                    portee par le CSS (.item-text.impact passe en flex-direction
                    row), pas par la structure — le markup reste celui des
                    autres cartes du site. */}
                <div className="item-text impact">
                    {article.image && (
                        <div className="impact-thumb">
                            {/* width/height intrinseques et non 96x96 : le
                                recadrage carre est fait en CSS par object-fit,
                                ce qui evite de deformer l'image. `sizes="96px"`
                                fait choisir a Next la plus petite variante
                                utile (w=128) au lieu de la taille intrinseque. */}
                            <Image
                                src={article.image.src}
                                width={article.image.width}
                                height={article.image.height}
                                sizes="96px"
                                placeholder={article.image.blurDataURL ? 'blur' : 'empty'}
                                blurDataURL={article.image.blurDataURL}
                                loading="lazy"
                                alt=""
                            />
                        </div>
                    )}

                    <div className="heading">
                        {/*{article.tagOrCategory && (
                            <span className="strapline">{article.tagOrCategory} -</span>
                        )}*/}
                        <p className="title">{article.title}</p>
                    </div>
                </div>
            </a>
        </article>
    );
}
