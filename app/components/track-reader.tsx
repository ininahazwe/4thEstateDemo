"use client";

import { useEffect, useRef } from "react";
import { getSession } from "next-auth/react";
import { trackRead } from "@/lib/track-read";

interface TrackReaderProps {
    articleId: number | string;
    slug: string;
}

/**
 * Composant invisible (rend null) monté SANS condition dans la page article.
 * La page reste statiquement générée : on ne fait AUCun appel serveur lié à
 * la session ici, sinon le SSG basculerait en rendu dynamique.
 *
 * La garde « membre connecté » se fait côté client via getSession(), qui lit
 * la session via /api/auth/session (handlers [...nextauth]) SANS nécessiter
 * de <SessionProvider>. La route interne /api/track-read re-vérifie la
 * session côté serveur — ce filtre client évite simplement un appel voué au
 * 401 pour chaque visiteur anonyme.
 */
export default function TrackReader({ articleId, slug }: TrackReaderProps) {
    const fired = useRef(false);

    useEffect(() => {
        // Garde contre le double-montage de useEffect (StrictMode en dev) et
        // contre tout re-render. fired passe à true de façon synchrone, avant
        // que getSession() (async) ne résolve.
        if (fired.current) return;
        fired.current = true;

        getSession().then((session) => {
            if (session?.user) {
                trackRead(articleId, slug);
            }
        });
    }, [articleId, slug]);

    return null;
}