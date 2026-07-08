'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {X} from "lucide-react";

export default function SubscriptionBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const cookieName = 'banner-abo-special-offer-mobile';

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

    if (!isVisible) return null;

    return (
        <aside
            className="banner-abo banner-sticky"
            data-cookie-container=""
            data-name={cookieName}
        >
            <Link
                className="banner-wrap ithalc"
                href="https://abos.courrierinternational.com#xtor-CS4-33-[bandeau-bas-abo]"
                data-ithalc="[cta_abo]"
                data-ithal="footer_bandeau"
            >
                {/* Respect strict du texte d'origine avec les espaces insécables (\u00A0) */}
                Support our journalism now{" "}
                <strong>GHS 50/month</strong>.
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