/**
 * Placeholder de l'aside affiché pendant que ArticleAsideStream charge ses
 * données (fallback du <Suspense>). Reproduit la structure de ArticleAside
 * pour éviter tout saut de mise en page quand le contenu réel arrive.
 */
export default function ArticleAsideSkeleton() {
    return (
        <aside className="article-aside" data-column="right" aria-busy="true">
            <section className="forecast-top-articles">
                <div className="section-title" id="most-read-title">
                    Latest Stories
                </div>
                <div className="wrap">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <article
                            key={i}
                            className="item aside-skeleton-item"
                            data-model="article"
                            data-type="default"
                        >
                            <div className="aside-skeleton-line" />
                            <div className="aside-skeleton-line short" />
                        </article>
                    ))}
                </div>
            </section>
        </aside>
    );
}
