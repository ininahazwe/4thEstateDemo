'use client';

import { useEffect, useRef } from 'react';

interface TikTokEmbedProps {
    url: string;
}

declare global {
    interface Window {
        tiktokEmbed?: {
            lib?: {
                render: (target?: Document | HTMLElement) => void;
            };
        };
    }
}

const SCRIPT_ID = 'tiktok-embed-script';
const SCRIPT_SRC = 'https://www.tiktok.com/embed.js';

function loadTikTokScript(onLoaded: () => void) {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
        if (window.tiktokEmbed?.lib?.render) {
            onLoaded();
        } else {
            existing.addEventListener('load', onLoaded, { once: true });
        }
        return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', onLoaded, { once: true });
    document.body.appendChild(script);
}

export default function TikTokEmbed({ url }: TikTokEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadTikTokScript(() => {
            window.tiktokEmbed?.lib?.render(containerRef.current ?? document);
        });
    }, [url]);

    return (
        <div ref={containerRef} className="tiktok-embed-wrapper">
            <blockquote
                className="tiktok-embed"
                cite={url}
                data-video-id={extractVideoId(url)}
                style={{ maxWidth: '325px', minWidth: '325px' }}
            >
                <section>
                    <a target="_blank" rel="noopener noreferrer" href={url}>
                        Voir sur TikTok
                    </a>
                </section>
            </blockquote>
        </div>
    );
}

function extractVideoId(url: string): string {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : '';
}