import { type ArticleData } from '../components/NewsZone/types';
import { type ArticleDataBanner } from '../components/SiteBanner/types';
import { type GeneralNewsArticle} from "@/app/components/GeneralNews/types";

// Interfaces pour typer proprement les réponses de l'API WordPress
interface WPPost {
    id: number;
    link: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    featured_media: number;
    categories: number[];
    tags: number[];
    date: string;
}

interface WPMedia {
    id: number;
    source_url: string;
    media_details?: {
        width?: number;
        height?: number;
    };
}

interface WPTerm {
    id: number;
    name: string;
}

function formatWpDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fonction utilitaire pour nettoyer les entités HTML complexes des titres WordPress
function cleanHtmlTitle(title: string): string {
    if (typeof window === 'undefined') {
        return title
            .replace(/&#8217;/g, "’")
            .replace(/&#8220;/g, "“")
            .replace(/&#8221;/g, "”")
            .replace(/&amp;/g, "&")
            .replace(/&#038;/g, "&");
    }
    const doc = new DOMParser().parseFromString(title, 'text/html');
    return doc.body.textContent || title;
}

export async function getFourthEstateArticles(): Promise<{ zone1: ArticleData[]; zone2: ArticleData[] }> {
    try {
        // 1. Récupérer les 15 derniers articles
        const postsRes = await fetch('https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=15', {
            next: { revalidate: 600 } // Cache ISR Next.js (10 minutes)
        });

        if (!postsRes.ok) throw new Error('Erreur lors de la récupération des articles');
        const posts: WPPost[] = await postsRes.json();

        // 2. Extraire tous les IDs uniques nécessaires pour limiter les appels réseau externes
        const mediaIds = Array.from(new Set(posts.map(p => p.featured_media).filter(id => id > 0)));
        const categoryIds = Array.from(new Set(posts.flatMap(p => p.categories).filter(id => id > 0)));
        const tagIds = Array.from(new Set(posts.flatMap(p => p.tags).filter(id => id > 0)));

        // 3. Récupérer en parallèle toutes les dépendances (Médias, Catégories, Tags)
        const mediaPromises = mediaIds.map(id =>
            fetch(`https://thefourthestategh.com/wp-json/wp/v2/media/${id}`).then(res => res.ok ? res.json() : null).catch(() => null)
        );

        // Utilisation des filtres d'inclusion WordPress (?include=id1,id2) pour tout grouper en une seule requête par type
        const categoriesPromise = categoryIds.length > 0
            ? fetch(`https://thefourthestategh.com/wp-json/wp/v2/categories?include=${categoryIds.join(',')}`).then(res => res.ok ? res.json() : []).catch(() => [])
            : Promise.resolve([]);

        const tagsPromise = tagIds.length > 0
            ? fetch(`https://thefourthestategh.com/wp-json/wp/v2/tags?include=${tagIds.join(',')}`).then(res => res.ok ? res.json() : []).catch(() => [])
            : Promise.resolve([]);

        const [mediaResults, categoriesResults, tagsResults] = await Promise.all([
            Promise.all(mediaPromises),
            categoriesPromise,
            tagsPromise
        ]);

        // 4. Indexer les résultats dans des Maps pour une recherche instantanée (O(1)) lors du mapping
        const mediaMap = new Map<number, WPMedia>();
        mediaResults.forEach(m => { if (m) mediaMap.set(m.id, m); });

        const categoryMap = new Map<number, string>();
        (categoriesResults as WPTerm[]).forEach(c => categoryMap.set(c.id, c.name));

        const tagMap = new Map<number, string>();
        (tagsResults as WPTerm[]).forEach(t => tagMap.set(t.id, t.name));

        // 5. Mapper les articles vers le format attendu par NewsZone et ArticleCard
        const mappedArticles: ArticleData[] = posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            // Résolution du tag ou de la catégorie (Prend le premier tag trouvé, sinon la première catégorie, sinon "Investigation")
            let tagOrCategory = "Investigation";
            if (post.categories && post.categories.length > 0) {
                const firstCat = categoryMap.get(post.categories[0]);
                if (firstCat) tagOrCategory = firstCat;
            }

            // Détermination de la section graphique (Adaptable selon les vrais IDs de votre WordPress)
            let section: 'geopolitique' | 'economie' | 'societe' | 'politique' | 'culture' = 'societe';
            if (post.categories.includes(3)) section = 'politique';
            if (post.categories.includes(5)) section = 'economie';

            const article: ArticleData = {
                id: `wp-post-${post.id}`,
                href: post.link,
                title: cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory), // Remplacement de strapline
                source: "The Fourth Estate",
                section: section,
                model: index === 0 ? "article-vertical" : "article",
                type: index === 2 ? "sirius-live" : "article",
                index: index + 1,
            };

            if (media) {
                article.image = {
                    src: media.source_url,
                    srcSet: `${media.source_url} 2x`,
                    width: media.media_details?.width || 640,
                    height: media.media_details?.height || 426,
                    fetchPriority: index === 0 ? "high" : "auto"
                };
            }

            return article;
        });

        // 6. Distribution finale des articles récoltés
        return {
            zone1: mappedArticles.slice(0, 5),
            zone2: mappedArticles.slice(5, 11)
        };

    } catch (error) {
        console.error("Erreur wpApi service:", error);
        return { zone1: [], zone2: [] };
    }
}

export async function getLatestBannerArticles(): Promise<ArticleDataBanner[]> {
    try {
        const res = await fetch('https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=4', {
            next: { revalidate: 300 } // Cache de 5 minutes
        });

        if (!res.ok) return [];

        const posts: WPPost[] = await res.json();

        return posts.map((post, idx) => {
            // Détermination du tag ou de la catégorie (même logique validée précédemment)
            let resolvedTag = "Investigation";
            if (post.tags && post.tags.length > 0) {
                // Remplacer par votre logique d'extraction textuelle réelle (ex: tagMap.get)
                resolvedTag = "Tag " + post.tags[0];
            } else if (post.categories && post.categories.length > 0) {
                resolvedTag = "Actualité";
            }

            return {
                id: String(post.id),
                href: post.link,
                title: post.title.rendered.replace(/&#8217;/g, "’").replace(/&amp;/g, "&"), // Utilise votre cleanHtmlTitle
                tagOrCategory: resolvedTag,
                section: 'politique', // Valeur par défaut à mapper selon vos besoins CSS
                model: 'article',
                type: 'article',
                index: idx,
                // On stocke la date formatée dans source ou on adapte le composant pour utiliser le tagOrCategory réutilisable
                source: formatWpDate(post.date)
            };
        });
    } catch (error) {
        console.error("Erreur wpApi lors de la récupération du bandeau:", error);
        return [];
    }
}

export async function getGeneralNewsArticles(perPage: number = 9): Promise<GeneralNewsArticle[]> {
    try {
        // ID fixe de la catégorie "general-news" — vérifié via l'API WordPress
        const GENERAL_NEWS_CATEGORY_ID = 109;

        const res = await fetch(
            `https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=${perPage}&categories=${GENERAL_NEWS_CATEGORY_ID}`,
            { next: { revalidate: 600 } }
        );

        if (!res.ok) return [];

        const posts: WPPost[] = await res.json();
        if (!posts.length) return [];

        // 3. Récupérer médias et catégories en parallèle
        const mediaIds = Array.from(new Set(posts.map(p => p.featured_media).filter(id => id > 0)));
        const categoryIds = Array.from(new Set(posts.flatMap(p => p.categories).filter(id => id > 0)));

        const [mediaResults, categoriesResults] = await Promise.all([
            Promise.all(
                mediaIds.map(id =>
                    fetch(`https://thefourthestategh.com/wp-json/wp/v2/media/${id}`)
                        .then(res => res.ok ? res.json() : null)
                        .catch(() => null)
                )
            ),
            categoryIds.length > 0
                ? fetch(`https://thefourthestategh.com/wp-json/wp/v2/categories?include=${categoryIds.join(',')}`)
                    .then(res => res.ok ? res.json() : [])
                    .catch(() => [])
                : Promise.resolve([])
        ]);

        // 4. Indexer dans des Maps
        const mediaMap = new Map<number, WPMedia>();
        (mediaResults as (WPMedia | null)[]).forEach(m => { if (m) mediaMap.set(m.id, m); });

        const categoryMap = new Map<number, string>();
        (categoriesResults as WPTerm[]).forEach(c => categoryMap.set(c.id, c.name));

        // 5. Mapper vers GeneralNewsArticle
        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'General News';
            if (post.categories.length > 0) {
                const firstCat = categoryMap.get(post.categories[0]);
                if (firstCat) tagOrCategory = firstCat;
            }

            const article: GeneralNewsArticle = {
                id: `gn-post-${post.id}`,
                href: post.link,
                title: cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source: 'The Fourth Estate',
                section: 'general-news',
                model: 'article-vertical',
                type: 'article',
                index: index + 1,
            };

            if (media) {
                article.image = {
                    src: media.source_url,
                    srcSet: `${media.source_url} 2x`,
                    width: media.media_details?.width ?? 640,
                    height: media.media_details?.height ?? 426,
                    fetchPriority: index === 0 ? 'high' : 'auto',
                };
            }

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getGeneralNewsArticles]:', error);
        return [];
    }
}

export async function getEnvironmentArticles(perPage: number = 6): Promise<EnvironmentArticle[]> {
    try {
        // Résoudre l'ID de la catégorie "environment" via son slug
        // Une fois l'ID connu, remplacez par une constante : const ENVIRONMENT_CATEGORY_ID = XXX;
        const catRes = await fetch(
            'https://thefourthestategh.com/wp-json/wp/v2/categories?slug=environment',
            { next: { revalidate: 3600 } }
        );
        const categories: WPTerm[] = catRes.ok ? await catRes.json() : [];
        const categoryId = categories[0]?.id ?? null;

        const url = categoryId
            ? `https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=${perPage}&categories=${categoryId}`
            : `https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=${perPage}`;

        const res = await fetch(url, { next: { revalidate: 600 } });
        if (!res.ok) return [];

        const posts: WPPost[] = await res.json();
        if (!posts.length) return [];

        // Récupérer médias et catégories en parallèle
        const mediaIds = Array.from(new Set(posts.map(p => p.featured_media).filter(id => id > 0)));
        const categoryIds = Array.from(new Set(posts.flatMap(p => p.categories).filter(id => id > 0)));

        const [mediaResults, categoriesResults] = await Promise.all([
            Promise.all(
                mediaIds.map(id =>
                    fetch(`https://thefourthestategh.com/wp-json/wp/v2/media/${id}`)
                        .then(res => res.ok ? res.json() : null)
                        .catch(() => null)
                )
            ),
            categoryIds.length > 0
                ? fetch(`https://thefourthestategh.com/wp-json/wp/v2/categories?include=${categoryIds.join(',')}`)
                    .then(res => res.ok ? res.json() : [])
                    .catch(() => [])
                : Promise.resolve([])
        ]);

        const mediaMap = new Map<number, WPMedia>();
        (mediaResults as (WPMedia | null)[]).forEach(m => { if (m) mediaMap.set(m.id, m); });

        const categoryMap = new Map<number, string>();
        (categoriesResults as WPTerm[]).forEach(c => categoryMap.set(c.id, c.name));

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Environment';
            if (post.categories.length > 0) {
                const firstCat = categoryMap.get(post.categories[0]);
                if (firstCat) tagOrCategory = firstCat;
            }

            const article: EnvironmentArticle = {
                id: `env-post-${post.id}`,
                href: post.link,
                title: cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source: 'The Fourth Estate',
                section: 'environment',
                model: 'article-vertical',
                type: 'article',
                index: index + 1,
            };

            if (media) {
                article.image = {
                    src: media.source_url,
                    srcSet: `${media.source_url} 2x`,
                    width: media.media_details?.width ?? 640,
                    height: media.media_details?.height ?? 426,
                    fetchPriority: index === 0 ? 'high' : 'auto',
                };
            }

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getEnvironmentArticles]:', error);
        return [];
    }
}

