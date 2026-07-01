import { Suspense } from "react";
import LoginForm from "./login-form";
import Header from "@/app/components/Header/Header";

export const metadata = {
    title: "Connexion — The Fourth Estate",
};

export default function ConnexionPage() {
    return (
        <>
            <Header />
            <div className="site-content-wrap">
                <div className="dfpcontainer">
                    <div id="dfp-habillage" className="dfp-slot" data-format="habillage" aria-hidden="true"></div>
                </div>
                <div className="dfpcontainer">
                    <div id="banniere_haute" className="dfp-slot" data-format="banniere_haute" aria-hidden="true"></div>
                </div>

                <div className="site-main-wrap">
                    <main className="site-main" id="site-main">
                        <section className="home">
                            <Suspense fallback={null}>
                                <LoginForm />
                            </Suspense>
                        </section>
                    </main>
                </div>
            </div>
        </>
    );
}