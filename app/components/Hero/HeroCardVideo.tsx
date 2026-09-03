'use client';

import { useEffect, useRef } from 'react';

interface HeroCardVideoProps {
    src: string;
    /** Repris de l'image mise en avant — sert de premiere frame tant que la
     *  video n'a pas demarre, et reste affiche si la lecture est refusee. */
    poster?: string;
}

// ---------------------------------------------------------------------------
// Vignette video des cartes Hero / HeroStacked (zone "spotlight") : autoplay,
// muette, en boucle — meme mecanique que ArticleHeroVideo (hero d'article),
// adaptee a un format vignette qui reste un lien cliquable.
//
// Composant CLIENT pour la meme raison qu'ArticleHeroVideo : l'autoplay muet
// exige `muted` impose par ref (React le traite comme une PROPRIETE du noeud
// et non un attribut HTML — sans ca le navigateur peut bloquer la lecture
// avant meme l'hydratation) et un `play()` explicite dont le rejet est
// rattrape en silence (le poster reste alors affiche, repli voulu).
//
// `prefers-reduced-motion` : pas de lecture forcee, le poster fait alors
// office d'image fixe — pas de bascule vers des controles natifs ici (a la
// difference du hero d'article) : la carte entiere est un lien, des
// controles video par-dessus intercepteraient le clic.
// ---------------------------------------------------------------------------

export default function HeroCardVideo({ src, poster }: HeroCardVideoProps) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        video.muted = true;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        void video.play().catch(() => {
            // Lecture refusee : le poster tient lieu de vignette statique.
        });
    }, []);

    return (
        <video
            ref={ref}
            className="hero-card-video"
            src={src}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
        />
    );
}
