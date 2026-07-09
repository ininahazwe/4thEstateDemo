import { VideoItem } from './types';

// Liste saisie manuellement en attendant le branchement sur l'API YouTube
// (playlistItems.list) d'une playlist dédiée. Le shape (youtubeId/title/
// duration) est volontairement calqué sur ce que renverra l'API, pour
// limiter les changements le jour du branchement — remplacer ce tableau
// par le mapping de la réponse API suffira.
//
// IDs de démonstration (vidéos libres de droit, Blender Foundation / CC) —
// à remplacer par les vraies vidéos The Fourth Estate.
export const videoItems: VideoItem[] = [
    {
        id: 'v1',
        youtubeId: 'gKOrmgUF6xA',
        title: 'Decayed and neglected: Accra\'s damage roundabouts',
        duration: '09:28',
    },
    {
        id: 'v2',
        youtubeId: '2LVKm-bylqs',
        title: 'Parliament of Ghana in the Dark: Why Are the Streetlights Not Working?',
        duration: '01:20',
    },
    {
        id: 'v3',
        youtubeId: 'x5peGL5hueA',
        title: 'The Fourth Estate Impact: Circle Dubai Streetlights Restored',
        duration: '02:47',
    },
    {
        id: 'v4',
        youtubeId: 'ee2sZTQ9vmQ',
        title: 'Ghana Parliament passes Anti-LGBTQ+ bill',
        duration: '02:28',
    },
    {
        id: 'v5',
        youtubeId: 'PfXpO0itRmU',
        title: 'Accra in Darkness: Who is responsible ?',
        duration: '13:32',
    },
    {
        id: 'v6',
        youtubeId: '_7Xef4XWJQs',
        title: 'Medical Kalabule Report: Committee contradicts Ridge hospital Medical Director',
        duration: '02:19',
    },
];
