import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Lit la session (cookies) et émet un jeton à usage unique : cette route doit
// toujours s'exécuter dynamiquement, jamais être mise en cache.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await auth();

    // Pas de session front → page de connexion.
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/connexion", req.url));
    }

    // Racine du site membership, dérivée de l'URL d'API (pas de variable
    // d'env dédiée) : https://membership.thefourthestategh.com
    const membershipOrigin = new URL(process.env.TFE_MEMBERSHIP_API_URL!).origin;

    try {
        // 1. Demander au WP un jeton SSO à usage unique pour ce membre.
        const res = await fetch(
            `${process.env.TFE_MEMBERSHIP_API_URL}/sso/issue`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-TFE-API-Key": process.env.TFE_MEMBERSHIP_API_KEY!,
                },
                body: JSON.stringify({ user_id: session.user.id }),
                cache: "no-store",
            }
        );

        if (!res.ok) {
            console.error(`SSO to-membership : /sso/issue a renvoyé ${res.status}`);
            // Repli : login manuel côté membership.
            return NextResponse.redirect(`${membershipOrigin}/login/`);
        }

        const data = (await res.json()) as { token: string };

        // 2. Rediriger le navigateur vers la racine du membership avec le
        //    jeton. Le handler WP (init) le consomme, ouvre la session, et
        //    redirige vers /account/.
        return NextResponse.redirect(
            `${membershipOrigin}/?tfe_sso=${encodeURIComponent(data.token)}`
        );
    } catch (err) {
        console.error("SSO to-membership : échec de l'appel /sso/issue", err);
        return NextResponse.redirect(`${membershipOrigin}/login/`);
    }
}