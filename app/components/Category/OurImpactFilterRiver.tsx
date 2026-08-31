'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CategoryArticle } from './Types';
import CategoryArticleCard from './CategoryArticleCard';

// ---------------------------------------------------------------------------
// Rivière filtrée de /category/our-impact — 31/08/2026
//
// Variante de CategoryRiverLoadMore avec un bandeau de filtres (All + les
// termes impact-category résolus côté serveur, voir getOurImpactFilters dans
// wpApi.ts). Composant dédié plutôt qu'un paramètre optionnel sur
// CategoryRiverLoadMore : cette page est la SEULE à avoir des filtres,
// inutile d'alourdir le composant partagé par /category/[slug] et
// /tag/[slug].
//
// Changer de filtre réinitialise entièrement la rivière (offset, compteur de
// lots, scroll auto) et relance /api/category/our-impact/more?filter=<slug>
// depuis offset=0 — chaque filtre est une requête WP à part
// (?categories=229&impact-category=<id>), pas un tri sur les articles déjà
// chargés en mémoire.
//
// Les trois garde-fous du scroll infini (AUTO_LOADS, MAX_BATCH, coupure sur
// erreur/lots vides) sont repris tels quels de CategoryRiverLoadMore — voir
// ce fichier pour le détail de chaque panne qu'ils évitent.
// ---------------------------------------------------------------------------

const AUTO_LOADS = 3;
const MAX_BATCH = 20;
const PRELOAD_MARGIN = '400px';

export interface OurImpactFilter {
    slug: string;
    label: string;
}

interface OurImpactFilterRiverProps {
    initialArticles: CategoryArticle[];
    initialHasMore: boolean;
    initialNextOffset: number;
    /** Filtres résolus côté serveur (getOurImpactFilters) — "All" est ajouté ici. */
    filters: OurImpactFilter[];
    /** Taille du PREMIER lot de chaque filtre — pas du palier de progression. */
    batchSize?: number;
}

interface RiverState {
    articles: CategoryArticle[];
    hasMore: boolean;
    autoEnabled: boolean;
}

interface MoreResponse {
    articles: CategoryArticle[];
    hasMore: boolean;
    nextOffset: number;
}

