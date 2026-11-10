/**
 * Suivi des clics sur les bannieres / CTA, via GA4 (gtag charge par
 * app/components/Analytics/GoogleAnalytics.tsx).
 *
 * Ne jette jamais : un echec de mesure (bloqueur de pub, gtag absent) ne doit
 * pas casser le clic. `transport_type: "beacon"` garantit l'envoi meme quand
 * le lien navigue dans le meme onglet.
 *
 * Cote GA4 : enregistrer `banner_id` et `banner_location` comme dimensions
 * personnalisees (portee Evenement) pour les voir dans les rapports standard.
 */
function send(eventName: string, banner: string, location: string): void {
    try {
        if (typeof window === "undefined" || typeof window.gtag !== "function") return;
        window.gtag("event", eventName, {
            banner_id: banner,
            banner_location: location,
            page_path: window.location.pathname,
            transport_type: "beacon",
        });
    } catch {
        /* silencieux par conception */
    }
}

/** Clic sur un CTA menant au programme de membres. */
export function trackMembershipClick(banner: string, location: string): void {
    send("membership_banner_click", banner, location);
}

/** Clic sur un bandeau menant au canal WhatsApp (hors membership). */
export function trackWhatsappClick(banner: string, location: string): void {
    send("whatsapp_banner_click", banner, location);
}
