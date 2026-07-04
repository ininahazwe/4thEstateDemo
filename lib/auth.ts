import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

/**
 * Réponse de POST /wp-json/tfe/v1/authenticate ET /sso/consume.
 * Les deux endpoints partagent volontairement le même shape.
 */
interface TfeAuthResponse {
    id: number;
    email: string;
    name: string;
    sync_pending: boolean;
    is_active: boolean;
    tier: string | null;
    message?: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        // ── Provider 1 : login classique email + mot de passe ──────────────
        Credentials({
            id: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // --- DIAGNOSTIC TEMPORAIRE (à retirer après debug) -----------
                // N'affiche JAMAIS la clé : seulement sa longueur et si elle
                // contient des espaces/retours ligne parasites.
                const rawKey = process.env.TFE_MEMBERSHIP_API_KEY ?? "";
                console.log("[auth] DIAG clé", {
                    apiUrl: process.env.TFE_MEMBERSHIP_API_URL,
                    keyLength: rawKey.length,                 // doit être 64
                    hasWhitespace: /\s/.test(rawKey),          // doit être false
                    trimmedLength: rawKey.trim().length,       // 64 aussi si propre
                });
                // -------------------------------------------------------------

                const res = await fetch(
                    `${process.env.TFE_MEMBERSHIP_API_URL}/authenticate`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-TFE-API-Key": process.env.TFE_MEMBERSHIP_API_KEY!,
                        },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    }
                );

                // --- DIAGNOSTIC TEMPORAIRE (à retirer après debug) -----------
                console.log("[auth] DIAG réponse WP", { status: res.status });
                // -------------------------------------------------------------

                if (!res.ok) {
                    return null;
                }

                const data: TfeAuthResponse = await res.json();

                return {
                    id: String(data.id),
                    email: data.email,
                    name: data.name,
                    isActive: data.is_active,
                    tier: data.tier,
                    syncPending: data.sync_pending,
                };
            },
        }),

        // ── Provider 2 : SSO par jeton (flux membership → front) ────────────
        // Reçoit un jeton opaque émis par le WP, le fait valider+consommer
        // par /sso/consume, et ouvre la session. Aucun mot de passe : le WP
        // a déjà prouvé l'identité en émettant le jeton.
        Credentials({
            id: "sso-token",
            credentials: {
                token: { label: "SSO Token", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.token) {
                    return null;
                }

                const res = await fetch(
                    `${process.env.TFE_MEMBERSHIP_API_URL}/sso/consume`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-TFE-API-Key": process.env.TFE_MEMBERSHIP_API_KEY!,
                        },
                        body: JSON.stringify({ token: credentials.token }),
                    }
                );

                // Jeton invalide / expiré / déjà utilisé → 401 → null.
                if (!res.ok) {
                    return null;
                }

                const data: TfeAuthResponse = await res.json();

                return {
                    id: String(data.id),
                    email: data.email,
                    name: data.name,
                    isActive: data.is_active,
                    tier: data.tier,
                    syncPending: data.sync_pending,
                };
            },
        }),
    ],
});