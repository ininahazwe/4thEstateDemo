import { notFound } from "next/navigation";
import Header from "@/app/components/Header/Header";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import Breadcrumb from "@/app/components/UI/Breadcrumb";
import ArticleHeader from "@/app/components/Article/ArticleHeader";
import ArticleBody from "@/app/components/Article/ArticleBody";
import ArticleAside from "@/app/components/Article/ArticleAside";
import type { Metadata } from "next";
import { getArticleBySlug, getMostReadArticles, getReadMoreArticles } from "@/app/services/wpApi.article";
import ArticleMenu from "@/app/components/Article/ArticleMenu";
import { Calendar, Clock } from "lucide-react";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";

const WP_API =
    process.env.NEXT_PUBLIC_WP_API_URL ?? "https://thefourthestategh.com/wp-json/wp/v2";

interface ArticlePageProps {
    params: Promise<{ slug: string }>;
}

/**
 * Pré-génère les pages des articles existants au moment du build/déploiement.
 * Ces pages deviennent statiques et sont servies depuis le CDN — temps de
 * chargement quasi nul, peu importe qui visite en premier.
 *
 * Seuls les articles publiés APRÈS ce déploiement ne sont pas couverts : ils
 * passent par le chemin normal (rendu à la demande + cache ISR de 600s sur
 * getArticleBySlug), donc un premier visiteur sur un article tout neuf
 * connaîtra encore un chargement plus lent — c'est attendu et limité aux
 * articles très récents.
 *
 * _fields=slug réduit la réponse WordPress au strict minimum (juste le slug),
 * évite de transférer titre/contenu/médias pour une liste qui n'en a pas besoin.
 */
export async function generateStaticParams() {
    try {
        const res = await fetch(`${WP_API}/posts?per_page=100&_fields=slug&status=publish`);
        if (!res.ok) return [];
        const posts = (await res.json()) as Array<{ slug: string }>;
        return posts.map((post) => ({ slug: post.slug }));
    } catch {
        // En cas d'échec, Next.js retombe sur le rendu à la demande pour
        // chaque slug — pas d'interruption du build.
        return [];
    }
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
    const { slug } = await params;
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

    // Dédupliqué et lu instantanément en mémoire si generateMetadata est passé avant
    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    // Lancement simultané des requêtes secondaires
    const [readMoreArticles, mostRead] = await Promise.all([
        getReadMoreArticles(article.id, article.tagIds, article.categoryIds, 4),
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
                        <article className="article">
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
                                    {/*<span className="article-source">
                                        {authorNames}
                                    </span>*/}
                                    {article.readTime && (
                                        <div className="article-infos">
                                            <span className="info-time">
                                                <Clock size={14} strokeWidth={2} aria-hidden="true" style={{ marginRight: "4px" }} />
                                                {article.readTime}
                                            </span>
                                            <span className="info-date">
                                                <Calendar size={14} strokeWidth={2} aria-hidden="true" style={{ marginRight: "4px" }} />
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