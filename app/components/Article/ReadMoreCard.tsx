import Link from "next/link";

interface ReadMoreCardProps {
    strapline?: string;
    title: string;
    category?: string;
    href: string;
}

export default function ReadMoreCard({ category, title, href }: ReadMoreCardProps) {
    return (
        <div className="asset asset-read-more">
            <Link href={href}>
                <div className="wrap">
                    <span className="read-more-label">Also read:</span>
                    {/*{category && (
                        <span className="strapline">{category} - </span>
                    )}*/}
                    {title}
                </div>
            </Link>
        </div>
    );
}