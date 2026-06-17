export interface NavItem {
    label: string;
    href: string;
    type: 'section' | 'type';
    ithal: string;
    icon?: string;
}

export const navItems: NavItem[] = [
    // Vos nouvelles sections personnalisées
    { label: "General News", href: "/general-news", type: "section", ithal: "general-news" },
    { label: "Anti-Corruption", href: "/anti-corruption", type: "section", ithal: "anti-corruption" },
    { label: "Environment", href: "/environment", type: "section", ithal: "environment" },
    { label: "Human Rights", href: "/human-rights", type: "section", ithal: "human-rights" },
    { label: "Our Impact", href: "/our-impact", type: "section", ithal: "our-impact" },
    { label: "Honours", href: "/honours", type: "section", ithal: "honours" },
    { label: "Opinions", href: "/opinions", type: "section", ithal: "opinions" },

    // Groupes de types / fonctionnalités secondaires (conservés et nettoyés)
    { label: "The Fourth Estate TV", href: "/tv", type: "type", ithal: "fourth-estate-tv", icon: "reveil" },
    { label: "Application Mobile", href: "/telecharger-application", type: "type", ithal: "application", icon: "mobile-screen-button" },
    { label: "Nos Sources", href: "/sources", type: "type", ithal: "nos-sources", icon: "earth-americas" }
];