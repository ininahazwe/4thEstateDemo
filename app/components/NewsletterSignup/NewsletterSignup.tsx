'use client';

import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function NewsletterSignup() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<Status>('idle');

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (status === 'loading') return;

        setStatus('loading');

        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) throw new Error('subscribe_failed');

            setStatus('success');
        } catch {
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <section className="newsletter-signup">
                <div className="newsletter-signup-inner">
                    <h2 className="newsletter-signup-title">Thanks for subscribing!</h2>
                    <p className="newsletter-signup-text">
                        Check your inbox to confirm your subscription.
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
                        Something went wrong. Please try again.
                    </p>
                )}
            </div>
        </section>
    );
}
