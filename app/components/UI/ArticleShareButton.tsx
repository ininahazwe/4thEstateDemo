'use client';

import { useState, useRef, useEffect } from 'react';
import { Share, Link2, Check } from 'lucide-react';

interface ArticleShareButtonProps {
    title: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Largeur du popup, doit rester alignée sur le min-width de share-popup.css. */
const POPUP_WIDTH = 220;

export default function ArticleShareButton({ title }: ArticleShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [url, setUrl] = useState('');
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    // URL canonique de partage, résolue AU CLIC (pas dans un effet) : window
    // n'existe pas côté serveur, et la version précédente peuplait l'URL depuis
    // un useEffect — les href étaient donc vides au premier rendu. On retire
    // volontairement query string + hash pour ne pas propager les paramètres de
    // campagne du visiteur (utm_*, fbclid, gclid) dans les liens partagés.
    function canonicalUrl() {
        return window.location.origin + window.location.pathname;
    }

    // Position du popup, calculée à l'ouverture.
    //
    // ⚠️ Pourquoi `position: fixed` et pas un simple `absolute` : le conteneur
    // `.tools-list` passe en `overflow: auto` sous 759px (scroll horizontal des
    // outils, cf. article-critical.css). Un popup en `absolute` y était donc
    // clippé par le conteneur — invisible sur mobile, là où le partage sert le
    // plus. `fixed` sort du flux de scroll ; en contrepartie il faut calculer
    // les coordonnées et fermer au scroll.
    function place() {
        const el = containerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const margin = 8;
        const left = Math.max(
            margin,
            Math.min(r.left, window.innerWidth - POPUP_WIDTH - margin)
        );
        setPos({ top: r.bottom + margin, left });
    }

    // Partage natif (feuille système) dès qu'il est disponible — mobile ET
    // desktop, plus seulement sous 759px.
    //
    // ⚠️ C'est le SEUL chemin fiable sur mobile. Les URL « web intent » de
    // Facebook / X / LinkedIn sont interceptées par les apps installées via
    // App Links : l'app s'ouvre, ne sait pas traiter /sharer ou /intent, et
    // affiche à la place l'URL passée en paramètre — donc l'article lui-même,
    // dans une nouvelle vue. Symptôme observé en prod le 16/08/2026 : seuls
    // WhatsApp (son deep link `api.whatsapp.com/send` est officiellement
    // supporté) et « Copier le lien » fonctionnaient.
    async function handleShareClick() {
        const link = canonicalUrl();
        setUrl(link);

        if (navigator.share) {
            try {
                await navigator.share({ title, url: link });
                return;
            } catch {
                // Annulation utilisateur ou refus du navigateur : on retombe
                // sur le popup plutôt que de ne rien faire.
            }
        }

        if (!isOpen) place();
        setIsOpen((prev) => !prev);
    }

    /**
     * Ouvre un partage dans une fenêtre dédiée et dimensionnée.
     *
     * Sur desktop, une fenêtre nommée n'est pas capturée par un handler de
     * protocole ou une app : c'est le comportement « dialogue de partage »
     * attendu. Le `href` reste posé sur le lien pour le clic-droit, le
     * middle-click et les lecteurs d'écran.
     *
     * Pas d'`await` avant `window.open` : l'appel doit rester dans
     * l'activation utilisateur, sinon le navigateur le bloque comme popup.
     *
     * Pas de `noopener` dans les features : la spec impose alors un retour
     * `null`, ce qui rendrait indétectable un blocage réel par le navigateur
     * et provoquerait une navigation parasite dans l'onglet courant.
     */
    function openShareWindow(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
        event.preventDefault();
        setIsOpen(false);
        const w = window.open(href, 'tfe-share', 'popup,width=600,height=650');
        // Popup bloquée par le navigateur : on suit le lien normalement.
        if (!w) window.location.assign(href);
    }

    // Ferme au clic en dehors (bouton ET popup, ce dernier n'étant plus un
    // descendant du conteneur à l'écran mais restant dans le même DOM).
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: MouseEvent) {
            const t = event.target as Node;
            if (
                !containerRef.current?.contains(t) &&
                !popupRef.current?.contains(t)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Escape ferme ; scroll et resize aussi (le popup est en coordonnées fixes,
    // il ne suit pas la page — mieux vaut le fermer que le laisser flotter).
    useEffect(() => {
        if (!isOpen) return;

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
                containerRef.current?.querySelector('button')?.focus();
            }
        }
        const close = () => setIsOpen(false);

        document.addEventListener('keydown', handleEscape);
        window.addEventListener('scroll', close, { passive: true });
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', close);
            window.removeEventListener('resize', close);
        };
    }, [isOpen]);

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks: Array<{
        name: string;
        href: string;
        icon: React.ReactNode;
        nativeDeepLink?: boolean;
    }> = [
        {
            name: 'Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&display=popup`,
            icon: (
                <svg xmlns={SVG_NS} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
            ),
        },
        {
            name: 'X',
            href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`,
            icon: (
                <svg xmlns={SVG_NS} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.26 10.99h-6.466l-5.06-6.616-5.79 6.617H1.96l7.73-8.835L1.5 2.25h6.617l4.573 6.045L18.243 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
            ),
        },
        {
            name: 'WhatsApp',
            // Seul deep link officiellement supporté par l'app : on le laisse
            // suivre son cours normal au lieu de le forcer dans une fenêtre.
            nativeDeepLink: true,
            href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
            icon: (
                <svg xmlns={SVG_NS} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.149.347-.347.521-.521.174-.174.232-.298.347-.521.115-.224.025-.397-.099-.546-.099-.149-.991-2.59-1.114-2.86-.106-.234-.234-.297-.397-.297-.149-.025-.397-.025-.595-.025-.198 0-.521.074-.793.371-.273.298-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.073.149.198 2.058 3.146 5.005 4.288 2.946 1.14 2.946.762 3.47.713.521-.05 1.758-.719 2.006-1.412.247-.694.247-1.288.173-1.412-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.054 2.284 7.034L.789 23.13a.6.6 0 00.732.732l4.096-1.495A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.96 0-3.852-.524-5.484-1.512a.6.6 0 00-.49-.063l-2.328.85.852-2.328a.6.6 0 00-.063-.49A9.82 9.82 0 012.182 12c0-5.42 4.398-9.818 9.818-9.818S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
                </svg>
            ),
        },
        {
            name: 'LinkedIn',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            icon: (
                <svg xmlns={SVG_NS} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                </svg>
            ),
        },
    ];

    async function handleCopyLink() {
        const value = url || canonicalUrl();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard indisponible (contexte non sécurisé, permission refusée) :
            // repli sur une sélection manuelle plutôt qu'un échec muet.
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            } catch {
                console.error('Impossible de copier le lien');
            }
            document.body.removeChild(ta);
        }
    }

    return (
        <div className="share-button-container" ref={containerRef}>
            <button
                type="button"
                className="item"
                data-model="button"
                data-share=""
                data-share-url={url}
                data-share-box="share-box"
                data-ithal="bouton_partage_article"
                data-ithalc="[cta_bloc]"
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label={`Share: ${title}`}
                onClick={handleShareClick}
            >
                <Share size={18} strokeWidth={2} aria-hidden="true" style={{ paddingRight: '4px' }} />
                Share
            </button>

            {isOpen && pos && (
                <div
                    className="share-popup"
                    role="menu"
                    ref={popupRef}
                    style={{ top: pos.top, left: pos.left }}
                >
                    {shareLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="share-popup-item"
                            role="menuitem"
                            onClick={
                                link.nativeDeepLink
                                    ? () => setIsOpen(false)
                                    : (e) => openShareWindow(e, link.href)
                            }
                        >
                            {link.icon}
                            <span>{link.name}</span>
                        </a>
                    ))}
                    <button
                        type="button"
                        className="share-popup-item"
                        role="menuitem"
                        onClick={handleCopyLink}
                    >
                        {copied ? (
                            <Check size={18} strokeWidth={2} aria-hidden="true" />
                        ) : (
                            <Link2 size={18} strokeWidth={2} aria-hidden="true" />
                        )}
                        <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
