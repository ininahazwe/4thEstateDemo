'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import type { Constituency, PartyCode, RegionMapData } from '@/app/data/elections/types';
import { FLIP_COLOR, PARTY_META, PARTY_ORDER } from '@/app/data/elections/types';

// Shorter labels for small regions so they do not collide on the map.
const LABEL_SHORT: Record<string, string> = { 'Greater Accra': 'Accra', 'Western North': 'W. North' };

type Metric = 'winner' | 'flips';
type PartyFilter = 'all' | PartyCode;

/** Tooltip anchor, in px relative to the tiles container. */
interface TipPosition {
    x: number;
    y: number;
    below: boolean;
}

const TIP_WIDTH = 250;

interface ElectionsExplorerProps {
    regionMap: RegionMapData;
    constituencies: Constituency[];
}

interface Tally {
    NDC: number;
    NPP: number;
    IND: number;
    total: number;
    flips: number;
}

function emptyTally(): Tally {
    return { NDC: 0, NPP: 0, IND: 0, total: 0, flips: 0 };
}

function tallyOf(list: Constituency[]): Tally {
    const t = emptyTally();
    for (const c of list) {
        t[c.party] += 1;
        t.total += 1;
        if (c.flipped) t.flips += 1;
    }
    return t;
}

function dominantParty(t: Tally): PartyCode {
    return PARTY_ORDER.reduce((best, p) => (t[p] > t[best] ? p : best), 'NDC' as PartyCode);
}

/** Counts up/down smoothly when the value changes (no animation on first paint). */
function AnimatedNumber({ value }: { value: number }) {
    const reduce = useReducedMotion();
    const [display, setDisplay] = useState(value);
    const previous = useRef(value);

    useEffect(() => {
        if (reduce) {
            previous.current = value;
            return;
        }
        const controls = animate(previous.current, value, {
            duration: 0.6,
            ease: 'easeOut',
            onUpdate: (v) => setDisplay(Math.round(v)),
        });
        previous.current = value;
        return () => controls.stop();
    }, [value, reduce]);

    return <>{reduce ? value : display}</>;
}

