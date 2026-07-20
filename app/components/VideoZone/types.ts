export interface VideoItem {
    /** Clé interne (React key) */
    id: string;
    /** ID YouTube (ce que renverra plus tard playlistItems.list de l'API YouTube) */
    youtubeId: string;
    title: string;
    /** Format "mm:ss", affiché sous le lecteur */
    duration?: string;
}
