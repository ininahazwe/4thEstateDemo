'use client';

import type { MouseEvent } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { splitTitle } from '@/app/services/titleParts';

interface HeroTitleProps {
    /** Titre WordPress COMPLET — jamais tronqué, cf. titleParts.ts. */
    title: string;
    /** Champ ACF `subtitle` : fin du titre, à rendre plus petite. */
    subtitle?: string;
}

// ---------------------------------------------------------------------------
// HeroTitle — le fond du hero (image ou vidéo) est épinglé (position:sticky) et
// donc totalement statique tant qu'il est couvert. Le titre, lui, doit "monter"
// légèrement au scroll mais beaucoup plus lentement que les blocs en dessous
// (qui suivent le scroll à 100%) : léger effet de profondeur entre les deux
// plans plutôt qu'un vrai parallaxe sur l'image elle-même.
// Bornes volontairement modestes (600px / -70px) : au-delà, le titre est de
// toute façon recouvert par le contenu qui arrive par-dessus le hero épinglé.
//
// Le `y` est porté par le BLOC (titre + chapô) et non par le <h1> seul : les
// deux doivent dériver ensemble, sinon le chapô s'écarterait du titre au fil
// du scroll.
// ---------------------------------------------------------------------------

export default function HeroTitle({ title, subtitle }: HeroTitleProps) {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 600], [0, -70]);

    // L'invite au scroll s'efface dès les premiers pixels : une fois le geste
    // amorcé elle n'a plus d'objet, et la laisser affichée en ferait un élément
    // de décor permanent au lieu d'une amorce.
    const cueOpacity = useTransform(scrollY, [0, 160], [1, 0]);
    // Une opacité nulle ne retire pas l'élément du flux des événements : sans
    // ça, le bouton resterait cliquable une fois invisible.
    const cuePointerEvents = useTransform(scrollY, (v) => (v > 150 ? 'none' : 'auto'));

    // Le chapô n'est plus rendu dans le hero : titre et sous-titre suffisent
    // par-dessus l'image, et empiler un troisième niveau de texte devenait
    // illisible sur mobile. `excerpt` reste disponible ailleurs (partages,
    // cartes, meta description).
    const { lead, rest } = splitTitle(title, subtitle);

    // On vise le bas réel du hero plutôt qu'un 90vh en dur : la hauteur est
    // pilotée par --am-hero-height côté CSS, et une valeur recopiée ici
    // divergerait au premier ajustement.
    const scrollPastHero = (e: MouseEvent<HTMLButtonElement>) => {
        const hero = e.currentTarget.closest('.am-hero-media');
        const top = hero
            ? hero.getBoundingClientRect().bottom + window.scrollY
            : window.innerHeight;

        window.scrollTo({ top, behavior: 'smooth' });
    };

    return (
        <div className="am-hero-title-overlay">
            <motion.div className="am-hero-title-block" style={{ y }}>
                {/* Un SEUL <h1>, deux <span> : le contenu textuel du titre
                    reste identique caractère pour caractère, donc aucun signal
                    perdu pour l'indexation ni pour les lecteurs d'écran. Un
                    <h2> ou un <p> pour la seconde partie fracturerait le plan
                    du document. */}
                <h1 className="am-title">
                    <span className="am-title-lead">{lead}</span>
                    {rest && <span className="am-title-rest">{rest}</span>}
                </h1>
            </motion.div>

            {/* Bouton et non simple décor : l'invite est utile au clavier et au
                lecteur d'écran, et un clic vaut mieux qu'un glyphe énigmatique.
                L'animation de va-et-vient est portée par le <span> intérieur, en
                CSS : framer-motion écrit un `transform` inline sur l'élément
                qu'il anime, les deux se marcheraient dessus sur le même nœud. */}
            <motion.button
                type="button"
                className="am-hero-scroll-cue"
                style={{ opacity: cueOpacity, pointerEvents: cuePointerEvents }}
                onClick={scrollPastHero}
                aria-label="Scroll to the story"
            >
                <span className="am-hero-scroll-cue-arrow" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M19 12l-7 7-7-7" />
                    </svg>
                </span>
            </motion.button>
        </div>
    );
}
