import { PodcastEpisode } from './Types';
import PodcastEpisodeCard from "@/app/components/Podcasts/Podcastepisodecard";

interface PodcastRiverProps {
    episodes: PodcastEpisode[];
}

export default function PodcastRiver({ episodes }: PodcastRiverProps) {
    return (
        <section className="stories-river river">
            {episodes.map((episode, index) => (
                <PodcastEpisodeCard key={episode.id} episode={episode} index={index + 1} />
            ))}
        </section>
    );
}