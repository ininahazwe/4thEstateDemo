'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// ArticleMediaVideoWrap — wrapper de la zone vidéo du template storytelling.
//
// Rôle : quand la vidéo arrive au centre de l'écran, la plaque blanche qui la
// contient (.container-background) bascule en fond noir, puis revient au blanc
// quand la vidéo sort. Le basculement se fait par simple ajout/retrait d'une
// classe, la transition de couleur est gérée en CSS.
//
// Pourquoi un IntersectionObserver plutôt qu'un `scroll` listener : le
// navigateur fait le calcul hors du thread principal et ne nous réveille qu'au
// franchissement du seuil — pas de handler qui tourne à chaque pixel de scroll.
// ---------------------------------------------------------------------------

const DARK_CLASS = 'container-background--dark';

/**
 * Nombre de vidéos actuellement visibles, par plaque blanche.
 *
 * Indispensable dès qu'une même .container-background contient DEUX vidéos :
 * sans compteur, la sortie d'écran de la première retirerait la classe alors
 * que la seconde est encore à l'écran. WeakMap et non Map pour ne pas retenir
 * en mémoire des sections démontées.
 */
const visibleCount = new WeakMap<Element, number>();

export default function ArticleMediaVideoWrap({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const section = el.closest('.container-background');
        if (!section) return;

        // État local : évite de compter deux fois si l'observer réémet un
        // callback avec la même valeur d'isIntersecting.
        let counted = false;

        const applyDelta = (delta: number) => {
            const next = Math.max(0, (visibleCount.get(section) ?? 0) + delta);
            visibleCount.set(section, next);
            section.classList.toggle(DARK_CLASS, next > 0);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[entries.length - 1];
                if (entry.isIntersecting === counted) return;
                counted = entry.isIntersecting;
                applyDelta(counted ? 1 : -1);
            },
            {
                // Bande centrale du viewport (50% de hauteur) : le fond bascule
                // quand la vidéo occupe vraiment l'écran, et non dès qu'un
                // pixel dépasse en bas — ce qui déclencherait beaucoup trop tôt.
                rootMargin: '-25% 0px -25% 0px',
                threshold: 0,
            }
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
            // Démontage alors que la vidéo était comptée (navigation client) :
            // sans ça le compteur resterait bloqué au-dessus de zéro.
            if (counted) applyDelta(-1);
        };
    }, []);

    return (
        <div className="am-video-wrap" ref={ref}>
            {children}
        </div>
    );
}
