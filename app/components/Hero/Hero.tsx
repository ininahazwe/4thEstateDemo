import Image from 'next/image';
import { getFourthEstateArticles } from '@/app/services/wpApi';

function formatPublished(iso?: string): string | null {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Hero — galerie de 3 articles en grandes cartes verticales, image plein
 * cadre + dégradé + titre. Réutilise le même appel que la zone-1 de
 * NewsZone (getFourthEstateArticles) : les 3 premiers articles renvoyés
 * par zone1 sont ceux affichés ici.
 */
export default async function Hero() {
    const { zone1 } = await getFourthEstateArticles();
    const articles = zone1.slice(0, 3);

    if (!articles.length) return null;

    return (
        <section className="hero-gallery">
            {articles.map((article, index) => {
                const publishedLabel = formatPublished(article.publishedAtISO);

                return (
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
                );
            })}
        </section>
    );
}
