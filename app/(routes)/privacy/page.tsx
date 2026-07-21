import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/app/components/Header/Header';
import SiteBannerV2 from '@/app/components/SiteBannerV2/SiteBannerV2';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import { getWpPage } from '@/app/services/wpApi.page';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';

const PAGE_SLUG = 'privacy';

export async function generateMetadata(): Promise<Metadata> {
    const page = await getWpPage(PAGE_SLUG);
    if (!page) return {};

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

    return {
        title: page.title,
        description: page.excerpt || undefined,
        openGraph: {
            type: 'website',
            url: `${baseUrl}/privacy`,
            title: page.title,
            description: page.excerpt || undefined,
            locale: 'en_GH',
        },
        alternates: {
            canonical: `${baseUrl}/privacy`,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function PrivacyPage() {
    const [page, bannerArticles, bannerCategories] = await Promise.all([
        getWpPage(PAGE_SLUG),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!page) return notFound();

    return (
        <>
            <Header />

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="1" data-section="privacy">
                    <div className="section-content" data-column="full">
                        <div className="section-header" data-column="full">
                            <h1 className="page-title">{page.title}</h1>
                        </div>

                        <div
                            className="article-text"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
