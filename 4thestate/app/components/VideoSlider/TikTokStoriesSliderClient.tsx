'use client';

import { useRef, useState } from 'react';
import TikTokVideoModal from "@/app/components/VideoSlider/Tiktokvideomodal";
import {TikTokDemoItem} from "@/app/components/VideoSlider/Tiktokdemodata";

interface TikTokStoriesSliderClientProps {
    items: TikTokDemoItem[];
}

/**
 * Partie interactive du slider (scroll, ouverture du modal).
 * Reçoit des items déjà enrichis avec leur thumbnail (résolue côté serveur
 * via l'oEmbed TikTok dans TikTokStoriesSlider.tsx) — ce composant ne fait
 * aucun fetch lui-même.
 */
export default function TikTokStoriesSliderClient({ items }: TikTokStoriesSliderClientProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [activeUrl, setActiveUrl] = useState<string | null>(null);

    const scrollByCard = (direction: 'prev' | 'next') => {
        const track = trackRef.current;
        if (!track) return;
        const cardWidth = track.querySelector('.item')?.clientWidth ?? 218;
        track.scrollBy({
            left: direction === 'next' ? cardWidth : -cardWidth,
            behavior: 'smooth',
        });
    };

    return (
        <section className="zone zone-type zone-insta">
            <h3 className="section-title">L’actu en vidéos</h3>

            <div className="wrap">
                <div id="stories">
                    <div className="carousel" ref={trackRef} role="region" aria-label="video feed">
                        {items.map((item) => (
                            <div className="item" key={item.id} role="group">
                                <div className="card">
                                    <div className="smudge">
                                        <div
                                            className="thumb"
                                            style={
                                                item.thumbnail
                                                    ? { backgroundImage: `url("${item.thumbnail}")` }
                                                    : undefined
                                            }
                                        >
                                            <button
                                                type="button"
                                                className="player"
                                                aria-label={item.caption ? `Lire : ${item.caption}` : 'Lire la vidéo'}
                                                onClick={() => setActiveUrl(item.url)}
                                            >
                                                {(item.duration || item.caption) && (
                                                    <div className="controls">
                                                        <div className="meta">
                                                            {item.duration && (
                                                                <div className="duration">
                                                                    <span className="duration-icon" aria-hidden="true" />
                                                                    <span className="text">{item.duration}</span>
                                                                </div>
                                                            )}
                                                            {item.caption && (
                                                                <div className="headline">
                                                                    <span className="text">{item.caption}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="navigation-buttons">
                        <button
                            type="button"
                            aria-label="Vidéo précédente"
                            onClick={() => scrollByCard('prev')}
                        >
                            <span className="icon icon-prev" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            aria-label="Vidéo suivante"
                            onClick={() => scrollByCard('next')}
                        >
                            <span className="icon icon-next" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            <TikTokVideoModal url={activeUrl} onClose={() => setActiveUrl(null)} />
        </section>
    );
}