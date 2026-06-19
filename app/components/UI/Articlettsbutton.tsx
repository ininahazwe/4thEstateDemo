'use client';

import { useState, useEffect, useRef } from "react";
import { Headphones, Pause, Square } from "lucide-react";

interface ArticleTTSButtonProps {
    containerSelector?: string;
}

export default function ArticleTTSButton({ containerSelector = '.article-text' }: ArticleTTSButtonProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Sécurité : Arrêter l'audio si l'utilisateur change de page
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const getArticleText = (): string => {
        const container = document.querySelector(containerSelector);
        if (!container) return '';

        // Filtre pour ne prendre que les paragraphes et éviter les encarts "À lire aussi"
        const paragraphs = container.querySelectorAll('p');
        return Array.from(paragraphs)
            .map(p => p.textContent?.trim())
            .filter(text => text && text.length > 0)
            .join(' ');
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
        const textToRead = getArticleText();
        if (!textToRead) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'fr-FR';
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

    return (
        <div className="tts-container" style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            {/* TA STRUCTURE DE BOUTON INITIALE CONSERVÉE */}
            <button
                className="tts"
                data-model="button"
                title={isPlaying && !isPaused ? "Pause" : "Listen"}
                data-modal-open="tts-reserved"
                data-audio-url=""
                data-need-js=""
                onClick={handleToggleAudio}
            >
                {isPlaying && !isPaused ? (
                    <Pause size={18} strokeWidth={2} aria-hidden="true" style={{ paddingRight: "4px" }} />
                ) : (
                    <Headphones size={18} strokeWidth={2} aria-hidden="true" style={{ paddingRight: "4px" }} />
                )}
                {isPlaying && !isPaused ? "Pause" : isPaused ? "Resume" : "Listen"}
            </button>

            {/* Bouton d'arrêt optionnel (apparaît uniquement quand le son joue ou est en pause) */}
            {(isPlaying || isPaused) && (
                <button
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