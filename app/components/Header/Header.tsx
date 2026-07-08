'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { navItems } from './navigationData';
import { ArrowBigRight, ArrowRight, Mail, Moon, Search, Sun } from "lucide-react";
import Image from 'next/image';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

// Membership site handles registration and paid subscriptions; Next.js frontend
// only handles authentication. "Join Us" / "Renew" buttons link there.
// ⚠️ Must point to actual membership subscription/registration page.
const MEMBERSHIP_JOIN_URL = 'https://membership.thefourthestategh.com';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // status: 'loading' | 'authenticated' | 'unauthenticated'
    // During first render (hydration), status is 'loading' → treated as logged out.
    // When session is fetched client-side, display updates (minor flash expected;
    // SessionProvider has no server session to preserve article page SSG).
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated';

    // Always initialize with 'light' to match server render (no window check in useState)
    const [theme, setTheme] = useState('light');

    // Sync with actual DOM theme after hydration (client-side only)
    useEffect(() => {
        const domTheme = document.documentElement.getAttribute('data-user-color-scheme') || 'light';
        setTheme(domTheme);
    }, []);

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
            {/* Original checkbox for CSS selector compatibility (e.g., :checked ~ .site-menu) */}
            <input
                type="checkbox"
                id="toggle-menu"
                checked={isMenuOpen}
                onChange={(e) => setIsMenuOpen(e.target.checked)}
                style={{ display: 'none' }}
            />

            {/* Accessibility skip links */}
            <div className="header-a11y">
                <a href="#site-main">Main content</a>
                <a href="#site-footer">Footer</a>
            </div>

            {/* Header main bar */}
            <div className="header-wrap">
                <button
                    type="button"
                    className="header-menu"
                    title="Toggle menu"
                    onClick={toggleMenu}
                >
                    <span className="sr-only">Menu</span>
                </button>

                {/* Tools (Search, Theme, Newsletter) */}
                <div className="header-tools">
                    <Link href="/search" className="item" title="Search articles">
                        <Search size={18} strokeWidth={2} aria-hidden="true" />
                        <span className="sr-only">Search</span>
                    </Link>
                    {/* Dark / Light mode toggle */}
                    <button
                        type="button"
                        className="item"
                        title={theme === 'light' ? "Turn on dark mode" : "Turn on light mode"}
                        onClick={toggleTheme}
                        aria-pressed={theme === 'dark'}
                    >
                        {theme === 'light' ? (
                            <Moon size={18} strokeWidth={2} aria-hidden="true" />
                        ) : (
                            <Sun size={18} strokeWidth={2} aria-hidden="true" />
                        )}
                        <span className="sr-only">
                            {theme === 'light' ? "Dark mode" : "Light mode"}
                        </span>
                    </button>

                    {/* Newsletter link */}
                    <Link
                        href="/newsletter" // TODO: Adapt to your local newsletter page
                        className="item"
                        title="Subscribe to newsletters"
                    >
                        <Mail size={18} strokeWidth={2} aria-hidden="true" />
                        <span className="sr-only">Newsletters</span>
                    </Link>

                    {/* Language switcher (AI translation via Anthropic API) */}
                    <LanguageSwitcher />
                </div>

                {/* Logo */}
                <Link href="/" className="header-logo" title="The Fourth Estate - Back to home">
                    <Image
                        src="/assets/img/logo-red.svg"
                        alt="The Fourth Estate Logo"
                        width={280}
                        height={52}
                        priority
                    />
                </Link>

                {/* Subscription zone — three states:
                    • Not logged in      → "Join Us" (subscription CTA)
                    • Logged in + active → badge + message (SSO to dashboard)
                    • Logged in + inactive → "Renew your support"
                    Membership links open in new tab. */}
                <div className="header-hebdo">
                    {!isAuthenticated ? (
                        <a
                            className="header-abo ithalc"
                            href={MEMBERSHIP_JOIN_URL}
                            data-model="button"
                            data-premium=""
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                            data-ithal="header_abo"
                        >
                        join us
                        <span style={{ display: 'block', fontWeight: 'normal', marginTop: '4px', fontSize: '16px' }}>from GHS50/month</span>
                        </a>
                        ) : session?.user?.isActive ? (
                        <div className="header-welcome">
                    {/* SSO: Navigate to membership dashboard already logged in (new tab).
                        Uses native <a> because server route ends with cross-domain
                        redirect — full page navigation intended. */}
                            <a
                                href="/api/sso/to-membership"
                                title="My account dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                            <Image
                                src="/assets/badges/badge1.png"
                                alt="Active member badge"
                                width={40}
                                height={52}
                                priority
                            />
                        </a>
                    <p>Thanks to your support</p>
                </div>
            ) : (
                <a
                    className="header-renew"
                    href={MEMBERSHIP_JOIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                Renew your support
                </a>
            )}
            </div>

{/* Profil Utilisateur — connecté : SSO vers le dashboard membership
                    (nouvel onglet, déjà connecté) ; déconnecté : page de connexion
                    du front. La déconnexion réelle se fait DEPUIS le dashboard. */}
{isAuthenticated ? (
    <a
        className="header-user"
        href="/api/sso/to-membership"
        title="My account"
        target="_blank"
        rel="noopener noreferrer"
    >
        <span className="sr-only">My account</span>
    </a>
) : (
    <Link className="header-user" href="/connexion" title="Connexion">
        <span className="sr-only">Connexion</span>
    </Link>
)}
</div>

{/* Menu de navigation (Burger Drawer) */}
<nav className={`site-menu ${isMenuOpen ? 'is-active' : ''}`}>
    <div className="menu-nav">
        <label htmlFor="toggle-menu" className="menu-overlay" onClick={toggleMenu}></label>

        <div className="menu-wrap align-left">
            {/* Outils du menu */}
            <section className="tools-section">
                <div className="tool-list">
                    <Link href="/search" className="item" data-icon="magnifying-glass">Search</Link>
                    <button type="button" className="item" data-icon="circle-half-stroke" onClick={toggleTheme} aria-pressed={theme === 'dark'}>
                        Mode {theme === 'light' ? 'dark' : 'light'}
                    </button>
                    <a href="https://4thestatedemo.vercel.app/" className="item" data-icon="envelope">Newsletters</a>
                </div>
            </section>

            {/* À la une du Hebdo */}
            {/*<section className="hebdo-section">
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
                        </section>*/}

            {/* Bouton Offres Menu
                        <a className="menu-abo ithalc" href="https://fourthestate.free.nf" rel="nofollow" data-ithal="menu_navigation_hebdo">
                            <strong>Offres spéciales</strong>
                            <span style={{ fontWeight: 'normal' }}>dès 3,99&nbsp;€/mois</span>
                        </a>*/}

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
                        };

                        return isExternal ? (
                            // La clé 'key' est maintenant déclarée directement ici
                            <a key={index} href={item.href} {...itemProps}>
                                {item.label}
                                <ArrowBigRight />
                            </a>
                        ) : (
                            // Et ici
                            <Link key={index} href={item.href} {...itemProps}>
                                {item.label}
                                <ArrowRight size={14} />
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