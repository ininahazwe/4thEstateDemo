export interface SocialLink {
    href: string;
    title: string;
    icon: string;
}

export interface FooterLink {
    label: string;
    href: string;
    ithal?: string; // Facultatif car les liens légaux n'en ont pas
    target?: string;
    rel?: string;
    className?: string;
}

export interface FooterSection {
    title: string;
    boxClass: string;
    links: FooterLink[];
}

export interface MagazineData {
    className: 'hebdo' | 'hs';
    href: string;
    ithal: string;
    imgSrc: string;
    imgSrcSet: string;
    width: number;
    height: number;
    alt: string;
}

export const socialLinks: SocialLink[] = [
    { href: "https://www.facebook.com/courrierinternational.com", title: "Facebook", icon: "facebook-f" },
    { href: "https://bsky.app/profile/courrierinter.bsky.social", title: "Bluesky", icon: "bluesky" },
    { href: "https://www.youtube.com/@courrierinternational7146", title: "YouTube", icon: "youtube" },
    { href: "https://www.instagram.com/courrierinter", title: "Instagram", icon: "instagram" },
    { href: "https://www.tiktok.com/@courrierinter", title: "TikTok", icon: "tiktok" },
    { href: "https://whatsapp.com/channel/0029VapAap84tRryBTOwm13T", title: "WhatsApp", icon: "whatsapp" },
    { href: "https://www.threads.net/@courrierinter", title: "Threads", icon: "threads" },
    { href: "https://www.linkedin.com/company/courrier-international", title: "LinkedIn", icon: "linkedin-in" },
    { href: "https://www.courrierinternational.com/page/flux-rss", title: "Flux RSS", icon: "rss" },
];

export const sectionsTags: FooterSection = {
    title: "Nos rubriques",
    boxClass: "links-box links-tags",
    links: [
        { label: "La France vue de\u00A0l’étranger", href: "https://www.courrierinternational.com/france", ithal: "france" },
        { label: "Géopolitique", href: "https://www.courrierinternational.com/geopolitique", ithal: "geopolitique" },
        { label: "Économie", href: "https://www.courrierinternational.com/economie", ithal: "economie" },
        { label: "Société", href: "https://www.courrierinternational.com/societe", ithal: "societe" },
        { label: "Politique", href: "https://www.courrierinternational.com/politique", ithal: "politique" },
        { label: "Sciences et environnement", href: "https://www.courrierinternational.com/science-environnement", ithal: "sciences-et-environnement" },
        { label: "Culture", href: "https://www.courrierinternational.com/culture", ithal: "culture" },
        { label: "Courrier Expat", href: "https://www.courrierinternational.com/expat", ithal: "courrier-expat" },
        { label: "Longs formats", href: "https://www.courrierinternational.com/long-format", ithal: "longs-formats" },
        { label: "Explainers", href: "https://www.courrierinternational.com/explainer", ithal: "explainers" },
        { label: "Vidéos", href: "https://www.courrierinternational.com/video", ithal: "videos" },
        { label: "Podcasts", href: "https://www.courrierinternational.com/sujet/podcast", ithal: "podcasts" },
        { label: "Infographies", href: "https://www.courrierinternational.com/infographie", ithal: "infographies" },
        { label: "Horoscope", href: "https://www.courrierinternational.com/horoscope", ithal: "horoscope" },
    ]
};

export const sectionsGroup: FooterSection[] = [
    {
        title: "Nos rendez-vous",
        boxClass: "links-box links-services",
        links: [
            { label: "Réveil Courrier", href: "https://www.courrierinternational.com/reveil", ithal: "reveil" },
            { label: "Courrier Week-end", href: "https://www.courrierinternational.com/weekend", ithal: "weekend" },
            { label: "Courrier Stories", href: "https://www.courrierinternational.com/stories", ithal: "stories" },
            { label: "Newsletters", href: "https://www.courrierinternational.com/page/newsletters", ithal: "newsletters" },
            { label: "Club Courrier", href: "https://courriermedias.courrierinternational.com/club-courrier/", ithal: "club-courrier", target: "_blank", rel: "noopener" },
        ]
    },
    {
        title: "Les sites du groupe",
        boxClass: "links-box links-groupe",
        links: [
            { label: "Le Monde", href: "https://www.lemonde.fr/", ithal: "lemonde", target: "_blank", rel: "noopener" },
            { label: "Télérama", href: "https://www.telerama.fr/", ithal: "telerama", target: "_blank", rel: "noopener" },
            { label: "Le Nouvel Obs", href: "https://www.nouvelobs.com/", ithal: "nouvelobs", target: "_blank", rel: "noopener" },
            { label: "Le Monde diplomatique", href: "https://www.monde-diplomatique.fr/", ithal: "lemondediplo", target: "_blank", rel: "noopener" },
            { label: "La Vie", href: "https://www.lavie.fr/", ithal: "lavie", target: "_blank", rel: "noopener" },
            { label: "Le HuffPost", href: "https://www.huffingtonpost.fr/", ithal: "huffpost", target: "_blank", rel: "noopener" },
            { label: "Fonds pour l’indépendance de\u00A0la\u00A0presse", href: "https://fondsindependancepresse.org/", ithal: "independancepresse", target: "_blank", rel: "noopener" },
        ]
    }
];

export const sectionsLegals: FooterSection = {
    title: "Aide et informations",
    boxClass: "links-box links-legals",
    links: [
        { label: "Qui sommes-nous\u00A0?", href: "https://www.courrierinternational.com/page/qui-sommes-nous" },
        { label: "CGVU", href: "https://www.courrierinternational.com/page/cgvu" },
        { label: "Mentions légales", href: "https://www.courrierinternational.com/page/mentions-legales" },
        { label: "Politique de\u00A0confidentialité", href: "https://www.courrierinternational.com/page/donnees-personnelles" },
        { label: "Paramétrer les cookies", href: "#", className: "gdpr-cs-parameters-link" },
        { label: "Agence Courrier international", href: "https://www.courrierinternational.com/page/agence-courrier" },
        { label: "Nos partenaires", href: "https://www.courrierinternational.com/page/partenaires" },
        { label: "Annonceurs", href: "https://www.courrierinternational.com/page/publicite" },
        { label: "Contact", href: "https://www.courrierinternational.com/page/contact" },
        { label: "Aide\u00A0(FAQ)", href: "https://www.courrierinternational.com/faq" },
        { label: "Boutique", href: "https://boutiquevpc.courrierinternational.com", target: "_blank", rel: "noopener" },
        { label: "Faire un don", href: "https://donorbox.org/courrier-international", target: "_blank", rel: "noopener" },
        { label: "S'abonner/Se désabonner", href: "https://abos.courrierinternational.com" },
    ]
};