import { type IconType } from "react-icons/lib";
import { FaRegCirclePlay } from "react-icons/fa6";

export interface BannerTag {
    label: string;
    href: string;
    ithal: string;
    type?: 'type';
    icon?: IconType;
}

export interface HotArticle {
    id: string | number;
    time: string;
    title: string;
    href: string;
}

/**
 * "The Fourth Estate TV" n'est pas une catégorie WordPress — entrée fixe,
 * affichée après les tags dynamiques (résolus via getBannerCategories).
 */
export const bannerStaticTag: BannerTag = {
    label: "The Fourth Estate TV",
    href: "/tv",
    type: "type",
    ithal: "fourth-estate-tv",
    icon: FaRegCirclePlay,
};