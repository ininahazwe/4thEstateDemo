import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Script from 'next/script';
import type { Metadata } from 'next';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import CategoryRiverLoadMore from '@/app/components/Category/CategoryRiverLoadMore';
import ArticleAsideStream from '@/app/components/Article/ArticleAsideStream';
import ArticleAsideSkeleton from '@/app/components/Article/ArticleAsideSkeleton';
import {
    getCategoryPageData,
    getBannerCategories,
    getLatestBannerArticles,
    getAllCategorySlugs,
} from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import Header from "@/app/components/Header/Header";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
}

// ISR : la page catégorie est revalidée toutes les 10 min (comme les fetchs).
export const revalidate = 600;

// Prébuild des pages catégorie au build, à partir des slugs WP. Aucune lecture
// de searchParams (la pagination se fait via "Load more" -> /api/category/.../more,
// pas via ?page=), donc la page est réellement STATIQUE (parité avec la home) :
// la chaîne resolve->posts->médias tourne au build/revalidation, plus jamais sur
// le chemin critique d'une requête utilisateur. dynamicParams (défaut true)
// laisse un slug non prébuild se rendre à la demande.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
    try {
        const slugs = await getAllCategorySlugs();
        return slugs.map((slug) => ({ slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

    const data = await getCategoryPageData(slug);
    if (!data) return {};

    return {
        title: data.title,
        description: data.seoDescription || `All news from the ${data.title} category`,
        keywords: [data.title, "news", "articles"],
        openGraph: {
            type: "website",
            url: `${baseUrl}/category/${slug}`,
            title: data.title,
            description: data.seoDescription || `${data.title} news`,
            locale: "en_GH",
        },
        alternates: {
            canonical: `${baseUrl}/category/${slug}`,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

    // getMostReadArticles sorti du Promise.all : il est désormais fetché à
    // l'intérieur de <ArticleAsideStream> et streamé via <Suspense>, pour ne
    // pas bloquer le rendu du contenu principal.
    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getCategoryPageData(slug),
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