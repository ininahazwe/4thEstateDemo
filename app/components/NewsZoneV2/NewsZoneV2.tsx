import ArticleCard from './ArticleCard';
import { type ArticleData } from './types';
import SpecialOfferBanner from "@/app/components/GeneralNews/SpecialOfferBanner";

interface NewsZoneProps {
    zone1Articles: ArticleData[];
    zone2Articles: ArticleData[];
}

export default function NewsZoneV2({ zone1Articles, zone2Articles }: NewsZoneProps) {

    // Fonction utilitaire pour découper un tableau d'articles en sous-groupes d'affichage (areas)
    const chunkArticles = (arr: ArticleData[], sizes: number[]): ArticleData[][] => {
        let index = 0;
        return sizes.map(size => {
            const chunk = arr.slice(index, index + size);
            index += size;
            return chunk;
        }).filter(chunk => chunk.length > 0);
    };

    // Zone 1 — variante 2 colonnes (au lieu de 3) :
    // Premier groupe = 1 article vertical (occupe désormais les 2/3, fusion
    // des ex-colonnes 1+2). Second groupe = 2 articles, reprise à l'identique
    // de l'ex-3e colonne (dernier tiers). Total : 3 articles au lieu de 5.
    // Styles dédiés : voir custom.css, sélecteur .zone-actu-v2
    const zone1Areas = chunkArticles(zone1Articles, [1, 2]);

    // Zone 2 : inchangée — 1er groupe = 2 articles (cartes pleine largeur, avec image),
    // 2e groupe = 4 articles (grille 2 colonnes, sans image)
    const zone2Areas = chunkArticles(zone2Articles, [2, 4]);

    return (
        // Classe "zone-actu-v2" (et non "zone-actu") : isole complètement les
        // nouveaux styles de zone-1 de ceux du NewsZone original.
        <section className="zone zone-actu-v2" data-columns="2">
            {/* COLONNE PRINCIPALE (zone-1) */}
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
            </div>

            {/* COLONNE LATÉRALE (zone-2)
            <div className="zone-2" data-column="left">
                {zone2Areas.map((area, areaIdx) => (
                    <div className="area" key={`z2-area-${areaIdx}`}>
                        {area.map((article) => (
                            <ArticleCard
                                key={article.id}
                                article={article}
                                headingLevel="h3" // Tous les titres de la colonne latérale utilisent H3
                            />
                        ))}
                    </div>
                ))}
                <SpecialOfferBanner />
            </div>*/}
        </section>
    );
}