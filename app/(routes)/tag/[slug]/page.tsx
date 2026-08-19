import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Script from 'next/script';
import type { Metadata } from 'next';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import CategoryRiverLoadMore from '@/app/components/Category/CategoryRiverLoadMore';
import ArticleAsideStream from '@/app/components/Article/ArticleAsideStream';
import ArticleAsideSkeleton from '@/app/components/Article/ArticleAsideSkeleton';
import { getTagPageData, getTopTagSlugs, getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import Header from "@/app/components/Header/Header";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";

// Miroir de /category/[slug]/page.tsx (mêmes optimisations : statique + ISR,
// aside streamé, pas de section-tags), sur la taxonomie post_tag au lieu de
// category. La pagination passe par "Load more" (/api/tag/[slug]/more), donc
// aucune lecture de searchParams -> page STATIQUE.

interface TagPageProps {
    params: Promise<{ slug: string }>;
}

export const revalidate = 600;

// Prébuild ISR des tags les PLUS UTILISÉS uniquement (top 100 par nombre
// d'articles). Les tags rares se rendent à la demande (dynamicParams défaut
// true). Contrairement aux catégories (~13, toutes prébuilies), les tags se
// comptent en centaines -> prébuild borné.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
    try {
        const slugs = await getTopTagSlugs(100);
        return slugs.map((slug) => ({ slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

    const data = await getTagPageData(slug);
    if (!data) return {};

    return {
        title: data.title,
        description: `All articles tagged "${data.title}"`,
        keywords: [data.title, "news", "articles"],
        openGraph: {
            type: "website",
            url: `${baseUrl}/tag/${slug}`,
            title: data.title,
            description: `Articles tagged "${data.title}"`,
            locale: "en_GH",
        },
        alternates: {
            canonical: `${baseUrl}/tag/${slug}`,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function TagPage({ params }: TagPageProps) {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

    // getMostReadArticles sorti du Promise.all -> fetché dans <ArticleAsideStream>
    // et streamé via <Suspense>, comme la page catégorie.
    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getTagPageData(slug),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
            { "@type": "ListItem", position: 2, name: data.title, item: `${baseUrl}/tag/${slug}` },
        ],
    };

    const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: data.title,
        description: `Articles tagged "${data.title}"`,
        url: `${baseUrl}/tag/${slug}`,
        mainEntity: {
            "@type": "ItemList",
            itemListElement: data.articles.slice(0, 10).map((article, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: article.title,
                url: article.href,
            })),
        },
    };

    return (
        <>
            <Script
                id={`tag-breadcrumb-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
                strategy="afterInteractive"
            />
            <Script
                id={`tag-collection-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
                strategy="afterInteractive"
            />

            <Header />

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} showHighlights={false} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="2" data-section={`tag-${data.slug}`}>
                    <div className="section-content" data-column="left">
                        {/* tags={data.tags} est toujours [] côté tag -> pas de section-tags. */}
                        <CategoryHeader title={data.title} tags={data.tags} />
                        <CategoryRiverLoadMore
                            slug={slug}
                            initialArticles={data.articles}
                            initialHasMore={data.hasMore}
                            initialNextOffset={data.nextOffset}
                            batchSize={5}
                            apiBasePath="/api/tag"
                        />
                    </div>

                    <Suspense fallback={<ArticleAsideSkeleton />}>
                        <ArticleAsideStream />
                    </Suspense>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
