"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";
import {
    saveArticle,
    unsaveArticle,
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
     * État initial. Pas de vérification serveur à l'affichage (pas de
     * round-trip supplémentaire côté page article/cartes) : le bouton
     * reflète uniquement les actions faites pendant la session en cours
     * (+ l'auto-save au retour de /connexion, voir useEffect ci-dessous).
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

    // Garde anti-double-exécution (effet + éventuel re-render) : on ne
    // consomme l'intention en attente qu'une fois par montage.
    const consumedRef = useRef(false);

    // ── Retour de /connexion : si ce bouton correspond à l'article visé
    //    par une intention de bookmark en attente, on la finalise seul. ──
    useEffect(() => {
        if (status !== "authenticated" || consumedRef.current) return;

        const payload = consumePendingBookmark(articleId);
        if (!payload) return;

        consumedRef.current = true;
        setPending(true);
        saveArticle(payload).then((result) => {
            setPending(false);
            if (result === "ok") setSaved(true);
        });
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
