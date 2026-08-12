'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

type FormState = 'idle' | 'sending' | 'sent' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
    missing_fields: 'Please fill in your name, email and subject.',
    invalid_email: 'Please enter a valid email address.',
    missing_consent: 'Please accept the privacy policy before sending.',
    too_long: 'Your message is too long. Please shorten it and try again.',
    not_configured: 'The form is temporarily unavailable. Please try again later.',
};

/**
 * Formulaire de la page /contact-us. Envoi en JSON vers /api/contact, qui
 * relaie par email à la rédaction.
 *
 * Champs repris du formulaire WordPress actuel : name, email et subject
 * requis, message optionnel. Le sujet sert de titre au mail reçu par la
 * rédaction, ce qui lui permet de trier.
 */
export default function ContactForm() {
    const [state, setState] = useState<FormState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (state === 'sending') return;

        const formData = new FormData(event.currentTarget);

        setState('sending');
        setErrorMessage(null);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    subject: formData.get('subject'),
                    message: formData.get('message'),
                    consent: formData.get('consent') === 'on',
                    website: formData.get('website'),
                }),
            });

            if (res.ok) {
                setState('sent');
                formRef.current?.reset();
                return;
            }

            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setErrorMessage(
                (data?.error && ERROR_MESSAGES[data.error]) ||
                'Something went wrong. Please try again.'
            );
            setState('error');
        } catch {
            setErrorMessage('Network error. Please check your connection and try again.');
            setState('error');
        }
    }

    if (state === 'sent') {
        return (
            <div className="contact-success" role="status">
                <p className="contact-success__title">Thank you — your message has been sent.</p>
                <p className="contact-success__text">
                    Our newsroom will get back to you at the email address you provided.
                </p>
                <button
                    type="button"
                    className="contact-submit"
                    onClick={() => setState('idle')}
                >
                    Send another message
                </button>
            </div>
        );
    }

    const sending = state === 'sending';

    return (
        <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
            <label className="contact-field">
                <span className="contact-label">Name</span>
                <input
                    className="contact-input"
                    type="text"
                    name="name"
                    placeholder="Your name"
                    autoComplete="name"
                    required
                    disabled={sending}
                />
            </label>

            <label className="contact-field">
                <span className="contact-label">Email</span>
                <input
                    className="contact-input"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    disabled={sending}
                />
            </label>

            <label className="contact-field">
                <span className="contact-label">Subject</span>
                <input
                    className="contact-input"
                    type="text"
                    name="subject"
                    placeholder="What is this about?"
                    required
                    disabled={sending}
                />
            </label>

            <label className="contact-field">
                <span className="contact-label">Message</span>
                <textarea
                    className="contact-textarea"
                    name="message"
                    rows={5}
                    placeholder="Enter your message"
                    disabled={sending}
                />
            </label>

            {/*
              Honeypot : masqué en CSS, retiré du parcours clavier et ignoré des
              lecteurs d'écran. Invisible pour un visiteur, rempli par un robot
              qui remplit tous les champs — le serveur écarte alors l'envoi.
              tabIndex={-1} et aria-hidden évitent qu'un utilisateur au clavier
              ou en synthèse vocale tombe dessus par accident.
            */}
            <div className="contact-hp" aria-hidden="true">
                <label htmlFor="contact-website">Leave this field empty</label>
                <input
                    id="contact-website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                />
            </div>

            <label className="contact-consent">
                <input type="checkbox" name="consent" required disabled={sending} />
                <span>
                    I agree with the{' '}
                    <Link href="/privacy">Privacy Policy</Link>
                </span>
            </label>

            {errorMessage && (
                <p className="contact-error" role="alert">
                    {errorMessage}
                </p>
            )}

            <button type="submit" className="contact-submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send Your Request'}
            </button>
        </form>
    );
}
