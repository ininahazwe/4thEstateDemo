import { TvVideo } from './Types';
import TvVideoCard from './TvVideoCard';

interface TvGridProps {
    videos: TvVideo[];
}

export default function TvGrid({ videos }: TvGridProps) {
    return (
        <section className="stories-river river">
            {videos.map((video, index) => (
                <TvVideoCard key={video.id} video={video} index={index + 1} />
            ))}
        </section>
    );
}