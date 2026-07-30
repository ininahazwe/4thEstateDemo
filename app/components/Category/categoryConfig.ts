/**
 * Config par catégorie — surcharge optionnelle des données WordPress.
 *
 * Si un slug n'a pas d'entrée ici, getCategoryPageData utilise simplement
 * le nom WP brut comme titre, pas de description SEO custom, pas de tags.
 *
 * Ajouter une catégorie ne nécessite NI nouveau composant NI nouvelle route —
 * juste une entrée ici si tu veux personnaliser titre/SEO/tags, sinon rien du tout.
 */

export interface CategoryConfigEntry {
    /** Surcharge le H1 / titre de page. Si absent, on utilise le nom WP brut. */
    title?: string;
    /** Meta description pour le SEO. */
    seoDescription?: string;
    /** Tags affichés sous le H1 (section-tags). Si absent, liste vide. */
    tags?: { label: string; href: string }[];
}

export const CATEGORY_CONFIG: Record<string, CategoryConfigEntry> = {
    'anti-corruption': {
        title: 'Anti-Corruption',
        seoDescription:
            'Investigations and reporting on corruption, accountability, and governance in Ghana.',
        // Pas de `tags` ici : la section-tags est alimentée par les vrais tags WP
        // les plus fréquents de la catégorie (getCategoryTags), pour afficher
        // >= 15 tags au clic sur "See more". Ajouter `tags: [...]` ici seulement
        // pour forcer une liste manuelle (override).
    },

    // 'human-right': {
    //   title: 'Human Rights',
    //   seoDescription: '...',
    //   tags: [...],
    // },
};

export function getCategoryConfig(slug: string): CategoryConfigEntry {
    return CATEGORY_CONFIG[slug] ?? {};
}