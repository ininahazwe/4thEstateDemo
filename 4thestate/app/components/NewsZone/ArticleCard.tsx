'use client';

import { type ArticleData } from './types';
import {Globe, Headphones} from "lucide-react";
import Image from "next/image";

interface ArticleCardProps {
    article: ArticleData;
    headingLevel: 'h1' | 'h2' | 'h3';
}

const handlePlayAudio = () => {
    // 1. Récupérer le texte de l'article (via un ID ou une classe)
    const articleText = document.getElementById('article-content')?.innerText;

    if (!articleText) return;

    // 2. Stopper une éventuelle lecture en cours
    window.speechSynthesis.cancel();

    // 3. Créer l'énoncé
    const utterance = new SpeechSynthesisUtterance(articleText);
    utterance.lang = 'fr-FR'; // Forcer la langue française
    utterance.rate = 1.0;     // Vitesse de lecture (0.5 à 2)

    // 4. Lancer la lecture
    window.speechSynthesis.speak(utterance);
};

export default function ArticleCard({ article, headingLevel: Heading }: ArticleCardProps) {
    const isLive = article.type === 'sirius-live';

    // Gestion de l'erreur d'image native propre à React (remplace l'attribut onerror du HTML)
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
                {/* Rendu conditionnel de l'image si elle existe */}
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
                        {/* Remplacement de strapline par tagOrCategory provenant de WordPress */}
                        {article.tagOrCategory && <span className="strapline">{article.tagOrCategory}</span>}
                        {isLive && <div className="live">Live</div>}

                        {/* Niveau de titre dynamique pour respecter vos règles CSS / SEO */}
                        <Heading id={`title-${article.id}`} className="title">
                            {article.title}
                        </Heading>
                    </div>

                    <div className="infos">
                        <div className="wrapper">
                            {article.source && (
                                <span className="source">
                                    <Globe size={14} strokeWidth={2} aria-hidden="true" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                                    <span style={{ verticalAlign: 'middle' }}>{article.source}</span>
                                </span>
                            )}
                        </div>
                        <div className="placeholders">
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </a>

            {/* Barre d'actions (Écouter / Favoris) */}
            <div className="item-buttons">
                {!isLive && (
                    <button
                        type="button"
                        className="tts" // Ajustez la classe selon votre CSS
                        title="Écouter l’article"
                        onClick={handlePlayAudio} // Fonction à lier pour le clic
                    >
                        <Headphones size={18} strokeWidth={2} aria-hidden="true" />
                        <span className="sr-only">Écouter l’article</span>
                    </button>
                )}
            </div>
        </article>
    );
}