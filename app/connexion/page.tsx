import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = {
    title: "Connexion — The Fourth Estate",
};

export default function ConnexionPage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "#ffffff",
            }}
        >
            {/* useSearchParams() dans LoginForm impose ce Suspense en Next 15. */}
            <Suspense fallback={null}>
                <LoginForm />
            </Suspense>
        </main>
    );
}