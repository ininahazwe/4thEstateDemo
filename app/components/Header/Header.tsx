'use client';

import { useState } from 'react';
import Link from 'next/link';
import { navItems } from './navigationData';
import {Mail, Moon, Search, Sun} from "lucide-react";
import Image from 'next/image';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'light'; // SSR guard
        return document.documentElement.getAttribute('data-user-color-scheme') || 'light';
    });

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-user-color-scheme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <header className="site-header" id="site-header">
            {/* Input checkbox d'origine réactivé pour la compatibilité avec vos sélecteurs CSS globaux (ex: :checked ~ .site-menu) */}
            <input
                type="checkbox"
                id="toggle-menu"
                checked={isMenuOpen}
                onChange={(e) => setIsMenuOpen(e.target.checked)}
                style={{ display: 'none' }}
            />

            {/* Accessibilité */}
            <div className="header-a11y">
                <a href="#site-main">Contenu</a>
                <a href="#site-footer">Pied de page</a>
            </div>

            {/* Barre principale du header */}
            <div className="header-wrap">
                <button
                    type="button"
                    className="header-menu"
                    title="Menu"
                    onClick={toggleMenu}
                >
                    <span className="sr-only">Menu</span>
                </button>

                {/* Outils (Recherche, Thème, Newsletter) */}
                <div className="header-tools">
                    <Link href="/recherche" className="item" title="Recherche">
                        <Search size={18} strokeWidth={2} aria-hidden="true" />
                        <span className="sr-only">Recherche</span>
                    </Link>
                    {/* Bouton Mode Sombre / Clair */}
                    <button
                        type="button"
                        className="item"
                        title={theme === 'light' ? "Activer le mode sombre" : "Activer le mode clair"}
                        onClick={toggleTheme}
                        aria-pressed={theme === 'dark'}
                    >
                        {theme === 'light' ? (
                            <Moon size={18} strokeWidth={2} aria-hidden="true" />
                        ) : (
                            <Sun size={18} strokeWidth={2} aria-hidden="true" />
                        )}
                        <span className="sr-only">
                            {theme === 'light' ? "Mode sombre" : "Mode clair"}
                        </span>
                    </button>

                    {/* Lien de la Newsletter */}
                    <a
                        href="/newsletter" // Pensez à adapter ce lien vers votre future page locale !
                        className="item"
                        title="Newsletters"
                    >
                        <Mail size={18} strokeWidth={2} aria-hidden="true" />
                        <span className="sr-only">Newsletters</span>
                    </a>

                    {/* Switcher de langues (traduction IA via API Anthropic) */}
                    <LanguageSwitcher />
                </div>

                {/* Logo */}
                <Link href="/" className="header-logo" title="The Fourth Estate - Return to home">
                    <Image
                        src="/assets/img/logo.svg"
                        alt="The Fourth Estate Logo"
                        width={190}
                        height={38}
                        priority
                    />
                </Link>

                {/* Zone Abonnement */}
                <div className="header-hebdo">
                    <a className="header-abo ithalc" href="https://fourthestate.free.nf" data-model="button" data-premium="" rel="nofollow" data-ithal="header_abo">
                        Join Us
                        <span style={{display: 'block', fontWeight: 'normal', marginTop: '4px', fontSize: '16px'}}>from 50ghs/mois</span>
                    </a>
                </div>

                {/* Profil Utilisateur */}
                <a className="header-user"
                   href="https://fourthestate.free.nf/connexion" title="Connexion">
                    <span className="sr-only">Connexion</span>
                </a>
            </div>

            {/* Menu de navigation (Burger Drawer) */}
            <nav className={`site-menu ${isMenuOpen ? 'is-active' : ''}`}>
                <div className="menu-nav">
                    <label htmlFor="toggle-menu" className="menu-overlay" onClick={toggleMenu}></label>

                    <div className="menu-wrap align-left">
                        {/* Outils du menu */}
                        <section className="tools-section">
                            <div className="tool-list">
                                <Link href="/recherche" className="item" data-icon="magnifying-glass">Recherche</Link>
                                <button type="button" className="item" data-icon="circle-half-stroke" onClick={toggleTheme} aria-pressed={theme === 'dark'}>
                                    Mode {theme === 'light' ? 'sombre' : 'clair'}
                                </button>
                                <a href="https://www.courrierinternational.com/page/newsletters" className="item" data-icon="envelope">Newsletters</a>
                            </div>
                        </section>

                        {/* À la une du Hebdo */}
                        <section className="hebdo-section">
                            <a href="https://www.courrierinternational.com/magazine/2026/1859-magazine">
                                <div className="item-image">
                                    <figure>
                                        <picture>
                                            <img
                                                loading="lazy"
                                                src="https://focus.courrierinternational.com/80x0/2026/06/17/a105bb3_upload-1-zjlpdgo0nnuz-couv1859bd.jpg"
                                                srcSet="https://focus.courrierinternational.com/160x0/2026/06/17/a105bb3_upload-1-zjlpdgo0nnuz-couv1859bd.jpg 2x"
                                                width={70}
                                                height={84}
                                                alt="N°1859 : Brexit : un jour sans fin"
                                                className="loading"
                                            />
                                        </picture>
                                    </figure>
                                </div>
                                <div className="item-text">Brexit : un jour sans fin</div>
                            </a>
                        </section>

                        {/* Bouton Offres Menu */}
                        <a className="menu-abo ithalc" href="https://fourthestate.free.nf" rel="nofollow" data-ithal="menu_navigation_hebdo">
                            <strong>Offres spéciales</strong>
                            <span style={{ fontWeight: 'normal' }}>dès 3,99&nbsp;€/mois</span>
                        </a>

                        {/* Liste dynamique des rubriques */}
                        <section className="nav-section">
                            <div className="simple-list arrows">
                                {navItems.map((item, index) => {
                                    const isExternal = item.href.startsWith('http');

                                    // La clé 'key' a été retirée de cet objet pour éliminer le bug
                                    const itemProps = {
                                        className: `item ${item.type} ithalc`,
                                        'data-ithalc': '[cta_bloc_menu]',
                                        'data-ithal': item.ithal,
                                        ...(item.icon && { 'data-icon': item.icon })
                                    };

                                    return isExternal ? (
                                        // La clé 'key' est maintenant déclarée directement ici
                                        <a key={index} href={item.href} {...itemProps}>
                                            {item.label}
                                        </a>
                                    ) : (
                                        // Et ici
                                        <Link key={index} href={item.href} {...itemProps}>
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </nav>
        </header>
    );
}