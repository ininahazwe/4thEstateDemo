import { Suspense } from "react";
import SsoHandler from "./sso-handler";

export const metadata = {
    title: "Connexion en cours — The Fourth Estate",
};

export default function SsoPage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "#ffffff",
                fontFamily: "Arial, Helvetica, sans-serif",
                color: "#282828",
            }}
        >
            <Suspense fallback={null}>
                <SsoHandler />
            </Suspense>
        </main>
    );
}