import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { Metadata } from 'next';
import Header from '@/app/components/Header/Header';
import { getAuthorPageData } from '@/app/services/wpApi.author';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import AuthorHeader from "@/app/components/Author/Authorheader";
import AuthorRiver from "@/app/components/Author/Authorriver";
import Pagination from "@/app/components/Author/Pagination";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";

interface AuthorPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

function resolvePage(pageParam?: string): number {
    return Number(pageParam) > 0 ? Number(pageParam) : 1;
}

export async function generateMetadata({ params, searchParams }: AuthorPageProps): Promise<Metadata> {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";
    const pageUrl = page > 1 ? `${baseUrl}/author/${slug}?page=${page}` : `${baseUrl}/author/${slug}`;

    const data = await getAuthorPageData(slug, page);
    if (!data) return {};

    return {
        title: page > 1 ? `All articles by ${data.name} — Page ${page}` : `All articles by ${data.name}`,
        description: `Discover all articles and investigations by ${data.name} on The Fourth Estate`,
        keywords: [data.name, "author", "journalist", "articles"],
        openGraph: {
            type: "profile",
            url: pageUrl,
            title: data.name,
            description: `Articles by ${data.name}`,
            locale: "en_GH",
        },
        alternates: {
            canonical: `${baseUrl}/author/${slug}`,
        },
        robots: {
            index: page === 1,
            follow: true,
        },
    };
}

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getAuthorPageData(slug, page),
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
                name: data.name,
                item: `${baseUrl}/author/${slug}`,
            },
            ...(page > 1
                ? [
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: `Page ${page}`,
                        item: `${baseUrl}/author/${slug}?page=${page}`,
                    },
                ]
                : []),
        ],
    };

    // JSON-LD Person schema
    const personSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: data.name,
        url: `${baseUrl}/author/${slug}`,
        jobTitle: "Journalist",
    };

    return (
        <>
            {/* JSON-LD Structured Data - injected after hydration */}
            <Script
                id={`author-breadcrumb-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
                strategy="afterInteractive"
            />
            <Script
                id={`author-person-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
                strategy="afterInteractive"
            />

            <Header />

            <SiteBanner articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="2" data-section="author">
                    <div className="section-content" data-column="left">
                        <AuthorHeader name={data.name} />
                        <AuthorRiver articles={data.articles} />
                        <Pagination pagination={data.pagination} />
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}