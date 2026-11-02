'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {X} from "lucide-react";
import { useSession } from "next-auth/react";
import { MEMBERSHIP_JOIN_URL } from "@/lib/site-links";
import {
    POPUP_DISMISSED_EVENT,
    isPopupDismissed,
    isPopupSeason,
} from "@/lib/membership-prompt";

export default function SubscriptionBanner() {
    const { status } = useSession();
    const [isVisible, setIsVisible] = useState(false);
    const cookieName = 'banner-abo-special-offer-mobile';
    // Une seule surface membership à la fois : pendant la saison de la popup,
    // la barre attend que la popup ait été vue/fermée. Elle se masque aussi
    // tant que le héros storytelling (.am-hero-media) est à l'écran.
    const [popupDone, setPopupDone] = useState(false);
    const [heroInView, setHeroInView] = useState(false);

    useEffect(() => {
        const update = () => setPopupDone(!isPopupSeason() || isPopupDismissed());
        update();
        window.addEventListener(POPUP_DISMISSED_EVENT, update);
        return () => window.removeEventListener(POPUP_DISMISSED_EVENT, update);
    }, []);

    useEffect(() => {
        const hero = document.querySelector('.am-hero-media');
        if (!hero || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), { threshold: 0.2 });
        io.observe(hero);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        // Vérification du cookie au montage du composant (côté client uniquement)
        const hasCookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${cookieName}=`));

        if (!hasCookie) {
            setIsVisible(true);
        }
    }, []);

    const handleClose = () => {
        setIsVisible(false);

        // Création du cookie pour une durée de 1 jour (data-cookie-expiration="1")
        const date = new Date();
        date.setTime(date.getTime() + 1 * 24 * 60 * 60 * 1000);
        document.cookie = `${cookieName}=true; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
    };

    // Masqué pendant la résolution de la session (évite un flash) et pour
    // tout user authentifié — banniere d'abonnement réservée aux visiteurs.
    if (status !== "unauthenticated") return null;
    if (!isVisible || !popupDone || heroInView) return null;

    return (
        <aside
            className="banner-abo banner-sticky"
            data-cookie-container=""
            data-name={cookieName}
        >
            <Link
                className="banner-wrap ithalc"
                href={MEMBERSHIP_JOIN_URL}
                data-ithalc="[cta_abo]"
                data-ithal="footer_bandeau"
            >
                {/* Respect strict du texte d'origine avec les espaces insécables (\u00A0) */}
                Support our journalism. Become a member{/*now{" "}*/}
                {/*<strong>GHS50/month</strong>.*/}
            </Link>

            <button
                type="button"
                className="banner-close ithalc"
                title="Close subscription banner"
                data-cookie-name={cookieName}
                data-cookie-expiration="1"
                data-ithalc="[cta_bloc]"
                data-ithal="footer_bandeau_close"
                onClick={handleClose}
            >
                <X size={18} strokeWidth={2} aria-hidden="true" />
                <span className="sr-only">Close subscription banner</span>
            </button>
        </aside>
    );
}