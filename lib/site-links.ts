/**
 * Liens externes « adhésion / soutien ».
 *
 * ⚠️ REDIRECTION TEMPORAIRE (16/08/2026) : le site membership n'est pas
 * exposé publiquement pour l'instant, tous les CTA d'adhésion pointent vers
 * la page de don MFWA. Pour revenir en arrière, remettre la valeur commentée
 * ci-dessous — c'est le seul endroit à modifier.
 */
export const MEMBERSHIP_URL = "https://mfwa.org/donate";
// export const MEMBERSHIP_URL = "https://membership.thefourthestategh.com";

/** CTA « Join us » / « Renew » / « Support us ». */
export const MEMBERSHIP_JOIN_URL = MEMBERSHIP_URL;

/** Création de compte (login-form, AuthRequiredModal). */
export const WP_REGISTER_URL = MEMBERSHIP_URL;

/**
 * Mot de passe oublié — laissé sur le site membership : /donate ne rend pas
 * ce service. À rediriger aussi si le domaine devient inaccessible.
 */
export const WP_RESET_URL =
    "https://membership.thefourthestategh.com/mot-de-passe-oublie";
