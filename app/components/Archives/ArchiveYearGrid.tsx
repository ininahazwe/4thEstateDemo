'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MONTH_NAMES } from './Types';

interface ArchiveYearGridProps {
    years: number[];
}

/**
 * Grille de rectangles (une par année). Au clic, ouverture d'un modal listant
 * les 12 mois. Le mois choisi navigue via router.push (useTransition) pour
 * afficher un spinner sur le bouton cliqué pendant la navigation ; le
 * loading.tsx de la route prend ensuite le relais (skeleton pleine page).
 * Aucun appel réseau pour le modal lui-même : les 12 mois sont toujours
 * proposés (un mois sans publication affiche une liste vide côté page mois),
 * sauf pour l'année en cours où les mois pas encore atteints sont grisés
 * (`disabled`, même style que le spinner de chargement) — ils n'ont par
 * définition aucun contenu.
 */
export default function ArchiveYearGrid({ years }: ArchiveYearGridProps) {
    const [openYear, setOpenYear] = useState<number | null>(null);
    const [pendingMonth, setPendingMonth] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    // Calculés au rendu client (composant 'use client', modal ouvert seulement
    // après interaction) : pas de risque de désaccord SSR/hydratation.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const dialogRef = useRef<HTMLDivElement>(null);
    const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
    const router = useRouter();

    const close = useCallback(() => {
        setOpenYear(null);
        lastTriggerRef.current?.focus();
    }, []);

    const goToMonth = useCallback((year: number, month: string) => {
        setPendingMonth(month);
        startTransition(() => {
            router.push(`/archives/${year}/${month}`);
        });
    }, [router]);

    useEffect(() => {
        if (openYear === null) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isPending) close();
        };
        document.addEventListener('keydown', onKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialogRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [openYear, close, isPending]);

    if (!years.length) {
        return <p className="archives-empty">No archives available yet.</p>;
    }

    return (
        <>
            <ul className="archives-year-grid">
                {years.map((year) => (
                    <li key={year}>
                        <button
                            type="button"
                            className="archives-year-card"
                            aria-haspopup="dialog"
                            aria-expanded={openYear === year}
                            onClick={(e) => {
                                lastTriggerRef.current = e.currentTarget;
                                setPendingMonth(null);
                                setOpenYear(year);
                            }}
                        >
                            <span className="archives-year-label">{year}</span>
                            <span className="archives-year-hint">View months</span>
                        </button>
                    </li>
                ))}
            </ul>

            {openYear !== null && createPortal(
                <div
                    className="archives-modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isPending) close();
                    }}
                >
                    <div
                        ref={dialogRef}
                        className="archives-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="archives-modal-title"
                        tabIndex={-1}
                    >
                        <div className="archives-modal-header">
                            <h2 id="archives-modal-title" className="archives-modal-title">
                                {openYear} — choose a month
                            </h2>
                            <button
                                type="button"
                                className="archives-modal-close"
                                aria-label="Close"
                                onClick={close}
                                disabled={isPending}
                            >
                                ×
                            </button>
                        </div>

                        <ul className="archives-month-grid">
                            {MONTH_NAMES.map((name, index) => {
                                const monthNum = index + 1;
                                const month = String(monthNum).padStart(2, '0');
                                const isThisPending = isPending && pendingMonth === month;
                                const isFuture = openYear === currentYear && monthNum > currentMonth;
                                return (
                                    <li key={name}>
                                        <button
                                            type="button"
                                            className={`archives-month-item${isThisPending ? ' is-loading' : ''}`}
                                            disabled={isPending || isFuture}
                                            aria-busy={isThisPending}
                                            aria-disabled={isFuture}
                                            title={isFuture ? 'No publications yet' : undefined}
                                            onClick={() => openYear !== null && goToMonth(openYear, month)}
                                        >
                                            {isThisPending && (
                                                <span className="archives-spinner" aria-hidden="true" />
                                            )}
                                            {name}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
