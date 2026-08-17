import type { WpComment } from '@/app/services/wpApi.comments';

/**
 * Initiales de l'auteur, en guise d'avatar.
 *
 * Volontairement pas de Gravatar : le champ `author_avatar_urls` de l'API
 * envoie le hash de l'email du commentateur chez Automattic à chaque affichage
 * de page, ce qui ferait fuiter une donnée personnelle sans consentement.
 */
function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function CommentItem({ comment, depth }: { comment: WpComment; depth: number }) {
    return (
        <li className="comment-item" data-depth={depth}>
            <article className="comment-body">
                <div className="comment-meta">
                    <span className="comment-avatar" aria-hidden="true">
                        {initials(comment.authorName)}
                    </span>
                    <span className="comment-author">{comment.authorName}</span>
                    <time className="comment-date" dateTime={comment.dateISO}>
                        {comment.dateLabel}
                    </time>
                </div>

                {/* content.rendered est déjà filtré par WordPress (kses) à
                    l'insertion : seules quelques balises inline survivent. */}
                <div
                    className="comment-content"
                    dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
                />
            </article>

            {comment.children.length > 0 && (
                <ul className="comment-replies">
                    {comment.children.map((child) => (
                        // Profondeur plafonnée à 3 : au-delà, l'indentation
                        // devient illisible sur mobile.
                        <CommentItem key={child.id} comment={child} depth={Math.min(depth + 1, 3)} />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function CommentList({ comments }: { comments: WpComment[] }) {
    if (!comments.length) return null;

    return (
        <ul className="comment-list">
            {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} depth={0} />
            ))}
        </ul>
    );
}
