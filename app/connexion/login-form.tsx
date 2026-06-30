"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

// ⚠️ À CONFIRMER — routes WordPress membership pour création de compte et
// réinitialisation du mot de passe. Remplace par les vraies URL du site
// membership.thefourthestategh.com (cf. ton plugin tfe-membership).
const WP_REGISTER_URL = "https://membership.thefourthestategh.com/inscription";
const WP_RESET_URL = "https://membership.thefourthestategh.com/mot-de-passe-oublie";

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Le middleware redirige un utilisateur non connecté vers
    // /connexion?callbackUrl=<page demandée>. À défaut : retour à l'accueil.
    const callbackUrl = searchParams.get("callbackUrl") ?? "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            // authorize() renvoie null pour de mauvais identifiants COMME pour
            // une erreur serveur (clé API invalide, WP down). On ne distingue
            // pas les deux côté UI → message générique unique.
            if (!res || res.error) {
                setError("Email ou mot de passe incorrect.");
                setLoading(false);
                return;
            }

            router.push(callbackUrl);
            router.refresh(); // revalide les composants serveur qui lisent la session
        } catch {
            setError("Une erreur est survenue. Réessaie dans un instant.");
            setLoading(false);
        }
    }

    return (
        <div className="card">
            <h1 className="title">Connexion</h1>
            <p className="subtitle">Accède à ton compte The Fourth Estate.</p>

            {error && (
                <div className="error" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <label className="label" htmlFor="email">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={loading}
                />

                <label className="label" htmlFor="password">
                    Mot de passe
                </label>
                <input
                    id="password"
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                />

                <button type="submit" className="button" disabled={loading}>
                    {loading ? "Connexion…" : "Se connecter"}
                </button>
            </form>

            <div className="links">
                <a className="link" href={WP_RESET_URL}>
                    Mot de passe oublié ?
                </a>
                <span className="sep" aria-hidden="true">
                    ·
                </span>
                <a className="link" href={WP_REGISTER_URL}>
                    Créer un compte
                </a>
            </div>

            <style jsx>{`
                .card {
                    width: 100%;
                    max-width: 380px;
                    border: 1px solid #282828;
                    border-radius: 0;
                    padding: 32px;
                    background: #ffffff;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #282828;
                }
                .title {
                    font-family: Georgia, "Times New Roman", serif;
                    font-size: 28px;
                    font-weight: 700;
                    margin: 0 0 8px;
                    color: #282828;
                }
                .subtitle {
                    font-size: 14px;
                    line-height: 1.5;
                    margin: 0 0 24px;
                }
                .error {
                    border: 1px solid #6d2929;
                    border-radius: 0;
                    background: #f7eaea;
                    color: #6d2929;
                    font-size: 14px;
                    padding: 12px;
                    margin-bottom: 20px;
                }
                .label {
                    display: block;
                    font-size: 13px;
                    font-weight: 700;
                    margin-bottom: 6px;
                }
                .input {
                    width: 100%;
                    box-sizing: border-box;
                    border: 1px solid #282828;
                    border-radius: 0;
                    padding: 10px 12px;
                    font-size: 15px;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #282828;
                    background: #ffffff;
                    margin-bottom: 18px;
                    outline: none;
                }
                .input:focus {
                    border-color: #6d2929;
                    box-shadow: 0 0 0 2px rgba(109, 41, 41, 0.15);
                }
                .input:disabled {
                    background: #f2f2f2;
                    cursor: not-allowed;
                }
                .button {
                    width: 100%;
                    border: none;
                    border-radius: 0;
                    background: #6d2929;
                    color: #ffffff;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 15px;
                    font-weight: 700;
                    padding: 12px;
                    cursor: pointer;
                    margin-top: 4px;
                    transition: background 0.15s ease;
                }
                .button:hover:not(:disabled) {
                    background: #571f1f;
                }
                .button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .links {
                    margin-top: 20px;
                    font-size: 13px;
                    text-align: center;
                }
                .link {
                    color: #6d2929;
                    text-decoration: none;
                }
                .link:hover {
                    text-decoration: underline;
                }
                .sep {
                    margin: 0 8px;
                }
            `}</style>
        </div>
    );
}