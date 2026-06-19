import Link from "next/link";
import {WpArticleCard} from "@/app/services/wpApi.article";

interface ArticleAsideProps {
    mostRead: WpArticleCard[];
}

export default function ArticleAside({ mostRead }: ArticleAsideProps) {
    return (
        <aside className="article-aside" data-column="right">
            <section aria-labelledby="most-read-title">
                <p className="section-title" id="most-read-title">
                    Les plus lus
                </p>
                <ol className="most-read-list">
                    {mostRead.map((item, i) => (
                        <li key={item.id} className="most-read-item">
                            <span className="most-read-index" aria-hidden="true">
                                {i + 1}
                            </span>
                            <Link href={item.href} style={{ flex: 1 }}>
                                {item.isPremium && (
                                    <span className="badge-premium">Abonnés</span>
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
