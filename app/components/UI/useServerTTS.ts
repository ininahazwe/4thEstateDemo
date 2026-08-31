'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type TTSPlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

/**
 * Lecture audio via /api/tts (Piper, synthese + cache cote serveur).
 * Remplace window.speechSynthesis : la qualite et la couverture des langues
 * ne dependent plus des voix installees sur l'appareil du visiteur (cf.
 * diagnostic 31/08/2026 -- voix anglaise robotique, swahili absent et rendu
 * phonetiquement avec l'accent de la voix de secours du navigateur).
 */
export function useServerTTS() {
    const [state, setState] = useState<TTSPlaybackState>('idle');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    const cleanup = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current.src = '';
            audioRef.current = null;
        }
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    // Coupe le son si le composant est demonte en cours de lecture.
    useEffect(() => cleanup, [cleanup]);

    const stop = useCallback(() => {
        cleanup();
        setState('idle');
    }, [cleanup]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setState('paused');
    }, []);

    const resume = useCallback(() => {
        audioRef.current?.play().catch(() => setState('idle'));
        setState('playing');
    }, []);

    const play = useCallback(async (text: string, lang: string) => {
        if (!text) return;
        cleanup();
        setState('loading');

        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, lang: lang.toUpperCase() }),
            });

            if (!res.ok) {
                const detail = await res.json().catch(() => null);
                throw new Error(detail?.detail ?? detail?.error ?? `HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;

            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setState('idle');
            audio.onerror = () => setState('idle');

            await audio.play();
            setState('playing');
        } catch (err) {
            console.error('TTS playback error:', err);
            cleanup();
            setState('idle');
        }
    }, [cleanup]);

    return { state, play, pause, resume, stop };
}
