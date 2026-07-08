'use client';

import { useEffect, useRef, useState } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

interface ArticleIllustrationProps {
    featuredImage: string;
    imageCaption?: string;
    imageCredit?: string;
}

export default function ArticleIllustration({
                                                featuredImage,
                                                imageCaption,
                                                imageCredit,
                                            }: ArticleIllustrationProps) {
    const galleryRef = useRef<HTMLDivElement>(null);

    // On stocke les dimensions réelles de l'image.
    // On met des valeurs par défaut génériques pour que le lien soit actif dès le premier instant.
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
        width: 2000,
        height: 1500,
    });

    // Fonction déclenchée dès que l'image physique est chargée dans le navigateur
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.naturalWidth && img.naturalHeight) {
            setDimensions({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
        }
    };

    useEffect(() => {
        if (!galleryRef.current) return;

        const lightbox = new PhotoSwipeLightbox({
            gallery: galleryRef.current,
            children: "a",
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
                        const slideEl = lightbox.pswp?.currSlide?.data.element as
                            | HTMLElement
                            | undefined;
                        const figcaption = slideEl
                            ?.closest("figure")
                            ?.querySelector("figcaption");
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
    }, []); // L'initialisation reste stable et ne dépend pas du changement de dimensions

    return (
        <div className="article-illustration" ref={galleryRef}>
            <figure className="is-clickable">
                {/* Les attributs dynamiques fournissent le ratio exact de l'image à PhotoSwipe */}
                <a
                    href={featuredImage}
                    data-pswp-width={dimensions.width}
                    data-pswp-height={dimensions.height}
                    target="_blank"
                    rel="noreferrer"
                >
                    <picture>
                        <img
                            src={featuredImage}
                            alt={imageCaption ?? ""}
                            fetchPriority="high"
                            style={{ width: "100%", height: "auto" }}
                            onLoad={handleImageLoad} // Détection des dimensions natives
                        />
                    </picture>
                </a>

                {(imageCaption || imageCredit) && (
                    <figcaption>
                        {imageCaption && (
                            <span className="wp-element-caption">{imageCaption} </span>
                        )}
                        {imageCredit && (
                            <span className="wp-element-caption">({imageCredit})</span>
                        )}
                    </figcaption>
                )}
            </figure>
        </div>
    );
}