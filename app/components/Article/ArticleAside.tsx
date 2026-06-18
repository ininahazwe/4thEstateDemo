import Link from "next/link";

interface MostReadItem {
  index: number;
  strapline?: string;
  title: string;
  href: string;
  isPremium?: boolean;
}

interface ArticleAsideProps {
  mostRead: MostReadItem[];
}

export default function ArticleAside({ mostRead }: ArticleAsideProps) {
  return (
    <aside className="article-aside" aria-label="Sidebar">
      <section aria-labelledby="most-read-title">
        <div className="section-title" id="most-read-title">
          Les plus lus
        </div>
        <ol className="most-read-list" aria-label="Articles les plus lus">
          {mostRead.map((item) => (
            <li key={item.href} className="most-read-item">
              <span className="most-read-index" aria-hidden="true">
                {item.index}
              </span>
              <Link href={item.href} style={{ flex: 1 }}>
                {item.isPremium && (
                  <span className="badge-premium" style={{ marginBottom: 4, display: "inline-block" }}>
                    Abonnés
                  </span>
                )}
                {item.strapline && (
                  <p className="most-read-strapline">{item.strapline}</p>
                )}
                <p className="most-read-title">{item.title}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
