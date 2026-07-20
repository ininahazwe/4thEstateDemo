import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { Metadata } from 'next';
import { getMostReadArticles } from '@/app/services/wpApi.article';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import CategoryRiverLoadMore from '@/app/components/Category/CategoryRiverLoadMore';
import ArticleAside from '@/app/components/Article/ArticleAside';
import { getTagPageData, getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import Header from "@/app/components/Header/Header";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";

// Miroir de /category/[slug]/page.tsx, sur la taxonomie post_tag au lieu
// de category. Nécessaire pour les liens du CPT "highlight" qui référencent
// des tags WP (ex: acf.tag = "big-push-contract-list").

interface TagPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

function resolvePage(pageParam?: string): number {
    return Number(pageParam) > 0 ? Number(pageParam) : 1;
}

export async function generateMetadata({ params, searchParams }: TagPageProps): Promise<Metadata> {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";
    const pageUrl = page > 1 ? `${baseUrl}/tag/${slug}?page=${page}` : `${baseUrl}/tag/${slug}`;

    const data = await getTagPageData(slug, page);
    if (!data) return {};

    return {
        title: page > 1 ? `${data.title} — Page ${page}` : data.title,
        description: `All articles tagged "${data.title}"`,
        keywords: [data.title, "news", "articles"],
        openGraph: {
            type: "website",
            url: pageUrl,
            title: data.title,
            description: `Articles tagged "${data.title}"`,
            locale: "en_GH",
        },
        alternates: {
            canonical: `${baseUrl}/tag/${slug}`,
        },
        robots: {
            index: page === 1,
            follow: true,
        },
    };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

    const [data, mostRead, bannerArticles, bannerCategories] = await Promise.all([
        getTagPageData(slug, page),
        getMostReadArticles(),
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
            ...(page > 1
                ? [{ "@type": "ListItem", position: 3, name: `Page ${page}`, item: `${baseUrl}/tag/${slug}?page=${page}` }]
                : []),
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

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="2" data-section={`tag-${data.slug}`}>
                    <div className="section-content" data-column="left">
                        <CategoryHeader title={data.title} tags={data.tags} />
                        <CategoryRiverLoadMore
                            slug={slug}
                            initialArticles={data.articles}
                            initialHasMore={data.hasMore}
                            batchSize={5}
                            apiBasePath="/api/tag"
                        />
                    </div>

                    <ArticleAside mostRead={mostRead} />
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
