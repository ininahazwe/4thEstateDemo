import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { Metadata } from 'next';
import { getMostReadArticles } from '@/app/services/wpApi.article';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import CategoryRiverLoadMore from '@/app/components/Category/CategoryRiverLoadMore';
import ArticleAside from '@/app/components/Article/ArticleAside';
import { getCategoryPageData, getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import Header from "@/app/components/Header/Header";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

function resolvePage(pageParam?: string): number {
    return Number(pageParam) > 0 ? Number(pageParam) : 1;
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";
    const pageUrl = page > 1 ? `${baseUrl}/category/${slug}?page=${page}` : `${baseUrl}/category/${slug}`;

    const data = await getCategoryPageData(slug, page);
    if (!data) return {};

    return {
        title: page > 1 ? `${data.title} — Page ${page}` : data.title,
        description: data.seoDescription || `All news from the ${data.title} category`,
        keywords: [data.title, "news", "articles"],
        openGraph: {
            type: "website",
            url: pageUrl,
            title: data.title,
            description: data.seoDescription || `${data.title} news`,
            locale: "en_GH",
        },
        alternates: {
            canonical: `${baseUrl}/category/${slug}`,
        },
        robots: {
            index: page === 1, // Index first page only
            follow: true,
        },
    };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

    const [data, mostRead, bannerArticles, bannerCategories] = await Promise.all([
        getCategoryPageData(slug, page),
        getMostReadArticles(),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    // JSON-LD BreadcrumbList schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: baseUrl,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: data.title,
                item: `${baseUrl}/category/${slug}`,
            },
            ...(page > 1
                ? [
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: `Page ${page}`,
                        item: `${baseUrl}/category/${slug}?page=${page}`,
                    },
                ]
                : []),
        ],
    };

    // JSON-LD CollectionPage schema
    const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: data.title,
        description: data.seoDescription || `Articles in the ${data.title} category`,
        url: `${baseUrl}/category/${slug}`,
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
            {/* JSON-LD Structured Data - injected after hydration */}
            <Script
                id={`category-breadcrumb-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
                strategy="afterInteractive"
            />
            <Script
                id={`category-collection-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
                strategy="afterInteractive"
            />

            <Header />

            {/*<SiteBanner articles={bannerArticles} categories={bannerCategories} />*/}

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="2" data-section={data.slug}>
                    <div className="section-content" data-column="left">
                        <CategoryHeader title={data.title} tags={data.tags} />
                        <CategoryRiverLoadMore
                            slug={slug}
                            initialArticles={data.articles}
                            initialHasMore={data.hasMore}
                            batchSize={5}
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