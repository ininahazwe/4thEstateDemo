// ---------------------------------------------------------------------------
// Footer — données statiques
// ---------------------------------------------------------------------------
// Note : la colonne "Topics" (anciennement "Nos rubriques") n'est plus ici —
// elle est désormais alimentée dynamiquement par getTopCategories() dans
// app/services/wpApi.ts (catégories triées par nombre d'articles publiés).

export interface SocialLink {
    icon: string;
    href: string;
    title: string;
}

export interface FooterLink {
    label: string;
    href: string;
    ithal?: string;
    target?: string;
    rel?: string;
    className?: string;
    /**
     * Entree qui declenche une action au lieu de naviguer.
     *
     * `'cookie-settings'` : rend un bouton qui reouvre le bandeau de
     * consentement (CookieSettingsButton) au lieu d'un <a>. `href` est alors
     * ignore — il reste renseigne pour rester compatible avec un eventuel
     * rendu degrade, mais aucune page n'est visitee.
     */
    action?: 'cookie-settings';
}

export interface FooterSection {
    boxClass: string;
    title: string;
    links: FooterLink[];
}

// -----------------------------------------------------------------------
// Réseaux sociaux
// -----------------------------------------------------------------------

export const socialLinks: SocialLink[] = [
    { icon: 'facebook',  href: 'https://www.facebook.com/thefourthestategh',  title: 'Follow us on Facebook' },
    { icon: 'twitter',   href: 'https://twitter.com/thefourthestategh',       title: 'Follow us on X' },
    { icon: 'instagram', href: 'https://www.instagram.com/thefourthestategh', title: 'Follow us on Instagram' },
    { icon: 'linkedin',  href: 'https://www.linkedin.com/company/thefourthestategh', title: 'Follow us on LinkedIn' },
    { icon: 'youtube',   href: 'https://www.youtube.com/@thefourthestategh',  title: 'Follow us on YouTube' },
    { icon: 'rss',       href: '/feed',                                       title: 'RSS feed' },
];

// -----------------------------------------------------------------------
// Colonne "Group" (Rendez-vous + Sites)
// -----------------------------------------------------------------------

export const sectionsGroup: FooterSection[] = [
    {
        boxClass: 'links-box links-services',
        title: 'Highlights',
        links: [
            { label: 'Podcasts', href: '/podcasts', ithal: 'podcasts' },
            { label: 'Archives', href: '/archives', rel: 'noopener', ithal: 'archives' },
        ],
    },
    {
        boxClass: 'links-box links-groupe',
        title: 'Our sites',
        links: [
            { label: 'MFWA', href: 'https://mfwa.org', target: '_blank', rel: 'noopener', ithal: 'site-main' },
            { label: 'Fact-Check Ghana', href: 'https://www.fact-checkghana.com', target: '_blank', rel: 'noopener', ithal: 'Fact-Check Ghana' },
        ],
    },
];

// -----------------------------------------------------------------------
// Colonne "Help & legal"
// -----------------------------------------------------------------------

export const sectionsLegals: FooterSection = {
    boxClass: 'links-box links-legals',
    title: 'Help & legal',
    links: [
        { label: 'Contact us',        href: '/contact-us' },
        { label: 'About us',          href: '/about-us' },
        /*{ label: 'Terms of use',      href: '/terms' },*/
        { label: 'Privacy policy',    href: '/privacy' },
        // Ne pointe plus vers /cookies (route inexistante = 404) : rouvre le
        // bandeau de consentement. Voir CookieSettingsButton.
        { label: 'Cookie settings',   href: '/privacy', className: 'item cookies', action: 'cookie-settings' },
    ],
};