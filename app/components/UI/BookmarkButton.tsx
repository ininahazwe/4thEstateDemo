"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
    const [showError, setShowError] = useState(false);

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
                // Le token membership utilisé pour finaliser l'intention en
                // attente a expiré entre-temps — même traitement que dans
                // handleClick (voir le commentaire là-bas).
                else if (result === "unauthenticated") signOut({ redirect: false });
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

        setShowError(false);
        setPending(true);
        const result = saved ? await unsaveArticle(articleId) : await saveArticle(buildPayload());
        setPending(false);

        if (result === "ok") {
            setSaved(!saved);
        } else if (result === "unauthenticated") {
            // Le JWT NextAuth local est valide (status === "authenticated"
            // plus haut) mais WP a renvoyé 401/403 : le compte/token
            // membership, lui, a expiré ou a été révoqué (session WP côté
            // serveur, mot de passe changé, compte désactivé…). Sans ce
            // signOut, le cookie NextAuth reste valide jusqu'à son maxAge —
            // le header continue d'afficher "connecté" indéfiniment alors
            // que plus aucune action membership ne fonctionne.
            signOut({ redirect: false });
            setShowAuthModal(true);
        } else {
            // "error" : échec réseau/upstream (mauvaise TFE_MEMBERSHIP_API_URL/KEY,
            // WP injoignable, etc.). Pas bloquant pour la lecture, mais visible
            // — sinon impossible à distinguer d'un simple clic ignoré.
            console.error(
                `[bookmark] ${saved ? "unsave" : "save"} failed for article ${articleId} — check TFE_MEMBERSHIP_API_URL/TFE_MEMBERSHIP_API_KEY and the WP response.`
            );
            setShowError(true);
        }
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
                className={`favorites${className ? ` ${className}` : ""}`}
                data-in-favorites={saved}
                aria-pressed={saved}
                disabled={pending}
                data-model="button"
                title={showError ? "Something went wrong. Please try again." : label}
                onClick={handleClick}
            >
                <Bookmark size={18} strokeWidth={2} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
                <span className={showLabel ? "action" : "action sr-only"}>{label}</span>
            </button>

            {showError && (
                <span role="status" style={{ fontSize: 11, color: "#c0392b", marginLeft: 4 }}>
                    Couldn&apos;t save. Try again.
                </span>
            )}

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
