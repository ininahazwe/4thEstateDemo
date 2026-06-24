import { CategoryArticle } from './Types';
import CategoryArticleCard from './CategoryArticleCard';

interface CategoryRiverProps {
    articles: CategoryArticle[];
}

export default function CategoryRiver({ articles }: CategoryRiverProps) {
    return (
        <section className="section-river river">
            {articles.map((article, index) => (
                <CategoryArticleCard key={article.id} article={article} highlight={index < 2} />
            ))}
        </section>
    );
}