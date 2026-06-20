'use client';

import { useEffect, useRef } from 'react';
import TikTokEmbed from './TikTokEmbed';

interface TikTokVideoModalProps {
    url: string | null;
    onClose: () => void;
}

/**
 * Modal "maison" pour ouvrir une vidéo TikTok en grand format.
 * PhotoSwipe ne peut pas être réutilisé ici : son moteur attend une image
 * ou un <video> natif avec des dimensions connues à l'avance, pas un iframe
 * tiers généré dynamiquement par le script embed.js de TikTok.
 *
 * L'embed TikTok n'est monté que lorsque le modal est ouvert (url non null),
 * pour éviter de charger un iframe par carte visible dans le slider.
 */
export default function TikTokVideoModal({ url, onClose }: TikTokVideoModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const isOpen = url !== null;

    // Fermeture via la touche Échap, tant que le modal est ouvert.
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Empêche le scroll de la page derrière le modal pendant qu'il est ouvert.
    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Ferme uniquement si le clic vise l'overlay lui-même, pas son contenu.
        if (e.target === overlayRef.current) onClose();
    };

    return (
        <div
            ref={overlayRef}
            className="tiktok-modal-overlay"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label="Lecture de la vidéo"
        >
            <button
                type="button"
                className="tiktok-modal-close"
                onClick={onClose}
                aria-label="Fermer la vidéo"
            >
                ×
            </button>

            <div className="tiktok-modal-content">
                <TikTokEmbed url={url} />
            </div>
        </div>
    );
}