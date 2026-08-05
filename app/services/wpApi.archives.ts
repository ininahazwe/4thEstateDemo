import { cache } from 'react';
import { decode } from 'html-entities';
import type { ArchiveMonthData, ArchiveItem } from '../components/Archives/Types';

// ---------------------------------------------------------------------------
// wpApi.archives.ts — dédié aux pages /archives et /archives/[year]/[month].
// Autonome (aucun import croisé vers wpApi.ts) pour ne rien casser ailleurs,
// même convention que wpApi.search.ts.
//
// Bornes de mois avec l'API WordPress :
//   - `after`  → strictement APRÈS la date -> on prend la dernière seconde du
//                mois précédent pour inclure le 1er du mois à 00:00:00.
//   - `before` → strictement AVANT la date -> on prend le 1er du mois suivant
//                à 00:00:00 pour inclure le dernier jour jusqu'à 23:59:59.
// ---------------------------------------------------------------------------

const WP_BASE =
    process.env.NEXT_PUBLIC_WP_API_URL || 'https://thefourthestategh.com/wp-json/wp/v2';

export const ARCHIVE_PER_PAGE = 50;

interface WPPostArchive {
    id: number;
    slug: string;
    title: { rendered: string };
    date: string;
    status?: string;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function cleanHtmlTitle(title: string): string {
    return decode(title).replace(/<[^>]*>/g, '').trim();
}

function buildHref(post: WPPostArchive): string {
    const date = new Date(post.date);
    return `/${date.getFullYear()}/${pad(date.getMonth() + 1)}/${post.slug}`;
}

function formatWpDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-EN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/** Bornes ISO (sans fuseau) d'un mois, prêtes pour after/before de WP. */
function monthBounds(year: number, month: number): { after: string; before: string } {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();

    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;

    return {
        after: `${prevYear}-${pad(prevMonth)}-${pad(prevLastDay)}T23:59:59`,
        before: `${nextYear}-${pad(nextMonth)}-01T00:00:00`,
    };
}

/** Année du plus ancien article publié (fallback : année courante). */
const getOldestPostYear = cache(async (): Promise<number> => {
    const currentYear = new Date().getFullYear();
    try {
        const res = await fetch(
            `${WP_BASE}/posts?per_page=1&page=1&status=publish&orderby=date&order=asc&_fields=date`,
            { next: { revalidate: 86400 } }
        );
        if (!res.ok) return currentYear;
        const posts: Array<{ date: string }> = await res.json();
        if (!posts.length) return currentYear;
        const year = new Date(posts[0].date).getFullYear();
        return Number.isFinite(year) && year > 1990 ? year : currentYear;
    } catch {
        return currentYear;
    }
});

/** Liste des années d'archive, de la plus récente à la plus ancienne. */
export const getArchiveYears = cache(async (): Promise<number[]> => {
    const oldest = await getOldestPostYear();
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= oldest; y--) years.push(y);
    return years;
});

export interface MonthArchiveParams {
    year: number;
    month: number; // 1-12
    page?: number;
}

/** Publications d'un mois, de la plus récente à la plus ancienne. */
export const getMonthArchive = cache(async (
    { year, month, page = 1 }: MonthArchiveParams
): Promise<ArchiveMonthData> => {
    const empty: ArchiveMonthData = {
        year,
        month,
        items: [],
        total: 0,
        pagination: { currentPage: page, totalPages: 0 },
    };

    const { after, before } = monthBounds(year, month);

    const params = new URLSearchParams({
        page: String(page),
        per_page: String(ARCHIVE_PER_PAGE),
        status: 'publish',
        orderby: 'date',
        order: 'desc',
        after,
        before,
        _fields: 'id,slug,title,date',
    });

    let res: Response;
    try {
        res = await fetch(`${WP_BASE}/posts?${params.toString()}`, {
            next: { revalidate: 3600 },
        });
    } catch (err) {
        console.error('[getMonthArchive] fetch failed', { year, month, page, err });
        return empty;
    }

    if (!res.ok) {
        // 400 = page au-delà de la dernière -> liste vide, pas de crash
        if (res.status !== 400) {
            console.error(`[getMonthArchive] API error ${res.status}`, { year, month, page });
        }
        return empty;
    }

    const total = Number(res.headers.get('X-WP-Total') ?? '0');
    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? '0');
    const rawPosts: WPPostArchive[] = await res.json();
    const posts = rawPosts.filter((p) => !p.status || p.status === 'publish');

    const items: ArchiveItem[] = posts.map((post) => ({
        id: `archive-post-${post.id}`,
        href: buildHref(post),
        title: cleanHtmlTitle(post.title.rendered),
        date: post.date,
        dateLabel: formatWpDate(post.date),
    }));

    return {
        year,
        month,
        items,
        total,
        pagination: { currentPage: page, totalPages },
    };
});
