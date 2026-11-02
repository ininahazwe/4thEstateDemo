'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

interface ArticleHeroVideoProps {
    src: string;
    /** Image mise en avant : première frame affichée avant que la vidéo ne soit
     *  prête, et seule chose visible si la lecture est refusée. */
    poster?: string;
    /** Repris de l'image mise en avant — la vidéo est décorative, mais le hero
     *  doit rester descriptible. */
    label?: string;
}

// ---------------------------------------------------------------------------
// Vidéo de hero, jouée en boucle et sans son.
//
// Composant CLIENT alors que le reste du hero est rendu côté serveur, et ce
// n'est pas gratuit — c'est la lecture automatique qui l'impose :
//
// 1. `muted` forcé par ref. Tous les navigateurs refusent l'autoplay d'une
//    vidéo non muette. Or React traite `muted` comme une PROPRIÉTÉ du nœud DOM
//    et non comme un attribut : le HTML rendu côté serveur peut arriver sans
//    lui, et le navigateur bloque alors la lecture avant même l'hydratation.
//    L'imposer sur l'élément réel supprime cette fenêtre.
//
// 2. `play()` appelé explicitement, et sa promesse rattrapée. L'attribut
//    `autoplay` seul échoue silencieusement dans plusieurs cas courants (mode
//    économie d'énergie iOS, onglet ouvert en arrière-plan, réglage navigateur).
//    Le rejet n'est pas une erreur à remonter : le poster reste affiché, ce qui
//    est exactement le repli voulu.
//
// 3. `prefers-reduced-motion` : aucune lecture automatique. Une boucle vidéo
//    plein écran est précisément le type de mouvement que ce réglage vise. Les
//    contrôles natifs apparaissent alors pour laisser le choix au lecteur.
// ---------------------------------------------------------------------------

export default function ArticleHeroVideo({ src, poster }: ArticleHeroVideoProps) {
    const ref = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        video.muted = true;

        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        // Pas d'attribut `autoPlay` dans le JSX : il lancerait la lecture
        // avant l'hydratation, même sous prefers-reduced-motion (WCAG 2.3.3).
        // C'est ici, une fois la préférence connue, que la lecture démarre.
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            void video.play().catch(() => {
                // Lecture refusée : le poster tient lieu d'image de hero.
            });
        }

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    const toggle = () => {
        const video = ref.current;
        if (!video) return;
        if (video.paused) void video.play().catch(() => {});
        else video.pause();
    };

    return (
        <>
            <video
                ref={ref}
                className="am-hero-video"
                src={src}
                poster={poster}
                muted
                loop
                playsInline
                // `metadata` et non `auto` : le hero fait 90vh, la vidéo se lance
                // dès l'ouverture — inutile de précharger le fichier entier.
                preload="metadata"
                // Vidéo muette et décorative : le titre (H1) porte déjà le sens.
                // Un aria-label la dupliquerait pour les lecteurs d'écran.
                aria-hidden="true"
            />
            {/* WCAG 2.2.2 : tout mouvement > 5 s doit pouvoir être mis en pause. */}
            <button
                type="button"
                className="am-hero-video-toggle"
                onClick={toggle}
                aria-label={playing ? 'Pause background video' : 'Play background video'}
            >
                {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            </button>
        </>
    );
}
