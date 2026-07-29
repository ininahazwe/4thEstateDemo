'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pilote les contrôles data-slider (data-slider-wrap / data-slider-left /
 * data-slider-right / data-fade) définis dans base.css et home.css.
 * Ce JS n'a jamais été porté depuis le thème WordPress d'origine — les
 * boutons de zones comme EnvironmentZone/StoriesZone étaient du markup
 * mort (data-fade figé, aucun handler). Ce hook fournit :
 * - le scroll horizontal au clic (behavior: smooth)
 * - l'état canScrollLeft/canScrollRight recalculé au scroll/resize, à
 *   traduire en data-fade={!canScrollX} côté composant.
 */
export function useSlider() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateFade = useCallback(() => {
        const el = wrapRef.current;
        if (!el) return;
        // Marge de 4px pour absorber les arrondis de scrollLeft/scrollWidth.
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        updateFade();
        el.addEventListener('scroll', updateFade, { passive: true });
        window.addEventListener('resize', updateFade);

        return () => {
            el.removeEventListener('scroll', updateFade);
            window.removeEventListener('resize', updateFade);
        };
    }, [updateFade]);

    const scrollBy = (direction: 1 | -1) => {
        const el = wrapRef.current;
        if (!el) return;
        el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    return {
        wrapRef,
        canScrollLeft,
        canScrollRight,
        scrollLeft: () => scrollBy(-1),
        scrollRight: () => scrollBy(1),
    };
}
