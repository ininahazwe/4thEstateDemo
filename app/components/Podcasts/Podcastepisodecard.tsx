'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PodcastEpisode } from './Types';

interface PodcastEpisodeCardProps {
    episode: PodcastEpisode;
    index: number;
}

export default function PodcastEpisodeCard({ episode, index }: PodcastEpisodeCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <article
            className="item"
            data-model="story"
            data-type="stories"
            data-index={index}
            data-item-id={episode.id}
        >
            <div className="podcast-item-trigger">
                <div className="item-image podcast">
                    {isPlaying ? (
                        <iframe
                            src={`https://open.spotify.com/embed/episode/${episode.id}?utm_source=generator&autoplay=1`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            title={episode.title}
                        />
                    ) : (
                        <button
                            type="button"
                            className="podcast-play-button"
                            onClick={() => setIsPlaying(true)}
                            aria-label={`Play ${episode.title}`}
                        >
                            <picture>
                                <Image
                                    src={episode.cover}
                                    alt=""
                                    width={640}
                                    height={360}
                                    loading="lazy"
                                />
                            </picture>
                        </button>
                    )}
                </div>

                <div className="item-text">
                    <div className="heading">
                        <span className="sr-only">The Fourth Estate Podcast</span>
                        <p id={`title-${episode.id}`} className="title">
                            {episode.title}
                        </p>
                    </div>

                    <div className="infos">
                        <div className="wrapper">
              <span className="date" data-icon="calendar-days">
                {episode.publishedAt}
              </span>
                        </div>
                        <div className="placeholders">
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}