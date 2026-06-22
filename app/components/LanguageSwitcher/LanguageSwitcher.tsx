// app/components/LanguageSwitcher/LanguageSwitcher.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslatePage } from './useTranslatePage';

export type LangCode = 'en' | 'fr' | 'pt' | 'sw';

interface LanguageOption {
    code: LangCode;
    label: string;
    flag: string; // chemin vers le SVG, ex: /flags/en.svg
}

const LANGUAGES: LanguageOption[] = [
    { code: 'en', label: 'English', flag: '/assets/flags/en.svg' },
    { code: 'fr', label: 'French', flag: '/assets/flags/fr.svg' },
    { code: 'pt', label: 'Portuguese', flag: '/assets/flags/pt.svg' },
    { code: 'sw', label: 'Swahili', flag: '/assets/flags/sw.svg' },
];

// Langue source réelle du contenu WordPress (celle dans laquelle les articles sont écrits)
const SOURCE_LANG: LangCode = 'en';

interface DropdownPosition {
    top: number;
    right: number;
}

export default function LanguageSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState<LangCode>(SOURCE_LANG);
    const [position, setPosition] = useState<DropdownPosition | null>(null);
    const [mounted, setMounted] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { translatePageTo, restoreOriginal, isTranslating } = useTranslatePage();

    // Nécessaire pour createPortal : document n'existe pas en SSR
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fermer au clic extérieur (le dropdown étant maintenant dans le body,
    // on vérifie qu'on n'a cliqué ni sur le bouton ni dans le dropdown lui-même)
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node;
            const clickedButton = buttonRef.current?.contains(target);
            const clickedDropdown = dropdownRef.current?.contains(target);
            if (!clickedButton && !clickedDropdown) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Recalcule la position si la fenêtre est redimensionnée pendant que le menu est ouvert
    useEffect(() => {
        if (!isOpen) return;
        function recompute() {
            computePosition();
        }
        window.addEventListener('resize', recompute);
        window.addEventListener('scroll', recompute, true);
        return () => {
            window.removeEventListener('resize', recompute);
            window.removeEventListener('scroll', recompute, true);
        };
    }, [isOpen]);

    function computePosition() {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPosition({
            top: rect.bottom + 8, // 8px d'espace sous le bouton
            right: window.innerWidth - rect.right,
        });
    }

    function handleToggle() {
        if (!isOpen) {
            computePosition();
        }
        setIsOpen((prev) => !prev);
    }

    async function handleSelectLang(lang: LangCode) {
        setIsOpen(false);
        if (lang === currentLang) return;

        if (lang === SOURCE_LANG) {
            restoreOriginal();
            setCurrentLang(SOURCE_LANG);
            return;
        }

        setCurrentLang(lang);
        await translatePageTo(lang.toUpperCase());
    }

    const selected = LANGUAGES.find((l) => l.code === currentLang) ?? LANGUAGES[0];

    const dropdown = isOpen && position && (
        <div
            ref={dropdownRef}
            className="gt_option gt_option--portal"
            style={{ top: position.top, right: position.right }}
        >
            {LANGUAGES.map((lang) => (
                <a
                    key={lang.code}
                    href="#"
                    title={lang.label}
                    className={lang.code === currentLang ? 'nturl gt_current' : 'nturl'}
                    data-gt-lang={lang.code}
                    onClick={(e) => {
                        e.preventDefault();
                        handleSelectLang(lang.code);
                    }}
                >
                    <img width={16} height={16} alt={lang.code} src={lang.flag} />
                    {' '}
                    {lang.label}
                </a>
            ))}
        </div>
    );

    return (
        <div className="gt_switcher notranslate item">
            <button
                ref={buttonRef}
                type="button"
                className="gt_selected_btn"
                title={`Langue : ${selected.label}`}
                onClick={handleToggle}
            >
                <img src={selected.flag} height={18} width={18} alt={selected.code} />
                <span className="sr-only">{selected.label}</span>
                {isTranslating && <span className="gt_loading" aria-hidden="true" />}
            </button>

            {mounted && dropdown && createPortal(dropdown, document.body)}
        </div>
    );
}