'use client';

import { useState } from 'react';
import { CategoryArticle } from './Types';
import CategoryArticleCard from './CategoryArticleCard';

interface CategoryRiverLoadMoreProps {
    slug: string;
    initialArticles: CategoryArticle[];
    initialHasMore: boolean;
    /**
     * Offset WP de reprise (`data.nextOffset` du fetch serveur).
     *
     * ⚠️ Ne PAS le remplacer par `articles.length` : les posts vidéo sont
     * écartés après la requête, donc le nombre d'articles affichés est inférieur
     * au nombre de posts consommés côté WP. C'était le bug des doublons.
     */
    initialNextOffset: number;
    batchSize?: number;
    /** Préfixe de l'API "load more" — /api/category par défaut, /api/tag pour la page tag. */
    apiBasePath?: string;
}

export default function CategoryRiverLoadMore({
                                                   slug,
                                                   initialArticles,
                                                   initialHasMore,
                                                   initialNextOffset,
                                                   batchSize = 5,
                                                   apiBasePath = '/api/category',
                                               }: CategoryRiverLoadMoreProps) {
    const [articles, setArticles] = useState(initialArticles);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [nextOffset, setNextOffset] = useState(initialNextOffset);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleLoadMore = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setError(false);

        try {
            const res = await fetch(
                `${apiBasePath}/${slug}/more?offset=${nextOffset}&limit=${batchSize}`
            );
            if (!res.ok) throw new Error('load_more_failed');

            const data: {
                articles: CategoryArticle[];
                hasMore: boolean;
                nextOffset: number;
            } = await res.json();

            setArticles((prev) => [...prev, ...data.articles]);
            setHasMore(data.hasMore);
            // Garde-fou : un offset qui n'avance pas ferait boucler le bouton sur
            // le même lot. On préfère arrêter la liste.
            if (data.nextOffset > nextOffset) {
                setNextOffset(data.nextOffset);
            } else {
                setHasMore(false);
            }
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <section className="section-river river">
                {articles.map((article, index) => (
                    <CategoryArticleCard key={article.id} article={article} highlight={index < 2} />
                ))}
            </section>

            {hasMore && (
                <div className="load-more-wrap" style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                    <button
                        type="button"
                        data-model="button"
                        onClick={handleLoadMore}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            )}

            {error && (
                <p style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 12 }}>
                    Something went wrong. Please try again.
                </p>
            )}
        </>
    );
}
