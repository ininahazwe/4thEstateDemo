import { type EnvironmentArticle } from './Types';
import EnvironmentCard from './Environmentcard';
import {ArrowBigLeft, ArrowBigRight} from "lucide-react";

interface EnvironmentZoneProps {
    articles: EnvironmentArticle[];
    title?: string;
}

export default function EnvironmentZone({
                                            articles,
                                            title = 'Environment',
                                        }: EnvironmentZoneProps) {
    if (!articles.length) return null;

    return (
        <section className="zone zone-type zone-long-format" data-slider="">

            {/* Titre cliquable vers la page catégorie — identique au HTML de référence */}
            <a href="https://thefourthestategh.com/category/environment/" className="section-title">
                {title}
            </a>

            {/* Wrap slider : data-slider-wrap déclenche votre JS existant */}
            <div className="wrap" data-slider-wrap="">
                {articles.map((article, idx) => (
                    <EnvironmentCard
                        key={article.id}
                        article={article}
                        index={idx}
                    />
                ))}
            </div>

            {/* Contrôles slider — repris à l'identique du HTML de référence */}
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