export interface BannerTag {
    label: string;
    href: string;
    ithal: string;
    type?: 'type';
    icon?: string;
}

export interface HotArticle {
    id: string | number;
    time: string;
    title: string;
    href: string;
}

export const bannerTags: BannerTag[] = [
    { label: "General News", href: "/general-news", ithal: "general-news" },
    { label: "Anti-Corruption", href: "/anti-corruption", ithal: "anti-corruption" },
    { label: "Environment", href: "/environment", ithal: "environment" },
    { label: "Human Rights", href: "/human-rights", ithal: "human-rights" },
    { label: "Our Impact", href: "/our-impact", ithal: "our-impact" },
    { label: "Opinions", href: "/opinions", ithal: "opinions" },
    { label: "Honours", href: "/honours", ithal: "honours" },

    // Groupes de types / fonctionnalités secondaires (conservés et nettoyés)
    { label: "The Fourth Estate TV", href: "/tv", type: "type", ithal: "fourth-estate-tv", icon: "reveil" },
];