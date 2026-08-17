import { getComments } from '@/app/services/wpApi.comments';
import CommentList from './CommentList';
import CommentForm from './CommentForm';

/**
 * Bloc commentaires d'un article.
 *
 * Server component : la liste est rendue côté serveur (bon pour le SEO et pour
 * les lecteurs sans JS), seul le formulaire est client. Destiné à être placé
 * dans un <Suspense> pour ne pas retarder l'affichage de l'article.
 */
export default async function CommentsSection({ postId }: { postId: number }) {
    const { items, total } = await getComments(postId);

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

            <CommentForm postId={postId} />
        </section>
    );
}
