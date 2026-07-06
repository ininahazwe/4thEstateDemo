import { SearchPagination } from './Types';

interface PaginationProps {
    pagination: SearchPagination;
    query: string;
    from?: string;
    to?: string;
}

/**
 * Construit le lien d'une page en RECONDUISANT les paramètres de recherche
 * (q + from/to). Contrairement à la pagination catégorie/auteur (un seul
 * paramètre `page`), ici on doit préserver le contexte de recherche complet
 * sinon la page 2 perdrait le mot-clé et les dates.
 */
function buildPageHref(page: number, query: string, from?: string, to?: string) {
    const params = new URLSearchParams({ q: query });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (page > 1) params.set('page', String(page));
    return `/search?${params.toString()}`;
}

export default function Pagination({ pagination, query, from, to }: PaginationProps) {
    const { currentPage, totalPages } = pagination;

    if (totalPages <= 1) return null;

    const pages: (number | 'dots')[] = [];
    const window = 1;

    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= window) {
            pages.push(p);
        } else if (pages[pages.length - 1] !== 'dots') {
            pages.push('dots');
        }
    }

    return (
        <section className="site-pagination">
            {pages.map((p, idx) =>
                p === 'dots' ? (
                    <span key={`dots-${idx}`} className="item dots" data-model="button">
                        ...
                    </span>
                ) : (
                    <a
                        key={p}
                        className={p === currentPage ? 'item selected' : 'item'}
                        data-model="button"
                        href={buildPageHref(p, query, from, to)}
                    >
                        {p}
                    </a>
                )
            )}
            {currentPage < totalPages && (
                <a
                    className="item"
                    data-model="button"
                    data-icon="angle-right"
                    data-icon-position="after"
                    href={buildPageHref(currentPage + 1, query, from, to)}
                >
                    Next
                </a>
            )}
        </section>
    );
}
