'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readStoredConsent, writeConsent, type ConsentChoice } from './consent';

/**
 * Bandeau de consentement cookies.
 *
 * Ne s'affiche que si le visiteur n'a jamais repondu. Le choix est relu au
 * chargement suivant par le script inline du <head>, qui applique le consent
 * mode avant gtag.js — le bandeau n'a donc aucun role au retour d'un visiteur
 * connu.
 *
 * Monte apres l'hydratation (`useEffect`) : le rendu serveur ne connait pas
 * localStorage, l'afficher des le HTML provoquerait un mismatch et un
 * clignotement chez tous les visiteurs ayant deja repondu.
 */
export default function CookieConsent() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (readStoredConsent() === null) setVisible(true);
    }, []);

    if (!visible) return null;

    const decide = (choice: ConsentChoice) => {
        writeConsent(choice);
        setVisible(false);
    };

    return (
        <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie preferences">
            <div className="cookie-consent__inner">
                <p className="cookie-consent__text">
                    We use analytics cookies to understand which stories are read, so we can
                    report better. Nothing is collected until you agree, and we never sell
                    your data.{' '}
                    <Link href="/privacy" className="cookie-consent__link">
                        Privacy policy
                    </Link>
                </p>

                <div className="cookie-consent__actions">
                    <button
                        type="button"
                        className="cookie-consent__btn cookie-consent__btn--ghost"
                        onClick={() => decide('denied')}
                    >
                        Decline
                    </button>
                    <button
                        type="button"
                        className="cookie-consent__btn cookie-consent__btn--solid"
                        onClick={() => decide('granted')}
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
