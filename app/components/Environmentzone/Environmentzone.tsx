'use client';

import Link from 'next/link';
import { type EnvironmentArticle } from './Types';
import EnvironmentCard from './Environmentcard';
import {ArrowBigLeft, ArrowBigRight} from "lucide-react";
import { useSlider } from '@/app/hooks/useSlider';

interface EnvironmentZoneProps {
    articles: EnvironmentArticle[];
    title?: string;
}

export default function EnvironmentZone({
                                            articles,
                                            title = 'Environment',
                                        }: EnvironmentZoneProps) {
    const { wrapRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } = useSlider();

    if (!articles.length) return null;

    return (
        <section className="zone zone-type zone-long-format" data-slider="">

            {/* Titre cliquable vers la page catégorie — identique au HTML de référence */}
            <Link href="/category/environment" className="section-title">
                {title}
            </Link>

            {/* Wrap slider : ref branchée sur useSlider pour le scroll horizontal */}
            <div className="wrap" data-slider-wrap="" ref={wrapRef}>
                {articles.map((article, idx) => (
                    <EnvironmentCard
                        key={article.id}
                        article={article}
                        index={idx}
                    />
                ))}
            </div>

            {/* Contrôles slider — data-fade recalculé dynamiquement au scroll */}
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