import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

/**
 * Réponse de POST /wp-json/tfe/v1/authenticate sur membership.thefourthestategh.com.
 * Voir class-tfe-rest-auth.php côté WordPress pour la source de vérité de ce shape.
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
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const res = await fetch(
                    `${process.env.TFE_MEMBERSHIP_API_URL}/wp-json/tfe/v1/authenticate`,
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

                // 401 = mauvais identifiants, tout autre code d'erreur = problème
                // serveur (clé API invalide, WP membership down, etc.) — dans les
                // deux cas, authorize() doit retourner null pour qu'Auth.js
                // affiche une erreur générique de connexion, jamais throw ici
                // (Auth.js gère mal les exceptions non interceptées dans authorize).
                if (!res.ok) {
                    return null;
                }

                const data: TfeAuthResponse = await res.json();

                // Le shape retourné ici devient le `user` reçu par le callback
                // jwt() dans auth.config.ts — d'où les noms de champs choisis
                // (isActive, tier, syncPending) qui matchent ce qui est lu là-bas.
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