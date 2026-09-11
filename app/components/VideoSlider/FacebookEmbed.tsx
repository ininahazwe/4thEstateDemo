'use client';

import { useEffect, useRef } from 'react';

interface FacebookEmbedProps {
    url: string;
}

declare global {
    interface Window {
        FB?: {
            XFBML?: {
                parse: (target?: Document | HTMLElement) => void;
            };
        };
    }
}

const SCRIPT_ID = 'facebook-jssdk';
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v21.0';
const FB_ROOT_ID = 'fb-root';

function ensureFbRoot() {
    if (!document.getElementById(FB_ROOT_ID)) {
        const root = document.createElement('div');
        root.id = FB_ROOT_ID;
        document.body.prepend(root);
    }
}

function loadFacebookScript(onLoaded: () => void) {
    ensureFbRoot();

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
        if (window.FB?.XFBML?.parse) {
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
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', onLoaded, { once: true });
    document.body.appendChild(script);
}

/**
 * Embed Facebook (vidéo ou reel), même mécanique que TikTokEmbed.tsx :
 * script chargé une seule fois, puis `FB.XFBML.parse()` sur le conteneur
 * à chaque montage — nécessaire car la modale n'est montée qu'à l'ouverture,
 * après le premier `#xfbml=1` automatique du SDK.
 */
export default function FacebookEmbed({ url }: FacebookEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadFacebookScript(() => {
            window.FB?.XFBML?.parse(containerRef.current ?? document);
        });
    }, [url]);

    return (
        <div ref={containerRef} className="facebook-embed-wrapper">
            <div
                className="fb-video"
                data-href={url}
                data-width="325"
                data-show-text="false"
                data-autoplay="true"
            >
                <blockquote cite={url} className="fb-xfbml-parse-ignore">
                    <a target="_blank" rel="noopener noreferrer" href={url}>
                        Voir sur Facebook
                    </a>
                </blockquote>
            </div>
        </div>
    );
}