export async function getAntiCorruptionArticles(): Promise<AntiCorruptionArticle[]> {
    try {
        // Résoudre l'ID de la catégorie "anti-corruption" via son slug
        // Une fois l'ID connu, remplacez par : const ANTI_CORRUPTION_CATEGORY_ID = XXX;
        const catRes = await fetch(
            'https://thefourthestategh.com/wp-json/wp/v2/categories?slug=anti-corruption',
            { next: { revalidate: 3600 } }
        );
        const categories: WPTerm[] = catRes.ok ? await catRes.json() : [];
        const categoryId = categories[0]?.id ?? null;

        const url = categoryId
            ? `https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=5&categories=${categoryId}`
            : `https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=5`;

        const res = await fetch(url, { next: { revalidate: 600 } });
        if (!res.ok) return [];

        const posts: WPPost[] = await res.json();
        if (!posts.length) return [];

        // Récupérer médias et catégories en parallèle
        const mediaIds = Array.from(new Set(posts.map(p => p.featured_media).filter(id => id > 0)));
        const categoryIds = Array.from(new Set(posts.flatMap(p => p.categories).filter(id => id > 0)));

        const [mediaResults, categoriesResults] = await Promise.all([
            Promise.all(
                mediaIds.map(id =>
                    fetch(`https://thefourthestategh.com/wp-json/wp/v2/media/${id}`)
                        .then(res => res.ok ? res.json() : null)
                        .catch(() => null)
                )
            ),
            categoryIds.length > 0
                ? fetch(`https://thefourthestategh.com/wp-json/wp/v2/categories?include=${categoryIds.join(',')}`)
                    .then(res => res.ok ? res.json() : [])
                    .catch(() => [])
                : Promise.resolve([])
        ]);

        const mediaMap = new Map<number, WPMedia>();
        (mediaResults as (WPMedia | null)[]).forEach(m => { if (m) mediaMap.set(m.id, m); });

        const categoryMap = new Map<number, string>();
        (categoriesResults as WPTerm[]).forEach(c => categoryMap.set(c.id, c.name));

        return posts.map((post, index) => {
            const media = mediaMap.get(post.featured_media);

            let tagOrCategory = 'Anti-Corruption';
            if (post.categories.length > 0) {
                const firstCat = categoryMap.get(post.categories[0]);
                if (firstCat) tagOrCategory = firstCat;
            }

            const article: AntiCorruptionArticle = {
                id: `ac-post-${post.id}`,
                href: post.link,
                title: cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                source: 'The Fourth Estate',
                section: 'anti-corruption',
                // Index 0 → grande carte verticale (colonne gauche), autres → article standard
                model: index === 0 ? 'article-vertical' : 'article',
                type: 'article',
                index: index + 1,
            };

            if (media) {
                article.image = {
                    src: media.source_url,
                    srcSet: `${media.source_url} 2x`,
                    width: media.media_details?.width ?? 640,
                    height: media.media_details?.height ?? 426,
                    fetchPriority: index === 0 ? 'high' : 'auto',
                };
            }

            return article;
        });

    } catch (error) {
        console.error('Erreur wpApi [getAntiCorruptionArticles]:', error);
        return [];
    }
}

