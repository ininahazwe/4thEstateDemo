'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    CONSENT_REOPEN_EVENT,
    readStoredConsent,
    writeConsent,
    type ConsentChoice,
} from './consent';

/**
 * Bandeau de consentement cookies.
 *
 * Deux modes d'ouverture :
 *
 *  - **premiere visite** : s'affiche seul si le visiteur n'a jamais repondu ;
 *  - **reouverture** : sur l'evenement CONSENT_REOPEN_EVENT, emis par le bouton
 *    « Cookie settings » du pied de page. Le visiteur peut alors changer d'avis
 *    a tout moment — exigence de droit de retrait, et sans ca la seule maniere
 *    de revenir sur son choix etait d'effacer localStorage a la main.
 *
 * En reouverture le bandeau rappelle le choix courant et propose une croix de
 * fermeture : refermer sans cliquer ne doit RIEN changer.
 *
 * Monte apres l'hydratation (`useEffect`) : le rendu serveur ne connait pas
 * localStorage, l'afficher des le HTML provoquerait un mismatch et un
 * clignotement chez tous les visiteurs ayant deja repondu.
 */
export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [current, setCurrent] = useState<ConsentChoice | null>(null);
    const [reopened, setReopened] = useState(false);

    useEffect(() => {
        const stored = readStoredConsent();
        setCurrent(stored);
        if (stored === null) setVisible(true);
    }, []);

    useEffect(() => {
        const onReopen = () => {
            setCurrent(readStoredConsent());
            setReopened(true);
            setVisible(true);
        };
        window.addEventListener(CONSENT_REOPEN_EVENT, onReopen);
        return () => window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen);
    }, []);

    const decide = useCallback((choice: ConsentChoice) => {
        writeConsent(choice);
        setCurrent(choice);
        setVisible(false);
        setReopened(false);
    }, []);

    if (!visible) return null;

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
                    {reopened && current !== null && (
                        <>
                            {' '}
                            <span className="cookie-consent__status">
                                {current === 'granted'
                                    ? 'You currently allow analytics cookies.'
                                    : 'Analytics cookies are currently switched off.'}
                            </span>
                        </>
                    )}
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

                {/* Fermeture sans changement — uniquement en reouverture : a la
                    premiere visite, une croix serait un troisieme choix ambigu
                    (ni accepte, ni refuse) et le bandeau reviendrait a chaque page. */}
                {reopened && (
                    <button
                        type="button"
                        className="cookie-consent__close"
                        aria-label="Close without changing my choice"
                        onClick={() => {
                            setVisible(false);
                            setReopened(false);
                        }}
                    >
                        &times;
                    </button>
                )}
            </div>
        </div>
    );
}
