import { AuthorArticle } from './Types';
import AuthorArticleCard from "@/app/components/Author/Authorarticlecard";

interface AuthorRiverProps {
    articles: AuthorArticle[];
}

export default function AuthorRiver({ articles }: AuthorRiverProps) {
    return (
        <section className="section-river river">
            {articles.map((article, index) => (
                <AuthorArticleCard key={article.id} article={article} highlight={index < 2} />
            ))}
        </section>
    );
}