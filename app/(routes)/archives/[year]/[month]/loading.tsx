// Affiché par Next pendant le chargement de la route (Suspense auto sur
// navigation + attente des données serveur de page.tsx). Skeleton simple
// calqué sur le markup final (archives-list-item) pour éviter le layout shift.

export default function ArchiveMonthLoading() {
    const placeholders = Array.from({ length: 8 });

    return (
        <main className="site-main" id="site-main">
            <section className="section" data-section="archives-month">
                <div className="section-content">
                    <div className="section-header" data-column="full">
                        <div className="archives-skeleton archives-skeleton-back" />
                        <div className="archives-skeleton archives-skeleton-title" />
                    </div>

                    <ul className="archives-list" aria-busy="true" aria-label="Loading publications">
                        {placeholders.map((_, i) => (
                            <li key={i} className="archives-list-item">
                                <span className="archives-skeleton archives-skeleton-date" />
                                <span className="archives-skeleton archives-skeleton-title-line" />
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </main>
    );
}
