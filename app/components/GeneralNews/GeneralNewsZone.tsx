'use client';

import Link from 'next/link';
import GeneralNewsCard from './GeneralNewsCard';
import { type GeneralNewsArticle } from './types';
import { useSlider } from '@/app/hooks/useSlider';
import { ArrowBigLeft, ArrowBigRight } from 'lucide-react';

interface GeneralNewsZoneProps {
    articles: GeneralNewsArticle[];
    title?: string;
}

export default function GeneralNewsZone({
                                            articles,
                                            title = 'General News'
                                        }: GeneralNewsZoneProps) {
    const { wrapRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useSlider();

    if (!articles.length) return null;

    return (
        <section className="zone zone-type zone-archives" data-slider="">
            {/* Lien interne : pointait vers le WP en absolu, ce qui ferait
                sortir du site une fois le front sur le domaine principal. */}
            <Link href="/category/general-news" className="section-title">
                {title}
            </Link>

            {/* Flux continu (plus de chunking par 3) : un groupe de 3 remplit
                exactement une rangée et ne déborde jamais, ce qui rendait le
                slider par groupe inopérant. Un seul wrap, comme EnvironmentZone. */}
            <div className="wrap" data-slider-wrap="" ref={wrapRef}>
                {articles.map((article, idx) => (
                    <GeneralNewsCard
                        key={article.id}
                        article={article}
                        index={idx}
                    />
                ))}
            </div>

            <div data-slider-controls="">
                <button
                    type="button"
                    data-slider-left=""
                    aria-label="Précédent"
                    data-fade={!canScrollLeft}
                    onClick={scrollLeft}
                >
                    <ArrowBigLeft size={18} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    data-slider-right=""
                    aria-label="Suivant"
                    data-fade={!canScrollRight}
                    onClick={scrollRight}
                >
                    <ArrowBigRight size={18} strokeWidth={2} aria-hidden="true" />
                </button>
            </div>
        </section>
    );
}
