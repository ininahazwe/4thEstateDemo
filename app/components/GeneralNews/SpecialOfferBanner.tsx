'use client';

import Link from "next/link";
import Image from "next/image";
import { FaUnlockKeyhole } from "react-icons/fa6";

export default function SpecialOfferBanner() {
    return (
        <aside id="ci-banner-offre-spe" data-cookie-container="">
            {/* Responsive optimized background */}
            <picture>
                <source
                    media="(-webkit-min-device-pixel-ratio: 2)"
                    srcSet="https://focus.courrierinternational.com/1280x0/2026/06/19/072f2ff_upload-1-zabs3gbykwyv-fond-banner.png"
                />
                <img
                    className="bg"
                    width={640}
                    height={200}
                    loading="lazy"
                    src="https://focus.courrierinternational.com/640x0/2026/06/19/072f2ff_upload-1-zabs3gbykwyv-fond-banner.png"
                    alt=""
                    aria-hidden="true"
                />
            </picture>

            <Link
                className="wrap"
                href="https://4thestatedemo.vercel.app/"
                data-ithalc="[cta_abo]"
                data-ithal="home_bandeau_offre_spe"
            >
                <div className="content">
                    {/* Next.js Image component for the vector logo */}
                    <Image
                        src="/assets/img/logo.svg"
                        alt="The Fourth Estate Logo"
                        width={120}
                        height={23}
                    />

                    {/* Free text translated: "Offres spéciales" -> "Special Offers" */}
                    <span className="tag" data-model="tag">
                        <FaUnlockKeyhole className="tag-icon" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                        Special Offers
                    </span>

                    {/* Free text translated: "3,99 €/mois" -> "€3.99/month" (or £3.99 / $3.99 depending on your target currency) */}
                    <p className="price">GHS 50/month</p>

                    {/* Free text translated baseline */}
                    <p className="baseline">
                        Dive into our summer series,<br />
                        long-form features, reports, and investigations
                    </p>

                    {/* Free text translated: "J'en profite" -> "Get started" or "Subscribe now" */}
                    <span data-model="button">Subscribe now</span>
                </div>

                {/* SVG vector subscription icon
                <svg className="picto-abo" width={170} height={170} viewBox="0 0 173 173">
                    <use
                        xlinkHref="/bucket/assets/4d38e18f8d07ca4ff87527104179a963411be5a6/img/icons/abo/29-fixed.svg#picto"
                        href="/bucket/assets/4d38e18f8d07ca4ff87527104179a963411be5a6/img/icons/abo/29-fixed.svg#picto"
                    />
                </svg>*/}
            </Link>
        </aside>
    );
}