import Image from 'next/image';
import { getSpotlightArticles } from '@/app/services/wpApi.spotlight';

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
            {articles.map((article, index) => (
                <a
                    href={article.href}
                    className="hero-gallery-card"
                    key={article.id}
                >
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

                    <div className="hero-gallery-scrim" aria-hidden="true" />

                    <div className="hero-gallery-caption">
                        <span className="hero-gallery-title">{article.title}</span>
                    </div>
                </a>
            ))}
        </section>
    );
}
