import ArticleCard from './ArticleCard';
import { type ArticleData } from './types';
import SpecialOfferBanner from "@/app/components/GeneralNews/SpecialOfferBanner";

interface NewsZoneProps {
    zone1Articles: ArticleData[];
    zone2Articles: ArticleData[];
}

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

    // Zone 2 : Groupes de 3 articles (H3)
    const zone2Areas = chunkArticles(zone2Articles, [3, 3]);

    return (
            <section className="zone zone-actu" data-columns="2">
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

                {/* COLONNE LATÉRALE (zone-2)*/}
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
                </div>
            </section>
    );
}