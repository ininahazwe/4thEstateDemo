import type { NextAuthConfig } from "next-auth";

/**
 * Config Edge-safe — PAS de Credentials Provider ici.
 *
 * Le Credentials Provider exécute du code Node.js (appel fetch vers le WP
 * membership, mais surtout potentiellement d'autres dépendances lourdes
 * selon comment le projet évolue) et n'est de toute façon jamais nécessaire
 * dans le runtime Edge : le middleware n'a besoin que de LIRE le JWT déjà
 * émis (tier, is_active), jamais de ré-authentifier quelqu'un.
 *
 * Ce fichier reste minimal : seuls les callbacks qui doivent absolument
 * être identiques entre Edge et Node.js vivent ici. lib/auth.ts (Node.js)
 * réutilise cette config et y ajoute le provider.
 */
export const authConfig: NextAuthConfig = {
    secret: process.env.NEXTAUTH_SECRET,
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
                token.wpUserId = user.id;
                token.isActive = user.isActive;
                token.tier = user.tier;
                token.syncPending = user.syncPending;
            }
            return token;
        },

        /**
         * Expose les champs membership sur session.user, pour lecture côté
         * composants (ex: <AdSlot> qui vérifie session.user.isActive).
         */
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.wpUserId as number;
                session.user.isActive = token.isActive as boolean;
                session.user.tier = token.tier as string | null;
                session.user.syncPending = token.syncPending as boolean;
            }
            return session;
        },
    },
};