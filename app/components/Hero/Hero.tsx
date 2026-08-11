import Image from 'next/image';
import { getSpotlightArticles } from '@/app/services/wpApi.spotlight';

/**
 * Hero — galerie de 3 articles en grandes cartes verticales, image plein
 * cadre + dégradé + titre.
 *
 * Source : onglet SPOTLIGHT du plugin WordPress "CapEDx Composition"
 * (dossier Weave). Les 3 articles affichés sont les 3 premières positions
 * choisies en admin, dans l'ordre choisi — voir wpApi.spotlight.ts pour le
 * détail du stockage (catégorie `spotlight` + post meta `cp_order_home`).
 *
 * Avant : les 3 premiers articles de zone1 (getFourthEstateArticles), donc les
 * 3 derniers publiés — l'ordre éditorial défini en admin était ignoré.
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
