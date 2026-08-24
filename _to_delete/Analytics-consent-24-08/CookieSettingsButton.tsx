'use client';

import { openConsentSettings } from './consent';

/**
 * Lien « Cookie settings » du pied de page.
 *
 * Remplace l'ancienne entree qui pointait vers `/cookies` — une route qui
 * n'existe pas dans app/(routes), donc un 404 sur un lien que la politique de
 * confidentialite est censee garantir. Ici, pas de page a maintenir : le clic
 * reouvre simplement le bandeau de consentement.
 *
 * Rendu en <button> et non en <a> : l'element ne navigue pas. Un <a href="#">
 * casserait la navigation clavier et polluerait l'historique.
 *
 * `className` est passe par le pied de page pour reprendre exactement le style
 * des autres entrees de la colonne (`item`), le reste etant neutralise en CSS.
 */
export default function CookieSettingsButton({
    label,
    className = 'item',
}: {
    label: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            className={`${className} cookie-settings-trigger`}
            onClick={openConsentSettings}
        >
            {label}
        </button>
    );
}
