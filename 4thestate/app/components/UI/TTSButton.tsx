'use client';

import { useState, useEffect, useRef } from "react";
import { Headphones, Pause, Square } from "lucide-react";

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
 * document.documentElement.lang) vers un code BCP-47 complet attendu par
 * SpeechSynthesisUtterance.lang. Fallback en-US si la langue est absente,
 * inconnue, ou si document n'est pas encore disponible (safety SSR).
 */
function resolveSpeechLang(): string {
    if (typeof document === 'undefined') return 'en-US';
    const map: Record<string, string> = {
        en: 'en-US',
        fr: 'fr-FR',
        pt: 'pt-PT',
        sw: 'sw-KE',
    };
    const current = document.documentElement.lang;
    return map[current] ?? 'en-US';
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Sécurité : arrêter l'audio si le composant est démonté (changement de page,
    // disparition de la carte d'une liste filtrée, etc.)
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

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
        // 1. Si c'est en cours de lecture, on met en pause
        if (isPlaying && !isPaused) {
            window.speechSynthesis.pause();
            setIsPaused(true);
            return;
        }

        // 2. Si c'est en pause, on reprend
        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            return;
        }

        // 3. Sinon, on lance une nouvelle lecture
        const textToRead = resolveText();
        if (!textToRead) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = resolveSpeechLang();
        utterance.rate = 1.0;

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utterance.onerror = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
    };

    const handleStopAudio = (e: React.MouseEvent) => {
        e.stopPropagation(); // Évite de déclencher le toggle du parent si imbriqué
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
    };

    const label = isPlaying && !isPaused ? "Pause" : isPaused ? "Resume" : "Listen";

    return (
        <div className={`tts-container ${className}`.trim()} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <button
                ref={buttonRef}
                type="button"
                className="tts"
                data-model="button"
                title={label}
                aria-describedby={titleId}
                data-modal-open="tts-reserved"
                data-audio-url=""
                data-need-js=""
                onClick={handleToggleAudio}
            >
                {isPlaying && !isPaused ? (
                    <Pause size={18} strokeWidth={2} aria-hidden="true" style={showLabel ? { paddingRight: "4px" } : undefined} />
                ) : (
                    <Headphones size={18} strokeWidth={2} aria-hidden="true" style={showLabel ? { paddingRight: "4px" } : undefined} />
                )}
                {showLabel && label}
                {!showLabel && <span className="sr-only">{label}</span>}
            </button>

            {showStopButton && (isPlaying || isPaused) && (
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