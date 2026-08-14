'use client';

import { useEffect, useRef } from 'react';

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

export default function ArticleHeroVideo({ src, poster, label }: ArticleHeroVideoProps) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;

        video.muted = true;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            video.controls = true;
            return;
        }

        void video.play().catch(() => {
            // Lecture refusée : le poster tient lieu d'image de hero.
        });
    }, []);

    return (
        <video
            ref={ref}
            className="am-hero-video"
            src={src}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            // `metadata` et non `auto` : le hero fait 90vh, la vidéo se lance
            // dès l'ouverture — inutile de précharger le fichier entier, le
            // navigateur enchaîne de lui-même une fois la lecture démarrée.
            preload="metadata"
            aria-label={label || undefined}
        />
    );
}
