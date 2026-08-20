'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CategoryArticle } from './Types';
import CategoryArticleCard from './CategoryArticleCard';

// ---------------------------------------------------------------------------
// Rivière d'articles avec chargement au défilement (19/08/2026)
//
// Remplace le bouton « Load more » cliqué par un déclenchement à l'approche du
// bas de liste, avec des lots qui grossissent à mesure qu'on descend.
//
// Trois garde-fous, chacun pour une panne précise :
//
// 1. `AUTO_LOADS` — au bout de 3 lots automatiques, le bouton reprend la main.
//    Un défilement infini sans fin rend le pied de page inatteignable : il porte
//    les liens légaux ET « Cookie settings », donc le retrait du consentement.
//    Rendre ce lien injoignable sur une grosse catégorie n'est pas acceptable.
//
// 2. `MAX_BATCH` — la progression est linéaire (+`batchSize` par palier) mais
//    plafonnée. Sans plafond, un lecteur persévérant finirait par demander 60 ou
//    80 articles d'un coup : requête lente côté WP, et autant d'images à charger
//    d'un bloc sur mobile.
//
// 3. Coupure de l'automatique sur erreur ou sur lots vides répétés. L'observer
//    est recréé à chaque nouveau lot ; sans ces coupures, une erreur réseau ou
//    une longue série de posts vidéo filtrés (voir fetchDisplayableSlice dans
//    wpApi.ts) enchaînerait les requêtes à vide en boucle serrée.
// ---------------------------------------------------------------------------

/** Lots chargés automatiquement avant de rendre la main au lecteur. */
const AUTO_LOADS = 3;

/** Plafond de taille d'un lot : 5 → 10 → 15 → 20 → 20 → 20… */
const MAX_BATCH = 20;

/**
 * Marge de déclenchement sous la fenêtre. Charge avant que le lecteur n'atteigne
 * réellement le bas, pour que la liste paraisse continue — sans être si large
 * que les trois lots automatiques partent tous avant le premier défilement.
 */
const PRELOAD_MARGIN = '400px';

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
    /** Taille du PREMIER lot — et pas du palier de progression. */
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [autoEnabled, setAutoEnabled] = useState(true);

    // Offset et compteur de lots vivent dans des refs, pas dans l'état : ils
    // sont lus par loadMore, qui doit rester une callback STABLE. Les mettre en
    // état la recréerait à chaque lot, donc recréerait l'observer en cascade.
    const offsetRef = useRef(initialNextOffset);
    const loadCountRef = useRef(0);
    const emptyRunsRef = useRef(0);
    // Verrou synchrone : `isLoading` est appliqué de façon asynchrone, deux
    // intersections rapprochées passeraient toutes les deux le test avant le
    // premier rendu.
    const loadingRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const loadMore = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setIsLoading(true);
        setError(false);

        const limit = Math.min(batchSize * (loadCountRef.current + 1), MAX_BATCH);

        try {
            const res = await fetch(
                `${apiBasePath}/${slug}/more?offset=${offsetRef.current}&limit=${limit}`
            );
            if (!res.ok) throw new Error('load_more_failed');

            const data: {
                articles: CategoryArticle[];
                hasMore: boolean;
                nextOffset: number;
            } = await res.json();

            loadCountRef.current += 1;
            if (loadCountRef.current >= AUTO_LOADS) setAutoEnabled(false);

            setArticles((prev) => [...prev, ...data.articles]);

            // Garde-fou : un offset qui n'avance pas ferait boucler sur le même
            // lot. On préfère arrêter la liste.
            if (data.nextOffset > offsetRef.current) {
                offsetRef.current = data.nextOffset;
                setHasMore(data.hasMore);
            } else {
                setHasMore(false);
            }

            // Lot vide alors que l'API annonce encore du contenu : cas
            // pathologique d'une longue série de vidéos filtrées. On rend la main
            // plutôt que d'enchaîner des requêtes sans résultat.
            if (data.articles.length === 0) {
                emptyRunsRef.current += 1;
                if (emptyRunsRef.current >= 2) setAutoEnabled(false);
            } else {
                emptyRunsRef.current = 0;
            }
        } catch {
            setError(true);
            // Ne jamais réessayer automatiquement : le sentinel reste visible,
            // ce serait une boucle de requêtes en échec.
            setAutoEnabled(false);
        } finally {
            loadingRef.current = false;
            setIsLoading(false);
        }
    }, [apiBasePath, slug, batchSize]);

    useEffect(() => {
        if (!autoEnabled || !hasMore) return;

        const el = sentinelRef.current;
        if (!el) return;

        // Navigateur sans IntersectionObserver : on retombe sur le bouton, qui
        // reste la version qui fonctionne partout.
        if (typeof IntersectionObserver === 'undefined') {
            setAutoEnabled(false);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) void loadMore();
            },
            { rootMargin: `0px 0px ${PRELOAD_MARGIN} 0px` },
        );

        observer.observe(el);
        return () => observer.disconnect();
        // `articles.length` : l'observer est recréé après chaque lot pour
        // redéclencher si le sentinel est encore dans la fenêtre (défilement
        // rapide, écran haut). La coupure vient d'AUTO_LOADS, pas de l'observer.
    }, [autoEnabled, hasMore, loadMore, articles.length]);

    return (
        <>
            <section className="section-river river">
                {articles.map((article, index) => (
                    <CategoryArticleCard key={article.id} article={article} highlight={index < 2} />
                ))}
            </section>

            {/* Cible d'observation. Hors du flux visuel, mais elle doit occuper
                une hauteur non nulle : un élément de 0 px n'entre jamais en
                intersection sur certains navigateurs. */}
            {hasMore && autoEnabled && (
                <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
            )}

            {/* Annonce l'arrivée des articles aux lecteurs d'écran : sans ça, le
                chargement au défilement est totalement silencieux. */}
            <p
                role="status"
                aria-live="polite"
                style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: isLoading ? 12 : 0 }}
            >
                {isLoading ? 'Loading more stories…' : ''}
            </p>

            {hasMore && !autoEnabled && (
                <div className="load-more-wrap" style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                    <button
                        type="button"
                        data-model="button"
                        onClick={loadMore}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading…' : error ? 'Try again' : 'Load more'}
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
