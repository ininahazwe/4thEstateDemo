import Image from 'next/image';
import { getSpotlightArticles } from '@/app/services/wpApi.spotlight';
import { splitTitle } from '@/app/services/titleParts';
import HeroCardVideo from './HeroCardVideo';

/**
 * HeroStacked — variante du Hero où le texte est séparé de l'image.
 *
 * La structure de chaque carte est volontairement simple : le bloc de titre
 * apparaît d'abord, puis le média. Les deux zones sont contraintes en hauteur
 * par hero-stacked-gallery.css pour conserver une composition régulière.
 */
export default async function HeroStacked() {
    const articles = await getSpotlightArticles(3);

    if (!articles.length) return null;

    return (
        <section className="hero-stacked-gallery">
            {articles.map((article, index) => {
                const { lead, rest } = splitTitle(article.title, article.subtitle);

                return (
                    <a
                        href={article.href}
                        className="hero-stacked-gallery-card"
                        key={article.id}
                    >
                        <div className="hero-stacked-gallery-media">
                            {article.heroVideo && article.model !== 'story' ? (
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

                            {article.model === 'story' ? (
                                <span className="hero-card-storytelling-icon" aria-hidden="true" title="Storytelling">
                                    <svg viewBox="0 0 24 24" width="18" height="18">
                                        <rect x="3" y="3" width="12" height="12" rx="3" fill="#FFB020" />
                                        <rect x="7" y="7" width="12" height="12" rx="3" fill="#FF5252" />
                                        <rect x="11" y="11" width="10" height="10" rx="3" fill="#6D2929" />
                                    </svg>
                                </span>
                            ) : article.heroVideo && (
                                <span className="hero-card-play-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </span>
                            )}
                        </div>

                        <div className="hero-stacked-gallery-caption">
                            <h2 className="hero-stacked-gallery-title">{lead}</h2>
                            {rest && (
                                <p className="hero-stacked-gallery-subtitle">{rest}</p>
                            )}
                        </div>
                    </a>
                );
            })}
        </section>
    );
}
