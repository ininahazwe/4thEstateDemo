import Link from "next/link";

interface BreadcrumbItem {
    label: string;
    href: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
    if (!items.length) return null;

    return (
        <ul className="article-breadcrumbs">
            {items.map((item, i) => (
                <li className="item" key={item.href}>
                    {i === items.length - 1 ? (
                        <span aria-current="page">{item.label}</span>
                    ) : (
                        <Link href={item.href}>{item.label}</Link>
                    )}
                </li>
            ))}
        </ul>
    );
}
