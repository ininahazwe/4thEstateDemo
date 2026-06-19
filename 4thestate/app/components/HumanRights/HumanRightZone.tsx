import {HumanRightsArticle} from "@/app/components/HumanRights/Types";
import HumanRightsCard from "@/app/components/HumanRights/HumanRightCard";

interface HumanRightsZoneProps {
    articles: HumanRightsArticle[];
}

export default function HumanRightsZone({ articles }: HumanRightsZoneProps) {
    if (!articles.length) return null;

    // Répartition fixe : [1, 2, 2] — colonne gauche, centre, droite
    // Identique à la structure HTML de référence (zone-tag zone-france)
    const area1 = articles.slice(0, 1); // 1 article-vertical avec grande image
    const area2 = articles.slice(1, 3); // 2 articles empilés
    const area3 = articles.slice(3, 5); // 2 articles empilés

    const areas = [area1, area2, area3].filter(area => area.length > 0);

    return (
        <section className="zone zone-tag zone-human-rights">
            <a href="https://thefourthestategh.com/category/human-rights/" className="section-title">
                Human Rights
            </a>

            <div className="wrap">
                {areas.map((area, areaIdx) => (
                    <div className="area" key={`ac-area-${areaIdx}`}>
                        {area.map((article) => (
                            <HumanRightsCard
                                key={article.id}
                                article={article}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}