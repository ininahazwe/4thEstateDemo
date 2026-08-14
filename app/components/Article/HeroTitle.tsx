'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

interface HeroTitleProps {
    title: string;
    /** Chapô de l'article (excerpt WordPress, déjà dépouillé de son HTML par
     *  wpApi.article). Optionnel : tous les posts n'en ont pas. */
    excerpt?: string;
}

// ---------------------------------------------------------------------------
// HeroTitle — le fond du hero (image) est épinglé (position:sticky) et donc
// totalement statique tant qu'il est couvert. Le titre, lui, doit "monter"
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

export default function HeroTitle({ title, excerpt }: HeroTitleProps) {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 600], [0, -70]);

    // Un excerpt vide ou réduit à des espaces ne doit pas produire un <p> vide,
    // qui ouvrirait une gouttière sous le titre pour rien.
    const lede = excerpt?.trim();

    return (
        <div className="am-hero-title-overlay">
            <motion.div className="am-hero-title-block" style={{ y }}>
                <h1 className="am-title">{title}</h1>
                {lede && <p className="am-hero-excerpt">{lede}</p>}
            </motion.div>
        </div>
    );
}
