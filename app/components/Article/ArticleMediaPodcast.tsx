'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa6';

export interface ArticleMediaPodcastProps {
    /** ID d'épisode Spotify (segment final de l'URL open.spotify.com/episode/<id>). */
    episodeId: string;
    title: string;
    show: string;
    description: string;
    cover: string;
    duration?: string;
}

/**
 * Section podcast de la page article "media".
 *
 * Client Component : l'iframe Spotify n'est montée qu'au clic (click-to-load),
 * pour ne pas charger un embed tiers lourd au rendu initial de l'article.
 * Même pattern que LatestPodcastWidget / PodcastEpisodeCard.
 *
 * NB : pas d'autoplay=1 — Spotify exige un clic sur ses propres contrôles ;
 * l'utilisateur clique donc une 2e fois sur le ▶ de l'iframe (comportement
 * normal d'un embed tiers).
 */
export default function ArticleMediaPodcast({
    episodeId,
    title,
    show,
    description,
    cover,
    duration,
}: ArticleMediaPodcastProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <section className="am-podcast" aria-label="Listen to the podcast">
            <div className="am-podcast-inner">
                <div className="am-podcast-kicker">
                    <FaSpotify size={16} aria-hidden="true" />
                    <span>Listen on Spotify</span>
                </div>

                {isPlaying ? (
                    <div className="am-podcast-embed">
                        <iframe
                            src={`https://open.spotify.com/embed/episode/${episodeId}?utm_source=generator`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            title={title}
                        />
                    </div>
                ) : (
                    <div className="am-podcast-card">
                        <button
                            type="button"
                            className="am-podcast-cover"
                            onClick={() => setIsPlaying(true)}
                            aria-label={`Play ${title}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cover} alt="" loading="lazy" />
                            <span className="am-podcast-play" aria-hidden="true">
                                <Play size={26} fill="currentColor" />
                            </span>
                        </button>

                        <div className="am-podcast-text">
                            <div className="am-podcast-show">{show}</div>
                            <h3 className="am-podcast-title">{title}</h3>
                            <p className="am-podcast-desc">{description}</p>
                            {duration && <div className="am-podcast-duration">{duration}</div>}
                            <button
                                type="button"
                                className="am-podcast-cta"
                                onClick={() => setIsPlaying(true)}
                            >
                                <Play size={16} fill="currentColor" aria-hidden="true" />
                                Play episode
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
