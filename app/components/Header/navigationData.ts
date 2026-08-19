export interface NavItem {
    label: string;
    href: string;
    type: 'section' | 'type';
    ithal: string;
    icon?: string;
    target: string;
}

export const navItems: NavItem[] = [
    // Vos nouvelles sections personnalisées
    { label: "General News", href: "/category/general-news", type: "section", ithal: "general-news", target: "" },
    { label: "Anti-Corruption", href: "/category/anti-corruption", type: "section", ithal: "anti-corruption", target: "" },
    { label: "Environment", href: "/category/environment", type: "section", ithal: "environment", target: "" },
    { label: "Human Rights", href: "/category/human-rights", type: "section", ithal: "human-rights", target: "" },
    { label: "Our Impact", href: "/category/our-impact", type: "section", ithal: "our-impact", target: "" },
    { label: "Honours", href: "/impact-category/honours", type: "section", ithal: "honours", target: "" },
    { label: "Opinions", href: "/category/opinions", type: "section", ithal: "opinions", target: "" },

    // Groupes de types / fonctionnalités secondaires
    { label: "The Fourth Estate TV", href: "/tv", type: "type", ithal: "fourth-estate-tv", icon: "reveil", target: "" },
    { label: "Podcasts", href: "/podcasts", type: "type", ithal: "fourth-estate-postcasts", icon: "reveil", target: "" },
    { label: "About Us", href: "/about-us", type: "section", ithal: "About us", icon: "reveil", target: "" },
    //{ label: "Fact Check Ghana", href: "https://www.fact-checkghana.com/", type: "section", ithal: "Fact Check Ghana", icon: "reveil", target: "_blank" },
];