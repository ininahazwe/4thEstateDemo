import { notFound } from "next/navigation";
import Header from "@/app/components/Header/Header";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import Breadcrumb from "@/app/components/UI/Breadcrumb";
import ArticleHeader from "@/app/components/Article/ArticleHeader";
import ArticleBody from "@/app/components/Article/ArticleBody";
import ArticleAside from "@/app/components/Article/ArticleAside";
import type { Metadata } from "next";
import {getArticleBySlug, getMostReadArticles, getReadMoreArticles} from "@/app/services/wpApi.article";
import ArticleMenu from "@/app/components/Article/ArticleMenu";
import {Calendar, Clock, Headphones} from "lucide-react";

interface ArticlePageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) return { title: "Article introuvable" };

    return {
        title: `${article.title} — Courrier international`,
        description: article.excerpt,
        openGraph: {
            title: article.title,
            description: article.excerpt,
            images: article.featuredImage ? [article.featuredImage] : [],
        },
    };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
    const { slug } = await params;

    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    // Tous les fetches secondaires en parallèle
    const [relatedArticles, readMoreArticles, mostRead] = await Promise.all([
        // Grille "Sur le même sujet" en bas : même logique tags/catégorie
        getReadMoreArticles(article.id, article.tagIds, article.categoryIds, 3),
        // Encarts "À lire aussi" intercalés dans le texte : subset différent
        getReadMoreArticles(article.id, article.tagIds, article.categoryIds, 3),
        getMostReadArticles(4),
    ]);

    const breadcrumbs = [
        ...(article.category
            ? [{ label: article.category.name, href: `/categorie/${article.category.slug}` }]
            : []),
        ...(article.country
            ? [{ label: article.country.name, href: `/pays/${article.country.slug}` }]
            : []),
    ];

    return (
        <>
            <Header />

            <ArticleMenu />

            <div className="site-content-wrap">
                <div id="habillagepub" className="site-main-wrap">
                    <main className="site-main" id="site-main">
                        <article className="article" data-columns="2">
                            <header className="article-header" data-column="full">
                                <Breadcrumb items={breadcrumbs} />
                                <ArticleHeader
                                    strapline={article.strapline}
                                    title={article.title}
                                />
                                <p className="article-lede">{article.excerpt}</p>

                                <div className="article-rule" aria-hidden="true" />

                                <div className="article-metas">
                                    <a className="article-source">
                                        {article.source ?? "Courrier international"}
                                    </a>
                                    {article.readTime && (
                                    <div className="article-infos">
                                        <span className="info-time">
                                            <Clock size={14} strokeWidth={2} aria-hidden="true" style={{marginRight: "4px"}}/>
                                            {article.readTime}
                                        </span>
                                        <span className="info-date">
                                            <Calendar size={14} strokeWidth={2} aria-hidden="true" style={{marginRight: "4px"}}/>
                                            {article.publishedAt}
                                        </span>
                                    </div>
                                    )}
                                </div>
                            </header>
                            <ArticleBody
                                content={article.content}
                                featuredImage={article.featuredImage}
                                imageCaption={article.imageCaption}
                                imageCredit={article.imageCredit}
                                relatedArticles={relatedArticles}
                                readMoreArticles={readMoreArticles}
                                tags={article.tags}
                            />
                            <ArticleAside mostRead={mostRead} />
                        </article>
                    </main>
                </div>
            </div>

            <SiteFooter />
        </>
    );
}