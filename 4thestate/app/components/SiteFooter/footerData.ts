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
}

export interface FooterSection {
    boxClass: string;
    title: string;
    links: FooterLink[];
}

export interface MagazineData {
    className: string;
    href: string;
    ithal: string;
    imgSrc: string;
    imgSrcSet: string;
    width: number;
    height: number;
    alt: string;
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
            { label: 'Investigations', href: '/investigations', ithal: 'investigations' },
            { label: 'Newsletter',     href: '/newsletter',     ithal: 'newsletter' },
            { label: 'Podcasts',       href: '/podcasts',       ithal: 'podcasts' },
        ],
    },
    {
        boxClass: 'links-box links-groupe',
        title: 'Our sites',
        links: [
            { label: 'The Fourth Estate', href: 'https://thefourthestategh.com', target: '_blank', rel: 'noopener', ithal: 'site-main' },
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
        { label: 'Contact us',        href: '/contact' },
        { label: 'About us',          href: '/about' },
        { label: 'Terms of use',      href: '/terms' },
        { label: 'Privacy policy',    href: '/privacy' },
        { label: 'Cookie settings',   href: '/cookies', className: 'item cookies' },
    ],
};