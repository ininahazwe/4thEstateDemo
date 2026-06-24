// app/components/LanguageSwitcher/useTranslatePage.ts
'use client';

import { useCallback, useRef, useState } from 'react';

// Sélecteurs à exclure de la traduction — équivalent du .skiptranslate de Google
const EXCLUDE_SELECTOR = '.notranslate, script, style, noscript, code, pre';

interface TextNodeRef {
    node: Text;
    original: string;
}

export function useTranslatePage() {
    const [isTranslating, setIsTranslating] = useState(false);
    // Garde le texte original de chaque noeud traduit, pour pouvoir revenir en arrière sans nouvel appel API
    const originalsRef = useRef<TextNodeRef[] | null>(null);

    const collectTextNodes = useCallback((): Text[] => {
        const root = document.body;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const text = node.nodeValue?.trim();
                if (!text) return NodeFilter.FILTER_REJECT;

                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.closest(EXCLUDE_SELECTOR)) return NodeFilter.FILTER_REJECT;

                return NodeFilter.FILTER_ACCEPT;
            },
        });

        const nodes: Text[] = [];
        let current = walker.nextNode();
        while (current) {
            nodes.push(current as Text);
            current = walker.nextNode();
        }
        return nodes;
    }, []);

    const translatePageTo = useCallback(
        async (targetLang: string) => {
            setIsTranslating(true);
            try {
                const nodes = collectTextNodes();

                // Sauvegarder les originaux seulement la première fois
                // (sinon, si on traduit FR -> EN -> PT, on perdrait le FR de référence)
                if (!originalsRef.current) {
                    originalsRef.current = nodes.map((node) => ({
                        node,
                        original: node.nodeValue ?? '',
                    }));
                }

                const refs = originalsRef.current;
                const texts = refs.map((r) => r.original);

                // Batch par paquets de 50 pour éviter des payloads trop gros
                const BATCH_SIZE = 50;
                const translations: string[] = [];

                for (let i = 0; i < texts.length; i += BATCH_SIZE) {
                    const chunk = texts.slice(i, i + BATCH_SIZE);
                    const res = await fetch('/api/translate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ texts: chunk, targetLang }),
                    });

                    if (!res.ok) {
                        throw new Error(`Translate API error: ${res.status}`);
                    }

                    const data: { translations: string[] } = await res.json();
                    translations.push(...data.translations);
                }

                // Appliquer les traductions aux noeuds vivants dans le DOM
                refs.forEach((ref, index) => {
                    // Le noeud peut avoir été démonté entre temps (navigation React) — on vérifie
                    if (ref.node.isConnected) {
                        ref.node.nodeValue = translations[index] ?? ref.original;
                    }
                });
            } finally {
                setIsTranslating(false);
            }
        },
        [collectTextNodes]
    );

    const restoreOriginal = useCallback(() => {
        if (!originalsRef.current) return;
        originalsRef.current.forEach((ref) => {
            if (ref.node.isConnected) {
                ref.node.nodeValue = ref.original;
            }
        });
    }, []);

    return { translatePageTo, restoreOriginal, isTranslating };
}