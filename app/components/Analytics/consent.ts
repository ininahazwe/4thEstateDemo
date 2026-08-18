/**
 * Source unique de verite pour le consentement cookies.
 *
 * La meme cle et les memes valeurs sont utilisees a trois endroits :
 *  - le script inline du <head> (app/layout.tsx), qui restaure le choix du
 *    visiteur AVANT le chargement de gtag.js pour eviter tout battement ;
 *  - le bandeau CookieConsent, qui ecrit le choix ;
 *  - GoogleAnalytics, qui configure la mesure.
 *
 * Toute modification ici doit etre repercutee dans le script inline.
 */
export const CONSENT_STORAGE_KEY = 'tfe-cookie-consent';

export type ConsentChoice = 'granted' | 'denied';

/** Lit le choix deja enregistre. `null` = le visiteur n'a pas encore repondu. */
export function readStoredConsent(): ConsentChoice | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
        return v === 'granted' || v === 'denied' ? v : null;
    } catch {
        // localStorage indisponible (navigation privee stricte, cookies
        // bloques) : on se comporte comme si rien n'avait ete choisi.
        return null;
    }
}

/** Enregistre le choix et le transmet immediatement a Google Consent Mode. */
export function writeConsent(choice: ConsentChoice): void {
    try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
        // Echec d'ecriture : le choix ne survivra pas a la session, mais la
        // mise a jour ci-dessous s'applique quand meme a la page en cours.
    }

    if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
            analytics_storage: choice,
            ad_storage: choice,
            ad_user_data: choice,
            ad_personalization: choice,
        });
    }
}
