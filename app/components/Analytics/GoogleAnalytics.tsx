'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Envoie un `page_view` a chaque changement de route.
 *
 * Necessaire parce que gtag.js n'emet sa vue de page qu'au chargement initial
 * du document : dans une application Next en navigation client, tous les
 * changements de page suivants passeraient sinon inapercus. C'est la raison
 * du `send_page_view: false` dans la configuration ci-dessous — sans lui, la
 * premiere page serait comptee deux fois.
 *
 * `useSearchParams` impose une frontiere <Suspense> : sans elle, Next bascule
 * toutes les pages en rendu client, ce qui couterait le rendu serveur du site
 * entier pour une simple mesure d'audience.
 */
function PageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!GA_ID || typeof window.gtag !== 'function') return;

        const qs = searchParams.toString();
        window.gtag('event', 'page_view', {
            page_path: qs ? `${pathname}?${qs}` : pathname,
            page_location: window.location.href,
            page_title: document.title,
        });
    }, [pathname, searchParams]);

    return null;
}

/**
 * Google Analytics 4, branche en direct (sans Tag Manager).
 *
 * Pas de Consent Mode / bandeau cookies : arbitrage du 24/08/2026, le Ghana
 * n'imposant pas de regime equivalent au RGPD. La mesure demarre donc
 * directement au chargement de gtag.js, sans attendre d'action du visiteur.
 *
 * Sans `NEXT_PUBLIC_GA_ID`, le composant ne rend rien du tout : aucune requete
 * vers Google en developpement ou en preproduction tant que la variable n'est
 * pas definie.
 */
export default function GoogleAnalytics() {
    if (!GA_ID) return null;

    return (
        <>
            <Script
                id="ga-lib"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />
            <Script id="ga-config" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    window.gtag = window.gtag || gtag;
                    gtag('js', new Date());
                    gtag('config', '${GA_ID}', {
                        send_page_view: false,
                        anonymize_ip: true
                    });
                `}
            </Script>
            <Suspense fallback={null}>
                <PageViewTracker />
            </Suspense>
        </>
    );
}
