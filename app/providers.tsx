"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Fournit la session Auth.js à tous les composants client (Header, AdSlot…).
 *
 * AUCune session n'est passée en prop : SessionProvider la récupère côté
 * client via /api/auth/session. C'est volontaire — passer une session
 * obtenue par auth() dans le layout forcerait le rendu dynamique sur tout
 * le site et casserait la génération statique des pages article.
 */
export default function Providers({ children }: { children: ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}