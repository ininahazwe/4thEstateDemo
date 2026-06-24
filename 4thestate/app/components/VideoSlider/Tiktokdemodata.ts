// ---------------------------------------------------------------------------
// Données de démo — à remplacer plus tard par une vraie source
// (champ ACF sur un post WordPress, ou tout autre mécanisme retenu).
// ---------------------------------------------------------------------------

export interface TikTokDemoItem {
    id: string;
    url: string;
    caption?: string;
    /** Image de fond affichée derrière l'embed pendant son chargement. */
    thumbnail?: string;
    /** Durée affichée façon "1:42", purement visuelle (TikTok gère sa propre durée réelle). */
    duration?: string;
}

export const tiktokDemoItems: TikTokDemoItem[] = [
    {
        id: 'demo-1',
        url: 'https://www.tiktok.com/@thefourthestategh/photo/7529957852090207494',
        caption: 'Caption',
        duration: '1:42',
    },
    {
        id: 'demo-2',
        url: 'https://www.tiktok.com/@thefourthestategh/video/7561842402642775307',
        caption: 'Caption',
        duration: '2:54',
    },
    {
        id: 'demo-3',
        url: 'https://www.tiktok.com/@thefourthestategh/photo/7604879632935963920',
        caption: 'Caption',
        duration: '0:58',
    },
    {
        id: 'demo-4',
        url: 'https://www.tiktok.com/@thefourthestategh/video/7641249274197593360',
        caption: 'Caption',
        duration: '0:58',
    },
    {
        id: 'demo-5',
        url: 'https://www.tiktok.com/@thefourthestategh/video/7446716061648555270',
        caption: 'Caption',
        duration: '0:58',
    },
];