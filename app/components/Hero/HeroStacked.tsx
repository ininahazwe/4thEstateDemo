import Image from 'next/image';
import { getSpotlightArticles } from '@/app/services/wpApi.spotlight';
import { splitTitle } from '@/app/services/titleParts';

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
                            {article.image && (
                                <Image
                                    src={article.image.src}
                                    alt=""
                                    fill
                                    sizes="(min-width: 760px) 33vw, 80vw"
                                    priority={index === 0}
                                    style={{ objectFit: 'cover' }}
                                />
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
