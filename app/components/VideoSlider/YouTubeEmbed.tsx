'use client';

import { extractYouTubeId } from './Tiktokdemodata';

interface YouTubeEmbedProps {
    url: string;
}

export default function YouTubeEmbed({ url }: YouTubeEmbedProps) {
    const videoId = extractYouTubeId(url);

    if (!videoId) {
        return (
            <a target="_blank" rel="noopener noreferrer" href={url}>
                Voir sur YouTube
            </a>
        );
    }

    return (
        <iframe
            className="youtube-embed-wrapper"
            width="325"
            height="580"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        />
    );
}
