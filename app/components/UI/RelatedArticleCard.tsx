import Link from "next/link";

interface RelatedArticleCardProps {
  strapline?: string;
  title: string;
  href: string;
  image?: string;
  isPremium?: boolean;
}

export default function RelatedArticleCard({
  strapline,
  title,
  href,
  image,
  isPremium,
}: RelatedArticleCardProps) {
  return (
    <article className="related-card">
      <Link href={href}>
        {image && (
          <div className="related-card-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" loading="lazy" />
          </div>
        )}
        <div>
          {isPremium && <span className="badge-premium">Abonnés</span>}
          {strapline && (
            <p className="related-card-strapline">{strapline}</p>
          )}
          <p className="related-card-title">{title}</p>
        </div>
      </Link>
    </article>
  );
}
