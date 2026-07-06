// app/components/LanguageSwitcher/LanguageSwitcher.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslatePage } from './useTranslatePage';

export type LangCode = 'en' | 'fr' | 'pt' | 'sw';

interface LanguageOption {
    code: LangCode;
    label: string;
    flag: string; // Gardé au cas où tu en aurais besoin ailleurs
}

const LANGUAGES: LanguageOption[] = [
    { code: 'en', label: 'English', flag: '/assets/flags/en.svg' },
    { code: 'fr', label: 'French', flag: '/assets/flags/fr.svg' },
    { code: 'pt', label: 'Portuguese', flag: '/assets/flags/pt.svg' },
    { code: 'sw', label: 'Swahili', flag: '/assets/flags/sw.svg' },
];

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

    useEffect(() => {
        setMounted(true);
        document.documentElement.lang = SOURCE_LANG;
    }, []);

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
            top: rect.bottom + 8,
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
            document.documentElement.lang = SOURCE_LANG;
            return;
        }

        setCurrentLang(lang);
        document.documentElement.lang = lang;
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
                    {/* Affichage du code de la langue en majuscules à la place du flag */}
                    <span className="gt_lang_code" style={{ marginRight: '8px', fontWeight: 'bold' }}>
                        {lang.code.toUpperCase()}
                    </span>
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                {/* Remplacement du flag ici aussi pour l'harmonie UI */}
                <span className="gt_current_code" style={{ fontWeight: 'bold' }}>
                    {selected.code.toUpperCase()}
                </span>
                <span className="sr-only">{selected.label}</span>
            </button>

            {mounted && dropdown && createPortal(dropdown, document.body)}

            {/* Voile de chargement pendant la traduction : filigrane translucide
                sur le contenu de l'article (#site-main), plutôt qu'un petit
                spinner dans le switcher. Portalé dans #site-main pour ne couvrir
                que le contenu (header/footer restent actifs). Fallback body. */}
            {mounted &&
                isTranslating &&
                createPortal(
                    <div className="translate-overlay notranslate" role="status" aria-live="polite">
                        <div className="translate-overlay-pill">
                            <span className="translate-overlay-spinner" aria-hidden="true" />
                            <span>Translating…</span>
                        </div>
                    </div>,
                    document.getElementById('site-main') ?? document.body
                )}
        </div>
    );
}