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
import {Calendar, Clock} from "lucide-react";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";

interface ArticlePageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
    const { slug } = await params;
    // getArticleBySlug est enveloppé dans React.cache() : cet appel et celui
    // dans ArticlePage() ci-dessous partagent le même résultat — un seul
    // fetch réseau pour les deux, au lieu de deux fetches identiques.
    const article = await getArticleBySlug(slug);
    if (!article) return { title: "Article introuvable" };

    return {
        title: `${article.title} — The Fourth Estate`,
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

    // Même fetch que dans generateMetadata — dédupliqué automatiquement par React.cache()
    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    // Tous les fetches secondaires en parallèle.
    // Le doublon getReadMoreArticles/getReadMoreArticles a été supprimé :
    // readMoreArticles et relatedArticles utilisaient les MÊMES arguments,
    // ce qui doublait inutilement le travail (jusqu'à 2 fetches WordPress en plus).
    // On réutilise maintenant le même résultat pour les deux usages.
    const [readMoreArticles, mostRead] = await Promise.all([
        getReadMoreArticles(article.id, article.tagIds, article.categoryIds, 3),
        getMostReadArticles(4),
    ]);
    const relatedArticles = readMoreArticles;

    const breadcrumbs = [
        ...(article.category
            ? [{ label: article.category.name, href: `/category/${article.category.slug}` }]
            : []),
        ...(article.country
            ? [{ label: article.country.name, href: `/country/${article.country.slug}` }]
            : []),
    ];

    const authorNames = article.authors.length
        ? article.authors.map((a) => a.displayName).join(" | ")
        : "The Fourth Estate";

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
                                    category={article.category}
                                />
                                <p className="article-lede">{article.excerpt}</p>

                                <div className="article-rule" aria-hidden="true" />

                                <div className="article-metas">
                                    <a className="article-source">
                                        {authorNames}
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
                                id={article.id}
                                title={article.title}
                                content={article.content}
                                featuredImage={article.featuredImage}
                                imageCaption={article.imageCaption}
                                imageCredit={article.imageCredit}
                                relatedArticles={relatedArticles}
                                readMoreArticles={readMoreArticles}
                                tags={article.tags}
                                authors={article.authors}
                            />
                            <ArticleAside mostRead={mostRead} />
                        </article>
                    </main>
                </div>
            </div>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}