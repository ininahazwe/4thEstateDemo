'use client';

import { useEffect, useRef } from 'react';
import VideoEmbed from './VideoEmbed';
import { type VideoStoryItem } from './Tiktokdemodata';

interface TikTokVideoModalProps {
    item: VideoStoryItem | null;
    onClose: () => void;
}

/**
 * Custom modal, multi-plateforme (TikTok, YouTube…) via VideoEmbed.
 * PhotoSwipe can't be reused here: its engine expects an image or native
 * <video> with known dimensions, not third-party iframes dynamiquement
 * générés par les scripts d'embed de chaque plateforme.
 *
 * L'embed n'est monté que quand la modale est ouverte (item non null),
 * pour éviter de charger un iframe par carte visible dans le slider.
 */
export default function TikTokVideoModal({ item, onClose }: TikTokVideoModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const isOpen = item !== null;

    // Close via Escape key while modal is open.
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent page scrolling behind modal while open.
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
        // Close only if click targets overlay itself, not its content.
        if (e.target === overlayRef.current) onClose();
    };

    return (
        <div
            ref={overlayRef}
            className="tiktok-modal-overlay"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-label="Play video"
        >
            <button
                type="button"
                className="tiktok-modal-close"
                onClick={onClose}
                aria-label="Close video"
            >
                ×
            </button>

            <div className="tiktok-modal-content">
                {item && <VideoEmbed url={item.url} platform={item.platform} />}
            </div>
        </div>
    );
}