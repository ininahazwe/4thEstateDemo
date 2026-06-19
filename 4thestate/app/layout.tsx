// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import localFont from 'next/font/local';


export const metadata: Metadata = {
    title: "The Fourth Estate - Réplication & Investigation",
    description: "Plateforme d'investigation journalistique indépendante.",
};

// 1. Configuration de la police locale
const maPoliceConfiguration = localFont({
    src: [
        {
            path: './fonts/TheAntiquaB-W5Plain_TRIAL.otf',
            weight: '400',
            style: 'normal',
        },
        {
            path: './fonts/TheAntiquaB-W7Bold_TRIAL.otf',
            weight: '700',
            style: 'normal',
        },
    ],
    // Définir une variable CSS globale pour l'utiliser dans Tailwind ou du CSS classique
    variable: '--font-ma-police',
});
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
        {children}
        </body>
        </html>
    );
}