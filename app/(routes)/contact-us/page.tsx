import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import Header from '@/app/components/Header/Header';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import ContactForm from '@/app/components/Contact/ContactForm';
import { socialLinks } from '@/app/components/SiteFooter/footerData';

// Page entièrement statique : le formulaire est un composant client et la
// soumission passe par /api/contact. Rien à fetcher côté WordPress.
export const revalidate = 86400;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

/** Adresse affichée publiquement — aussi utilisée en replyTo par la rédaction. */
const CONTACT_EMAIL = 'thefourthestate@mfwa.org';
const CONTACT_PHONE = '+233 302 555327';
/** Format sans espaces ni séparateurs, requis par le protocole tel:. */
const CONTACT_PHONE_HREF = '+233302555327';

/**
 * Colonne de droite : les autres portes d'entrée vers la rédaction, à la
 * place du bloc commercial du modèle (qui vendait des prestations UX).
 */
const OTHER_WAYS: Array<{ label: string; href: string; external?: boolean }> = [
    {
        label: 'Send us a confidential tip through our whistleblower portal',
        href: '/whistleblower',
    },
    {
        label: 'Suggest a story or a lead for our newsroom',
        href: `mailto:${CONTACT_EMAIL}?subject=Story%20suggestion`,
        external: true,
    },
    {
        label: 'Support independent journalism with a donation',
        href: 'https://mfwa.org/donate',
        external: true,
    },
    {
        label: 'Request a right of reply on a published story',
        href: `mailto:${CONTACT_EMAIL}?subject=Right%20of%20reply`,
        external: true,
    },
];

export const metadata: Metadata = {
    title: 'Contact us - The Fourth Estate',
    description:
        'Get in touch with The Fourth Estate newsroom. Send us a message, a story lead or a confidential tip.',
    openGraph: {
        type: 'website',
        url: `${baseUrl}/contact-us`,
        title: 'Get in touch with us',
        description:
            'Get in touch with The Fourth Estate newsroom. Send us a message, a story lead or a confidential tip.',
        locale: 'en_GH',
    },
    alternates: {
        canonical: `${baseUrl}/contact-us`,
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function ContactUsPage() {
    return (
        <>
            <Header />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="1" data-section="contact-us">
                    <div className="section-content" data-column="full">

                        <div className="contact-header">
                            <p className="contact-eyebrow">Contact us</p>
                            <h1 className="contact-title">Get in touch with us</h1>
                            <p className="contact-subtitle">
                                Fill out the form below and our newsroom will get back to you.
                            </p>
                        </div>

                        <div className="contact-grid">

                            {/* ── Colonne gauche : formulaire ───────────────── */}
                            <div className="contact-col">
                                <ContactForm />

                                <div className="contact-direct">
                                    <h2 className="contact-h2">You can also contact us via</h2>

                                    <ul className="contact-direct__list">
                                        <li>
                                            <span className="contact-icon" aria-hidden="true">
                                                <Mail size={18} strokeWidth={1.8} />
                                            </span>
                                            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                                        </li>
                                        <li>
                                            <span className="contact-icon" aria-hidden="true">
                                                <Phone size={18} strokeWidth={1.8} />
                                            </span>
                                            <a href={`tel:${CONTACT_PHONE_HREF}`}>{CONTACT_PHONE}</a>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* ── Colonne droite : autres moyens + adresse ──── */}
                            <div className="contact-col">
                                <h2 className="contact-h2">Other ways to reach us</h2>

                                <ul className="contact-ways">
                                    {OTHER_WAYS.map((way) => (
                                        <li key={way.href} className="contact-way">
                                            <span className="contact-check" aria-hidden="true">
                                                <CheckCircle2 size={20} strokeWidth={1.8} />
                                            </span>
                                            {way.external ? (
                                                <a
                                                    href={way.href}
                                                    target={way.href.startsWith('mailto:') ? undefined : '_blank'}
                                                    rel={way.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                                                >
                                                    {way.label}
                                                </a>
                                            ) : (
                                                <Link href={way.href}>{way.label}</Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                <div className="contact-follow">
                                    <h2 className="contact-h2">Follow our reporting</h2>
                                    <ul className="contact-social">
                                        {/* Le flux RSS n'est pas un réseau social : exclu de cette liste. */}
                                        {socialLinks
                                            .filter((social) => social.icon !== 'rss')
                                            .map((social) => (
                                                <li key={social.icon}>
                                                    <a
                                                        href={social.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title={social.title}
                                                    >
                                                        {social.icon.charAt(0).toUpperCase() + social.icon.slice(1)}
                                                    </a>
                                                </li>
                                            ))}
                                    </ul>
                                </div>

                                <div className="contact-location">
                                    <p className="contact-location__label">
                                        <span className="contact-icon" aria-hidden="true">
                                            <MapPin size={18} strokeWidth={1.8} />
                                        </span>
                                        Ghana
                                    </p>
                                    <address className="contact-location__address">
                                        Aar-Bakor Street, Ogbojo
                                        <br />
                                        Accra, Ghana
                                        <br />
                                        West Africa
                                    </address>
                                    <p className="contact-location__note">
                                        The Fourth Estate is a project of the{' '}
                                        <a
                                            href="https://mfwa.org"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Media Foundation for West Africa
                                        </a>
                                        .
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
