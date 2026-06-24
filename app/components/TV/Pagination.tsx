import { TvPagination } from './Types';

interface PaginationProps {
    pagination: TvPagination;
    nextPageToken: string | null;
    prevPageToken: string | null;
}

/**
 * Pagination Précédent/Suivant — contrainte de l'API YouTube : la navigation
 * se fait via un pageToken opaque renvoyé par chaque requête, pas par numéro
 * de page. On ne peut donc pas générer de liens directs vers "page 5" sans
 * avoir déjà visité les pages 1-4 dans cette session. Le numéro de page
 * affiché est indicatif (basé sur une estimation du nombre total de vidéos),
 * mais seuls Précédent/Suivant sont de vrais liens fonctionnels.
 */
export default function Pagination({ pagination, nextPageToken, prevPageToken }: PaginationProps) {
    const { currentPage, totalPages, basePath } = pagination;

    if (totalPages <= 1 && !nextPageToken && !prevPageToken) return null;

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
                    href={`${basePath}?pageToken=${prevPageToken}&page=${currentPage - 1}`}
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
                    href={`${basePath}?pageToken=${nextPageToken}&page=${currentPage + 1}`}
                >
                    Next
                </a>
            )}
        </section>
    );
}