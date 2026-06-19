'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import ReadMoreCard from "./ReadMoreCard";
import { WpArticleCard } from "@/app/services/wpApi.article";

interface ArticleContentProps {
    content: string;
    readMoreArticles: WpArticleCard[];
    every?: number;
}

/**
 * Prépare et transforme le HTML WordPress en injectant les liens requis pour PhotoSwipe
 * et en intercalant les ReadMoreCard.
 */
function prepareAndInterleaveContent(
    html: string,
    cards: WpArticleCard[],
    every: number,
    hasReadMore: boolean
): React.ReactNode[] {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // 1. Transformer TOUTES les images/figures WordPress pour PhotoSwipe
    const figuresAndImages = doc.querySelectorAll("figure, img");
    figuresAndImages.forEach((el) => {
        // Si c'est une image isolée, ou une image dans une figure qui n'a pas encore de lien PhotoSwipe
        const img = el.tagName.toLowerCase() === "img" ? (el as HTMLImageElement) : el.querySelector("img");
        if (!img || el.querySelector("a[data-pswp-width]")) return;

        const src = img.getAttribute("src") || "";
        const alt = img.getAttribute("alt") || "";

        // On récupère les dimensions réelles fournies par WordPress si disponibles, sinon valeurs par défaut
        // PhotoSwipe ajustera l'image proportionnellement à partir de ces ratios de départ.
        const width = img.getAttribute("width") || "2000";
        const height = img.getAttribute("height") || "1500";

        // Créer l'enveloppe <a> requise par PhotoSwipe
        const a = doc.createElement("a");
        a.setAttribute("href", src);
        a.setAttribute("data-pswp-width", width);
        a.setAttribute("data-pswp-height", height);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noreferrer");

        // Ajouter une classe pour signifier que l'élément est cliquable graphiquement (curseur zoom)
        if (el.tagName.toLowerCase() === "figure") {
            el.classList.add("is-clickable");
            // Insérer le lien autour de l'image à l'intérieur de la figure
            img.parentNode?.insertBefore(a, img);
            a.appendChild(img);
        } else {
            // Si c'est une image seule, on l'enveloppe directement
            a.appendChild(img.cloneNode(true));
            el.parentNode?.replaceChild(a, el);
        }
    });

    const children = Array.from(doc.body.children);
    const nodes: React.ReactNode[] = [];
    let cardIndex = 0;
    let pCount = 0;

    children.forEach((el, i) => {
        nodes.push(
            <div key={`chunk-${i}`} dangerouslySetInnerHTML={{ __html: el.outerHTML }} />
        );

        if (hasReadMore && el.tagName.toLowerCase() === "p") {
            pCount++;
            if (pCount % every === 0 && cardIndex < cards.length) {
                const card = cards[cardIndex++];
                nodes.push(
                    <ReadMoreCard
                        key={`readmore-${card.id}`}
                        category={card.category}
                        title={card.title}
                        href={card.href}
                    />
                );
            }
        }
    });

    return nodes;
}

export default function ArticleContent({
                                           content,
                                           readMoreArticles,
                                           every = 3,
                                       }: ArticleContentProps) {
    const hasReadMore = readMoreArticles.length > 0;
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // On utilise une seule logique de parsing unifiée pour éviter les duplications de code
    const nodes = useMemo(() => {
        if (!mounted) return null;
        return prepareAndInterleaveContent(content, readMoreArticles, every, hasReadMore);
    }, [mounted, hasReadMore, content, readMoreArticles, every]);

    useEffect(() => {
        if (!containerRef.current || !mounted) return;

        // Configuration de la Lightbox ciblant les liens générés dynamiquement
        const lightbox = new PhotoSwipeLightbox({
            gallery: containerRef.current,
            // On cible l'élément 'a' contenant l'attribut de largeur, qu'il soit dans une figure ou isolé
            children: "a[data-pswp-width]",
            pswpModule: () => import("photoswipe"),
            bgOpacity: 0.95,
        });

        lightbox.on("uiRegister", () => {
            lightbox.pswp?.ui?.registerElement({
                name: "custom-caption",
                order: 9,
                isButton: false,
                appendTo: "root",
                html: "",
                onInit: (el) => {
                    lightbox.pswp?.on("change", () => {
                        const triggerEl = lightbox.pswp?.currSlide?.data.element as
                            | HTMLElement
                            | undefined;
                        // On cherche un figcaption à proximité (dans le même bloc parent ou figure)
                        const figcaption = triggerEl?.closest("figure")?.querySelector("figcaption");
                        el.innerHTML = figcaption
                            ? `<div class="wrap">${figcaption.innerHTML}</div>`
                            : "";
                    });
                },
            });
        });

        lightbox.init();

        return () => {
            lightbox.destroy();
        };
    }, [nodes, mounted]);

    // Rendu SSR initial identique à la version brute pour éviter tout mismatch d'hydratation
    if (!mounted || !nodes) {
        return (
            <div ref={containerRef} dangerouslySetInnerHTML={{ __html: content }} />
        );
    }

    return <div ref={containerRef}>{nodes}</div>;
}