import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/app/components/Header/Header';
import SiteBannerV2 from '@/app/components/SiteBannerV2/SiteBannerV2';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import { getWpPageById } from '@/app/services/wpApi.page';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import NewsletterSignup from "@/app/components/NewsletterSignup/NewsletterSignup";

const PAGE_ID = 21955;

export async function generateMetadata(): Promise<Metadata> {
    const page = await getWpPageById(PAGE_ID);
    if (!page) return {};

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

    return {
        title: page.title,
        description: page.excerpt || undefined,
        openGraph: {
            type: 'website',
            url: `${baseUrl}/subscribe`,
            title: page.title,
            description: page.excerpt || undefined,
            locale: 'en_GH',
        },
        alternates: {
            canonical: `${baseUrl}/subscription`,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function SubscriptionPage() {
    const [page, bannerArticles, bannerCategories] = await Promise.all([
        getWpPageById(PAGE_ID),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!page) return notFound();

    return (
        <>
            <Header />

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} showHighlights={false} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="1" data-section="subscription">
                    <div className="section-content" data-column="full">
                        <div
                            className="article-text"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    </div>
                </section>
                <NewsletterSignup />
            </main>

            <SiteFooter />
        </>
    );
}
