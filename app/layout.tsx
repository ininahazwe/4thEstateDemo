// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Courrier international - Réplication & Investigation",
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
        <body className="ci-phalcon not-logged special-abo variantB page-home v-web">
        {children}
        </body>
        </html>
    );
}