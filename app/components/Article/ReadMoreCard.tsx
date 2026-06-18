import Link from "next/link";

interface ReadMoreCardProps {
    strapline?: string;
    title: string;
    href: string;
}

export default function ReadMoreCard({ strapline, title, href }: ReadMoreCardProps) {
    return (
        <aside className="read-more-card">
            <Link href={href}>
                <span className="read-more-label">À lire aussi&nbsp;:</span>
                <p>
                    {strapline && (
                        <span className="read-more-strapline">{strapline} </span>
                    )}
                    <span className="read-more-title">{title}</span>
                </p>
            </Link>
        </aside>
    );
}