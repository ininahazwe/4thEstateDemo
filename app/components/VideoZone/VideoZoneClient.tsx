'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { VideoItem } from './types';

interface VideoZoneClientProps {
    items: VideoItem[];
}

export default function VideoZoneClient({ items }: VideoZoneClientProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    // Facade : le lecteur YouTube (~500 Ko de JS tiers) n'est charge qu'au clic.
    const [playing, setPlaying] = useState(false);

    if (!items.length) return null;

    const active = items[activeIndex];

    return (
        <section className="zone-video">
            <motion.div
                className="zone-video-bg"
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            />

            <div className="zone-video-inner">
                <div className="zone-video-label">
                    <span className="zone-video-icon" aria-hidden="true">▶</span>
                    Videos
                </div>

                <div className="zone-video-player">
                    {playing ? (
                        <iframe
                            key={active.youtubeId}
                            src={`https://www.youtube.com/embed/${active.youtubeId}?autoplay=1`}
                            title={active.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    ) : (
                        <button
                            type="button"
                            className="zone-video-facade"
                            onClick={() => setPlaying(true)}
                            aria-label={`Play video: ${active.title}`}
                        >
                            <img
                                src={`https://img.youtube.com/vi/${active.youtubeId}/hqdefault.jpg`}
                                alt=""
                                loading="lazy"
                                decoding="async"
                            />
                            <span className="zone-video-facade-play" aria-hidden="true">▶</span>
                        </button>
                    )}
                </div>

                <div className="zone-video-caption">
                    <span className="zone-video-title">{active.title}</span>
                    {active.duration && (
                        <span className="zone-video-duration">{active.duration}</span>
                    )}
                </div>

                {/* Vignettes de navigation — clic = changement de la vidéo principale */}
                <div className="zone-video-thumbs">
                    {items.map((video, index) => (
                        <button
                            type="button"
                            key={video.id}
                            className={`zone-video-thumb${index === activeIndex ? ' active' : ''}`}
                            onClick={() => {
                                setActiveIndex(index);
                                setPlaying(true);
                            }}
                            aria-current={index === activeIndex}
                        >
                            <img
                                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                                alt=""
                                loading="lazy"
                            />
                            <span className="zone-video-thumb-title">{video.title}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
