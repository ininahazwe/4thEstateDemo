'use client';

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";

// Variants : chaque élément apparaît en fondu + léger décalage vertical.
// viewport={{ once: false }} => l'animation se rejoue à chaque entrée/sortie du viewport.
const container: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
        },
    },
};

const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
    },
};

const bgFade: Variants = {
    hidden: { opacity: 0, scale: 1.04 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.8, ease: "easeOut" },
    },
};

export default function SpecialOfferBanner() {
    return (
        <aside id="ci-banner-offre-spe" data-cookie-container="">
            {/* Responsive optimized background */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                exit="hidden"
                viewport={{ once: false, amount: 0.3 }}
                variants={bgFade}
            >
                <picture>
                    <source
                        media="(-webkit-min-device-pixel-ratio: 2)"
                        srcSet="/assets/img/lines.png"
                    />
                    <img
                        className="bg"
                        width={640}
                        height={200}
                        loading="lazy"
                        src="/assets/img/lines.png"
                        alt=""
                        aria-hidden="true"
                    />
                </picture>
            </motion.div>

            <Link
                className="wrap"
                href="https://membership.thefourthestategh.com/"
                data-ithalc="[cta_abo]"
                data-ithal="home_bandeau_offre_spe"
            >
                <motion.div
                    className="content"
                    initial="hidden"
                    whileInView="visible"
                    exit="hidden"
                    viewport={{ once: false, amount: 0.3 }}
                    variants={container}
                >
                    <motion.div variants={item}>
                        <Image
                            src="/assets/img/logo-white.svg"
                            alt="The Fourth Estate Logo"
                            width={240}
                            height={23}
                        />
                    </motion.div>

                    <motion.p className="price" variants={item}>
                        Make a donation or a monthly contribution
                    </motion.p>

                    <motion.p className="baseline" variants={item}>
                        The Fourth Estate membership exists to support public-interest<br />
                        journalism that improves lives and society and drives positive change
                    </motion.p>

                    <motion.span data-model="button" variants={item}>
                        Become a member
                    </motion.span>
                </motion.div>
            </Link>
        </aside>
    );
}