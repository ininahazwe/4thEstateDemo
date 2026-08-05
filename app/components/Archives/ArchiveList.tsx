import Link from 'next/link';
import type { ArchiveItem } from './Types';

interface ArchiveListProps {
    items: ArchiveItem[];
}

/** Liste "date | titre", déjà triée du plus récent au plus ancien par l'API. */
export default function ArchiveList({ items }: ArchiveListProps) {
    if (!items.length) {
        return <p className="archives-empty">No publication for this month.</p>;
    }

    return (
        <ul className="archives-list">
            {items.map((item) => (
                <li key={item.id} className="archives-list-item">
                    <time className="archives-list-date" dateTime={item.date}>
                        {item.dateLabel}
                    </time>
                    <span className="archives-list-sep" aria-hidden="true">|</span>
                    <Link className="archives-list-title" href={item.href}>
                        {item.title}
                    </Link>
                </li>
            ))}
        </ul>
    );
}
