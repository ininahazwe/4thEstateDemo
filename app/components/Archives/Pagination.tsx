import type { ArchivePagination } from './Types';

interface PaginationProps {
    pagination: ArchivePagination;
    year: number;
    month: number;
}

/** Même markup que la pagination /search, base d'URL /archives/[year]/[month]. */
function buildPageHref(page: number, year: number, month: number): string {
    const base = `/archives/${year}/${String(month).padStart(2, '0')}`;
    return page > 1 ? `${base}?page=${page}` : base;
}

export default function Pagination({ pagination, year, month }: PaginationProps) {
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
                        href={buildPageHref(p, year, month)}
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
                    href={buildPageHref(currentPage + 1, year, month)}
                >
                    Next
                </a>
            )}
        </section>
    );
}
