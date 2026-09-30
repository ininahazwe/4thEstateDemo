import { cache } from 'react';
import { decode } from 'html-entities';

// ---------------------------------------------------------------------------
// searchDictionary.ts — dictionnaire de mots "connus" utilisé par
// fuzzyQuery.ts pour corriger les fautes de frappe dans /search. Construit à
// partir des titres d'articles publiés + noms de catégories/tags. Fichier
// dédié à la recherche, dans le même esprit d'autonomie que wpApi.search.ts
// (aucun import croisé vers wpApi.ts).
//
// Coût : mêmes fetch WP paginés que app/sitemap.ts (revalidate 1h côté
// Next.js Data Cache), donc pas de sur-appel réseau à chaque recherche une
// fois le cache chaud — seule l'extraction des mots (JS pur) est refaite par
// requête, ce qui est négligeable.
// ---------------------------------------------------------------------------

const WP_BASE =
    process.env.NEXT_PUBLIC_WP_API_URL || 'https://cms.thefourthestategh.com/wp-json/wp/v2';

const PER_PAGE = 100;
const MAX_PAGES = 500; // même plafond de sécurité que app/sitemap.ts

const STOPWORDS = new Set([
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'is',
    'are', 'was', 'were', 'be', 'been', 'by', 'with', 'from', 'as', 'it',
    'its', 'this', 'that', 'these', 'those', 'has', 'have', 'had', 'not',
    'but', 'if', 'than', 'then', 'so', 'into', 'about', 'after', 'before',
    'over', 'under', 'between', 'during', 'without', 'within', 'how', 'what',
    'who', 'why', 'when', 'where', 'which', 'their', 'his', 'her', 'our',
    'your', 'my',
]);

function extractWords(text: string): string[] {
    return decode(text)
        .toLowerCase()
        .replace(/<[^>]*>/g, ' ')
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

async function fetchAllTitles(): Promise<string[]> {
    const titles: string[] = [];
    let page = 1;
    let totalPages = 1;

    try {
        do {
            const res = await fetch(
                `${WP_BASE}/posts?per_page=${PER_PAGE}&page=${page}&status=publish&_fields=title`,
                { next: { revalidate: 3600 } }
            );
            if (!res.ok) break;

            if (page === 1) {
                const header = res.headers.get('X-WP-TotalPages');
                const parsed = header ? parseInt(header, 10) : 1;
                totalPages = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
            }

            const batch: { title: { rendered: string } }[] = await res.json();
            if (!batch.length) break;

            titles.push(...batch.map((p) => p.title.rendered));
            page++;
        } while (page <= Math.min(totalPages, MAX_PAGES));
    } catch {
        // Dictionnaire partiel plutôt que vide en cas d'erreur réseau —
        // la correction sera juste un peu moins complète ce cycle-ci.
    }

    return titles;
}

async function fetchNames(endpoint: 'categories' | 'tags'): Promise<string[]> {
    try {
        const res = await fetch(`${WP_BASE}/${endpoint}?per_page=100&_fields=name`, {
            next: { revalidate: 3600 },
        });
        if (!res.ok) return [];
        const items: { name: string }[] = await res.json();
        return items.map((i) => i.name);
    } catch {
        return [];
    }
}

/**
 * Dictionnaire de mots connus (titres publiés + catégories + tags), utilisé
 * pour corriger les fautes de frappe dans la recherche. `cache()` dédoublonne
 * l'appel au sein d'un même rendu ; les fetch sous-jacents sont eux-mêmes mis
 * en cache 1h par Next.js.
 */
export const getSearchDictionary = cache(async (): Promise<Set<string>> => {
    const [titles, categories, tags] = await Promise.all([
        fetchAllTitles(),
        fetchNames('categories'),
        fetchNames('tags'),
    ]);

    const words = new Set<string>();
    [...titles, ...categories, ...tags].forEach((text) => {
        extractWords(text).forEach((w) => words.add(w));
    });

    return words;
});
