/**
 * Enregistre un événement de lecture pour le membre connecté.
 *
 * Fire-and-forget : ne jette JAMAIS et n'interrompt jamais la lecture —
 * un échec de tracking ne doit pas dégrader l'expérience de l'article.
 *
 * Passe par la route interne /api/track-read, qui ajoute la clé API
 * server-to-server et dérive user_id de la session. La clé n'est jamais
 * exposée au navigateur.
 */
export async function trackRead(
    articleId: number | string,
    slug: string
): Promise<void> {
    try {
        await fetch("/api/track-read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleId, slug }),
            keepalive: true, // l'envoi survit à une navigation rapide
        });
    } catch {
        // Silencieux par conception.
    }
}