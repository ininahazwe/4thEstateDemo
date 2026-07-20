'use client';

import TikTokEmbed from './TikTokEmbed';
import YouTubeEmbed from './YouTubeEmbed';
import { type VideoPlatform } from './Tiktokdemodata';

interface VideoEmbedProps {
    url: string;
    platform: VideoPlatform;
}

/**
 * Dispatcher multi-plateforme : rend l'embed natif de la plateforme détectée.
 * Ajouter une plateforme = ajouter un cas ici + son composant dédié
 * (chaque plateforme a son propre script/iframe, pas de lib générique).
 */
export default function VideoEmbed({ url, platform }: VideoEmbedProps) {
    if (platform === 'tiktok') return <TikTokEmbed url={url} />;
    if (platform === 'youtube') return <YouTubeEmbed url={url} />;

    return (
        <a target="_blank" rel="noopener noreferrer" href={url}>
            Voir la vidéo
        </a>
    );
}
