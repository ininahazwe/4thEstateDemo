import { SearchArticle } from './Types';
import SearchArticleCard from './SearchArticleCard';

interface SearchRiverProps {
    articles: SearchArticle[];
}

export default function SearchRiver({ articles }: SearchRiverProps) {
    return (
        <section className="section-river river">
            {articles.map((article, index) => (
                <SearchArticleCard key={article.id} article={article} highlight={index < 2} />
            ))}
        </section>
    );
}
