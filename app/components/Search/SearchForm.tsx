'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';

interface SearchFormProps {
    initialQuery?: string;
    initialFrom?: string;
    initialTo?: string;
}

/**
 * Formulaire de recherche du site. Client Component (a besoin de useState +
 * useRouter). Ne reçoit que des primitives sérialisables depuis la page
 * serveur (valeurs initiales) — aucun callback en prop.
 *
 * À la soumission, construit /search?q=…&from=…&to=… et navigue via
 * router.push : la page serveur relit ces searchParams et refait le fetch.
 * Les champs date (from/to) sont optionnels et repliés par défaut ; on les
 * déplie automatiquement s'ils sont déjà renseignés (retour sur une recherche
 * filtrée).
 */
export default function SearchForm({
    initialQuery = '',
    initialFrom = '',
    initialTo = '',
}: SearchFormProps) {
    const router = useRouter();

    const [query, setQuery] = useState(initialQuery);
    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [showFilters, setShowFilters] = useState(Boolean(initialFrom || initialTo));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const q = query.trim();
        if (!q) return;

        const params = new URLSearchParams({ q });
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        router.push(`/search?${params.toString()}`);
    };

    return (
        <form className="search-form" onSubmit={handleSubmit} role="search">
            <div className="search-form-main">
                <label htmlFor="search-query" className="sr-only">Search articles</label>
                <div className="search-input-wrap">
                    <SearchIcon size={18} strokeWidth={2} aria-hidden="true" />
                    <input
                        id="search-query"
                        type="search"
                        name="q"
                        className="search-input"
                        placeholder="Search articles by name or keyword…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                        autoFocus
                    />
                </div>

                <button type="submit" className="search-submit" data-model="button">
                    Search
                </button>

                <button
                    type="button"
                    className={`search-filters-toggle${showFilters ? ' is-active' : ''}`}
                    data-model="button"
                    onClick={() => setShowFilters((v) => !v)}
                    aria-expanded={showFilters}
                    aria-controls="search-filters"
                    title="Refine by date"
                >
                    <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                    <span>Filters</span>
                </button>
            </div>

            {showFilters && (
                <fieldset id="search-filters" className="search-filters">
                    <legend className="sr-only">Refine by publication date</legend>

                    <div className="search-filter-field">
                        <label htmlFor="search-from">From</label>
                        <input
                            id="search-from"
                            type="date"
                            name="from"
                            value={from}
                            max={to || undefined}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>

                    <div className="search-filter-field">
                        <label htmlFor="search-to">To</label>
                        <input
                            id="search-to"
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
                            Clear dates
                        </button>
                    )}
                </fieldset>
            )}
        </form>
    );
}
