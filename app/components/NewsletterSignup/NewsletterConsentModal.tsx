"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface NewsletterConsentModalProps {
    open: boolean;
    /** Adresse validée à l'étape précédente, rappelée au lecteur avant qu'il confirme. */
    email: string;
    onCancel: () => void;
    onAccept: () => void;
    submitting?: boolean;
}

/**
 * Étape de consentement de l'inscription newsletter : une fois l'adresse
 * saisie et validée, le lecteur doit cocher explicitement qu'il accepte la
 * politique de confidentialité (page /privacy) avant que l'adresse ne parte
 * chez Mailchimp.
 *
 * Aucun appel réseau ici : le modal renvoie le contenu de /privacy par un lien
 * plutôt que de le dupliquer, ce qui garantit que le texte accepté est toujours
 * celui en vigueur (il vient de WordPress) et évite un second point à maintenir.
 *
 * Look et mécanique alignés sur AuthRequiredModal (portal vers document.body,
 * Escape, clic sur l'overlay, accent terracotta) pour rester homogène.
 */
export default function NewsletterConsentModal({
    open,
    email,
    onCancel,
    onAccept,
    submitting = false,
}: NewsletterConsentModalProps) {
    const [accepted, setAccepted] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);

    // La case repart décochée à chaque ouverture : un consentement doit être
    // un geste actif, pas un reliquat de la tentative précédente.
    useEffect(() => {
        if (open) setAccepted(false);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        previouslyFocused.current = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", onKeyDown);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = prevOverflow;
            // Le focus revient au champ email : sans ça il retombe sur <body>
            // et la navigation au clavier repart du haut de la page.
            previouslyFocused.current?.focus?.();
        };
    }, [open, onCancel]);

    if (!open) return null;

    // Portal vers document.body : le bandeau newsletter est parfois rendu dans
    // une section qui crée un contexte d'empilement (transform, filter…), ce
    // qui coincerait une modal position:fixed à l'intérieur.
    return createPortal(
        <div
            className="tfe-nl-modal-overlay"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) onCancel();
            }}
        >
            <div
                ref={dialogRef}
                className="tfe-nl-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tfe-nl-modal-title"
                aria-describedby="tfe-nl-modal-desc"
                tabIndex={-1}
            >
                <button
                    type="button"
                    className="tfe-nl-modal__close"
                    onClick={onCancel}
                    disabled={submitting}
                    aria-label="Close"
                >
                    ✕
                </button>

                <p id="tfe-nl-modal-title" className="tfe-nl-modal__title">
                    One last step
                </p>

                <p id="tfe-nl-modal-desc" className="tfe-nl-modal__desc">
                    We&rsquo;ll use <strong>{email}</strong> to send you The Fourth Estate&rsquo;s
                    newsletter. We never share it with third parties, and you can unsubscribe
                    from any email we send.
                </p>

                <a
                    className="tfe-nl-modal__policy"
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Read our Privacy Policy
                    <span aria-hidden="true"> ↗</span>
                </a>

                <label className="tfe-nl-modal__consent">
                    <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        disabled={submitting}
                    />
                    <span>I have read and accept the Privacy Policy.</span>
                </label>

                <div className="tfe-nl-modal__actions">
                    <button
                        type="button"
                        className="tfe-nl-modal__btn tfe-nl-modal__btn--primary"
                        onClick={onAccept}
                        disabled={!accepted || submitting}
                    >
                        {submitting ? "Subscribing…" : "Confirm subscription"}
                    </button>
                    <button
                        type="button"
                        className="tfe-nl-modal__btn tfe-nl-modal__btn--secondary"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            <style jsx>{`
                .tfe-nl-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(40, 40, 40, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 16px;
                    animation: tfe-nl-fade-in 0.15s ease;
                }
                .tfe-nl-modal {
                    position: relative;
                    width: 100%;
                    max-width: 420px;
                    background: #ffffff;
                    border-top: 4px solid #6d2929;
                    border-radius: 0;
                    padding: 32px 28px 28px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
                    text-align: left;
                    animation: tfe-nl-modal-in 0.18s ease;
                }
                .tfe-nl-modal:focus {
                    outline: none;
                }
                @keyframes tfe-nl-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes tfe-nl-modal-in {
                    from {
                        opacity: 0;
                        transform: translateY(8px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .tfe-nl-modal-overlay,
                    .tfe-nl-modal {
                        animation: none;
                    }
                }
                .tfe-nl-modal__close {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    width: 32px;
                    height: 32px;
                    border: none;
                    background: none;
                    color: #9a9a97;
                    font-size: 16px;
                    cursor: pointer;
                    border-radius: 50%;
                }
                .tfe-nl-modal__close:hover:not(:disabled) {
                    background: #f5f4f2;
                    color: #282828;
                }
                .tfe-nl-modal__title {
                    font-size: 21px;
                    font-weight: 700;
                    color: #282828;
                    margin: 0 0 10px;
                    padding-right: 20px;
                }
                .tfe-nl-modal__desc {
                    font-size: 14px;
                    line-height: 1.5;
                    color: #58514f;
                    margin: 0 0 16px;
                    /* wrap-anywhere : une adresse email longue ne doit pas
                       élargir la carte au-delà de son max-width. */
                    overflow-wrap: anywhere;
                }
                .tfe-nl-modal__policy {
                    display: inline-block;
                    font-size: 14px;
                    font-weight: 700;
                    color: #6d2929;
                    text-decoration: underline;
                    margin: 0 0 20px;
                }
                .tfe-nl-modal__consent {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    font-size: 14px;
                    line-height: 1.4;
                    color: #282828;
                    margin: 0 0 24px;
                    cursor: pointer;
                }
                .tfe-nl-modal__consent input {
                    /* Décalage d'1px pour aligner la case sur la première ligne
                       de texte plutôt que sur le haut de la boîte. */
                    margin-top: 1px;
                    width: 16px;
                    height: 16px;
                    flex: 0 0 auto;
                    accent-color: #6d2929;
                    cursor: pointer;
                }
                .tfe-nl-modal__actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .tfe-nl-modal__btn {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    text-align: center;
                    font-size: 14px;
                    font-weight: 700;
                    padding: 12px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    transition: background-color 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
                }
                .tfe-nl-modal__btn:disabled {
                    opacity: 0.5;
                    cursor: default;
                }
                .tfe-nl-modal__btn--primary {
                    background: #6d2929;
                    color: #ffffff;
                }
                .tfe-nl-modal__btn--primary:hover:not(:disabled) {
                    background: #571f1f;
                }
                .tfe-nl-modal__btn--secondary {
                    background: #ffffff;
                    color: #6d2929;
                    border: 1px solid #6d2929;
                }
                .tfe-nl-modal__btn--secondary:hover:not(:disabled) {
                    background: #f7eaea;
                }
            `}</style>
        </div>,
        document.body
    );
}
