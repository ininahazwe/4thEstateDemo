import type { DefaultSession } from "next-auth";
// Cet import est OBLIGATOIRE : sans une référence au module next-auth/jwt,
// le bloc `declare module "next-auth/jwt"` plus bas est interprété comme la
// déclaration d'un nouveau module, et non comme une augmentation de l'existant.
// Résultat sans lui : token.xxx reste typé `unknown` (signature d'index par
// défaut du JWT) → erreurs TS2322 dans le callback session().
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    /**
     * Champs renvoyés par authorize() dans lib/auth.ts, fusionnés dans User.
     * Source de vérité : réponse de POST /wp-json/tfe/v1/authenticate.
     */
    interface User {
        isActive: boolean;
        tier: string | null;
        syncPending: boolean;
    }

    interface Session {
        user: {
            id: string;
            isActive: boolean;
            tier: string | null;
            syncPending: boolean;
        } & DefaultSession["user"];
    }
}

/**
 * Le paramètre `user` du callback jwt() est typé `User | AdapterUser`.
 * Même sans adapter (Credentials/JWT pur), augmenter AdapterUser garantit
 * que l'accès aux champs sur l'union compile.
 */
declare module "next-auth/adapters" {
    interface AdapterUser {
        isActive: boolean;
        tier: string | null;
        syncPending: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        wpUserId: string;
        isActive: boolean;
        tier: string | null;
        syncPending: boolean;
    }
}