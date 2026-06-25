'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PodcastEpisode } from '@/app/components/Podcasts/Types';

interface LatestPodcastWidgetProps {
    episode: PodcastEpisode;
}

export default function LatestPodcastWidget({ episode }: LatestPodcastWidgetProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <section className="ci-services latest-podcast-widget">
            <div className="section-title">Latest Podcast</div>
            <div className="wrap">
                <div className="item">
                    {isPlaying ? (
                        <div className="item-image podcast">
                            {/* Pas de autoplay=1 : Spotify exige un clic direct sur ses
                  propres contrôles pour démarrer la lecture (le clic sur
                  notre bouton, avant que l'iframe existe, ne compte pas
                  comme interaction côté Spotify). L'utilisateur doit
                  cliquer une 2e fois, cette fois sur le bouton ▶ visible
                  dans l'iframe elle-même — comportement normal et attendu
                  pour un embed tiers. */}
                            <iframe
                                src={`https://open.spotify.com/embed/episode/${episode.id}?utm_source=generator`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                                title={episode.title}
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="podcast-play-button"
                            onClick={() => setIsPlaying(true)}
                            aria-label={`Play ${episode.title}`}
                        >
                            <div className="item-image podcast">
                                <picture>
                                    <Image
                                        src={episode.cover}
                                        alt=""
                                        width={640}
                                        height={426}
                                        loading="lazy"
                                    />
                                </picture>
                            </div>
                        </button>
                    )}

                    <div className="item-text latest-podcast-text">
                        <div className="title">{episode.title}</div>
                        <div className="description">{episode.description}</div>
                    </div>
                </div>
            </div>
        </section>
    );
}