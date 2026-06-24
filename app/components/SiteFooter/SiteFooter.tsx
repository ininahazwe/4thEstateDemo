import {
    socialLinks,
    sectionsGroup,
    sectionsLegals,
    type MagazineData
} from './footerData';
import { getTopCategories } from '../../services/wpApi';
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

export default async function SiteFooter({ magazines = defaultMagazines }: SiteFooterProps) {

    const topCategories = await getTopCategories(10);

    return (
        <footer id="site-footer" className="site-footer">
            <section className="footer-content">

                {/* HERO SECTION : Logo & Réseaux Sociaux */}
                <div className="footer-hero">
                    <div className="hero-logo">
                        <Link href="/" title="Back to The Fourth Estate homepage">
                            <Image
                                src="/assets/img/logo-white.svg"
                                alt="The Fourth Estate Logo"
                                width={290}
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
                                    {IconComponent && (
                                        <IconComponent className="footer-icon" />
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

                        {/* Colonne 1 : Topics (catégories les plus actives, via l'API) */}
                        <div className="links-box links-tags">
                            <span className="footer-title">Topics</span>
                            {topCategories.map((cat) => (
                                <a
                                    key={cat.id}
                                    href={cat.href}
                                    className="item ithalc"
                                    data-ithalc="[cta_bloc_footer]"
                                    data-ithal={cat.ithal}
                                >
                                    {cat.label}
                                </a>
                            ))}
                        </div>

                        {/* Colonne 2 : Groupe (Rendez-vous + Sites) */}
                        <div className="group">
                            <div className="links-box links-services">
                                <span className="footer-title">Highlights</span>
                                {sectionsGroup.map((section, sIdx) => (
                                    <div className={section.boxClass} key={sIdx}>
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
                        <p>
                            The Fourth Estate is a non-profit, public interest and accountability investigative journalism project of the Media Foundation for West Africa (MFWA). Our aim is to promote independent and critical research-based journalism that holds those in power answerable to the people they govern.
                        </p>
                    </div>
                </div>

            </section>
        </footer>
    );
}