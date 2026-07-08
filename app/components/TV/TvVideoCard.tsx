import Image from 'next/image';
import { TvVideo } from './Types';

interface TvVideoCardProps {
    video: TvVideo;
    index: number;
}

export default function TvVideoCard({ video, index }: TvVideoCardProps) {
    return (
        <article
            className="item"
            data-model="story"
            data-type="stories"
            data-index={index}
            data-item-id={video.id}
        >
            <a href={video.href} target="_blank" rel="noopener noreferrer">
                <div className="item-image">
                    <picture>
                        <Image
                            src={video.thumbnail}
                            alt=""
                            width={640}
                            height={360}
                            loading="lazy"
                        />
                    </picture>
                </div>

                <div className="item-text">
                    <div className="heading">
                        <span className="sr-only">The Fourth Estate TV</span>
                        <p id={`title-${video.id}`} className="title">
                            {video.title}
                        </p>
                    </div>

                    <div className="infos">
                        <div className="wrapper">
                          <span className="date" data-icon="calendar-days">
                            {video.publishedAt}
                          </span>
                        </div>
                        <div className="placeholders">
                            <span></span>
                        </div>
                    </div>
                </div>
            </a>
        </article>
    );
}