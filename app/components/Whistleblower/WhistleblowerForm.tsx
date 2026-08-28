'use client';

import { useRef, useState } from 'react';

type FormState = 'idle' | 'sending' | 'sent' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
    missing_subject: 'Please fill in the subject field.',
    invalid_email: 'Please enter a valid email address, or leave the field empty.',
    invalid_file_type: 'Only JPEG, PNG, GIF and WebP images are accepted.',
    file_too_large: 'The file is too large (8 MB maximum).',
    not_configured: 'The form is temporarily unavailable. Please try again later.',
};

/**
 * Formulaire d'appel à témoignage, calqué sur celui de thefourthestategh.com
 * /whistleblower : seul "Subject" est requis (l'anonymat étant le principe,
 * nom et email restent optionnels). Envoi en multipart/form-data vers
 * /api/whistleblower, qui relaie par email à la rédaction.
 */
export default function WhistleblowerForm() {
    const [state, setState] = useState<FormState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (state === 'sending') return;

        setState('sending');
        setErrorMessage(null);

        try {
            const res = await fetch('/api/whistleblower', {
                method: 'POST',
                // Pas de Content-Type manuel : le navigateur doit poser lui-même
                // le boundary du multipart, sinon le serveur ne sait pas parser.
                body: new FormData(event.currentTarget),
            });

            if (res.ok) {
                setState('sent');
                formRef.current?.reset();
                setFileName(null);
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
            <div className="wb-success" role="status">
                <p className="wb-success__title">Thank you — your message has been sent.</p>
                <p className="wb-success__text">
                    Our newsroom will review it. Your identity remains private.
                </p>
                <button
                    type="button"
                    className="wb-submit"
                    onClick={() => setState('idle')}
                >
                    Send another tip
                </button>
            </div>
        );
    }

    const sending = state === 'sending';

    return (
        <form ref={formRef} className="wb-form" onSubmit={handleSubmit} noValidate>
            <p className="wb-info">
                To upload video files, please go to{' '}
                <a href="https://wetransfer.com/" target="_blank" rel="noopener noreferrer">
                    WeTransfer
                </a>{' '}
                or a similar file transfer service of your choice. Once the upload is ready,
                paste the link below.
            </p>

            <label className="wb-field">
                <span className="wb-label">Paste external video link (optional)</span>
                <input
                    className="wb-input"
                    type="url"
                    name="videoLink"
                    placeholder="https://..."
                    disabled={sending}
                />
            </label>

            <label className="wb-field">
                <span className="wb-label">Your name (optional)</span>
                <input className="wb-input" type="text" name="name" disabled={sending} />
            </label>

            <label className="wb-field">
                <span className="wb-label">Your email (optional)</span>
                <input className="wb-input" type="email" name="email" disabled={sending} />
            </label>

            <label className="wb-field">
                <span className="wb-label">
                    <span className="wb-label">Subject</span>
                </span>
                <input className="wb-input" type="text" name="subject" required disabled={sending} />
            </label>

            <label className="wb-field">
                <span className="wb-label">Your message (optional)</span>
                <textarea className="wb-textarea" name="message" rows={7} disabled={sending} />
            </label>

            <label className="wb-field">
                <span className="wb-label">Attach an image (optional)</span>
                <input
                    className="wb-file"
                    type="file"
                    name="attachment"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    disabled={sending}
                    onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? null)}
                />
                <span className="wb-hint">
                    {fileName ?? 'JPEG, PNG, GIF or WebP — 8 MB maximum, 1 file.'}
                </span>
            </label>

            {errorMessage && (
                <p className="wb-error" role="alert">
                    {errorMessage}
                </p>
            )}

            <button type="submit" className="wb-submit" disabled={sending}>
                {sending ? 'Sending…' : 'Submit'}
            </button>
        </form>
    );
}
