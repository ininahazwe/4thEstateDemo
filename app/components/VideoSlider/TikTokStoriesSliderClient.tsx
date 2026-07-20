'use client';

import { useRef, useState } from 'react';
import TikTokVideoModal from "@/app/components/VideoSlider/Tiktokvideomodal";
import {VideoStoryItem} from "@/app/components/VideoSlider/Tiktokdemodata";

interface TikTokStoriesSliderClientProps {
    items: VideoStoryItem[];
}

/**
 * Interactive slider component (scroll, modal opening).
 * Receives pre-enriched items with thumbnails (resolved server-side
 * via TikTok oEmbed in TikTokStoriesSlider.tsx) — this component
 * does no fetching itself.
 */
export default function TikTokStoriesSliderClient({ items }: TikTokStoriesSliderClientProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [activeItem, setActiveItem] = useState<VideoStoryItem | null>(null);

    const scrollByCard = (direction: "prev" | "next") => {
        const track = trackRef.current;
        if (!track) return;
        const cardWidth = track.querySelector(".item")?.clientWidth ?? 218;
        track.scrollBy({
            left: direction === "next" ? cardWidth : -cardWidth,
            behavior: "smooth",
        });
    };

    return (
        <section className="zone zone-type zone-insta">
            <h3 className="section-title">Video Stories</h3>

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
                                                aria-label={item.caption ? `Play: ${item.caption}` : 'Play video'}
                                                onClick={() => setActiveItem(item)}
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
                            aria-label="Previous video"
                            onClick={() => scrollByCard('prev')}
                        >
                            <span className="icon icon-prev" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            aria-label="Next video"
                            onClick={() => scrollByCard('next')}
                        >
                            <span className="icon icon-next" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            <TikTokVideoModal item={activeItem} onClose={() => setActiveItem(null)} />
        </section>
    );
}