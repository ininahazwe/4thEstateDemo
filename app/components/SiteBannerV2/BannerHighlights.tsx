import Image from 'next/image';
import Link from 'next/link';
import { HeadphonesIcon, PlayCircleIcon, CalendarClockIcon } from 'lucide-react';
import { getHighlights, type HighlightItem } from '@/app/services/wpApi.highlight';

/** Icône par défaut quand pas de thumbnail (podcast/video/upcoming — serie a toujours une vraie image). */
function HighlightFallbackIcon({ type }: { type: 'podcast' | 'video' | 'upcoming' }) {
    const Icon = type === 'podcast' ? HeadphonesIcon : type === 'video' ? PlayCircleIcon : CalendarClockIcon;
    return <Icon size={20} aria-hidden="true" />;
}

/** Une destination absolue http(s) sort du site ; tout le reste est interne. */
function isExternal(href: string): boolean {
    return /^https?:\/\//i.test(href);
}

/**
 * Contenu de la vignette, indépendant du fait qu'elle soit cliquable ou non.
 * Extrait pour éviter de le dupliquer dans les trois branches ci-dessous.
 */
function HighlightBody({ item }: { item: HighlightItem }) {
    return (
        <>
            <div className="item-tag">
                <span className="time">{item.badge}</span>
            </div>
            {item.title}
        </>
    );
}

/**
 * Enveloppe la vignette selon sa destination :
 *   - interne  -> <Link>, navigation client, même onglet, suivi par Google ;
 *   - externe  -> <a target="_blank"> avec rel de sécurité ;
 *   - aucune   -> <span>, pas de lien mort.
 *
 * L'ancienne version posait target="_blank" et rel="nofollow" sur TOUS les
 * liens, y compris /tag/{slug} qui est une page du site : ouvrir un onglet
 * pour une navigation interne surprend le lecteur, et le nofollow demandait
 * à Google de ne pas suivre notre propre maillage.
 */
function HighlightLink({ item }: { item: HighlightItem }) {
    if (!item.href) {
        return (
            <span className="item-title">
                <HighlightBody item={item} />
            </span>
        );
    }

    if (isExternal(item.href)) {
        return (
            <a
                href={item.href}
                className="item-title"
                target="_blank"
                rel="noopener noreferrer"
            >
                <HighlightBody item={item} />
            </a>
        );
    }

    return (
        <Link href={item.href} className="item-title">
            <HighlightBody item={item} />
        </Link>
    );
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
                            ) : (item.type === 'podcast' || item.type === 'video' || item.type === 'upcoming') ? (
                                <HighlightFallbackIcon type={item.type} />
                            ) : null}
                        </div>

                        <HighlightLink item={item} />
                    </div>
                ))}
            </div>
        </div>
    );
}
