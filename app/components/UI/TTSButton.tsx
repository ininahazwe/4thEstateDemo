'use client';

import { useState, useEffect, useRef } from "react";
import { Headphones, Pause, Square } from "lucide-react";

interface TTSButtonProps {
    /**
     * Retourne le texte à lire au moment du clic (pas de mémo nécessaire :
     * appelé une seule fois, juste avant de lancer la lecture).
     * Permet de cibler précisément la bonne carte/le bon article dans une
     * page qui peut contenir plusieurs instances de ce composant.
     */
    getText: () => string;
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
                                      getText,
                                      titleId,
                                      showLabel = true,
                                      showStopButton = true,
                                      className = '',
                                  }: TTSButtonProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Sécurité : arrêter l'audio si le composant est démonté (changement de page,
    // disparition de la carte d'une liste filtrée, etc.)
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

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
        const textToRead = getText();
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