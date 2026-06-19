'use client';

import {
    socialLinks,
    sectionsTags,
    sectionsGroup,
    sectionsLegals,
    type MagazineData
} from './footerData';
import Link from "next/link";
import Image from "next/image";

// 1. Importation des icônes souhaitées depuis react-icons
import {
    FaFacebookF,
    FaXTwitter,
    FaInstagram,
    FaLinkedinIn,
    FaYoutube
} from "react-icons/fa6";
import { IoLogoRss } from "react-icons/io5";

interface SiteFooterProps {
    magazines?: MagazineData[];
}

// 2. Dictionnaire de correspondance (Key -> Composant Icône)
const iconMapping: Record<string, React.ComponentType<{ className?: string }>> = {
    facebook: FaFacebookF,
    twitter: FaXTwitter, // ou x-twitter selon votre clé dans footerData
    instagram: FaInstagram,
    linkedin: FaLinkedinIn,
    youtube: FaYoutube,
    rss: IoLogoRss
};

const defaultMagazines: MagazineData[] = [
    {
        className: 'hebdo',
        href: "https://www.courrierinternational.com/magazine/2026/1859-magazine",
        ithal: "hebdo",
        imgSrc: "https://focus.courrierinternational.com/160x0/2026/06/17/a105bb3_upload-1-zjlpdgo0nnuz-couv1859bd.jpg",
        imgSrcSet: "https://focus.courrierinternational.com/320x0/2026/06/17/a105bb3_upload-1-zjlpdgo0nnuz-couv1859bd.jpg 2x",
        width: 320,
        height: 382,
        alt: "N°1859 : Brexit : un jour sans fin"
    },
    {
        className: 'hs',
        href: "https://www.courrierinternational.com/magazine/2026/113-hors-serie",
        ithal: "hs",
        imgSrc: "https://focus.courrierinternational.com/160x0/2026/05/06/741aece_upload-1-8hlc6cnse8qp-dereglement-climatique-une-sortie-e-20-mai-2026.jpg",
        imgSrcSet: "https://focus.courrierinternational.com/320x0/2026/05/06/741aece_upload-1-8hlc6cnse8qp-dereglement-climatique-une-sortie-e-20-mai-2026.jpg 2x",
        width: 320,
        height: 412,
        alt: "N°113 : Climat : vivre autrement"
    }
];

export default function SiteFooter({ magazines = defaultMagazines }: SiteFooterProps) {

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.classList.add('img--error');
    };

    return (
        <footer id="site-footer" className="site-footer">
            <section className="footer-content">

                {/* HERO SECTION : Logo & Réseaux Sociaux */}
                <div className="footer-hero">
                    <div className="hero-logo">
                        <Link href="/" title="Retour à l’accueil The Fourth Estate">
                            <Image
                                src="/assets/img/logo.svg"
                                alt="The Fourth Estate Logo"
                                width={190}
                                height={38}
                                priority
                            />
                        </Link>
                    </div>
                    <div className="hero-socials">
                        {socialLinks.map((social, index) => {
                            // 3. Récupération dynamique de l'icône associée
                            const IconComponent = iconMapping[social.icon.toLowerCase()];

                            return (
                                <a
                                    key={index}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener"
                                    className="item"
                                    title={social.title}
                                    // Optionnel : gardez data-icon si vos anciens sélecteurs CSS globaux en ont besoin
                                    data-icon={social.icon}
                                >
                                    {/* Rendu de l'icône avec une classe CSS pour l'ajuster si nécessaire */}
                                    {IconComponent ? (
                                        <IconComponent className="footer-icon" />
                                    ) : (
                                        <span className="icon-fallback">★</span>
                                    )}
                                    <span className="sr-only">{social.title}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>

                {/* CTAs SECTION */}
                <div className="footer-ctas">
                    <nav className="footer-links">

                        {/* Colonne 1 : Nos Rubriques */}
                        <div className={sectionsTags.boxClass}>
                            <span className="footer-title">{sectionsTags.title}</span>
                            {sectionsTags.links.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.href}
                                    className="item ithalc"
                                    data-ithalc="[cta_bloc_footer]"
                                    data-ithal={link.ithal}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>

                        {/* Colonne 2 : Groupe (Rendez-vous + Sites) */}
                        <div className="group">
                            {sectionsGroup.map((section, sIdx) => (
                                <div className={section.boxClass} key={sIdx}>
                                    <span className="footer-title">{section.title}</span>
                                    {section.links.map((link, idx) => (
                                        <a
                                            key={idx}
                                            href={link.href}
                                            target={link.target}
                                            rel={link.rel}
                                            className="item ithalc"
                                            data-ithalc="[cta_bloc_footer]"
                                            data-ithal={link.ithal}
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Colonne 3 : Aide & Liens Liens Légaux */}
                        <div className={sectionsLegals.boxClass}>
                            <span className="footer-title">{sectionsLegals.title}</span>
                            {sectionsLegals.links.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.href}
                                    target={link.target}
                                    rel={link.rel}
                                    className={link.className ? link.className : 'item'}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </nav>

                    {/* Section Externe : Unes de magazines & Apps Mobiles */}
                    <div className="footer-away">
                        <div className="away-print">
                            {magazines.map((mag, idx) => (
                                <a
                                    key={idx}
                                    className={`${mag.className} ithalc`}
                                    href={mag.href}
                                    data-ithalc="[cta_bloc_footer]"
                                    data-ithal={mag.ithal}
                                >
                                    <div className="item-image">
                                        <figure>
                                            <picture>
                                                <img
                                                    loading="lazy"
                                                    src={mag.imgSrc}
                                                    srcSet={mag.imgSrcSet}
                                                    width={mag.width}
                                                    height={mag.height}
                                                    alt={mag.alt}
                                                    onError={handleImageError}
                                                />
                                            </picture>
                                        </figure>
                                    </div>
                                </a>
                            ))}
                        </div>

                        <div className="away-apps">
                            <div className="footer-title">L’application mobile</div>
                            <div className="wrap">
                                <a href="https://itunes.apple.com/fr/app/courrier-international-magazine/id921592832" className="app ithalc" data-ithalc="[cta_bloc_footer]" data-ithal="appios">

                                </a>
                                <a href="https://play.google.com/store/apps/details?id=com.milibris.courrierinternationallemag&amp;hl=fr_FR" className="app ithalc" data-ithalc="[cta_bloc_footer]" data-ithal="appandroid">

                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            </section>
        </footer>
    );
}