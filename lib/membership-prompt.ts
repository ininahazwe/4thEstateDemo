/**
 * Coordination des surfaces « membership » (audit UX 02/11/2026, point 7).
 * Règle : UNE seule surface membership à la fois.
 *   1. La popup (MembershipLaunchModal) passe en premier, pendant les
 *      semaines d'affichage (cf. isPopupSeason).
 *   2. La barre fixe (SubscriptionBanner) n'apparaît qu'une fois la popup
 *      vue/fermée dans la session — ou toute la durée hors saison popup.
 *   3. Le bouton du header reste l'appel permanent (outline sur mobile).
 */

export const POPUP_DISMISSED_KEY = "tfe:membership-launch-dismissed";
export const POPUP_DISMISSED_EVENT = "tfe:membership-popup-dismissed";

/** Première semaine (jours 1 à 7) ou dernière semaine du mois, en UTC. */
export function isPopupSeason(now: Date = new Date()): boolean {
    const day = now.getUTCDate();
    const lastDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return day <= 7 || day > lastDay - 7;
}

export function isPopupDismissed(): boolean {
    try {
        return window.sessionStorage.getItem(POPUP_DISMISSED_KEY) === "1";
    } catch {
        return false;
    }
}

export function markPopupDismissed(): void {
    try {
        window.sessionStorage.setItem(POPUP_DISMISSED_KEY, "1");
    } catch {
        /* storage bloqué : on ignore */
    }
    window.dispatchEvent(new Event(POPUP_DISMISSED_EVENT));
}
