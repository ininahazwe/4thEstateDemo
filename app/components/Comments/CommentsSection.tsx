import { getComments } from '@/app/services/wpApi.comments';
import CommentList from './CommentList';
import CommentForm from './CommentForm';

/**
 * Bloc commentaires d'un article.
 *
 * Server component : la liste est rendue côté serveur (bon pour le SEO et pour
 * les lecteurs sans JS), seul le formulaire est client. Destiné à être placé
 * dans un <Suspense> pour ne pas retarder l'affichage de l'article.
 *
 * `commentsOpen` vient de la case native « Allow comments » du panneau
 * Discussion : décochée, on n'affiche plus le formulaire mais on garde les
 * commentaires déjà publiés. Le masquage complet du bloc, lui, se décide en
 * amont (voir hideComments dans page.tsx) : inutile de venir jusqu'ici pour
 * ne rien rendre — autant économiser la requête.
 */
export default async function CommentsSection({
    postId,
    commentsOpen = true,
}: {
    postId: number;
    commentsOpen?: boolean;
}) {
    const { items, total } = await getComments(postId);

    // Ni discussion existante, ni possibilité d'en ouvrir une : rien à montrer.
    if (!commentsOpen && items.length === 0) return null;

    return (
        <section className="comments" id="comments" aria-labelledby="comments-title">
            <h2 className="section-title" id="comments-title">
                {total > 0 ? `Comments (${total})` : 'Comments'}
            </h2>

            {items.length > 0 ? (
                <CommentList comments={items} />
            ) : (
                <p className="comments-empty">
                    No comments yet. Be the first to share your thoughts on this story.
                </p>
            )}

            {commentsOpen ? (
                <CommentForm postId={postId} />
            ) : (
                <p className="comments-closed">Comments are closed on this story.</p>
            )}
        </section>
    );
}
