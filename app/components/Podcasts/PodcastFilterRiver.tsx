'use client';

import { useMemo, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { PodcastEpisode } from './Types';
import PodcastEpisodeCard from './Podcastepisodecard';

interface PodcastFilterRiverProps {
    episodes: PodcastEpisode[];
}

type SortOrder = 'recent' | 'oldest';

const BATCH_SIZE = 10;

function getYear(episode: PodcastEpisode): string {
    return String(new Date(episode.publishedAtISO).getFullYear());
}

/**
 * Recherche + tri + filtre année + "load more", entièrement côté client sur
 * le catalogue COMPLET déjà fetché côté serveur (getAllPodcastEpisodes).
 *
 * Pourquoi pas le pattern serveur/offset des pages catégorie (CategoryRiverLoadMore
 * + /api/category/[slug]/more) : Spotify n'expose aucun paramètre de recherche
 * ou de filtre par date sur l'endpoint /shows/{id}/episodes (seulement
 * limit/offset). Filtrer côté serveur par lot rendrait la recherche incapable
 * de porter sur des épisodes pas encore "chargés" — on a donc besoin de la
 * liste complète en mémoire de toute façon. Autant filtrer/trier instantanément
 * côté client (pas de round-trip réseau par frappe/clic) et ne garder le
 * "load more" que pour l'affichage progressif du résultat déjà filtré.
 */
export default function PodcastFilterRiver({ episodes }: PodcastFilterRiverProps) {
    const [query, setQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
    const [year, setYear] = useState<string>('all');
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

    const years = useMemo(() => {
        const distinct = Array.from(new Set(episodes.map(getYear)));
        return distinct.sort((a, b) => Number(b) - Number(a));
    }, [episodes]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let result = episodes.filter((ep) => {
            const matchesQuery =
                !q ||
                ep.title.toLowerCase().includes(q) ||
                ep.description.toLowerCase().includes(q);
            const matchesYear = year === 'all' || getYear(ep) === year;
            return matchesQuery && matchesYear;
        });

        result = [...result].sort((a, b) => {
            const diff = new Date(a.publishedAtISO).getTime() - new Date(b.publishedAtISO).getTime();
            return sortOrder === 'recent' ? -diff : diff;
        });

        return result;
    }, [episodes, query, year, sortOrder]);

    // Reset le "load more" quand un filtre change, sinon on peut se retrouver
    // avec un visibleCount hérité d'une recherche précédente plus large.
    const handleQueryChange = (value: string) => {
        setQuery(value);
        setVisibleCount(BATCH_SIZE);
    };
    const handleYearChange = (value: string) => {
        setYear(value);
        setVisibleCount(BATCH_SIZE);
    };
    const handleSortChange = (value: SortOrder) => {
        setSortOrder(value);
        setVisibleCount(BATCH_SIZE);
    };

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;
    const hasActiveFilters = query.trim().length > 0 || year !== 'all';

    return (
        <>
            <div className="podcast-filters">
                <div className="search-input-wrap">
                    <SearchIcon size={18} strokeWidth={2} aria-hidden="true" />
                    <input
                        type="search"
                        className="search-input"
                        placeholder="Search episodes by title or topic…"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        aria-label="Search episodes"
                    />
                </div>

                <select
                    className="podcast-filter-select"
                    value={sortOrder}
                    onChange={(e) => handleSortChange(e.target.value as SortOrder)}
                    aria-label="Sort episodes"
                >
                    <option value="recent">Newest first</option>
                    <option value="oldest">Oldest first</option>
                </select>

                {years.length > 1 && (
                    <select
                        className="podcast-filter-select"
                        value={year}
                        onChange={(e) => handleYearChange(e.target.value)}
                        aria-label="Filter by year"
                    >
                        <option value="all">All years</option>
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                )}

                {hasActiveFilters && (
                    <button
                        type="button"
                        className="search-reset"
                        onClick={() => { setQuery(''); setYear('all'); setVisibleCount(BATCH_SIZE); }}
                        title="Clear search and filters"
                        aria-label="Clear search and filters"
                    >
                        <X size={16} strokeWidth={2} aria-hidden="true" />
                        <span>Clear</span>
                    </button>
                )}
            </div>

            {hasActiveFilters && (
                <p className="search-results-count">
                    {filtered.length > 0
                        ? `${filtered.length} episode${filtered.length > 1 ? 's' : ''} found`
                        : 'No episodes match your search.'}
                </p>
            )}

            <section className="stories-river river">
                {visible.map((episode, index) => (
                    <PodcastEpisodeCard key={episode.id} episode={episode} index={index + 1} />
                ))}
            </section>

            {hasMore && (
                <div className="load-more-wrap" style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                    <button
                        type="button"
                        data-model="button"
                        onClick={() => setVisibleCount((v) => v + BATCH_SIZE)}
                    >
                        Load more
                    </button>
                </div>
            )}
        </>
    );
}
