import { MEMBERSHIP_JOIN_URL } from "@/lib/site-links";

/**
 * Bandeau d'adhésion affiché en bas de chaque article, juste après le texte
 * et avant les tags / "You might also like". Même patron visuel que
 * .newsletter-signup (bandeau centré, style "toujours clair"), mais avec un
 * seul CTA — pas de formulaire.
 */
export default function ArticleMembershipCTA() {
    return (
        <section className="article-membership-cta">
            <div className="article-membership-cta-inner">
                <h2 className="article-membership-cta-title">
                    Become a member of The Fourth Estate community
                </h2>
                <p className="article-membership-cta-text">
                    For 5 years, we've investigated matters of public interest and helped hold power to account.
                </p>
                <p className="article-membership-cta-text">
                    Now we're launching our Membership Programme, a community of people who believe independent journalism is worth sustaining, and want to help us do more.
                    Join us as a member, and bring a friend along.
                </p>
                <a
                    className="article-membership-cta-button"
                    href={MEMBERSHIP_JOIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Join the community now
                </a>
            </div>
        </section>
    );
}
