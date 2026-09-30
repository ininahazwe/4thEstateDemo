// ---------------------------------------------------------------------------
// fuzzyQuery.ts — correction orthographique de la requête de recherche,
// mot par mot, par distance de Levenshtein contre le dictionnaire de
// searchDictionary.ts. Pas de dépendance externe (pas de fuse.js) pour rester
// dans le même esprit "100% autonome" que wpApi.search.ts.
// ---------------------------------------------------------------------------

/** Distance de Levenshtein — mots courts (quelques caractères), matrice
 * complète largement suffisante, pas besoin d'optimiser. */
function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
    }

    return dp[m][n];
}

/** Tolérance proportionnelle à la longueur du mot : un mot de 4 lettres ne
 * doit pas se faire corriger par n'importe quoi, un mot de 10 lettres peut
 * absorber quelques fautes de plus. */
function maxDistanceFor(word: string): number {
    if (word.length <= 4) return 1;
    if (word.length <= 8) return 2;
    return 3;
}

function closestWord(word: string, dictionary: Set<string>): string | null {
    if (dictionary.has(word)) return null; // déjà exact, rien à corriger

    const maxDist = maxDistanceFor(word);
    let best: string | null = null;
    let bestDist = Infinity;

    for (const candidate of dictionary) {
        // Filtre rapide avant le calcul de distance complet.
        if (Math.abs(candidate.length - word.length) > maxDist) continue;

        const dist = levenshtein(word, candidate);
        if (dist < bestDist) {
            bestDist = dist;
            best = candidate;
            if (dist <= 1) break; // impossible de faire mieux qu'à 1 lettre près
        }
    }

    return bestDist <= maxDist ? best : null;
}

export interface QueryCorrection {
    corrected: string;
    changed: boolean;
}

/**
 * Corrige mot par mot les termes absents du dictionnaire (titres/catégories/
 * tags publiés) par le mot connu le plus proche. Les mots courts (< 4
 * lettres), déjà connus, ou trop éloignés de tout candidat restent inchangés
 * — évite de "corriger" à tort un nom propre ou un mot rare non couvert par
 * le dictionnaire.
 */
export function correctQuery(query: string, dictionary: Set<string>): QueryCorrection {
    const tokens = query.split(/(\s+)/); // garde les espaces pour recomposer la chaîne telle quelle
    let changed = false;

    const corrected = tokens
        .map((token) => {
            const lower = token.toLowerCase();
            if (lower.length < 4 || !/^[a-z0-9'-]+$/.test(lower)) return token;

            const fix = closestWord(lower, dictionary);
            if (!fix || fix === lower) return token;

            changed = true;
            return fix;
        })
        .join('');

    return { corrected, changed };
}
