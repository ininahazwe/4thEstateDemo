import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Script from 'next/script';
import type { Metadata } from 'next';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import CategoryRiverLoadMore from '@/app/components/Category/CategoryRiverLoadMore';
import ArticleAsideStream from '@/app/components/Article/ArticleAsideStream';
import ArticleAsideSkeleton from '@/app/components/Article/ArticleAsideSkeleton';
import {
    getImpactCategoryPageData,
    getAllImpactCategorySlugs,
    getBannerCategories,
    getLatestBannerArticles,
} from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import Header from '@/app/components/Header/Header';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import SiteBannerV2 from '@/app/components/SiteBannerV2/SiteBannerV2';

// Route dédiée aux termes de la taxonomie custom "impact-category" (Honours,
// Accountability, …), calquée sur /category/[slug] mais sur ?impact-category=<id>.
// URL alignée sur WordPress : /impact-category/<slug>.

interface ImpactCategoryPageProps {
    params: Promise<{ slug: string }>;
}

export const revalidate = 600;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
    try {
        const slugs = await getAllImpactCategorySlugs();
        return slugs.map((slug) => ({ slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: ImpactCategoryPageProps): Promise<Metadata> {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

    const data = await getImpactCategoryPageData(slug);
    if (!data) return {};

    return {
        title: data.title,
        description: `Articles under ${data.title} — The Fourth Estate impact`,
        keywords: [data.title, 'impact', 'news', 'articles'],
        openGraph: {
            type: 'website',
            url: `${baseUrl}/impact-category/${slug}`,
            title: data.title,
            description: `Articles under ${data.title}`,
            locale: 'en_GH',
        },
        alternates: {
            canonical: `${baseUrl}/impact-category/${slug}`,
        },
        robots: { index: true, follow: true },
    };
}

export default async function ImpactCategoryPage({ params }: ImpactCategoryPageProps) {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getImpactCategoryPageData(slug),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
            { '@type': 'ListItem', position: 2, name: 'Our Impact', item: `${baseUrl}/category/our-impact` },
            { '@type': 'ListItem', position: 3, name: data.title, item: `${baseUrl}/impact-category/${slug}` },
        ],
    };

    const collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: data.title,
        description: `Articles under ${data.title}`,
        url: `${baseUrl}/impact-category/${slug}`,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: data.articles.slice(0, 10).map((article, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                name: article.title,
                url: article.href,
            })),
        },
    };

    return (
        <>
            <Script
                id={`impact-breadcrumb-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
                strategy="afterInteractive"
            />
            <Script
                id={`impact-collection-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
                strategy="afterInteractive"
            />

            <Header />

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
                            apiBasePath="/api/impact-category"
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
