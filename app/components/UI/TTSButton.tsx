'use client';

import { useRef } from "react";
import { Headphones, Pause, Square, Loader2 } from "lucide-react";
import { useServerTTS } from "./useServerTTS";

interface TTSButtonProps {
    /**
     * Sélecteur CSS global du conteneur dont on extrait le texte des <p>.
     * Cas d'usage : page article, où il n'existe qu'UN SEUL conteneur de ce
     * type sur la page (ex: ".article-text") — un querySelector global est
     * donc sans ambiguïté.
     * Optionnel : si omis, le composant retombe sur containerScopeSelector
     * (résolu relativement à sa propre position dans le DOM via closest()).
     */
    containerSelector?: string;
    /**
     * Sélecteur CSS résolu via closest() à partir du bouton lui-même,
     * pour les cas où PLUSIEURS instances de ce composant existent sur la
     * même page (grilles de cards) — chaque bouton ne doit lire que le
     * texte de SA propre carte, pas la première carte du DOM.
     * Défaut : "article" puis ".item-text" à l'intérieur.
     */
    containerScopeSelector?: string;
    textSelectorWithinScope?: string;
    /** id de l'élément décrit par ce bouton (a11y, aria-describedby) */
    titleId?: string;
    /** Affiche le label texte ("Listen"/"Pause"/"Resume") en plus de l'icône.
     *  true par défaut (usage page article) ; mettre false dans les grilles
     *  de cards pour un bouton icône seul, plus compact. */
    showLabel?: boolean;
    /** Affiche le bouton stop séparé une fois la lecture démarrée.
     *  true par défaut ; mettre false si une grille de cards préfère
     *  rester minimaliste (toggle play/pause uniquement). */
    showStopButton?: boolean;
    className?: string;
}

/**
 * Extrait le texte lisible (concatène les <p>) d'un conteneur DOM donné.
 */
function extractParagraphText(container: Element | null): string {
    if (!container) return '';
    const paragraphs = container.querySelectorAll('p');
    return Array.from(paragraphs)
        .map((p) => p.textContent?.trim())
        .filter((text) => text && text.length > 0)
        .join(' ');
}

/**
 * Mappe le code de langue actif (écrit par LanguageSwitcher sur
 * document.documentElement.lang) vers le code 2 lettres attendu par
 * /api/tts (EN/FR/PT/SW). Fallback EN si absent/inconnu, ou si document
 * n'est pas encore disponible (safety SSR).
 */
function resolveTTSLang(): string {
    if (typeof document === 'undefined') return 'EN';
    const known = new Set(['en', 'fr', 'pt', 'sw']);
    const current = document.documentElement.lang;
    return (known.has(current) ? current : 'en').toUpperCase();
}

export default function TTSButton({
                                      containerSelector,
                                      containerScopeSelector = 'article',
                                      textSelectorWithinScope = '.item-text',
                                      titleId,
                                      showLabel = true,
                                      showStopButton = true,
                                      className = '',
                                  }: TTSButtonProps) {
    const { state, play, pause, resume, stop } = useServerTTS();
    const buttonRef = useRef<HTMLButtonElement>(null);

    const isLoading = state === 'loading';
    const isPlaying = state === 'playing';
    const isPaused = state === 'paused';

    /**
     * Résout le texte à lire, entièrement côté client au moment du clic —
     * aucune fonction n'est reçue en prop, donc aucun problème de
     * sérialisation Server → Client.
     * - Si containerSelector est fourni (cas article, un seul conteneur
     *   sur la page) : document.querySelector global.
     * - Sinon (cas card, plusieurs instances sur la page) : on part du
     *   bouton lui-même (buttonRef), on remonte au plus proche ancêtre
     *   correspondant à containerScopeSelector (ex: "article"), puis on
     *   cherche textSelectorWithinScope (ex: ".item-text") à l'intérieur —
     *   ne lit donc QUE le texte de SA propre carte.
     */
    const resolveText = (): string => {
        if (containerSelector) {
            return extractParagraphText(document.querySelector(containerSelector));
        }
        const scope = buttonRef.current?.closest(containerScopeSelector);
        const target = scope?.querySelector(textSelectorWithinScope) ?? null;
        return extractParagraphText(target);
    };

    const handleToggleAudio = () => {
        if (isLoading) return; // évite un double clic pendant la génération serveur

        if (isPlaying) {
            pause();
            return;
        }

        if (isPaused) {
            resume();
            return;
        }

        const textToRead = resolveText();
        if (!textToRead) return;

        play(textToRead, resolveTTSLang());
    };

    const handleStopAudio = (e: React.MouseEvent) => {
        e.stopPropagation(); // Évite de déclencher le toggle du parent si imbriqué
        stop();
    };

    const label = isLoading ? "Loading" : isPlaying ? "Pause" : isPaused ? "Resume" : "Listen";

    const button = (
        <button
            ref={buttonRef}
            type="button"
            className="tts"
            data-model="button"
            title={label}
            aria-describedby={titleId}
            aria-busy={isLoading}
            data-modal-open="tts-reserved"
            data-audio-url=""
            data-need-js=""
            onClick={handleToggleAudio}
        >
            {isLoading ? (
                <Loader2 size={18} strokeWidth={2} className="tts-spin" aria-hidden="true" style={showLabel ? { paddingRight: "4px" } : undefined} />
            ) : isPlaying ? (
                <Pause size={18} strokeWidth={2} aria-hidden="true" style={showLabel ? { paddingRight: "4px" } : undefined} />
            ) : (
                <Headphones size={18} strokeWidth={2} aria-hidden="true" style={showLabel ? { paddingRight: "4px" } : undefined} />
            )}
            {showLabel && label}
            {!showLabel && <span className="sr-only">{label}</span>}
        </button>
    );

    // Le wrapper flex n'a de raison d'être que pour aligner le bouton stop
    // à côté du bouton principal. Sans showStopButton, un seul enfant
    // existera toujours : pas de wrapper, on rend le bouton nu.
    if (!showStopButton) {
        return className ? <span className={className}>{button}</span> : button;
    }

    return (
        <div className={`tts-container ${className}`.trim()} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            {button}

            {(isPlaying || isPaused) && (
                <button
                    type="button"
                    className="tts tts-stop"
                    title="Stop"
                    onClick={handleStopAudio}
                >
                    <Square size={12} fill="currentColor" strokeWidth={2} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
