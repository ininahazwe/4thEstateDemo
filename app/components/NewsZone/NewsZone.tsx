import ArticleCard from './ArticleCard';
import { type ArticleData } from './types';
import SpecialOfferBanner from "@/app/components/GeneralNews/SpecialOfferBanner";
import TipCallout from "@/app/components/CallToAction/TipCallout";

interface NewsZoneProps {
    zone1Articles: ArticleData[];
    zone2Articles: ArticleData[];
}

/**
 * `.zone-actu .zone-2` = `[data-column=left]`, large de 640px a partir de
 * 1000px et pleine largeur en dessous (base.css). area 0 : 2 cartes cote a
 * cote (~310px chacune) ; area 1 : cartes pleine largeur (les items 3+ ont
 * leur image masquee en CSS). Transmis a next/image via `sizes`.
 */
const ZONE2_SIZES = [
    '(max-width: 759px) 100vw, (max-width: 999px) 50vw, 310px',
    '(max-width: 999px) 100vw, 640px',
] as const;

export default function NewsZone({ zone1Articles, zone2Articles }: NewsZoneProps) {

    // Fonction utilitaire pour découper un tableau d'articles en sous-groupes d'affichage (areas)
    const chunkArticles = (arr: ArticleData[], sizes: number[]): ArticleData[][] => {
        let index = 0;
        return sizes.map(size => {
            const chunk = arr.slice(index, index + size);
            index += size;
            return chunk;
        }).filter(chunk => chunk.length > 0);
    };

    // Groupement arbitraire selon votre maquette d'origine :
    // Zone 1 : Premier groupe = 1 article vertical, Second groupe = 2 articles, Troisième groupe = 2 articles
    const zone1Areas = chunkArticles(zone1Articles, [1, 2, 2]);

    // Zone 2 : 1er groupe = 2 articles (cartes pleine largeur, avec image),
    // 2e groupe = 4 articles (grille 2 colonnes, sans image)
    const zone2Areas = chunkArticles(zone2Articles, [2, 4]);

    return (
        <div>
            <div className="section-title">More stories</div>
            <section className="zone zone-actu" data-columns="2">
                {/* COLONNE PRINCIPALE (zone-1)
            <div className="zone-1" data-column="full">
                {zone1Areas.map((area, areaIdx) => (
                    <div className="area" key={`z1-area-${areaIdx}`}>
                        {area.map((article) => (
                            <ArticleCard
                                key={article.id}
                                article={article}
                                // Si c'est le tout premier article de la zone 1, c'est un H1 (Modèle Vertical), sinon H2
                                headingLevel={article.model === 'article-vertical' ? 'h1' : 'h2'}
                            />
                        ))}
                    </div>
                ))}
            </div>*/}

                {/* COLONNE LATÉRALE (zone-2)*/}
                <div className="zone-2" data-column="left">
                    {zone2Areas.map((area, areaIdx) => (
                        <div className="area" key={`z2-area-${areaIdx}`}>
                            {area.map((article) => (
                                <ArticleCard
                                    key={article.id}
                                    article={article}
                                    sizes={ZONE2_SIZES[Math.min(areaIdx, 1)]}
                                    headingLevel="h3" // Tous les titres de la colonne latérale utilisent H3
                                />
                            ))}
                        </div>
                    ))}
                    {/*<SpecialOfferBanner />*/}
                </div>

                {/* Colonne latérale droite (data-column="right", 300px @≥1000px — cf. base.css [data-columns="2"]) */}
                <TipCallout />
            </section>
        </div>
    );
}