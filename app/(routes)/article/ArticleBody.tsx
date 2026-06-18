import type { WpArticleCard } from "@/app/services/wpApi.article";
import ArticleContent from "@/app/(routes)/article/ArticleContent";
import RelatedArticleCard from "@/app/components/Article/RelatedArticleCard";

interface ArticleBodyProps {
    content: string;
    relatedArticles: WpArticleCard[];
    readMoreArticles: WpArticleCard[];
    tags: Array<{ label: string; href: string }>;
}

export default function ArticleBody({
    content,
    relatedArticles,
    readMoreArticles,
    tags,
}: ArticleBodyProps) {
    return (
        <div className="article-content-wrap">
            {/* Délègue le découpage HTML + intercalage des ReadMoreCards au client
                pour éviter tout mismatch d'hydratation lié au parsing du HTML WP */}
            <div className="article-text">
                <ArticleContent
                    content={content}
                    readMoreArticles={readMoreArticles}
                    every={3}
                />
            </div>

            {tags.length > 0 && (
                <div className="article-tags" aria-label="Mots-clés">
                    {tags.map((tag) => (
                        <a key={tag.href} href={tag.href} className="tag">
                            {tag.label}
                        </a>
                    ))}
                </div>
            )}

            {relatedArticles.length > 0 && (
                <section aria-labelledby="related-title" className="article-related">
                    <p className="section-title" id="related-title">
                        Sur le même sujet
                    </p>
                    <div className="related-grid">
                        {relatedArticles.map((article) => (
                            <RelatedArticleCard key={article.id} {...article} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
