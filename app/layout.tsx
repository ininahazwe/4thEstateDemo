// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./styles/base.css";
import "./styles/home.css";
import "./styles/layout.css";
import "./styles/global.css";
import "./styles/component-banner.css";
import "./styles/home-critical.css";
import "./styles/custom.css";
import "./styles/article-critical.css";
import "./styles/swipe.css";
import "./styles/podcast.css";
import "./styles/latest-podcast-widget.css";
import "./styles/video-zone.css";
import "./styles/newsletter-signup.css";
import "./styles/hero-gallery.css";
import "./styles/article.css";
import "./styles/article-card-theme-lock.css";
import "./styles/share-popup.css";
import "./styles/inline.css";
import "./styles/video.css";
import "./styles/language-switcher.css";
import "./styles/article-layout.css";
import "./styles/section-critical.css";
import "./styles/search.css";
import "./styles/archives.css";
import "./styles/callout.css";
import "./styles/footer-accordion.css";
import "./styles/whistleblower.css";
import "./styles/contact.css";
import "./styles/aside-skeleton.css";
import "./styles/comments.css";
import "./styles/cookie-consent.css";
import "./styles/dark.css";
import "./styles/article-storytelling.css";
import "./globals.css";
import Providers from "@/app/providers";
import GoogleAnalytics from "@/app/components/Analytics/GoogleAnalytics";
import CookieConsent from "@/app/components/Analytics/CookieConsent";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: "The Fourth Estate - Independent Investigation",
        template: "%s — The Fourth Estate",
    },
    description: "Independent journalistic investigation platform. In-depth reporting, exclusive interviews, and critical analysis.",
    keywords: ["investigative journalism", "reporting", "news", "corruption", "environment", "human rights"],
    authors: [{ name: "The Fourth Estate", url: baseUrl }],
    creator: "The Fourth Estate",
    publisher: "The Fourth Estate",
    formatDetection: {
        email: false,
        telephone: false,
        address: false,
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: "en_GH",
        url: baseUrl,
        siteName: "The Fourth Estate",
        title: "The Fourth Estate - Independent Investigation",
        description: "Independent journalistic investigation platform.",
        images: [
            {
                url: `${baseUrl}/og-image.jpg`,
                width: 1200,
                height: 630,
                alt: "The Fourth Estate",
                type: "image/jpeg",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "The Fourth Estate",
        description: "Independent investigative journalism",
        images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
        canonical: baseUrl,
        languages: {
            "en": baseUrl,
            "fr": `${baseUrl}/fr`,
        },
    },
    category: "News",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "NewsMediaOrganization",
        name: "The Fourth Estate",
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description: "Independent journalistic investigation platform",
        sameAs: [
            "https://twitter.com/thefourthestate",
            "https://facebook.com/thefourthestate",
            "https://instagram.com/thefourthestate",
        ],
        address: {
            "@type": "PostalAddress",
            addressCountry: "GH",
        },
    };

    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "The Fourth Estate",
        url: baseUrl,
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${baseUrl}/search?q={search_term_string}`,
            },
            query_input: "required name=search_term_string",
        },
    };

    // suppressHydrationWarning sur <html> : le script inline du <head> écrase
    // data-user-color-scheme depuis localStorage AVANT l'hydratation, alors que
    // le serveur rend toujours "light" (il n'a pas accès au localStorage). Sans
    // ça, tout visiteur en thème sombre déclenche une erreur d'hydratation.
    // La suppression ne porte QUE sur les attributs de cet élément, pas sur ses
    // enfants — les vrais mismatches ailleurs restent signalés.
    return (
        <html lang="en" data-user-color-scheme="light" suppressHydrationWarning>
        <head>
            {/* Theme initialization - runs before hydration */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-user-color-scheme', savedTheme);
              })();
            `,
                }}
            />

            {/* Google Consent Mode v2 — DOIT s'executer avant gtag.js.
                Tout est refuse par defaut ; on ne repasse en "granted" que si
                le visiteur avait deja accepte lors d'une visite precedente.
                Inline dans le <head> et non via next/script : c'est le seul
                moyen de garantir l'ordre d'execution vis-a-vis de gtag.js.
                La cle localStorage doit rester alignee sur CONSENT_STORAGE_KEY
                (app/components/Analytics/consent.ts). */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
              (function() {
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;

                var stored = null;
                try { stored = localStorage.getItem('tfe-cookie-consent'); } catch (e) {}
                var granted = stored === 'granted' ? 'granted' : 'denied';

                gtag('consent', 'default', {
                  ad_storage: granted,
                  ad_user_data: granted,
                  ad_personalization: granted,
                  analytics_storage: granted,
                  functionality_storage: 'granted',
                  security_storage: 'granted',
                  wait_for_update: 500
                });
              })();
            `,
                }}
            />
        </head>
        <body className="ci-phalcon not-logged special-abo variantB page-home v-web {maPoliceConfiguration.className}">
            <Providers>
                {children}
            </Providers>

            {/* JSON-LD Structured Data - injected after hydration to avoid mismatch */}
            <Script
                id="organization-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
                strategy="afterInteractive"
            />
            <Script
                id="website-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
                strategy="afterInteractive"
            />

            <GoogleAnalytics />
            <CookieConsent />
        </body>
        </html>
    );
}