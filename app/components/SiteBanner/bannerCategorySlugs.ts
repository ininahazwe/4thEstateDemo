/**
 * Slugs des catégories WordPress affichées dans le banner, dans cet ordre précis.
 * Pour ajouter/retirer un tag du banner ou changer l'ordre : éditer cette liste.
 *
 * "The Fourth Estate TV" n'est PAS une catégorie WP — c'est ajouté en dur
 * après cette liste dans SiteBanner.tsx (icône FaRegCirclePlay, type spécial).
 */
export const BANNER_CATEGORY_SLUGS: string[] = [
    'general-news',
    'anti-corruption',
    'environment',
    'human-rights',
    'our-impact',
    'opinions',
    // 'honours' retiré : c'est un terme de la taxonomie impact-category, pas une
    // catégorie WP — getBannerCategories (qui interroge /categories) ne pouvait
    // pas le résoudre et l'omettait silencieusement. Sa page vit sous
    // /impact-category/honours.
];