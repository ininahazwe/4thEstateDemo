import {TvPagination} from "@/app/components/TV/Types";

interface PaginationProps {
    pagination: TvPagination;
    nextPageToken: string | null;
    prevPageToken: string | null;
    /** Filtres actifs à reporter dans les liens Prev/Next pour ne pas les perdre en changeant de page. */
    query?: string;
    order?: string;
    from?: string;
    to?: string;
}

/**
 * Pagination Précédent/Suivant — contrainte de l'API YouTube : la navigation
 * se fait via un pageToken opaque renvoyé par chaque requête, pas par numéro
 * de page. On ne peut donc pas générer de liens directs vers "page 5" sans
 * avoir déjà visité les pages 1-4 dans cette session. Le numéro de page
 * affiché est indicatif (basé sur une estimation du nombre total de vidéos),
 * mais seuls Précédent/Suivant sont de vrais liens fonctionnels.
 */
export default function Pagination({
                                        pagination,
                                        nextPageToken,
                                        prevPageToken,
                                        query,
                                        order,
                                        from,
                                        to,
                                    }: PaginationProps) {
    const { currentPage, totalPages, basePath } = pagination;

    if (totalPages <= 1 && !nextPageToken && !prevPageToken) return null;

    const buildParams = (pageToken: string, page: number) => {
        const params = new URLSearchParams({ pageToken, page: String(page) });
        if (query) params.set('q', query);
        if (order && order !== 'date') params.set('order', order);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        return params.toString();
    };

    return (
        <section className="site-pagination">
      <span className="item dots" data-model="button">
        Page {currentPage}{totalPages > 0 ? ` of ~${totalPages}` : ''}
      </span>

            {prevPageToken && (
                <a
                    className="item"
                    data-model="button"
                    data-icon="angle-left"
                    href={`${basePath}?${buildParams(prevPageToken, currentPage - 1)}`}
                >
                    Previous
                </a>
            )}

            {nextPageToken && (
                <a
                    className="item"
                    data-model="button"
                    data-icon="angle-right"
                    data-icon-position="after"
                    href={`${basePath}?${buildParams(nextPageToken, currentPage + 1)}`}
                >
                    Next
                </a>
            )}
        </section>
    );
}