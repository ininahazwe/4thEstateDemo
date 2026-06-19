import RelatedArticleCard from "./RelatedArticleCard";
import ArticleContent from "./ArticleContent";
import { WpArticleCard } from "@/app/services/wpApi.article";
import ArticleIllustration from "@/app/components/Article/Articleillustration";
import ArticleTTSButton from "@/app/components/UI/Articlettsbutton";
import ArticleShareButton from "@/app/components/UI/ArticleShareButton";

interface Author {
    displayName: string;
    // Si tu as un slug pour l'URL de l'auteur, ajoute-le ici, ex: slug: string;
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
    authors: Author[];                  // 1. On ajoute les auteurs dans les Props
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
                                        authors,         // 2. On récupère la prop ici
                                    }: ArticleBodyProps) {

    // 3. Logique identique pour générer la chaîne de caractères si nécessaire,
    // ou "The Fourth Estate" par défaut si aucun auteur n'est rattaché.
    const authorNames = authors.length
        ? authors.map((a) => a.displayName).join(" | ")
        : "The Fourth Estate";

    return (
        <div className="article-content" data-column="left">
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
                    <ArticleTTSButton  />
                </div>
            </aside>
            <div className="article-text">
                <ArticleContent content={content} readMoreArticles={readMoreArticles} />
            </div>

            <div className="article-secondary">
                <div className="article-authors-vo">
                    <div className="article-authors">
                        <div className="default-authors">
                            {/* 4. Remplacement dynamique de Boukari Ouédraogo */}
                            <span>{authorNames}</span>
                        </div>
                    </div>
                </div>
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