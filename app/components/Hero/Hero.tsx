import Image from 'next/image';
import { getSpotlightArticles } from '@/app/services/wpApi.spotlight';
import { splitTitle } from '@/app/services/titleParts';
import HeroCardVideo from './HeroCardVideo';

/**
 * Hero — galerie de 3 articles en grandes cartes verticales, image plein
 * cadre + dégradé + titre.
 *
 * Source : zone "spotlight" du menu Composition en admin WordPress
 * (mu-plugin tfe-composition.php). Les 3 articles affichés sont les 3
 * premières positions de la liste, dans l'ordre choisi par l'édito — voir
 * wpApi.spotlight.ts.
 *
 * Avant : les 3 premiers articles de zone1 (getFourthEstateArticles), donc les
 * 3 derniers publiés — l'ordre éditorial était ignoré.
 */
export default async function Hero() {
    const articles = await getSpotlightArticles(3);

    if (!articles.length) return null;

    return (
        <section className="hero-gallery">
            {articles.map((article, index) => {
                const { lead, rest } = splitTitle(article.title, article.subtitle);
                return (
                <a
                    href={article.href}
                    className="hero-gallery-card"
                    key={article.id}
                >
                    {article.heroVideo ? (
                        <HeroCardVideo src={article.heroVideo} poster={article.image?.src} />
                    ) : (
                        article.image && (
                            <Image
                                src={article.image.src}
                                alt=""
                                fill
                                sizes="(min-width: 760px) 33vw, 80vw"
                                priority={index === 0}
                                style={{ objectFit: 'cover' }}
                            />
                        )
                    )}

                    <div className="hero-gallery-scrim" aria-hidden="true" />

                    {article.heroVideo && (
                        <span className="hero-card-play-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                    )}

                    <div className="hero-gallery-caption">
                        {/* Un seul bloc de titre, coupe en deux uniquement a
                            l'affichage : le texte complet reste present et dans
                            l'ordre, rien n'est perdu pour l'indexation. */}
                        <span className="hero-gallery-title">
                            {lead}
                            {rest && <span className="hero-gallery-subtitle">{rest}</span>}
                        </span>
                    </div>
                </a>
                );
            })}
        </section>
    );
}
