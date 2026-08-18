import Link from 'next/link';
import { type HealthArticle } from '@/app/components/Health/Types';
import HealthCard from '@/app/components/Health/HealthCard';

interface HealthZoneProps {
    articles: HealthArticle[];
}

/**
 * Largeurs d'affichage reelles des 3 colonnes de `.zone-tag` (cf.
 * home-critical.css) : 420px / 200px / 300px a partir de 760px, pleine
 * largeur en dessous. Transmis a next/image via `sizes` pour qu'il cesse
 * de servir le `medium_large` (768px) dans un slot de 200px.
 */
const ZONE_TAG_SIZES = [
    '(max-width: 759px) 100vw, 420px',
    '(max-width: 759px) 100vw, 200px',
    '(max-width: 759px) 100vw, 300px',
] as const;

/**
 * Zone Health — copie de HumanRightsZone, branchée sur la catégorie WP
 * "health" (term id 105).
 *
 * Aucun CSS à ajouter : toute la mise en page vient de `zone-tag`, la classe
 * `zone-health` n'est qu'un point d'accroche sans style dédié (comme
 * `zone-human-rights` et `zone-anti-corruption`).
 */
export default function HealthZone({ articles }: HealthZoneProps) {
    if (!articles.length) return null;

    // Répartition fixe : [1, 2, 2] — colonne gauche, centre, droite
    // Identique à la structure HTML de référence (zone-tag zone-france)
    const area1 = articles.slice(0, 1); // 1 article-vertical avec grande image
    const area2 = articles.slice(1, 3); // 2 articles empilés
    const area3 = articles.slice(3, 5); // 2 articles empilés

    const areas = [area1, area2, area3].filter(area => area.length > 0);

    return (
        <section className="zone zone-tag zone-health">
            <Link href="/category/health" className="section-title">
                Health
            </Link>

            <div className="wrap">
                {areas.map((area, areaIdx) => (
                    <div className="area" key={`health-area-${areaIdx}`}>
                        {area.map((article) => (
                            <HealthCard
                                key={article.id}
                                article={article}
                                sizes={ZONE_TAG_SIZES[Math.min(areaIdx, 2)]}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
