import type { NextAuthConfig } from "next-auth";

/**
 * Config Edge-safe — PAS de Credentials Provider ici.
 *
 * Le Credentials Provider exécute du code Node.js (appel fetch vers le WP
 * membership) et n'est de toute façon jamais nécessaire dans le runtime
 * Edge : le middleware n'a besoin que de LIRE le JWT déjà émis (tier,
 * is_active), jamais de ré-authentifier quelqu'un.
 *
 * lib/auth.ts (Node.js) réutilise cette config et y ajoute le provider.
 *
 * Pas de `secret:` explicite : Auth.js v5 lit AUTH_SECRET depuis l'env
 * automatiquement, en Edge comme en Node — une seule source de vérité.
 */
export const authConfig: NextAuthConfig = {
    // Nécessaire pour un domaine custom (demo.thefourthestategh.com) sur
    // Vercel : sans ça, Auth.js ne fait pas confiance au header Host reçu
    // et retombe sur son URL par défaut codée en dur (http://localhost:3000)
    // pour construire les redirections/callbacks — d'où le
    // "?error=Configuration" + redirection vers localhost observés.
    trustHost: true,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/connexion",
        error: "/connexion",
    },
    providers: [], // Le(s) provider(s) réel(s) sont ajoutés dans lib/auth.ts
    callbacks: {
        /**
         * Propage les champs membership du provider vers le JWT, une seule
         * fois au login (`user` n'est défini que lors de l'appel initial à
         * authorize()). Les appels suivants ne font que faire transiter le
         * token existant.
         */
        async jwt({ token, user, trigger }) {
            if (user) {
                // user provient d'authorize() qui garantit un id non-null
                // (String(data.id)). Le ?? "" satisfait le type optionnel
                // de User.id sans jamais s'activer en pratique.
                token.wpUserId = user.id ?? "";
                token.isActive = user.isActive;
                token.tier = user.tier;
                token.syncPending = user.syncPending;
            }

            // Rafraîchissement à la demande — déclenché côté client par
            // `useSession().update()`. Sans ce bloc, is_active/tier sont une
            // photo prise au login (ci-dessus) et ne sont plus jamais
            // revérifiés pendant toute la durée de vie du JWT (30 jours par
            // défaut) : un compte activé après l'ouverture de session
            // continue d'afficher "Join the community" jusqu'à ce que
            // l'utilisateur se déconnecte / reconnecte.
            //
            // ⚠️ Suppose un endpoint POST {TFE_MEMBERSHIP_API_URL}/status
            // côté plugin WP membership (user_id → is_active/tier/
            // sync_pending), à créer s'il n'existe pas déjà — ce plugin vit
            // sur membership.thefourthestategh.com, pas dans ce dépôt.
            if (trigger === "update" && token.wpUserId) {
                try {
                    const res = await fetch(
                        `${process.env.TFE_MEMBERSHIP_API_URL}/status`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-TFE-API-Key": process.env.TFE_MEMBERSHIP_API_KEY!,
                            },
                            body: JSON.stringify({ user_id: token.wpUserId }),
                            cache: "no-store",
                        }
                    );

                    if (res.ok) {
                        const data = (await res.json()) as {
                            is_active: boolean;
                            tier: string | null;
                            sync_pending: boolean;
                        };
                        token.isActive = data.is_active;
                        token.tier = data.tier;
                        token.syncPending = data.sync_pending;
                    } else {
                        console.error(`jwt update: /status a renvoyé ${res.status}`);
                    }
                } catch (err) {
                    // Échec réseau : on garde l'ancienne valeur plutôt que de
                    // dégrader un membre actif en cas de panne WP passagère.
                    console.error("jwt update: échec de l'appel /status", err);
                }
            }

            return token;
        },

        /**
         * Expose les champs membership sur session.user, pour lecture côté
         * composants (ex: <AdSlot> qui vérifie session.user.isActive).
         * id reste une string (natif NextAuth) ; WordPress coerce vers int
         * à l'insertion dans tfem_tfe_reading_history.
         */
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.wpUserId;
                session.user.isActive = token.isActive;
                session.user.tier = token.tier;
                session.user.syncPending = token.syncPending;
            }
            return session;
        },
    },
};