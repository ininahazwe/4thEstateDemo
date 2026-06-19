import GeneralNewsCard from './GeneralNewsCard';
import { type GeneralNewsArticle } from './types';

interface GeneralNewsZoneProps {
    articles: GeneralNewsArticle[];
    title?: string;
}

export default function GeneralNewsZone({
                                            articles,
                                            title = 'General News'
                                        }: GeneralNewsZoneProps) {

    // Découpe les articles en groupes de 3, comme dans le template HTML d'archives
    const chunkArticles = (arr: GeneralNewsArticle[], size: number): GeneralNewsArticle[][] => {
        const chunks: GeneralNewsArticle[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            const chunk = arr.slice(i, i + size);
            if (chunk.length > 0) chunks.push(chunk);
        }
        return chunks;
    };

    const articleGroups = chunkArticles(articles, 3);

    return (
        <section className="zone zone-type zone-archives">
            <h3 className="section-title">{title}</h3>

            {articleGroups.map((group, groupIdx) => (
                <div className="wrap" key={`general-news-group-${groupIdx}`}>
                    {group.map((article, articleIdx) => (
                        <GeneralNewsCard
                            key={article.id}
                            article={article}
                            index={groupIdx * 3 + articleIdx}
                        />
                    ))}
                </div>
            ))}
        </section>
    );
}