export default function OurImpactFilterRiver({
    initialArticles,
    initialHasMore,
    initialNextOffset,
    filters,
    batchSize = 5,
}: OurImpactFilterRiverProps) {
    // null = "All". L'onglet "All" réutilise les données déjà rendues côté
    // serveur (aucun fetch au premier affichage) ; tout autre filtre, y
    // compris revenir sur "All" ensuite, relance un fetch depuis offset=0.
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [state, setState] = useState<RiverState>({
        articles: initialArticles,
        hasMore: initialHasMore,
        autoEnabled: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    // Offset et compteurs vivent dans des refs, pas dans l'état : loadMore
    // doit rester une callback stable (voir CategoryRiverLoadMore).
    const offsetRef = useRef(initialNextOffset);
    const loadCountRef = useRef(0);
    const emptyRunsRef = useRef(0);
    const loadingRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // Incrémenté à chaque changement de filtre : une requête en vol pour un
    // filtre qu'on vient de quitter ne doit jamais écraser l'état du nouveau.
    const requestIdRef = useRef(0);

    const fetchBatch = useCallback(
        async (filter: string | null, offset: number, limit: number): Promise<MoreResponse> => {
            const url =
                `/api/category/our-impact/more?offset=${offset}&limit=${limit}` +
                (filter ? `&filter=${encodeURIComponent(filter)}` : '');
            const res = await fetch(url);
            if (!res.ok) throw new Error('load_more_failed');
            return res.json();
        },
        []
    );

    const loadMore = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setIsLoading(true);
        setError(false);

        const requestId = requestIdRef.current;
        const limit = Math.min(batchSize * (loadCountRef.current + 1), MAX_BATCH);

        try {
            const data = await fetchBatch(activeFilter, offsetRef.current, limit);
            if (requestIdRef.current !== requestId) return; // filtre changé entre-temps

            // Garde-fou : un offset qui n'avance pas ferait boucler sur le même
            // lot. Calculé AVANT de muter offsetRef (sinon la comparaison se
            // ferait contre la nouvelle valeur dans le setState différé).
            const advanced = data.nextOffset > offsetRef.current;
            if (advanced) offsetRef.current = data.nextOffset;

            loadCountRef.current += 1;
            const stillAuto = loadCountRef.current < AUTO_LOADS;

            setState((prev) => ({
                articles: [...prev.articles, ...data.articles],
                hasMore: advanced ? data.hasMore : false,
                autoEnabled: prev.autoEnabled && stillAuto,
            }));

            // Lot vide alors que l'API annonce encore du contenu (longue série
            // de vidéos filtrées) : on rend la main plutôt que d'enchaîner des
            // requêtes sans résultat.
            if (data.articles.length === 0) {
                emptyRunsRef.current += 1;
                if (emptyRunsRef.current >= 2) {
                    setState((prev) => ({ ...prev, autoEnabled: false }));
                }
            } else {
                emptyRunsRef.current = 0;
            }
        } catch {
            if (requestIdRef.current === requestId) {
                setError(true);
                setState((prev) => ({ ...prev, autoEnabled: false }));
            }
        } finally {
            if (requestIdRef.current === requestId) setIsLoading(false);
            loadingRef.current = false;
        }
    }, [activeFilter, batchSize, fetchBatch]);

    const handleFilterChange = useCallback(
        (filterSlug: string | null) => {
            if (filterSlug === activeFilter || isLoading) return;

            requestIdRef.current += 1;
            const requestId = requestIdRef.current;
            loadingRef.current = false;
            loadCountRef.current = 0;
            emptyRunsRef.current = 0;
            offsetRef.current = 0;

            setActiveFilter(filterSlug);
            setError(false);
            setIsLoading(true);
            setState({ articles: [], hasMore: false, autoEnabled: true });

            fetchBatch(filterSlug, 0, batchSize)
                .then((data) => {
                    if (requestIdRef.current !== requestId) return;
                    offsetRef.current = data.nextOffset;
                    setState({ articles: data.articles, hasMore: data.hasMore, autoEnabled: true });
                })
                .catch(() => {
                    if (requestIdRef.current === requestId) setError(true);
                })
                .finally(() => {
                    if (requestIdRef.current === requestId) setIsLoading(false);
                });
        },
        [activeFilter, isLoading, batchSize, fetchBatch]
    );

    useEffect(() => {
        if (!state.autoEnabled || !state.hasMore) return;

        const el = sentinelRef.current;
        if (!el) return;

        if (typeof IntersectionObserver === 'undefined') {
            setState((prev) => ({ ...prev, autoEnabled: false }));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) void loadMore();
            },
            { rootMargin: `0px 0px ${PRELOAD_MARGIN} 0px` }
        );

        observer.observe(el);
        return () => observer.disconnect();
        // state.articles.length : l'observer est recréé après chaque lot pour
        // redéclencher si le sentinel est encore dans la fenêtre.
    }, [state.autoEnabled, state.hasMore, state.articles.length, loadMore]);

    return (
        <>
            {filters.length > 0 && (
                <div className="our-impact-filters" role="tablist" aria-label="Filter by impact category">
                    <button
                        type="button"
                        data-model={activeFilter === null ? 'button primary' : 'button'}
                        role="tab"
                        aria-selected={activeFilter === null}
                        onClick={() => handleFilterChange(null)}
                    >
                        All
                    </button>
                    {filters.map((f) => (
                        <button
                            key={f.slug}
                            type="button"
                            data-model={activeFilter === f.slug ? 'button primary' : 'button'}
                            role="tab"
                            aria-selected={activeFilter === f.slug}
                            onClick={() => handleFilterChange(f.slug)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            <section className="section-river river">
                {state.articles.map((article, index) => (
                    <CategoryArticleCard key={article.id} article={article} highlight={index < 2} />
                ))}
            </section>

            {!isLoading && state.articles.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 12 }}>
                    No stories in this category yet.
                </p>
            )}

            {state.hasMore && state.autoEnabled && (
                <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
            )}

            <p
                role="status"
                aria-live="polite"
                style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: isLoading ? 12 : 0 }}
            >
                {isLoading ? 'Loading stories…' : ''}
            </p>

            {state.hasMore && !state.autoEnabled && (
                <div className="load-more-wrap" style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                    <button type="button" data-model="button" onClick={loadMore} disabled={isLoading}>
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
