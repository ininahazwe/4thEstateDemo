'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PresidentialAspirant } from '@/app/data/elections/types';
import { PARTY_META } from '@/app/data/elections/types';

interface CandidateGridProps {
    aspirants: PresidentialAspirant[];
}

const BASE_PATH = '/elections';
const nf = new Intl.NumberFormat('en-GB');

const STATUS_LABEL: Record<string, string> = {
    nominated: 'Flagbearer',
    lost_primary: 'Lost primary',
};

function candidatePath(id: string): string {
    return `${BASE_PATH}/candidates/${id}`;
}

function slugFromPath(pathname: string | null): string | null {
    const match = pathname?.match(/\/elections\/candidates\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Closes the modal. When it was opened from the grid during this visit, go
 * back in history (so "back" does not re-open it later); on a direct visit to
 * a candidate URL there is nothing to go back to, so push /elections instead.
 */
function closeModal(openedFromGrid: { current: boolean }) {
    if (openedFromGrid.current) {
        openedFromGrid.current = false;
        window.history.back();
    } else {
        window.history.pushState(null, '', BASE_PATH);
    }
}

function partyColor(party: string): string {
    return (PARTY_META as Record<string, { color: string }>)[party]?.color ?? '#6b7280';
}

function splitName(name: string): { first: string; last: string } {
    const parts = name.trim().split(/\s+/);
    return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// True only in the browser: the modal is portalled to <body>, which does not
// exist during server rendering.
const subscribeNoop = () => () => {};
function useIsClient(): boolean {
    return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

const listVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
};

function Avatar({ candidate, size, layoutId }: { candidate: PresidentialAspirant; size: 'card' | 'modal'; layoutId?: string }) {
    const px = size === 'modal' ? 96 : 72;
    return (
        <motion.span
            layoutId={layoutId}
            className="el-avatar"
            data-size={size}
            style={{ ['--el-party' as string]: partyColor(candidate.party) }}
            aria-hidden="true"
        >
            {candidate.photo ? (
                <Image src={candidate.photo} alt="" width={px} height={px} className="el-avatar__img" />
            ) : (
                initials(candidate.name)
            )}
        </motion.span>
    );
}

/**
 * Grid of presidential contenders with one modal per candidate.
 *
 * The open candidate is derived from the URL (/elections/candidates/{id}):
 * cards are real links, but a plain click only pushes the URL (no navigation),
 * so the modal opens instantly, the address is shareable and the browser's
 * back button closes it.
 */
export default function CandidateGrid({ aspirants }: CandidateGridProps) {
    const pathname = usePathname();
    const isClient = useIsClient();
    // 0 = opened from the grid (avatar morphs from the card); ±1 = prev/next.
    const [direction, setDirection] = useState(0);
    const closeRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const lastOpenId = useRef<string | null>(null);
    const openedFromGrid = useRef(false);

    const sorted = [...aspirants].sort((a, b) => b.primaryPct - a.primaryPct);
    const openId = slugFromPath(pathname);
    const openIndex = sorted.findIndex((a) => a.id === openId);
    const open = openIndex >= 0 ? sorted[openIndex] : null;
    const isOpen = open !== null;

    // Focus management + scroll lock, tied to the open/closed state only (not
    // to which candidate is shown, so prev/next keeps the keyboard focus).
    useEffect(() => {
        if (!isOpen) {
            if (lastOpenId.current) {
                document
                    .querySelector<HTMLElement>(`[data-cand-id="${lastOpenId.current}"]`)
                    ?.focus({ preventScroll: true });
                lastOpenId.current = null;
            }
            return;
        }
        closeRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (openId) lastOpenId.current = openId;
    }, [openId]);

    // Keyboard: listened on the document (not the dialog) so Escape and the
    // arrows keep working even when the focused element was just unmounted by
    // a candidate switch.
    useEffect(() => {
        if (!openId) return;
        const order = [...aspirants].sort((a, b) => b.primaryPct - a.primaryPct).map((a) => a.id);
        const index = order.indexOf(openId);
        if (index < 0) return;

        const go = (delta: number) => {
            setDirection(delta);
            window.history.replaceState(
                null,
                '',
                candidatePath(order[(index + delta + order.length) % order.length]),
            );
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeModal(openedFromGrid);
            } else if (event.key === 'ArrowRight') {
                go(1);
            } else if (event.key === 'ArrowLeft') {
                go(-1);
            } else if (event.key === 'Tab') {
                // Keep the focus inside the dialog.
                const dialog = dialogRef.current;
                const focusables = dialog?.querySelectorAll<HTMLElement>('button, a[href]');
                if (!dialog || !focusables || focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const activeElement = document.activeElement;
                if (!dialog.contains(activeElement)) {
                    event.preventDefault();
                    first.focus();
                } else if (event.shiftKey && activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [openId, aspirants]);

    function openFromGrid(event: ReactMouseEvent<HTMLAnchorElement>, id: string) {
        // Let the browser handle new-tab / new-window clicks.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        setDirection(0);
        openedFromGrid.current = true;
        window.history.pushState(null, '', candidatePath(id));
    }

    function close() {
        closeModal(openedFromGrid);
    }

    function step(delta: number) {
        if (openIndex < 0) return;
        const next = sorted[(openIndex + delta + sorted.length) % sorted.length];
        setDirection(delta);
        // replaceState: browsing inside the modal should not pile up history.
        window.history.replaceState(null, '', candidatePath(next.id));
    }

    function goTo(id: string) {
        const target = sorted.findIndex((a) => a.id === id);
        if (target < 0 || target === openIndex) return;
        setDirection(target > openIndex ? 1 : -1);
        window.history.replaceState(null, '', candidatePath(id));
    }

    return (
        <section className="el-block" aria-labelledby="el-candidates-title">
            <h2 id="el-candidates-title" className="el-block__title">The 2028 presidential contenders</h2>
            <p className="el-block__lead">
                Select a contender to see their profile and how they did in their party’s primary.
            </p>

            <MotionConfig reducedMotion="user">
                <motion.ul
                    className="el-cands"
                    variants={listVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.15 }}
                >
                    {sorted.map((a) => {
                        const { first, last } = splitName(a.name);
                        return (
                            <motion.li
                                key={a.id}
                                className="el-cands__item"
                                data-featured={a.status === 'nominated' || undefined}
                                variants={itemVariants}
                            >
                                <a
                                    href={candidatePath(a.id)}
                                    className="el-cand"
                                    data-cand-id={a.id}
                                    style={{ ['--el-party' as string]: partyColor(a.party) }}
                                    onClick={(event) => openFromGrid(event, a.id)}
                                >
                                    <Avatar candidate={a} size="card" layoutId={`el-avatar-${a.id}`} />
                                    <span className="el-cand__name">
                                        <span className="el-cand__first">{first}</span>{' '}
                                        <strong className="el-cand__last">{last}</strong>
                                    </span>
                                    <span className="el-cand__tagline">{a.tagline}</span>
                                    <span className="el-cand__meta">
                                        <span className="el-pill" data-status={a.status}>
                                            {a.party} · {STATUS_LABEL[a.status] ?? a.status}
                                        </span>
                                        <span className="el-cand__pct">{a.primaryPct}%</span>
                                    </span>
                                    <span className="el-cand__bar" aria-hidden="true">
                                        <span style={{ width: `${Math.max(a.primaryPct, 1.5)}%` }} />
                                    </span>
                                </a>
                            </motion.li>
                        );
                    })}

                    <motion.li className="el-cands__item" variants={itemVariants}>
                        <div className="el-cand el-cand--pending">
                            <span className="el-avatar" data-size="card" data-pending="true" aria-hidden="true">?</span>
                            <span className="el-cand__name"><strong className="el-cand__last">NDC</strong></span>
                            <span className="el-cand__tagline">No flagbearer chosen yet</span>
                        </div>
                    </motion.li>
                    <motion.li className="el-cands__item" variants={itemVariants}>
                        <div className="el-cand el-cand--pending">
                            <span className="el-avatar" data-size="card" data-pending="true" aria-hidden="true">?</span>
                            <span className="el-cand__name"><strong className="el-cand__last">Others</strong></span>
                            <span className="el-cand__tagline">No verified declarations so far</span>
                        </div>
                    </motion.li>
                </motion.ul>

                {isClient &&
                    createPortal(
                        <AnimatePresence>
                            {open && (
                                <motion.div
                                    key="el-modal"
                                    className="el-modal-root"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="el-modal-backdrop" onClick={close} />
                                    <motion.div
                                        ref={dialogRef}
                                        className="el-modal"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="el-modal-title"
                                        style={{ ['--el-party' as string]: partyColor(open.party) }}
                                        initial={{ y: 48, scale: 0.96 }}
                                        animate={{ y: 0, scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                                    >
                                        <button
                                            ref={closeRef}
                                            type="button"
                                            className="el-modal__close"
                                            aria-label="Close profile"
                                            onClick={close}
                                        >
                                            <X size={20} aria-hidden="true" />
                                        </button>

                                        <div className="el-modal__scroll">
                                            <AnimatePresence mode="wait" initial={false} custom={direction}>
                                                <motion.div
                                                    key={open.id}
                                                    custom={direction}
                                                    variants={slideVariants}
                                                    initial="enter"
                                                    animate="center"
                                                    exit="exit"
                                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                                >
                                                    <header className="el-modal__header">
                                                        <Avatar
                                                            candidate={open}
                                                            size="modal"
                                                            layoutId={direction === 0 ? `el-avatar-${open.id}` : undefined}
                                                        />
                                                        <div>
                                                            <h2 id="el-modal-title" className="el-modal__name">{open.name}</h2>
                                                            <p className="el-modal__tagline">{open.tagline}</p>
                                                            <span className="el-pill" data-status={open.status}>
                                                                {open.party} · {STATUS_LABEL[open.status] ?? open.status}
                                                            </span>
                                                        </div>
                                                    </header>

                                                    <dl className="el-facts">
                                                        {open.facts.map((fact) => (
                                                            <div key={fact.label} className="el-facts__row">
                                                                <dt>{fact.label}</dt>
                                                                <dd>{fact.value}</dd>
                                                            </div>
                                                        ))}
                                                    </dl>

                                                    <h3 className="el-modal__subtitle">
                                                        {open.party} primary, 31 January 2026 — placed {openIndex + 1} of {sorted.length}
                                                    </h3>
                                                    <ul className="el-bars">
                                                        {sorted.map((a, index) => {
                                                            const current = a.id === open.id;
                                                            return (
                                                                <li key={a.id} className="el-bars__row" data-current={current || undefined}>
                                                                    <div className="el-bars__label">
                                                                        {current ? (
                                                                            <span className="el-bars__name" aria-current="true">{a.name}</span>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                className="el-bars__name el-bars__link"
                                                                                onClick={() => goTo(a.id)}
                                                                            >
                                                                                {a.name}
                                                                            </button>
                                                                        )}
                                                                        <span className="el-bars__value">
                                                                            {a.primaryPct}% · {nf.format(a.primaryVotes)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="el-bars__track" aria-hidden="true">
                                                                        <motion.div
                                                                            className="el-bars__fill"
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${Math.max(a.primaryPct, 0.8)}%` }}
                                                                            transition={{ duration: 0.7, delay: 0.1 + index * 0.06, ease: 'easeOut' }}
                                                                        />
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>

                                                    <p className="el-modal__source">
                                                        Source:{' '}
                                                        <a href={open.sourceUrl} target="_blank" rel="noopener noreferrer">
                                                            Electoral Commission results via ModernGhana
                                                        </a>
                                                    </p>
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

                                        <div className="el-modal__nav">
                                            <button type="button" className="el-modal__navbtn" onClick={() => step(-1)}>
                                                <ChevronLeft size={18} aria-hidden="true" /> Previous
                                            </button>
                                            <span className="el-modal__count" aria-live="polite">
                                                {openIndex + 1} / {sorted.length}
                                            </span>
                                            <button type="button" className="el-modal__navbtn" onClick={() => step(1)}>
                                                Next <ChevronRight size={18} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>,
                        document.body,
                    )}
            </MotionConfig>
        </section>
    );
}
