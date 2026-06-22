import { notFound } from "next/navigation";
import Header from "@/app/components/Header/Header";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import Breadcrumb from "@/app/components/UI/Breadcrumb";
import ArticleHeader from "@/app/components/Article/ArticleHeader";
import ArticleBody from "@/app/components/Article/ArticleBody";
import ArticleAside from "@/app/components/Article/ArticleAside";
import type { Metadata } from "next";
import { getArticleBySlug, getMostReadArticles, getReadMoreArticles } from "@/app/services/wpApi.article";
import { Calendar, Clock } from "lucide-react";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteBanner from "@/app/components/SiteBanner/SiteBanner";
import {
    getBannerCategories,
    getLatestBannerArticles,
} from "@/app/services/wpApi";
import {BANNER_CATEGORY_SLUGS} from "@/app/components/SiteBanner/bannerCategorySlugs";

const WP_API =
    process.env.NEXT_PUBLIC_WP_API_URL ?? "https://thefourthestategh.com/wp-json/wp/v2";

interface ArticlePageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    try {
        const res = await fetch(`${WP_API}/posts?per_page=100&_fields=slug&status=publish`);
        if (!res.ok) return [];
        const posts = (await res.json()) as Array<{ slug: string }>;
        return posts.map((post) => ({ slug: post.slug }));
    } catch {
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

    // Seuls bannerArticles et bannerCategories sont utilisés sur la page
    // article (alimenter SiteBanner). Les autres zones (general news,
    // environment, anti-corruption, our-impact, stories, human-right) sont
    // homepage-only — les fetcher ici ajouterait 6 requêtes WordPress par vue
    // d'article pour rien, à l'encontre des optimisations de perf déjà faites.
    const [bannerArticles, bannerCategories] = await Promise.all([
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

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

            <SiteBanner articles={bannerArticles} categories={bannerCategories} />

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