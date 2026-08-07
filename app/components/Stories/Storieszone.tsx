import Link from 'next/link';
import StoriesCard from './StoriesCard';
import { type StoriesArticle } from './types';
import {ArrowBigLeft, ArrowBigRight} from "lucide-react";

interface StoriesZoneProps {
    articles: StoriesArticle[];
}

export default function StoriesZone({ articles }: StoriesZoneProps) {
    if (!articles.length) return null;

    return (
        <section className="zone zone-type zone-stories" data-slider="">

            {/* data-icon="stories" reproduit à l'identique du HTML de référence */}
            {/* Équivalent interne de l'ancien /?s=video du WP : la recherche
                du front prend le mot-clé en ?q= (cf. (routes)/search/page.tsx). */}
            <Link
                href="/search?q=video"
                className="section-title"
            >
                The Fourth Estate Stories
            </Link>

            <div className="wrap" data-slider-wrap="">
                {articles.map((article) => (
                    <StoriesCard key={article.id} article={article} />
                ))}
            </div>

            <div data-slider-controls="">
                <button
                    data-slider-left=""
                    aria-label="Précédent"
                    data-fade="true"
                >
                    <ArrowBigLeft size={18} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                    data-slider-right=""
                    aria-label="Suivant"
                    data-fade="false"
                >
                    <ArrowBigRight size={18} strokeWidth={2} aria-hidden="true" />
                </button>
            </div>

        </section>
    );
}