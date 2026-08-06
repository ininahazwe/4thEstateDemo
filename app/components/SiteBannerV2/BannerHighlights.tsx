import Image from 'next/image';
import { HeadphonesIcon, PlayCircleIcon } from 'lucide-react';
import { getHighlights } from '@/app/services/wpApi.highlight';

/** Icône par défaut quand pas de thumbnail (type podcast/video uniquement — serie/upcoming ont une vraie image). */
function HighlightFallbackIcon({ type }: { type: 'podcast' | 'video' }) {
    const Icon = type === 'podcast' ? HeadphonesIcon : PlayCircleIcon;
    return <Icon size={20} aria-hidden="true" />;
}

export default async function BannerHighlights() {
    const highlights = await getHighlights(4);

    if (!highlights || highlights.length === 0) return null;

    return (
        <div className="banner-hot-articles banner-hot-articles--thumbs">
            <div className="item-list">
                {highlights.map((item) => (
                    <div className="item" key={item.id}>
                        <div className="item-thumb">
                            {item.thumbnail ? (
                                <Image
                                    src={item.thumbnail}
                                    alt=""
                                    width={44}
                                    height={44}
                                />
                            ) : (item.type === 'podcast' || item.type === 'video') ? (
                                <HighlightFallbackIcon type={item.type} />
                            ) : null}
                        </div>

                        <a href={item.href} className="item-title">
                            <div className="item-tag">
                                <span className="time">{item.badge}</span>
                            </div>
                            {item.title}
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}