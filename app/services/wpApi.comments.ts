/**
 * Commentaires — système natif de WordPress.
 *
 * LECTURE : `GET /wp/v2/comments` est public et ne renvoie que les
 * commentaires **approuvés** (ceux en attente exigent une authentification).
 * Aucun filtrage à faire de notre côté : ce que l'API rend est publiable.
 *
 * ÉCRITURE : elle ne passe PAS par ce fichier. WordPress refuse l'écriture
 * anonyme sur /wp/v2/comments, donc le formulaire poste sur notre route
 * interne /api/comments, qui relaie vers l'endpoint `tfe/v1/comment` du
 * mu-plugin (cf. wordpress/mu-plugins/tfe-comments.php) avec la clé API
 * server-to-server. La clé n'est jamais exposée au navigateur.
 */

import { decode } from 'html-entities';

const WP_BASE =
    process.env.NEXT_PUBLIC_WP_API_URL || 'https://cms.thefourthestategh.com/wp-json/wp/v2';

/** Plafond de l'API REST : 100 par page. */
const PER_PAGE = 100;

export interface WpComment {
    id: number;
    parent: number;
    authorName: string;
    dateISO: string;
    dateLabel: string;
    /** HTML déjà filtré par WordPress (kses) à l'insertion. */
    contentHtml: string;
    children: WpComment[];
}

export interface WpCommentThread {
    items: WpComment[];
    /** Total réel côté WordPress, y compris au-delà de la première page. */
    total: number;
}

const DATE_LABEL = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

interface RawComment {
    id: number;
    parent: number;
    author_name: string;
    date: string;
    content?: { rendered?: string };
}

/**
 * Reconstruit l'arborescence à partir du champ plat `parent`.
 *
 * Un commentaire dont le parent n'est pas dans le lot (parent supprimé, ou
 * au-delà de la première page) est remonté à la racine plutôt que perdu.
 */
function buildTree(flat: WpComment[]): WpComment[] {
    const byId = new Map<number, WpComment>(flat.map((c) => [c.id, c]));
    const roots: WpComment[] = [];

    for (const comment of flat) {
        const parent = comment.parent ? byId.get(comment.parent) : undefined;

        if (parent) {
            parent.children.push(comment);
        } else {
            roots.push(comment);
        }
    }

    return roots;
}

/**
 * Commentaires approuvés d'un article, en arbre.
 *
 * `revalidate: 60` et non `no-store` : la page article est en ISR, un
 * `no-store` la basculerait en rendu dynamique à chaque vue. Une minute de
 * décalage est sans conséquence puisque tout commentaire passe de toute façon
 * par la modération — et l'approbation déclenche une revalidation immédiate
 * via tfe-comments.php.
 */
export async function getComments(postId: number): Promise<WpCommentThread> {
    try {
        const res = await fetch(
            `${WP_BASE}/comments?post=${postId}&per_page=${PER_PAGE}&order=asc&orderby=date` +
                `&_fields=id,parent,author_name,date,content`,
            { next: { revalidate: 60 } }
        );

        if (!res.ok) return { items: [], total: 0 };

        const raw = (await res.json()) as RawComment[];

        const flat: WpComment[] = raw.map((c) => ({
            id: c.id,
            parent: c.parent ?? 0,
            // WordPress encode les entités HTML dans author_name
            // ("O&#039;Brien") : sans decode, l'apostrophe s'affiche brute.
            authorName: decode(c.author_name || '').trim() || 'Anonymous',
            dateISO: c.date,
            dateLabel: DATE_LABEL.format(new Date(c.date)),
            contentHtml: c.content?.rendered ?? '',
            children: [],
        }));

        const headerTotal = Number(res.headers.get('x-wp-total'));

        return {
            items: buildTree(flat),
            total: Number.isFinite(headerTotal) && headerTotal > 0 ? headerTotal : flat.length,
        };
    } catch {
        return { items: [], total: 0 };
    }
}