export async function getOurImpactArticles(): Promise<OurImpactArticle[]> {
    try {
        // Résoudre l'ID de la catégorie "our-impact" via son slug
        // Une fois l'ID connu, remplacez par : const OUR_IMPACT_CATEGORY_ID = XXX;
        const catRes = await fetch(
            'https://thefourthestategh.com/wp-json/wp/v2/categories?slug=our-impact',
            { next: { revalidate: 3600 } }
        );
        const categories: WPTerm[] = catRes.ok ? await catRes.json() : [];
        const categoryId = categories[0]?.id ?? null;

        const url = categoryId
            ? `https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=6&categories=${categoryId}`
            : `https://thefourthestategh.com/wp-json/wp/v2/posts?per_page=6`;

        const res = await fetch(url, { next: { revalidate: 600 } });
        if (!res.ok) return [];

        const posts: WPPost[] = await res.json();
        if (!posts.length) return [];

        // Pas besoin de médias — cette zone n'affiche pas d'images
        const categoryIds = Array.from(new Set(posts.flatMap(p => p.categories).filter(id => id > 0)));

        const categoriesResults: WPTerm[] = categoryIds.length > 0
            ? await fetch(`https://thefourthestategh.com/wp-json/wp/v2/categories?include=${categoryIds.join(',')}`)
                .then(res => res.ok ? res.json() : [])
                .catch(() => [])
            : [];

        const categoryMap = new Map<number, string>();
        categoriesResults.forEach(c => categoryMap.set(c.id, c.name));

        return posts.map((post, index) => {
            let tagOrCategory = 'Our Impact';
            if (post.categories.length > 0) {
                const firstCat = categoryMap.get(post.categories[0]);
                if (firstCat) tagOrCategory = firstCat;
            }

            return {
                id: `oi-post-${post.id}`,
                href: post.link,
                title: cleanHtmlTitle(post.title.rendered),
                tagOrCategory: cleanHtmlTitle(tagOrCategory),
                section: 'our-impact' as const,
                model: 'article' as const,
                type: 'default' as const,
                index: index + 1,
            };
        });

    } catch (error) {
        console.error('Erreur wpApi [getOurImpactArticles]:', error);
        return [];
    }
}
