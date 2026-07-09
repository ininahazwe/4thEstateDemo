'use client';

import { useState } from 'react';
import { videoItems } from './videoData';

export default function VideoZone() {
    const [activeIndex, setActiveIndex] = useState(0);

    if (!videoItems.length) return null;

    const active = videoItems[activeIndex];

    return (
        <section className="zone-video">
            {/* Casse la largeur de #site-main pour occuper tout le viewport
                (voir .zone-video dans video-zone.css) — seul le fond est
                pleine largeur, le contenu ci-dessous reste, lui, aligné sur
                la largeur standard du site via .zone-video-inner. */}
            <div className="zone-video-inner">
                <div className="zone-video-label">
                    <span className="zone-video-icon" aria-hidden="true">▶</span>
                    Vidéo
                </div>

                <div className="zone-video-player">
                    <iframe
                        key={active.youtubeId}
                        src={`https://www.youtube.com/embed/${active.youtubeId}`}
                        title={active.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>

                <div className="zone-video-caption">
                    <span className="zone-video-title">{active.title}</span>
                    {active.duration && (
                        <span className="zone-video-duration">{active.duration}</span>
                    )}
                </div>

                {/* Vignettes de navigation — clic = changement de la vidéo principale */}
                <div className="zone-video-thumbs">
                    {videoItems.map((video, index) => (
                        <button
                            type="button"
                            key={video.id}
                            className={`zone-video-thumb${index === activeIndex ? ' active' : ''}`}
                            onClick={() => setActiveIndex(index)}
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
