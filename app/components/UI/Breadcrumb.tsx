import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      <Link href="/">Accueil</Link>
      {items.map((item, i) => (
        <span key={item.href} style={{ display: "contents" }}>
          <span className="breadcrumb-sep" aria-hidden="true">/</span>
          {i === items.length - 1 ? (
            <span aria-current="page">{item.label}</span>
          ) : (
            <Link href={item.href}>{item.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
