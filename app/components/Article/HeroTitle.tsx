'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

interface HeroTitleProps {
    title: string;
}

// ---------------------------------------------------------------------------
// HeroTitle — le fond du hero (image) est épinglé (position:sticky) et donc
// totalement statique tant qu'il est couvert. Le titre, lui, doit "monter"
// légèrement au scroll mais beaucoup plus lentement que les blocs en dessous
// (qui suivent le scroll à 100%) : léger effet de profondeur entre les deux
// plans plutôt qu'un vrai parallaxe sur l'image elle-même.
// Bornes volontairement modestes (600px / -70px) : au-delà, le titre est de
// toute façon recouvert par le contenu qui arrive par-dessus le hero épinglé.
// ---------------------------------------------------------------------------

export default function HeroTitle({ title }: HeroTitleProps) {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 600], [0, -70]);

    return (
        <div className="am-hero-title-overlay">
            <motion.h1 className="am-title" style={{ y }}>
                {title}
            </motion.h1>
        </div>
    );
}
