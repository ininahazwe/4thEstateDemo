"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Réception du flux SSO membership → front. Récupère le jeton en query param,
 * le soumet au provider "sso-token" (qui appelle /sso/consume côté serveur),
 * puis redirige vers l'accueil. Le jeton est à usage unique : cette page ne
 * doit s'exécuter qu'une fois (garde useRef contre le double-montage).
 */
export default function SsoHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const fired = useRef(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (fired.current) return;
        fired.current = true;

        if (!token) {
            setFailed(true);
            return;
        }

        signIn("sso-token", { token, redirect: false }).then((res) => {
            if (!res || res.error) {
                // Jeton invalide/expiré : on invite à se connecter manuellement.
                setFailed(true);
                return;
            }
            router.replace("/");
            router.refresh();
        });
    }, [token, router]);

    if (failed) {
        return (
            <div style={{ textAlign: "center", maxWidth: 380 }}>
                <p style={{ marginBottom: 16 }}>
                    Ce lien de connexion a expiré ou n’est plus valide.
                </p>
                <a href="/connexion" style={{ color: "#6D2929", fontWeight: 700 }}>
                    Se connecter
                </a>
            </div>
        );
    }

    return <p>Connexion en cours…</p>;
}