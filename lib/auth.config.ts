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
        async jwt({ token, user }) {
            if (user) {
                // user provient d'authorize() qui garantit un id non-null
                // (String(data.id)). Le ?? "" satisfait le type optionnel
                // de User.id sans jamais s'activer en pratique.
                token.wpUserId = user.id ?? "";
                token.isActive = user.isActive;
                token.tier = user.tier;
                token.syncPending = user.syncPending;
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