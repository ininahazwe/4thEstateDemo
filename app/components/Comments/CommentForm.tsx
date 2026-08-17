'use client';

import { useState } from 'react';

interface CommentFormProps {
    postId: number;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Messages d'erreur : techniques côté API, lisibles côté lecteur. */
const ERRORS: Record<string, string> = {
    invalid_name: 'Please enter your name.',
    invalid_email: 'Please enter a valid email address.',
    invalid_content: 'Your comment must be between 5 and 5000 characters.',
    rate_limited: 'You have posted several comments already. Please try again later.',
    unavailable: 'Comments are temporarily unavailable. Please try again later.',
    upstream_unreachable: 'We could not reach the server. Please try again in a moment.',
};

export default function CommentForm({ postId }: CommentFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [content, setContent] = useState('');
    const [website, setWebsite] = useState(''); // honeypot
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setStatus('sending');
        setMessage('');

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, name, email, content, website }),
            });

            const data = (await res.json().catch(() => null)) as
                | { error?: string; message?: string }
                | null;

            if (!res.ok) {
                setStatus('error');
                setMessage(
                    data?.message ||
                        ERRORS[data?.error ?? ''] ||
                        'Your comment could not be posted. Please try again.'
                );
                return;
            }

            // Modération a priori : on ne réinjecte rien dans la liste, on
            // annonce l'attente. Prétendre l'afficher serait mentir au lecteur.
            setStatus('sent');
            setName('');
            setEmail('');
            setContent('');
        } catch {
            setStatus('error');
            setMessage(ERRORS.upstream_unreachable);
        }
    }

    if (status === 'sent') {
        return (
            <div className="comment-form-done" role="status">
                <p>
                    <strong>Thank you.</strong> Your comment has been submitted and will
                    appear once our team has reviewed it.
                </p>
                <button type="button" className="comment-form-again" onClick={() => setStatus('idle')}>
                    Write another comment
                </button>
            </div>
        );
    }

    return (
        <form className="comment-form" onSubmit={handleSubmit} noValidate>
            <p className="comment-form-intro">
                Your email address is required but never published. Comments are reviewed
                before they appear.
            </p>

            <div className="comment-form-row">
                <label className="comment-field">
                    <span>Name</span>
                    <input
                        type="text"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={60}
                        autoComplete="name"
                    />
                </label>

                <label className="comment-field">
                    <span>Email (not published)</span>
                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={100}
                        autoComplete="email"
                    />
                </label>
            </div>

            <label className="comment-field">
                <span>Your comment</span>
                <textarea
                    name="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    minLength={5}
                    maxLength={5000}
                    rows={5}
                />
            </label>

            {/* Honeypot : masqué visuellement ET retiré de l'ordre de
                tabulation et des lecteurs d'écran, pour qu'aucun humain ne
                puisse le remplir par accident. Les bots, eux, remplissent
                tout ce qu'ils trouvent dans le DOM. */}
            <div className="comment-honeypot" aria-hidden="true">
                <label htmlFor="comment-website">Website</label>
                <input
                    id="comment-website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                />
            </div>

            {status === 'error' && (
                <p className="comment-form-error" role="alert">
                    {message}
                </p>
            )}

            <button type="submit" className="comment-form-submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Post comment'}
            </button>
        </form>
    );
}
