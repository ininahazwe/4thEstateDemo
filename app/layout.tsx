// app/layout.tsx
import type { Metadata } from "next";
import "./styles/base.css";
import "./styles/home.css";
import "./styles/layout.css";
import "./styles/global.css";
import "./styles/component-banner.css";
import "./styles/home-critical.css";
import "./styles/custom.css";
import "./styles/article-critical.css";
import "./styles/swipe.css";
import "./styles/podcast.css";
import "./styles/latest-podcast-widget.css";
import "./styles/article.css";
import "./styles/article-card-theme-lock.css";
import "./styles/share-popup.css";
import "./styles/inline.css";
import "./styles/video.css";
import "./styles/language-switcher.css";
import "./styles/article-layout.css";
import "./styles/section-critical.css";
import "./globals.css";
import Providers from "@/app/providers";

export const metadata: Metadata = {
    title: "The Fourth Estate - Réplication & Investigation",
    description: "Plateforme d'investigation journalistique indépendante.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" data-user-color-scheme="light">
        {/*<head>
            <script
                dangerouslySetInnerHTML={{
                    __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-user-color-scheme', savedTheme);
              })();
            `,
                }}
            />
        </head>*/}
        {/* Vous pouvez ajouter les classes globales ici si nécessaire (ex: ci-phalcon v-web) */}
        <body className="ci-phalcon not-logged special-abo variantB page-home v-web {maPoliceConfiguration.className}">
            <Providers>
                {children}
            </Providers>
        </body>
        </html>
    );
}