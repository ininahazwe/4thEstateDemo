"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { WP_REGISTER_URL } from "@/lib/site-links";

interface AuthRequiredModalProps {
    open: boolean;
    onClose: () => void;
    /** Appelé quand le lecteur choisit "Log in" — au parent de stocker
     *  l'intention en attente (ex. bookmark) avant de naviguer vers /connexion. */
    onLoginClick: () => void;
    title?: string;
    description?: string;
}

/**
 * Modal générique "réservé aux membres" — à réutiliser partout où une
 * action nécessite un compte (bookmark aujourd'hui, autres actions
 * gated plus tard). Look maison (accent terracotta #6d2929, radius 0
 * sur la carte), distinct de la maquette d'inspiration.
 */
export default function AuthRequiredModal({
    open,
    onClose,
    onLoginClick,
    title = "Save this for later?",
    description = "This feature is reserved for our members.",
}: AuthRequiredModalProps) {
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    // Portal vers document.body : le bouton bookmark vit souvent dans une
    // carte dont le survol pose transform:translateY (base.css), ce qui crée
    // un contexte d'empilement local et coince une modal position:fixed
    // dedans (elle apparaît alors à moitié sous d'autres cartes). Le portal
    // échappe à tout ancêtre, quel que soit le composant appelant.
    return createPortal(
        <div
            className="tfe-auth-modal-overlay"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="tfe-auth-modal" role="dialog" aria-modal="true" aria-labelledby="tfe-auth-modal-title">
                <button type="button" className="tfe-auth-modal__close" onClick={onClose} aria-label="Close">
                    ✕
                </button>

                <p id="tfe-auth-modal-title" className="tfe-auth-modal__title">
                    {title}
                </p>
                <p className="tfe-auth-modal__desc">{description}</p>

                <div className="tfe-auth-modal__actions">
                    <a href={WP_REGISTER_URL} className="tfe-auth-modal__btn tfe-auth-modal__btn--primary">
                        Create account
                    </a>
                    <button type="button" className="tfe-auth-modal__btn tfe-auth-modal__btn--secondary" onClick={onLoginClick}>
                        Log in
                    </button>
                </div>
            </div>

            <style jsx>{`
                .tfe-auth-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(40, 40, 40, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 16px;
                    animation: tfe-auth-fade-in 0.15s ease;
                }
                .tfe-auth-modal {
                    position: relative;
                    width: 100%;
                    max-width: 380px;
                    background: #ffffff;
                    border-top: 4px solid #6d2929;
                    border-radius: 0;
                    padding: 32px 28px 28px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
                    animation: tfe-auth-modal-in 0.18s ease;
                }
                @keyframes tfe-auth-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes tfe-auth-modal-in {
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
                    .tfe-auth-modal-overlay,
                    .tfe-auth-modal {
                        animation: none;
                    }
                }
                .tfe-auth-modal__close {
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
                .tfe-auth-modal__close:hover {
                    background: #f5f4f2;
                    color: #282828;
                }
                .tfe-auth-modal__title {
                    font-size: 21px;
                    font-weight: 700;
                    color: #282828;
                    margin: 0 0 10px;
                    padding-right: 20px;
                }
                .tfe-auth-modal__desc {
                    font-size: 14px;
                    line-height: 1.5;
                    color: #58514f;
                    margin: 0 0 24px;
                }
                .tfe-auth-modal__actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .tfe-auth-modal__btn {
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
                    text-decoration: none;
                    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
                }
                .tfe-auth-modal__btn--primary {
                    background: #6d2929;
                    color: #ffffff;
                }
                .tfe-auth-modal__btn--primary:hover {
                    background: #571f1f;
                }
                .tfe-auth-modal__btn--secondary {
                    background: #ffffff;
                    color: #6d2929;
                    border: 1px solid #6d2929;
                }
                .tfe-auth-modal__btn--secondary:hover {
                    background: #f7eaea;
                }
            `}</style>
        </div>,
        document.body
    );
}
