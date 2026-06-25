import { TvVideo } from './Types';
import Podcastepisodecard from './Podcastepisodecard';

interface TvGridProps {
    videos: TvVideo[];
}

export default function TvGrid({ videos }: TvGridProps) {
    return (
        <section className="stories-river river">
            {videos.map((video, index) => (
                <Podcastepisodecard key={video.id} video={video} index={index + 1} />
            ))}
        </section>
    );
}