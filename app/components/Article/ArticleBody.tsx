import RelatedArticleCard from "./RelatedArticleCard";
import ArticleContent from "./ArticleContent";
import { WpArticleCard } from "@/app/services/wpApi.article";
import ArticleIllustration from "@/app/components/Article/Articleillustration";
import ArticleShareButton from "@/app/components/UI/ArticleShareButton";
import TTSButton from "@/app/components/UI/TTSButton";

interface Author {
    displayName: string;
    slug: string; // nécessaire pour construire /author/{slug}
}

interface ArticleBodyProps {
    id: number;
    title: string;
    content: string;
    featuredImage?: string;
    imageCaption?: string;
    imageCredit?: string;
    relatedArticles: WpArticleCard[];   // grille "Sur le même sujet" en bas
    readMoreArticles: WpArticleCard[];  // encarts "À lire aussi" intercalés dans le texte
    tags: Array<{ label: string; href: string }>;
    authors: Author[];
}

export default function ArticleBody({
                                        content,
                                        featuredImage,
                                        imageCaption,
                                        imageCredit,
                                        relatedArticles,
                                        readMoreArticles,
                                        tags,
                                        title,
                                        authors,
                                    }: ArticleBodyProps) {

    return (
        <div className="article-content">
            {featuredImage && (
                <ArticleIllustration
                    featuredImage={featuredImage}
                    imageCaption={imageCaption}
                    imageCredit={imageCredit}
                />
            )}

            <aside className="article-tools" data-hide-kne="">
                <div className="tools-list">
                    <ArticleShareButton title={title} />
                    <TTSButton containerSelector=".article-text" />
                </div>
            </aside>
            <div className="article-text">
                <ArticleContent content={content} readMoreArticles={readMoreArticles} />
            </div>

            <div className="article-secondary">
                {/*<div className="article-authors-vo">
                    <div className="article-authors">
                        <div className="default-authors">
                            {authors.length ? (
                                authors.map((author, index) => (
                                    <span key={author.slug}>
                                        <a href={`/author/${author.slug}`} className="author-link">
                                            {author.displayName}
                                        </a>
                                        {index < authors.length - 1 && " | "}
                                    </span>
                                ))
                            ) : (
                                <span>The Fourth Estate</span>
                            )}
                        </div>
                    </div>
                </div>*/}
                {/* Tags */}
                {tags.length > 0 && (
                    <div className="article-tags" aria-label="Mots-clés">
                        <div className="tags-list">
                            {tags.map((tag) => (
                                <a key={tag.href} href={tag.href} className="item">
                                    {tag.label}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Grille "Sur le même sujet" */}
                {relatedArticles.length > 0 && (
                    <div className="article-readmore no-mobile">
                        <div className="section-title">You might also like</div>
                        <div className="readmore-list" data-count="4">
                            {relatedArticles.map((article) => (
                                <RelatedArticleCard key={article.id} {...article} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}