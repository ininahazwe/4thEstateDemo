/**
 * Bookmark ("Saved articles") — enregistre/retire un article des favoris
 * du membre connecté, affichés ensuite dans le dashboard membership
 * (segment "Saved articles" de l'Overview).
 *
 * Même schéma que trackRead (lib/track-read.ts) : passe par une route
 * interne Next.js qui dérive user_id de la session et ajoute la clé API
 * server-to-server — jamais exposée au navigateur.
 *
 * Contrairement à trackRead, ces appels ne sont PAS fire-and-forget : le
 * bouton bookmark a besoin de savoir si l'action a réussi pour refléter
 * l'état (rempli/vide) correctement.
 */

export interface SaveArticlePayload {
    articleId: number | string;
    slug: string;
    title: string;
    imageUrl?: string;
    link: string;
    category?: string;
}

export type BookmarkResult = "ok" | "unauthenticated" | "error";

export async function saveArticle(payload: SaveArticlePayload): Promise<BookmarkResult> {
    try {
        const res = await fetch("/api/save-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.ok) return "ok";
        return res.status === 401 ? "unauthenticated" : "error";
    } catch {
        return "error";
    }
}

export async function unsaveArticle(articleId: number | string): Promise<BookmarkResult> {
    try {
        const res = await fetch("/api/unsave-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleId }),
        });
        if (res.ok) return "ok";
        return res.status === 401 ? "unauthenticated" : "error";
    } catch {
        return "error";
    }
}

/* ====================================================================
 * Intention de bookmark en attente d'authentification.
 *
 * Quand un lecteur non connecté clique "Log in" dans AuthRequiredModal,
 * on mémorise l'article visé avant de partir sur /connexion. Au retour
 * (callbackUrl ramène sur la même page), BookmarkButton relit cette
 * intention et sauvegarde automatiquement l'article — l'icône se
 * remplit sans que le lecteur ait à re-cliquer.
 *
 * sessionStorage (pas localStorage) : l'intention ne doit pas survivre
 * au-delà de l'onglet/session courante.
 * ==================================================================== */

const PENDING_KEY = "tfe_pending_bookmark";
const PENDING_TTL_MS = 10 * 60 * 1000; // 10 min — au-delà, on ignore (session abandonnée)

interface PendingBookmark extends SaveArticlePayload {
    ts: number;
}

export function setPendingBookmark(payload: SaveArticlePayload): void {
    try {
        const pending: PendingBookmark = { ...payload, ts: Date.now() };
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    } catch {
        // sessionStorage indisponible (mode privé strict, etc.) — best-effort.
    }
}

/**
 * Lit puis EFFACE l'intention en attente si elle correspond à `articleId`
 * et n'est pas expirée. Ne consomme rien si l'article ne correspond pas
 * (laisse la clé pour le bon BookmarkButton, ailleurs sur la page).
 */
export function consumePendingBookmark(articleId: number | string): SaveArticlePayload | null {
    try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (!raw) return null;

        const pending = JSON.parse(raw) as PendingBookmark;
        const expired = Date.now() - pending.ts > PENDING_TTL_MS;

        if (expired) {
            sessionStorage.removeItem(PENDING_KEY);
            return null;
        }

        if (String(pending.articleId) !== String(articleId)) {
            return null;
        }

        sessionStorage.removeItem(PENDING_KEY);
        const { ts: _ts, ...payload } = pending;
        return payload;
    } catch {
        return null;
    }
}
