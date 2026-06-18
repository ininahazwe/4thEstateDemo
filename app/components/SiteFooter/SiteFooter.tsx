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

interface SiteFooterProps {
    // Optionnel : permet d'injecter dynamiquement les numéros de la semaine via votre API
    magazines?: MagazineData[];
}

// Valeurs par défaut si l'API ne fournit pas encore les magazines de la semaine
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
                        <Link href="/" title="Retour à l’accueil Courrier international">
                            <svg width="190" height="38" role="img" aria-label="Retour à l’accueil Courrier international">
                                <use
                                    xlinkHref="/bucket/assets/19736043d5ae92f5521f862714cad251e792dfbf/img/logos/logoCI-compressed.svg#logo"
                                    href="/bucket/assets/19736043d5ae92f5521f862714cad251e792dfbf/img/logos/logoCI-compressed.svg#logo"
                                />
                            </svg>
                        </Link>
                    </div>
                    <div className="hero-socials">
                        {socialLinks.map((social, index) => (
                            <a
                                key={index}
                                href={social.href}
                                target="_blank"
                                rel="noopener"
                                className="item"
                                title={social.title}
                                data-icon={social.icon}
                            >
                                <span className="sr-only">{social.title}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* CTAs SECTION : Blocs de liens et magazines */}
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

                        {/* Colonne 3 : Aide & Liens Légaux */}
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
                                    <Image loading="lazy" src="/bucket/assets/19736043d5ae92f5521f862714cad251e792dfbf/img/icons/icon-appstore.png" alt="Télécharger sur l’AppStore" width="155" height="48" />
                                </a>
                                <a href="https://play.google.com/store/apps/details?id=com.milibris.courrierinternationallemag&amp;hl=fr_FR" className="app ithalc" data-ithalc="[cta_bloc_footer]" data-ithal="appandroid">
                                    <Image loading="lazy" src="/bucket/assets/19736043d5ae92f5521f862714cad251e792dfbf/img/icons/icon-googleplay.png" alt="Télécharger sur GooglePlay" width="155" height="48" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            </section>
        </footer>
    );
}