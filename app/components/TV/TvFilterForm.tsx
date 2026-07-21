'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, SlidersHorizontal, Loader, X } from 'lucide-react';

interface TvFilterFormProps {
    initialQuery?: string;
    initialOrder?: string;
    initialFrom?: string;
    initialTo?: string;
}

/**
 * Filtre /tv. Miroir de SearchForm.tsx (page /search) — mêmes classes CSS,
 * même logique de navigation (router.push, la page serveur relit
 * searchParams et refetch YouTube).
 *
 * Contrairement à /podcasts (filtrage 100% client sur le catalogue complet),
 * ici chaque changement de filtre déclenche un nouvel appel search.list
 * server-side : YouTube ne permet pas de charger tout le catalogue à moindre
 * coût (100 unités de quota/appel), donc pas de "liste complète en mémoire"
 * possible — voir wpApi.tv.ts.
 */
export default function TvFilterForm({
    initialQuery = '',
    initialOrder = 'date',
    initialFrom = '',
    initialTo = '',
}: TvFilterFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [query, setQuery] = useState(initialQuery);
    const [order, setOrder] = useState(initialOrder);
    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [showFilters, setShowFilters] = useState(Boolean(initialFrom || initialTo));

    const navigate = (params: URLSearchParams) => {
        startTransition(() => {
            router.push(`/tv${params.toString() ? `?${params.toString()}` : ''}`);
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (order !== 'date') params.set('order', order);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        navigate(params);
    };

    const handleOrderChange = (value: string) => {
        setOrder(value);
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (value !== 'date') params.set('order', value);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        navigate(params);
    };

    const handleReset = () => {
        setQuery('');
        setOrder('date');
        setFrom('');
        setTo('');
        setShowFilters(false);
        navigate(new URLSearchParams());
    };

    const hasActiveFilters = query || order !== 'date' || from || to;

    return (
        <form className="search-form" onSubmit={handleSubmit} role="search">
            <div className="search-form-main">
                <label htmlFor="tv-query" className="sr-only">Search videos</label>
                <div className="search-input-wrap">
                    <SearchIcon size={18} strokeWidth={2} aria-hidden="true" />
                    <input
                        id="tv-query"
                        type="search"
                        name="q"
                        className="search-input"
                        placeholder="Search videos by title…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                <select
                    className="podcast-filter-select"
                    value={order}
                    onChange={(e) => handleOrderChange(e.target.value)}
                    aria-label="Sort videos"
                >
                    <option value="date">Newest first</option>
                    <option value="viewCount">Most viewed</option>
                    <option value="title">Title (A-Z)</option>
                </select>

                <button
                    type="submit"
                    className={`search-submit${isPending ? ' is-loading' : ''}`}
                    data-model="button"
                    disabled={isPending}
                    aria-busy={isPending}
                >
                    {isPending ? (
                        <>
                            <Loader size={18} strokeWidth={2} className="search-submit-loader" aria-hidden="true" />
                            <span>Searching…</span>
                        </>
                    ) : (
                        'Search'
                    )}
                </button>

                <button
                    type="button"
                    className={`search-filters-toggle${showFilters ? ' is-active' : ''}`}
                    data-model="button"
                    onClick={() => setShowFilters((v) => !v)}
                    aria-expanded={showFilters}
                    aria-controls="tv-filters"
                    title="Filter by publish date"
                >
                    <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                    <span>Filters</span>
                </button>

                {hasActiveFilters && (
                    <button
                        type="button"
                        className="search-reset"
                        data-model="button"
                        onClick={handleReset}
                        disabled={isPending}
                        title="Clear all search terms and filters"
                        aria-label="Clear search and filters"
                    >
                        <X size={16} strokeWidth={2} aria-hidden="true" />
                        <span>Clear</span>
                    </button>
                )}
            </div>

            {showFilters && (
                <fieldset id="tv-filters" className="search-filters">
                    <legend className="sr-only">Filter by publish date</legend>

                    <div className="search-filter-field">
                        <label htmlFor="tv-from">From</label>
                        <input
                            id="tv-from"
                            type="date"
                            name="from"
                            value={from}
                            max={to || undefined}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>

                    <div className="search-filter-field">
                        <label htmlFor="tv-to">Until</label>
                        <input
                            id="tv-to"
                            type="date"
                            name="to"
                            value={to}
                            min={from || undefined}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>

                    {(from || to) && (
                        <button
                            type="button"
                            className="search-filter-clear"
                            onClick={() => { setFrom(''); setTo(''); }}
                        >
                            Reset dates
                        </button>
                    )}
                </fieldset>
            )}
        </form>
    );
}
