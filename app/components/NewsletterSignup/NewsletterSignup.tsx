'use client';

import { useState, type FormEvent } from 'react';
import NewsletterConsentModal from './NewsletterConsentModal';

// 'consent' : adresse saisie et validée, le modal attend l'acceptation de la
// politique de confidentialité. Aucun appel réseau n'a encore eu lieu — rien
// n'est envoyé à Mailchimp tant que le lecteur n'a pas coché la case.
type Status = 'idle' | 'consent' | 'loading' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messages distincts par code d'erreur renvoyé par /api/newsletter/subscribe.
// L'ancienne version affichait « Something went wrong » pour tout, ce qui
// rendait impossible de distinguer une panne Mailchimp d'une variable
// d'environnement absente sur le serveur — le symptôme est le même à l'écran.
const ERROR_MESSAGES: Record<string, string> = {
    invalid_email: 'Please enter a valid email address.',
    consent_required: 'Please accept the Privacy Policy to subscribe.',
    not_configured:
        'Our newsletter service is not configured yet. Please try again later.',
    upstream_error:
        'Our newsletter provider refused the request. Please try again in a moment.',
    upstream_unreachable:
        'We could not reach our newsletter provider. Please try again in a moment.',
};

export default function NewsletterSignup() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [errorReason, setErrorReason] = useState<string | null>(null);

    // Étape 1 — le submit du formulaire ne fait qu'ouvrir le modal.
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (status === 'loading') return;

        const trimmed = email.trim();
        if (!EMAIL_RE.test(trimmed)) {
            setErrorCode('invalid_email');
            setErrorReason(null);
            setStatus('error');
            return;
        }

        setErrorCode(null);
        setErrorReason(null);
        setStatus('consent');
    };

    // Étape 2 — consentement coché : l'adresse part enfin vers l'API.
    const handleAccept = async () => {
        setStatus('loading');

        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), consent: true }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setErrorCode(data?.error ?? `http_${res.status}`);
                // `reason` (libellé Mailchimp) ou `missing` (variables absentes)
                // : de quoi identifier la panne depuis le navigateur, sans avoir
                // à ouvrir les logs du serveur.
                setErrorReason(data?.reason ?? data?.missing?.join(', ') ?? null);
                setStatus('error');
                return;
            }

            setStatus('success');
        } catch {
            setErrorCode('network_error');
            setErrorReason(null);
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <section className="newsletter-signup">
                <div className="newsletter-signup-inner">
                    <h2 className="newsletter-signup-title">Thanks for subscribing!</h2>
                    <p className="newsletter-signup-text">
                        You&rsquo;re on the list. Our next newsletter will land in your inbox.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="newsletter-signup">
            <div className="newsletter-signup-inner">
                <h2 className="newsletter-signup-title">
                    Journalism That Serves The People&rsquo;s Interest
                </h2>
                <p className="newsletter-signup-text">
                    Sign up for The Fourth Estate&rsquo;s newsletter and get our latest
                    stories delivered straight to your inbox.
                </p>

                <form className="newsletter-signup-form" onSubmit={handleSubmit}>
                    <label htmlFor="newsletter-email" className="sr-only">
                        Email
                    </label>
                    <input
                        id="newsletter-email"
                        name="email"
                        type="email"
                        placeholder="Email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="newsletter-signup-input"
                    />
                    <button
                        type="submit"
                        className="newsletter-signup-button"
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
                    </button>
                </form>

                {status === 'error' && (
                    <p className="newsletter-signup-error">
                        {(errorCode && ERROR_MESSAGES[errorCode]) ??
                            'Something went wrong. Please try again.'}
                        {/* Code technique affiché discrètement : c'est lui qui
                            permet de qualifier une panne en production sans
                            accès aux logs (hébergement cPanel). */}
                        {errorCode && (
                            <span className="newsletter-signup-error-code">
                                {' '}
                                ({errorCode}
                                {errorReason ? ` — ${errorReason}` : ''})
                            </span>
                        )}
                    </p>
                )}
            </div>

            <NewsletterConsentModal
                open={status === 'consent' || status === 'loading'}
                email={email.trim()}
                submitting={status === 'loading'}
                onCancel={() => setStatus('idle')}
                onAccept={handleAccept}
            />
        </section>
    );
}
