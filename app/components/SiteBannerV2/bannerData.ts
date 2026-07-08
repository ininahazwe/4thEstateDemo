import { type IconType } from "react-icons/lib";
import { HeadphonesIcon, PlayCircleIcon } from "lucide-react";

export interface BannerTag {
    label: string;
    href: string;
    ithal: string;
    type?: 'type';
    iconColor?: string;
    icon?: any; // Ajustement ici (voir note ci-dessous)
}

export interface HotArticle {
    id: string | number;
    time: string;
    title: string;
    href: string;
}

/**
 * "The Fourth Estate TV" et "Podcasts" ne sont pas des catégories WordPress — entrées fixes,
 * affichées après les tags dynamiques (résolus via getBannerCategories).
 */
// 🛑 Correction ici : Ajout de [] après BannerTag pour indiquer un tableau
export const bannerStaticTags: BannerTag[] = [
    {
        label: "The Fourth Estate TV",
        href: "/tv",
        type: "type",
        ithal: "fourth-estate-tv",
        iconColor: "#cd6133",
        icon: PlayCircleIcon,
    },
    {
        // 💡 Correction bonus : J'ai nettoyé le label qui semblait avoir un résidu de copier-coller
        label: "Podcasts",
        href: "/podcasts",
        type: "type",
        iconColor: "#ffb142",
        ithal: "fourth-estate-podcasts",
        icon: HeadphonesIcon,
    }
];