import { type IconType } from "react-icons/lib";
import { HeadphonesIcon, PlayCircleIcon, SearchCheck, Megaphone } from "lucide-react";

export interface BannerTag {
    label: string;
    href: string;
    ithal: string;
    type?: 'type';
    iconColor?: string;
    icon?: any; // Ajustement ici (voir note ci-dessous)
}

/**
 * "The Fourth Estate TV" et "Podcasts" ne sont pas des catégories WordPress — entrées fixes,
 * affichées après les tags dynamiques (résolus via getBannerCategories).
 */
// 🛑 Correction ici : Ajout de [] après BannerTag pour indiquer un tableau
export const bannerStaticTags: BannerTag[] = [
    {
        label: "Videos",
        href: "/tv",
        type: "type",
        ithal: "videos",
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
    },
    {
        // 💡 Correction bonus : J'ai nettoyé le label qui semblait avoir un résidu de copier-coller
        label: "Fact-Check Ghana",
        href: "https://www.fact-checkghana.com",
        type: "type",
        iconColor: "red",
        ithal: "fact-check-ghana",
        icon: SearchCheck,
    },
    {
        // 💡 Correction bonus : J'ai nettoyé le label qui semblait avoir un résidu de copier-coller
        label: "Whistleblower",
        href: "/whistleblower",
        type: "type",
        iconColor: "blue",
        ithal: "whistleblower",
        icon: Megaphone,
    }

];