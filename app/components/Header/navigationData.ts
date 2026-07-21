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
    { label: "General News", href: "/general-news", type: "section", ithal: "general-news", target: ""},
    { label: "Anti-Corruption", href: "/anti-corruption", type: "section", ithal: "anti-corruption", target: ""},
    { label: "Environment", href: "/environment", type: "section", ithal: "environment", target: ""},
    { label: "Human Rights", href: "/human-rights", type: "section", ithal: "human-rights", target: ""},
    { label: "Our Impact", href: "/our-impact", type: "section", ithal: "our-impact", target: ""},
    { label: "Honours", href: "/honours", type: "section", ithal: "honours", target: ""},
    { label: "Opinions", href: "/opinions", type: "section", ithal: "opinions", target: ""},

    // Groupes de types / fonctionnalités secondaires (conservés et nettoyés)
    { label: "The Fourth Estate TV", href: "/tv", type: "type", ithal: "fourth-estate-tv", icon: "reveil", target: ""},
    { label: "Podcasts", href: "/podcasts", type: "type", ithal: "fourth-estate-postcasts", icon: "reveil", target: ""},
    { label: "MFWA", href: "https://mfwa.org", type: "type", ithal: "mfwa", target: '_blank'},
   /* { label: "Application Mobile", href: "/telecharger-application", type: "type", ithal: "application", icon: "mobile-screen-button" },
    { label: "Nos Sources", href: "/sources", type: "type", ithal: "nos-sources", icon: "earth-americas" }*/
];