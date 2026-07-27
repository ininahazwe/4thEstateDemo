"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";
import {
    saveArticle,
    unsaveArticle,
    checkIsSaved,
    setPendingBookmark,
    consumePendingBookmark,
    type SaveArticlePayload,
} from "@/lib/bookmark";
import AuthRequiredModal from "@/app/components/UI/AuthRequiredModal";

interface BookmarkButtonProps {
    articleId: number | string;
    slug: string;
    title: string;
    link: string;
    imageUrl?: string;
    category?: string;
    /**
     * État initial optimiste, en attendant la vérification serveur (évite
     * un état "vide" garanti pendant le check ci-dessous). Laisser à false
     * si l'appelant ne sait pas déjà — le useEffect corrige au besoin.
     */
    initialSaved?: boolean;
    showLabel?: boolean;
    className?: string;
}

export default function BookmarkButton({
    articleId,
    slug,
    title,
    link,
    imageUrl,
    category,
    initialSaved = false,
    showLabel = false,
    className,
}: BookmarkButtonProps) {
    const { status } = useSession();
    const router = useRouter();

    const [saved, setSaved] = useState(initialSaved);
    const [pending, setPending] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Garde anti-double-exécution (StrictMode / re-render) : le montage
    // ne doit résoudre l'état qu'une seule fois.
    const resolvedRef = useRef(false);

    // ── Résolution de l'état réel au montage, dans l'ordre suivant :
    //    1. Intention de bookmark en attente (retour de /connexion) pour
    //       CET article → on la finalise (save) et on s'arrête là, le
    //       check is-saved serait redondant et risquerait de course
    //       contre le save en cours.
    //    2. Sinon, si connecté, on demande à WP l'état réel — corrige
    //       l'optimisme de initialSaved (ou le false par défaut).
    // ------------------------------------------------------------------
    useEffect(() => {
        if (status === "loading" || resolvedRef.current) return;
        resolvedRef.current = true;

        if (status !== "authenticated") return;

        const pendingPayload = consumePendingBookmark(articleId);
        if (pendingPayload) {
            setPending(true);
            saveArticle(pendingPayload).then((result) => {
                setPending(false);
                if (result === "ok") setSaved(true);
            });
            return;
        }

        checkIsSaved(articleId).then(setSaved);
    }, [status, articleId]);

    function buildPayload(): SaveArticlePayload {
        return { articleId, slug, title, link, imageUrl, category };
    }

    async function handleClick() {
        if (pending) return;

        // Pas de session côté client → on ouvre directement la modal,
        // inutile de solliciter l'API pour se faire répondre 401.
        if (status !== "authenticated") {
            setShowAuthModal(true);
            return;
        }

        setPending(true);
        const result = saved ? await unsaveArticle(articleId) : await saveArticle(buildPayload());
        setPending(false);

        if (result === "ok") {
            setSaved(!saved);
        } else if (result === "unauthenticated") {
            // Session expirée entre le chargement de la page et le clic.
            setShowAuthModal(true);
        }
        // "error" : échec réseau/upstream, on laisse l'état inchangé —
        // pas de blocage de la lecture (cohérent avec trackRead, best-effort).
    }

    function handleLoginClick() {
        setPendingBookmark(buildPayload());
        const callbackUrl = window.location.pathname + window.location.search;
        setShowAuthModal(false);
        router.push(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    const label = saved ? "Remove from saved articles" : "Save article";

    return (
        <>
            <button
                type="button"
                className={`bookmark${className ? ` ${className}` : ""}`}
                data-in-favorites={saved}
                aria-pressed={saved}
                disabled={pending}
                title={label}
                onClick={handleClick}
            >
                <Bookmark size={18} strokeWidth={2} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
                <span className={showLabel ? "action" : "action sr-only"}>{label}</span>
            </button>

            <AuthRequiredModal
                open={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onLoginClick={handleLoginClick}
                title="Save this for later?"
                description="This feature is reserved for our members."
            />
        </>
    );
}
