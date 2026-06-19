'use client';

import { useState, useRef, useEffect } from 'react';
import { Share, Link2, Check } from 'lucide-react';

interface ArticleShareButtonProps {
    title: string;
}

export default function ArticleShareButton({ title }: ArticleShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [url, setUrl] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // window n'existe pas côté serveur ; on récupère l'URL après montage client
    useEffect(() => {
        setUrl(window.location.href);
    }, []);

    // Ferme le popup au clic en dehors
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Ferme le popup avec Escape
    useEffect(() => {
        if (!isOpen) return;

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsOpen(false);
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks = [
        {
            name: 'Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon:
                <svg
                    xmlns="http://w3.org"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
        },
        {
            name: 'X',
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.26 10.99h-6.466l-5.06-6.616-5.79 6.617H1.96l7.73-8.835L1.5 2.25h6.617l4.573 6.045L18.243 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
            ),
        },
        {
            name: 'WhatsApp',
            href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.149-.149.347-.347.521-.521.174-.174.232-.298.347-.521.115-.224.025-.397-.099-.546-.099-.149-.991-2.59-1.114-2.86-.106-.234-.234-.297-.397-.297-.149-.025-.397-.025-.595-.025-.198 0-.521.074-.793.371-.273.298-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.073.149.198 2.058 3.146 5.005 4.288 2.946 1.14 2.946.762 3.47.713.521-.05 1.758-.719 2.006-1.412.247-.694.247-1.288.173-1.412-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.054 2.284 7.034L.789 23.13a.6.6 0 00.732.732l4.096-1.495A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.96 0-3.852-.524-5.484-1.512a.6.6 0 00-.49-.063l-2.328.85.852-2.328a.6.6 0 00-.063-.49A9.82 9.82 0 012.182 12c0-5.42 4.398-9.818 9.818-9.818S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
                </svg>
            ),
        },
        {
            name: 'LinkedIn',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            icon: <svg
                xmlns="http://w3.org"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>,
        },
    ];

    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Fallback discret si l'API clipboard est indisponible
            console.error('Impossible de copier le lien');
        }
    }

    return (
        <div className="share-button-container" ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                className="item"
                data-model="button"
                data-share=""
                data-share-url={title}
                data-share-box="share-box"
                data-need-js=""
                data-hide-kne=""
                data-ithal="bouton_partage_article"
                data-ithalc="[cta_bloc]"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <Share size={18} strokeWidth={2} aria-hidden="true" style={{ paddingRight: '4px' }} />
                Share
            </button>

            {isOpen && (
                <div className="share-popup" role="menu">
                    {shareLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="share-popup-item"
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
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