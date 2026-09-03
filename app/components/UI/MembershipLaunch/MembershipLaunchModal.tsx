"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { MEMBERSHIP_JOIN_URL } from "@/lib/site-links";

/**
 * Popup d'annonce du lancement du programme de membres.
 *
 * Séquence : le site s'ouvre → 5 s plus tard le popup apparaît, avec un fond
 * WebGL interactif (cf. PressFreedomCanvas) et un compte à rebours jusqu'au
 * lundi 31 août 00:00 GMT.
 *
 * Réglages : les trois constantes ci-dessous. Après le 31, le composant ne
 * rend plus rien du tout (aucun compte à rebours négatif possible) — on peut
 * donc le laisser en place et le retirer du layout tranquillement ensuite.
 */

/** Cible du compte à rebours. Le Z est important : heure GMT, comme Accra. */
const LAUNCH_AT = "2026-09-29T00:00:00Z";
/** Délai avant ouverture, en ms. */
const OPEN_DELAY_MS = 5000;
/** Une fois fermé, on ne réaffiche pas dans cette session d'onglet.
 *  Pour « une seule fois par visiteur », remplacer sessionStorage par
 *  localStorage dans les deux appels plus bas. */
const STORAGE_KEY = "tfe:membership-launch-dismissed";

// Le canvas WebGL n'est téléchargé qu'à l'ouverture du popup : zéro impact
// sur le bundle initial du site.
const PressFreedomCanvas = dynamic(() => import("./PressFreedomCanvas"), {
    ssr: false,
});

type Remaining = { days: number; hours: number; minutes: number };

function remainingUntil(target: number): Remaining | null {
    const ms = target - Date.now();
    if (ms <= 0) return null;
    const totalMinutes = Math.floor(ms / 60000);
    return {
        days: Math.floor(totalMinutes / 1440),
        hours: Math.floor((totalMinutes % 1440) / 60),
        minutes: totalMinutes % 60,
    };
}

function pad(n: number) {
    return n < 10 ? `0${n}` : String(n);
}

export default function MembershipLaunchModal() {
    const launchTs = Date.parse(LAUNCH_AT);
    const { status } = useSession();

    const [open, setOpen] = useState(false);
    const [remaining, setRemaining] = useState<Remaining | null>(null);

    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeRef = useRef<HTMLButtonElement | null>(null);
    const restoreFocus = useRef<Element | null>(null);

    const dismiss = useCallback(() => {
        setOpen(false);
        try {
            window.sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
            /* navigation privée / storage bloqué : on ignore */
        }
        if (restoreFocus.current instanceof HTMLElement) {
            restoreFocus.current.focus();
        }
    }, []);

    /* --- déclenchement à +5 s ------------------------------------------- */
    useEffect(() => {
        if (Date.now() >= launchTs) return; // lancement passé : plus rien à annoncer
        if (status === "authenticated") return; // déjà membre / connecté

        let dismissed = false;
        try {
            dismissed = window.sessionStorage.getItem(STORAGE_KEY) === "1";
        } catch {
            /* storage inaccessible : on affiche, c'est le comportement le plus sûr */
        }
        if (dismissed) return;

        const id = window.setTimeout(() => {
            setRemaining(remainingUntil(launchTs));
            setOpen(true);
        }, OPEN_DELAY_MS);

        return () => window.clearTimeout(id);
    }, [launchTs, status]);

    /* --- compte à rebours ----------------------------------------------- */
    useEffect(() => {
        if (!open) return;
        const id = window.setInterval(() => {
            const next = remainingUntil(launchTs);
            setRemaining(next);
            if (!next) setOpen(false); // on a franchi l'heure du lancement
        }, 1000);
        return () => window.clearInterval(id);
    }, [open, launchTs]);

    /* --- scroll lock, focus, Échap, piège de tabulation ------------------ */
    useEffect(() => {
        if (!open) return;

        restoreFocus.current = document.activeElement;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();

        const onKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === "Escape") {
                ev.preventDefault();
                dismiss();
                return;
            }
            if (ev.key !== "Tab") return;
            const panel = panelRef.current;
            if (!panel) return;
            const focusables = panel.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (ev.shiftKey && document.activeElement === first) {
                ev.preventDefault();
                last.focus();
            } else if (!ev.shiftKey && document.activeElement === last) {
                ev.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, dismiss]);

    if (!open || !remaining) return null;

    return (
        <div
            className="mlm-overlay"
            role="presentation"
            onClick={(ev) => {
                if (ev.target === ev.currentTarget) dismiss();
            }}
        >
            <div
                className="mlm-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mlm-title"
                aria-describedby="mlm-lede"
                ref={panelRef}
            >
                <PressFreedomCanvas className="mlm-canvas" />
                <div className="mlm-scrim" aria-hidden="true" />

                <button
                    type="button"
                    className="mlm-close"
                    onClick={dismiss}
                    aria-label="Close this announcement"
                    ref={closeRef}
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                            d="M6 6l12 12M18 6L6 18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>

                <div className="mlm-content">
                    {/*<p className="mlm-eyebrow">The Fourth Estate · Membership</p>*/}

                    <h2 id="mlm-title" className="mlm-title">
                        We launched <span className="mlm-title-accent">The Fourth Estate Membership</span>.<br/>
                        Be among the first to join the community
                    </h2>

                    {/*<p id="mlm-lede" className="mlm-lede">
                        Some stories stay{" "}
                        <span className="mlm-title-accent">blacked out</span> until someone
                        pays for the light.
                    </p>*/}

                    {/*<p className="mlm-hint">
                        <span aria-hidden="true">✳</span>
                        <span className="mlm-hint-hover">
                            {" "}
                            Move your cursor across the page — the redactions lift where the
                            light falls.
                        </span>
                        <span className="mlm-hint-touch">
                            {" "}
                            Drag your finger across the page — the redactions lift where the
                            light falls.
                        </span>
                    </p>

                    <div
                        className="mlm-countdown"
                        role="timer"
                        aria-live="off"
                        aria-label={`Launch in ${remaining.days} days and ${remaining.hours} hours`}
                    >
                        <div className="mlm-unit">
                            <span className="mlm-num">{pad(remaining.days)}</span>
                            <span className="mlm-lab">{remaining.days === 1 ? "day" : "days"}</span>
                        </div>
                        <span className="mlm-sep" aria-hidden="true">
                            :
                        </span>
                        <div className="mlm-unit">
                            <span className="mlm-num">{pad(remaining.hours)}</span>
                            <span className="mlm-lab">{remaining.hours === 1 ? "hour" : "hours"}</span>
                        </div>
                        <span className="mlm-sep" aria-hidden="true">
                            :
                        </span>
                        <div className="mlm-unit">
                            <span className="mlm-num">{pad(remaining.minutes)}</span>
                            <span className="mlm-lab">min</span>
                        </div>
                    </div>*/}

                    <div className="mlm-actions">
                        <a
                            className="mlm-cta"
                            href={MEMBERSHIP_JOIN_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={dismiss}
                        >
                            Join the community now
                        </a>
                        <button type="button" className="mlm-later" onClick={dismiss}>
                            Not now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
