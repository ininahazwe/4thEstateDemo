import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { Metadata } from 'next';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import OurImpactFilterRiver from '@/app/components/Category/OurImpactFilterRiver';
import {
    getOurImpactPageData,
    getOurImpactFilters,
    getBannerCategories,
    getLatestBannerArticles,
} from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import Header from "@/app/components/Header/Header";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";

// ---------------------------------------------------------------------------
// /category/our-impact — route dédiée (31/08/2026)
//
// Un dossier littéral `category/our-impact/` est prioritaire sur
// `category/[slug]/` dans le App Router : cette URL ne passe donc plus JAMAIS
// par la route générique (retirée de son generateStaticParams, voir
// `../[slug]/page.tsx`). Nécessaire pour deux différences que les ~20 autres
// pages catégorie n'ont pas :
//
// 1. Pas d'aside ("article-aside") — data-columns="1" + section-content en
//    data-column="full", même pattern que /about-us, /privacy, /subscribe.
// 2. Un bandeau de filtres (All + termes impact-category) au-dessus de la
//    rivière — voir OurImpactFilterRiver.
//
// Toujours STATIQUE comme avant : aucune lecture de searchParams côté
// serveur. Le rendu initial est toujours "All" (getOurImpactPageData() sans
// argument) ; les filtres sont gérés entièrement côté client contre
// /api/category/our-impact/more, pas par un re-rendu serveur par filtre.
// ---------------------------------------------------------------------------

export const revalidate = 600;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

export async function generateMetadata(): Promise<Metadata> {
    const data = await getOurImpactPageData();
    if (!data) return {};

    return {
        title: data.title,
        description: data.seoDescription || `All news from the ${data.title} category`,
        keywords: [data.title, "news", "articles"],
        openGraph: {
            type: "website",
            url: `${baseUrl}/category/our-impact`,
            title: data.title,
            description: data.seoDescription || `${data.title} news`,
            locale: "en_GH",
        },
        alternates: {
            canonical: `${baseUrl}/category/our-impact`,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function OurImpactCategoryPage() {
    const [data, filters, bannerArticles, bannerCategories] = await Promise.all([
        getOurImpactPageData(),
        getOurImpactFilters(),
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
                item: `${baseUrl}/category/our-impact`,
            },
        ],
    };

    // JSON-LD CollectionPage schema
    const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: data.title,
        description: data.seoDescription || `Articles in the ${data.title} category`,
        url: `${baseUrl}/category/our-impact`,
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
                id="category-breadcrumb-our-impact"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
                strategy="afterInteractive"
            />
            <Script
                id="category-collection-our-impact"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
                strategy="afterInteractive"
            />

            <Header />

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} showHighlights={false} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="1" data-section="our-impact">
                    <div className="section-content" data-column="full">
                       {/* <CategoryHeader title={data.title} tags={data.tags} />*/}
                        <OurImpactFilterRiver
                            initialArticles={data.articles}
                            initialHasMore={data.hasMore}
                            initialNextOffset={data.nextOffset}
                            filters={filters}
                            batchSize={5}
                        />
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
