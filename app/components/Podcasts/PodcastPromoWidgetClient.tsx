'use client';

import { useState } from 'react';
import Image from 'next/image';
import { type PodcastEpisode } from './Types';

interface PodcastPromoWidgetClientProps {
    episode: PodcastEpisode;
}

/**
 * Barre horizontale compacte, largeur adaptative (container query, voir
 * podcast-promo-widget.css) — pensée pour être posée n'importe où (sidebar
 * étroite ou pleine largeur), sans dépendre de la mise en page qui l'entoure.
 *
 * Même mécanique de lecture que LatestPodcastWidget.tsx (aside article) :
 * l'iframe Spotify n'est montée qu'au clic, jamais préchargée derrière la
 * vignette.
 *
 * Pas de `autoplay=1` dans l'URL : Spotify exige un clic direct sur SES
 * propres contrôles pour démarrer la lecture — le clic sur notre bouton,
 * avant que l'iframe existe, ne compte pas comme interaction côté Spotify.
 * L'utilisateur doit cliquer une 2e fois sur le ▶ affiché dans l'iframe
 * elle-même. Comportement déjà documenté et accepté pour LatestPodcastWidget,
 * reproduit ici à l'identique plutôt que retenté sans succès.
 */
export default function PodcastPromoWidgetClient({ episode }: PodcastPromoWidgetClientProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    if (isPlaying) {
        return (
            <div className="podcast-promo-widget">
                <div className="podcast-promo-embed">
                    <iframe
                        src={`https://open.spotify.com/embed/episode/${episode.id}?utm_source=generator`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        title={episode.title}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="podcast-promo-widget">
            <button
                type="button"
                className="podcast-promo-bar"
                onClick={() => setIsPlaying(true)}
                aria-label={`Play ${episode.title}`}
            >
                <span className="podcast-promo-thumb">
                    <Image src={episode.cover} alt="" width={64} height={64} loading="lazy" />
                </span>
                <span className="podcast-promo-info">
                    <span className="podcast-promo-label">Latest episode</span>
                    <span className="podcast-promo-title">{episode.title}</span>
                </span>
                <span className="podcast-promo-play" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </span>
            </button>
        </div>
    );
}