export default function ElectionsExplorer({ regionMap, constituencies }: ElectionsExplorerProps) {
    const reduce = useReducedMotion();
    const [metric, setMetric] = useState<Metric>('winner');
    const [partyFilter, setPartyFilter] = useState<PartyFilter>('all');
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [active, setActive] = useState<Constituency | null>(null);
    const [tip, setTip] = useState<TipPosition | null>(null);
    const tilesRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLElement>(null);

    const regionById = useMemo(() => new Map(regionMap.regions.map((r) => [r.id, r])), [regionMap]);

    const byRegion = useMemo(() => {
        const map = new Map<string, Constituency[]>();
        for (const c of constituencies) {
            const list = map.get(c.region);
            if (list) list.push(c);
            else map.set(c.region, [c]);
        }
        return map;
    }, [constituencies]);

    const regionTallies = useMemo(() => {
        const map = new Map<string, Tally>();
        for (const [id, list] of byRegion) map.set(id, tallyOf(list));
        return map;
    }, [byRegion]);

    // Regions ordered by number of seats (largest first) for the grid and table.
    const orderedRegionIds = useMemo(
        () =>
            [...regionTallies.entries()]
                .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
                .map(([id]) => id),
        [regionTallies],
    );

    const matches = (c: Constituency): boolean =>
        (partyFilter === 'all' || c.party === partyFilter) && (metric === 'winner' || c.flipped);

    const scope = useMemo(
        () => (selectedRegion ? byRegion.get(selectedRegion) ?? [] : constituencies),
        [selectedRegion, byRegion, constituencies],
    );
    const scopeTally = useMemo(() => tallyOf(scope), [scope]);

    const transitions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const c of scope) {
            if (!c.flipped || !c.prevParty) continue;
            const key = `${c.prevParty}>${c.party}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([key, n]) => {
                const [from, to] = key.split('>') as [PartyCode, PartyCode];
                return { from, to, n };
            });
    }, [scope]);

    function regionPaint(regionId: string): { fill: string; opacity: number } {
        const list = byRegion.get(regionId) ?? [];
        const t = regionTallies.get(regionId) ?? emptyTally();
        if (!t.total) return { fill: '#999', opacity: 0.2 };

        if (metric === 'winner' && partyFilter === 'all') {
            const party = dominantParty(t);
            return { fill: PARTY_META[party].color, opacity: 0.55 + 0.45 * (t[party] / t.total) };
        }
        const count = list.filter(matches).length;
        const share = count / t.total;
        const fill = metric === 'flips' ? FLIP_COLOR : PARTY_META[partyFilter as PartyCode].color;
        // Flipped seats are a minority in most regions: rescale so differences stay visible.
        const scaled = metric === 'flips' ? Math.min(1, share / 0.6) : share;
        return { fill, opacity: 0.12 + 0.88 * scaled };
    }

    function toggleRegion(id: string) {
        setSelectedRegion((current) => (current === id ? null : id));
        setActive(null);
        setTip(null);
    }

    /** Region picked from the tile groups: the map and counters are further up, bring them into view. */
    function toggleRegionFromTiles(id: string) {
        const selecting = selectedRegion !== id;
        toggleRegion(id);
        if (selecting) {
            mapRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        }
    }

    /** Shows the constituency next to its tile (tooltip) and in the summary panel. */
    function showConstituency(c: Constituency, tile: HTMLElement) {
        setActive(c);
        const container = tilesRef.current;
        if (!container) return;
        const box = container.getBoundingClientRect();
        const rect = tile.getBoundingClientRect();
        const centre = rect.left - box.left + rect.width / 2;
        const below = rect.top < 170;
        setTip({
            x: Math.max(0, Math.min(centre - TIP_WIDTH / 2, box.width - TIP_WIDTH)),
            y: below ? rect.bottom - box.top + 8 : rect.top - box.top - 8,
            below,
        });
    }

    function hideConstituency() {
        setActive(null);
        setTip(null);
    }

    function reset() {
        setMetric('winner');
        setPartyFilter('all');
        setSelectedRegion(null);
        setActive(null);
        setTip(null);
    }

    const isDefault = metric === 'winner' && partyFilter === 'all' && !selectedRegion;
    const scopeName = selectedRegion ? regionById.get(selectedRegion)?.name ?? '' : 'Ghana';

    return (
        <section className="el-block" aria-labelledby="el-parliament-title">
            <h2 id="el-parliament-title" className="el-block__title">Parliament: 276 constituencies</h2>

            {/* Controls --------------------------------------------------- */}
            <div className="el-controls">
                <div className="el-controls__group" role="group" aria-label="What the map shows">
                    <button
                        type="button"
                        className="el-chip"
                        aria-pressed={metric === 'winner'}
                        onClick={() => setMetric('winner')}
                    >
                        Seats won in 2024
                    </button>
                    <button
                        type="button"
                        className="el-chip"
                        aria-pressed={metric === 'flips'}
                        onClick={() => setMetric('flips')}
                    >
                        Seats that changed hands
                    </button>
                </div>

                <div className="el-controls__group" role="group" aria-label="Filter by party">
                    <button
                        type="button"
                        className="el-chip"
                        aria-pressed={partyFilter === 'all'}
                        onClick={() => setPartyFilter('all')}
                    >
                        All parties
                    </button>
                    {PARTY_ORDER.map((p) => (
                        <button
                            key={p}
                            type="button"
                            className="el-chip el-chip--party"
                            aria-pressed={partyFilter === p}
                            onClick={() => setPartyFilter(p)}
                            style={{ ['--el-party' as string]: PARTY_META[p].color }}
                        >
                            <span className="el-chip__dot" aria-hidden="true" />
                            {PARTY_META[p].label}
                        </button>
                    ))}
                </div>

                <button type="button" className="el-reset" onClick={reset} disabled={isDefault}>
                    Reset
                </button>
            </div>

            <div className="el-layout">
                {/* Map ------------------------------------------------------- */}
                <figure className="el-map-wrap" ref={mapRef}>
                    <svg
                        className="el-map"
                        viewBox={regionMap.viewBox}
                        role="group"
                        aria-label="Map of Ghana’s 16 regions. Select a region to see its constituencies."
                    >
                        {regionMap.regions.map((r) => {
                            const paint = regionPaint(r.id);
                            const t = regionTallies.get(r.id) ?? emptyTally();
                            const selected = selectedRegion === r.id;
                            const dimmed = selectedRegion !== null && !selected;
                            return (
                                <motion.path
                                    key={r.id}
                                    d={r.d}
                                    className="el-region"
                                    data-selected={selected || undefined}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={selected}
                                    aria-label={`${r.name} region: ${t.NDC} NDC, ${t.NPP} NPP, ${t.IND} independent; ${t.flips} seats changed hands`}
                                    initial={false}
                                    animate={{
                                        fill: paint.fill,
                                        fillOpacity: dimmed ? paint.opacity * 0.35 : paint.opacity,
                                    }}
                                    transition={{ duration: reduce ? 0 : 0.45 }}
                                    onClick={() => toggleRegion(r.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleRegion(r.id);
                                        }
                                    }}
                                >
                                    <title>{`${r.name}: ${t.total} seats`}</title>
                                </motion.path>
                            );
                        })}
                        {regionMap.regions.map((r) => (
                            <text key={`${r.id}-label`} x={r.cx} y={r.cy} className="el-map__label" textAnchor="middle">
                                {LABEL_SHORT[r.name] ?? r.name}
                            </text>
                        ))}
                    </svg>
                    <figcaption className="el-map__legend">
                        {metric === 'flips' ? (
                            <span>
                                <span className="el-swatch" style={{ background: FLIP_COLOR }} aria-hidden="true" />
                                Darker = more seats that changed hands
                                {partyFilter !== 'all' ? ` (won by ${PARTY_META[partyFilter].label})` : ''}
                            </span>
                        ) : partyFilter === 'all' ? (
                            PARTY_ORDER.map((p) => (
                                <span key={p}>
                                    <span className="el-swatch" style={{ background: PARTY_META[p].color }} aria-hidden="true" />
                                    {PARTY_META[p].label}
                                </span>
                            ))
                        ) : (
                            <span>
                                <span className="el-swatch" style={{ background: PARTY_META[partyFilter].color }} aria-hidden="true" />
                                Darker = bigger {PARTY_META[partyFilter].label} share of the region’s seats
                            </span>
                        )}
                    </figcaption>
                </figure>

                {/* Summary ------------------------------------------------- */}
                <div className="el-summary" aria-live="polite">
                    <h3 className="el-summary__title">{scopeName}</h3>
                    <p className="el-summary__sub">{scopeTally.total} seats</p>

                    <ul className="el-seatlist">
                        {PARTY_ORDER.filter((p) => p !== 'IND' || scopeTally.IND > 0).map((p) => (
                            <li key={p} className="el-seatlist__item" style={{ ['--el-party' as string]: PARTY_META[p].color }}>
                                <span className="el-seatlist__num"><AnimatedNumber value={scopeTally[p]} /></span>
                                <span className="el-seatlist__label">{PARTY_META[p].label}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="el-stack" aria-hidden="true">
                        {PARTY_ORDER.map((p) => (
                            <motion.span
                                key={p}
                                className="el-stack__seg"
                                style={{ background: PARTY_META[p].color }}
                                initial={false}
                                animate={{ width: scopeTally.total ? `${(scopeTally[p] / scopeTally.total) * 100}%` : '0%' }}
                                transition={{ duration: reduce ? 0 : 0.5, ease: 'easeOut' }}
                            />
                        ))}
                    </div>

                    <p className="el-summary__flips">
                        <strong><AnimatedNumber value={scopeTally.flips} /></strong> seats changed hands since 2020
                    </p>
                    {transitions.length > 0 && (
                        <ul className="el-transitions">
                            {transitions.slice(0, 4).map((t) => (
                                <li key={`${t.from}-${t.to}`}>
                                    <span className="el-dotlabel" style={{ ['--el-party' as string]: PARTY_META[t.from].color }}>
                                        {PARTY_META[t.from].label}
                                    </span>
                                    {' → '}
                                    <span className="el-dotlabel" style={{ ['--el-party' as string]: PARTY_META[t.to].color }}>
                                        {PARTY_META[t.to].label}
                                    </span>
                                    : {t.n}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="el-detail" aria-live="polite">
                        {active ? (
                            <>
                                <p className="el-detail__name">{active.name}</p>
                                <p className="el-detail__line">
                                    <span className="el-dotlabel" style={{ ['--el-party' as string]: PARTY_META[active.party].color }}>
                                        {PARTY_META[active.party].label}
                                    </span>{' '}
                                    {active.mp}
                                </p>
                                <p className="el-detail__muted">
                                    {regionById.get(active.region)?.name} region
                                    {active.prevMp
                                        ? ` · previously ${active.prevMp} (${active.prevParty ?? '—'})`
                                        : ' · new constituency'}
                                    {active.flipped ? ' · changed hands' : ''}
                                </p>
                            </>
                        ) : (
                            <p className="el-detail__muted">Select a tile below to see its MP.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Constituency tiles ------------------------------------------ */}
            <div
                ref={tilesRef}
                className="el-tiles"
                role="group"
                aria-label="All constituencies, grouped by region"
                // Pointer (not mouse) events: a tap also emits a synthetic mouseleave,
                // which would close the tooltip as soon as it opens on touch screens.
                onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') hideConstituency();
                }}
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hideConstituency();
                }}
            >
                {orderedRegionIds.map((regionId) => {
                    const list = byRegion.get(regionId) ?? [];
                    const name = regionById.get(regionId)?.name ?? regionId;
                    const regionDim = selectedRegion !== null && selectedRegion !== regionId;
                    return (
                        <div key={regionId} className="el-tilegroup" data-dim={regionDim || undefined}>
                            <button
                                type="button"
                                className="el-tilegroup__title"
                                aria-pressed={selectedRegion === regionId}
                                onClick={() => toggleRegionFromTiles(regionId)}
                            >
                                {name} <span>{list.length}</span>
                            </button>
                            <div className="el-tilegroup__tiles">
                                {list.map((c) => {
                                    const on = matches(c);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className="el-tile"
                                            data-party={c.party}
                                            data-flipped={c.flipped || undefined}
                                            data-off={!on || undefined}
                                            data-active={active?.id === c.id || undefined}
                                            style={{ ['--el-party' as string]: PARTY_META[c.party].color }}
                                            aria-label={`${c.name}: ${c.mp}, ${PARTY_META[c.party].label}${c.flipped ? ', changed hands' : ''}`}
                                            onMouseEnter={(event) => showConstituency(c, event.currentTarget)}
                                            onFocus={(event) => showConstituency(c, event.currentTarget)}
                                            onClick={(event) => showConstituency(c, event.currentTarget)}
                                        >
                                            {PARTY_META[c.party].letter}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                <AnimatePresence>
                    {active && tip && (
                        <motion.div
                            key="el-tip"
                            className="el-tip"
                            data-below={tip.below || undefined}
                            style={{ width: TIP_WIDTH }}
                            initial={{ opacity: 0, x: tip.x, y: tip.y }}
                            animate={{ opacity: 1, x: tip.x, y: tip.y }}
                            exit={{ opacity: 0 }}
                            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38, opacity: { duration: 0.15 } }}
                            aria-hidden="true"
                        >
                            <div className="el-tip__box" style={{ ['--el-party' as string]: PARTY_META[active.party].color }}>
                                <p className="el-tip__name">{active.name}</p>
                                <p className="el-tip__mp">
                                    <span className="el-tip__dot" />
                                    {active.mp} · {PARTY_META[active.party].label}
                                </p>
                                <p className="el-tip__muted">
                                    {regionById.get(active.region)?.name}
                                    {active.flipped && active.prevParty
                                        ? ` · gained from ${PARTY_META[active.prevParty].label}`
                                        : active.prevMp
                                          ? ' · party held the seat'
                                          : ' · new constituency'}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <p className="el-tiles__note">
                Each tile is one constituency (D = NDC, P = NPP, I = independent). Hover, focus or tap a tile to see its MP;
                select a region name to filter the map. An orange corner marks a seat that
                changed hands since 2020.
            </p>
        </section>
    );
}
