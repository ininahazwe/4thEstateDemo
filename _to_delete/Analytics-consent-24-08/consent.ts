/**
 * Source unique de verite pour le consentement cookies.
 *
 * La meme cle et les memes valeurs sont utilisees a quatre endroits :
 *  - le script inline du <head> (app/layout.tsx), qui restaure le choix du
 *    visiteur AVANT le chargement de gtag.js pour eviter tout battement ;
 *  - le bandeau CookieConsent, qui ecrit le choix ;
 *  - GoogleAnalytics, qui configure la mesure ;
 *  - CookieSettingsButton (pied de page), qui permet de revenir sur son choix.
 *
 * Toute modification ici doit etre repercutee dans le script inline.
 */
export const CONSENT_STORAGE_KEY = 'tfe-cookie-consent';

export type ConsentChoice = 'granted' | 'denied';

/**
 * Evenement DOM qui reouvre le bandeau.
 *
 * Pourquoi un evenement et pas un contexte React : le bouton vit dans
 * <SiteFooter> (composant serveur) et le bandeau est monte dans <body> par
 * app/layout.tsx. Les relier par un contexte imposerait un provider client
 * autour de tout l'arbre, donc la perte du rendu serveur du site entier — pour
 * un clic tous les six mois. `window` est le canal partage naturel ici.
 */
export const CONSENT_REOPEN_EVENT = 'tfe-consent-reopen';

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

/**
 * Redemande son choix au visiteur, depuis n'importe ou dans l'application.
 *
 * Ne touche PAS au choix enregistre : un visiteur qui ouvre le panneau puis le
 * referme sans rien cliquer doit garder sa preference precedente.
 */
export function openConsentSettings(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
}

/**
 * Supprime les cookies deposes par gtag.js.
 *
 * `consent: update` en `denied` empeche les ecritures FUTURES mais ne retire
 * pas les identifiants deja poses : sans ce nettoyage, un visiteur qui retire
 * son consentement resterait porteur de son `_ga` jusqu'a expiration (2 ans).
 * Un retrait qui ne retire rien ne vaut pas grand-chose.
 *
 * gtag pose ses cookies sur le domaine enregistrable (`.exemple.com`) et leur
 * suppression exige de rejouer exactement le meme couple domain/path — on essaie
 * donc tous les suffixes du host courant, ce qui evite d'embarquer une liste de
 * suffixes publics pour un besoin d'une ligne.
 */
function deleteAnalyticsCookies(): void {
    if (typeof document === 'undefined') return;

    const names = document.cookie
        .split(';')
        .map((c) => c.split('=')[0].trim())
        .filter((n) => n.startsWith('_ga') || n.startsWith('_gid') || n.startsWith('_gat'));

    if (!names.length) return;

    const host = window.location.hostname;
    const labels = host.split('.');
    const domains = new Set<string>([host, `.${host}`]);
    for (let i = 1; i < labels.length - 1; i++) {
        const parent = labels.slice(i).join('.');
        domains.add(parent);
        domains.add(`.${parent}`);
    }

    const expired = 'Thu, 01 Jan 1970 00:00:00 GMT';
    for (const name of names) {
        document.cookie = `${name}=; expires=${expired}; path=/`;
        for (const domain of domains) {
            document.cookie = `${name}=; expires=${expired}; path=/; domain=${domain}`;
        }
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

    // Retrait du consentement : on efface aussi ce qui a deja ete pose.
    if (choice === 'denied') deleteAnalyticsCookies();
}
