'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import type {
    Constituency,
    ConstituencyResult,
    ConstituencyShape,
    PartyCode,
    RegionMapData,
} from '@/app/data/elections/types';
import { CLOSE_COLOR, CLOSE_RACE_POINTS, FLIP_COLOR, PARTY_META, PARTY_ORDER } from '@/app/data/elections/types';

// Shorter labels for small regions so they do not collide on the map.
const LABEL_SHORT: Record<string, string> = { 'Greater Accra': 'Accra', 'Western North': 'W. North' };

type Metric = 'winner' | 'flips' | 'close';
type Layer = 'constituencies' | 'regions';

const OTHER_PARTY_COLOR = '#6b7280';

function partyColor(code: string): string {
    return (PARTY_META as Record<string, { color: string }>)[code]?.color ?? OTHER_PARTY_COLOR;
}

function isClose(c: Constituency): boolean {
    return c.margin24 !== null && c.margin24 < CLOSE_RACE_POINTS;
}

/** Bounding box of an SVG path made only of absolute M/L/Z commands. */
function pathBox(d: string): { x: number; y: number; w: number; h: number } {
    const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
        minX = Math.min(minX, nums[i]);
        maxX = Math.max(maxX, nums[i]);
        minY = Math.min(minY, nums[i + 1]);
        maxY = Math.max(maxY, nums[i + 1]);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

const pct = (v: number, total: number) => (total ? (v / total) * 100 : 0);

/** Top-3 result of one election, with bars that grow when the constituency changes. */
function ResultBars({ result, year, animateBars }: { result: ConstituencyResult; year: string; animateBars: boolean }) {
    return (
        <div className="el-result">
            <p className="el-result__head">
                {year} result <span>· {result.total.toLocaleString('en-GB')} valid votes</span>
            </p>
            <ul className="el-result__rows">
                {result.top.map((r, index) => {
                    const share = pct(r.v, result.total);
                    return (
                        <li key={`${r.p}-${r.c}`} className="el-result__row" style={{ ['--el-party' as string]: partyColor(r.p) }}>
                            <span className="el-result__label">
                                <span className="el-result__party">{r.p}</span> {r.c}
                            </span>
                            <span className="el-result__pct">{share.toFixed(1)}%</span>
                            <span className="el-result__track" aria-hidden="true">
                                <motion.span
                                    className="el-result__fill"
                                    initial={animateBars ? { width: 0 } : false}
                                    animate={{ width: `${share}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
                                />
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
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
    /** Boundaries by constituency id. A constituency without a shape (Guan) only appears in the tiles. */
    shapes: Record<string, ConstituencyShape>;
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

export default function ElectionsExplorer({ regionMap, constituencies, shapes }: ElectionsExplorerProps) {
    const reduce = useReducedMotion();
    const [metric, setMetric] = useState<Metric>('winner');
    const [layer, setLayer] = useState<Layer>('constituencies');
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
        (partyFilter === 'all' || c.party === partyFilter) &&
        (metric === 'winner' || (metric === 'flips' ? c.flipped : isClose(c)));

    const regionBoxes = useMemo(() => new Map(regionMap.regions.map((r) => [r.id, pathBox(r.d)])), [regionMap]);
    const missingShapes = useMemo(() => constituencies.filter((c) => !shapes[c.id]), [constituencies, shapes]);

    // Zoom: in the constituency layer, the map frames the selected region.
    const viewBox = useMemo(() => {
        if (layer !== 'constituencies' || !selectedRegion) return regionMap.viewBox;
        const box = regionBoxes.get(selectedRegion);
        if (!box) return regionMap.viewBox;
        const pad = Math.max(box.w, box.h) * 0.08;
        return `${(box.x - pad).toFixed(1)} ${(box.y - pad).toFixed(1)} ${(box.w + pad * 2).toFixed(1)} ${(box.h + pad * 2).toFixed(1)}`;
    }, [layer, selectedRegion, regionBoxes, regionMap.viewBox]);
    const zoomed = viewBox !== regionMap.viewBox;

    function constituencyPaint(c: Constituency): { fill: string; opacity: number } {
        if (!matches(c)) return { fill: '#b8b8b8', opacity: 0.35 };
        if (metric === 'winner' && partyFilter === 'all') {
            // Safer seats darker: the margin (in points) drives the shade.
            const margin = c.margin24 ?? 30;
            return { fill: PARTY_META[c.party].color, opacity: 0.4 + 0.6 * Math.min(1, margin / 30) };
        }
        return { fill: PARTY_META[c.party].color, opacity: 0.95 };
    }

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
        const fill =
            metric === 'flips' ? FLIP_COLOR : metric === 'close' ? CLOSE_COLOR : PARTY_META[partyFilter as PartyCode].color;
        // Flipped and close seats are a minority in most regions: rescale so differences stay visible.
        const scaled = metric === 'winner' ? share : Math.min(1, share / (metric === 'flips' ? 0.6 : 0.4));
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

    /** Constituency pointed on the map: details go to the panel next to it. */
    function showFromMap(c: Constituency) {
        setActive(c);
        setTip(null);
    }

    /** Hover on the map: once zoomed, only the selected region's constituencies respond. */
    function hoverOnMap(c: Constituency) {
        if (selectedRegion && c.region !== selectedRegion) return;
        showFromMap(c);
    }

    /** Click on the map: drill down into (or jump to) the constituency's region. */
    function clickOnMap(c: Constituency) {
        showFromMap(c);
        if (selectedRegion !== c.region) setSelectedRegion(c.region);
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
        setLayer('constituencies');
        setSelectedRegion(null);
        setActive(null);
        setTip(null);
    }

    const isDefault = metric === 'winner' && partyFilter === 'all' && !selectedRegion && layer === 'constituencies';
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
                    <button
                        type="button"
                        className="el-chip"
                        aria-pressed={metric === 'close'}
                        onClick={() => setMetric('close')}
                    >
                        Close races (&lt; {CLOSE_RACE_POINTS} pts)
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
                    <div className="el-map-bar">
                        <div className="el-seg" role="group" aria-label="Map detail">
                            <button
                                type="button"
                                aria-pressed={layer === 'constituencies'}
                                onClick={() => setLayer('constituencies')}
                            >
                                Constituencies
                            </button>
                            <button type="button" aria-pressed={layer === 'regions'} onClick={() => setLayer('regions')}>
                                Regions
                            </button>
                        </div>
                        <AnimatePresence>
                            {selectedRegion && (
                                <motion.button
                                    type="button"
                                    className="el-back"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    onClick={() => toggleRegion(selectedRegion)}
                                >
                                    ← All of Ghana
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    <motion.svg
                        className="el-map"
                        data-layer={layer}
                        data-zoomed={zoomed || undefined}
                        viewBox={regionMap.viewBox}
                        initial={false}
                        animate={{ viewBox }}
                        transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                        role="group"
                        aria-label={
                            layer === 'constituencies'
                                ? 'Map of Ghana’s parliamentary constituencies, coloured by the party that won in 2024. Select a region to zoom in; the constituency list below gives every result.'
                                : 'Map of Ghana’s 16 regions. Select a region to see its constituencies.'
                        }
                        // Pointer (not mouse) events: a tap also emits a synthetic mouseleave
                        // that would clear the panel right after it was filled.
                        onPointerLeave={(event) => {
                            if (event.pointerType === 'mouse') setActive(null);
                        }}
                    >
                        {layer === 'constituencies' &&
                            constituencies.map((c) => {
                                const shape = shapes[c.id];
                                if (!shape) return null;
                                const paint = constituencyPaint(c);
                                const dimmed = selectedRegion !== null && c.region !== selectedRegion;
                                return (
                                    <path
                                        key={c.id}
                                        d={shape.d}
                                        className="el-cons"
                                        data-active={active?.id === c.id || undefined}
                                        style={{ fill: paint.fill, fillOpacity: dimmed ? paint.opacity * 0.25 : paint.opacity }}
                                        aria-hidden="true"
                                        onMouseEnter={() => hoverOnMap(c)}
                                        onClick={() => clickOnMap(c)}
                                    />
                                );
                            })}

                        {regionMap.regions.map((r) => {
                            const t = regionTallies.get(r.id) ?? emptyTally();
                            const selected = selectedRegion === r.id;
                            const dimmed = selectedRegion !== null && !selected;
                            const paint = regionPaint(r.id);
                            const common = {
                                className: layer === 'regions' ? 'el-region' : 'el-region el-region--outline',
                                'data-selected': selected || undefined,
                                role: 'button',
                                tabIndex: 0,
                                'aria-pressed': selected,
                                'aria-label': `${r.name} region: ${t.NDC} NDC, ${t.NPP} NPP, ${t.IND} independent; ${t.flips} seats changed hands`,
                                onClick: () => toggleRegion(r.id),
                                onKeyDown: (e: React.KeyboardEvent<SVGPathElement>) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleRegion(r.id);
                                    }
                                },
                            };
                            return layer === 'regions' ? (
                                <motion.path
                                    key={r.id}
                                    d={r.d}
                                    {...common}
                                    initial={false}
                                    animate={{
                                        fill: paint.fill,
                                        fillOpacity: dimmed ? paint.opacity * 0.35 : paint.opacity,
                                    }}
                                    transition={{ duration: reduce ? 0 : 0.45 }}
                                >
                                    <title>{`${r.name}: ${t.total} seats`}</title>
                                </motion.path>
                            ) : (
                                <path key={r.id} d={r.d} {...common} />
                            );
                        })}

                        {!zoomed &&
                            regionMap.regions.map((r) => (
                                <text key={`${r.id}-label`} x={r.cx} y={r.cy} className="el-map__label" textAnchor="middle">
                                    {LABEL_SHORT[r.name] ?? r.name}
                                </text>
                            ))}
                    </motion.svg>

                    <figcaption className="el-map__legend">
                        {layer === 'constituencies' ? (
                            <>
                                {metric === 'winner' && partyFilter === 'all' ? (
                                    <>
                                        {PARTY_ORDER.map((p) => (
                                            <span key={p}>
                                                <span className="el-swatch" style={{ background: PARTY_META[p].color }} aria-hidden="true" />
                                                {PARTY_META[p].label}
                                            </span>
                                        ))}
                                        <span className="el-legend__note">Darker = bigger 2024 margin</span>
                                    </>
                                ) : (
                                    <span>
                                        Coloured:{' '}
                                        {metric === 'flips'
                                            ? 'seats that changed hands'
                                            : metric === 'close'
                                              ? `seats won by less than ${CLOSE_RACE_POINTS} points`
                                              : 'seats won'}
                                        {partyFilter !== 'all' ? ` by ${PARTY_META[partyFilter].label}` : ''}; grey: the rest
                                    </span>
                                )}
                                {missingShapes.length > 0 && (
                                    <span className="el-legend__note">
                                        {missingShapes.map((c) => c.name).join(', ')} (new in 2024) has no published boundary
                                        yet and only appears in the list below.
                                    </span>
                                )}
                            </>
                        ) : metric !== 'winner' ? (
                            <span>
                                <span
                                    className="el-swatch"
                                    style={{ background: metric === 'flips' ? FLIP_COLOR : CLOSE_COLOR }}
                                    aria-hidden="true"
                                />
                                Darker = more {metric === 'flips' ? 'seats that changed hands' : 'close races'}
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

                </div>

                {/* Selected constituency (own grid area: right under the map on phones). */}
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
                            {active.r24 && (
                                <ResultBars key={`${active.id}-24`} result={active.r24} year="2024" animateBars={!reduce} />
                            )}
                            {active.r20 && (
                                <p className="el-detail__muted el-detail__prev">
                                    2020:{' '}
                                    {active.r20.top
                                        .slice(0, 2)
                                        .map((r) => `${r.p} ${pct(r.v, active.r20!.total).toFixed(1)}%`)
                                        .join(' · ')}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="el-detail__muted">
                            Point at a constituency on the map, or select a tile below, to see its result.
                        </p>
                    )}
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
