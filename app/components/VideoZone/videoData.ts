import { VideoItem } from './types';

// DEPRECATED — plus utilisé. VideoZone.tsx fetch désormais la playlist
// YouTube dédiée via wpApi.videoZone.ts (getVideoZoneItems). Fichier
// conservé pour référence, non importé nulle part.
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
