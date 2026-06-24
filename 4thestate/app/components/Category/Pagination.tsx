import { CategoryPagination } from './Types';

interface PaginationProps {
    pagination: CategoryPagination;
}

function buildPageHref(basePath: string, page: number) {
    return page === 1 ? basePath : `${basePath}?page=${page}`;
}

export default function Pagination({ pagination }: PaginationProps) {
    const { currentPage, totalPages, basePath } = pagination;

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
                            href={buildPageHref(basePath, p)}
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
                    href={buildPageHref(basePath, currentPage + 1)}
                >
                    Next
                </a>
            )}
        </section>
    );
}