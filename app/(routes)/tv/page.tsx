import { notFound } from 'next/navigation';
import Header from '@/app/components/Header/Header';
import TvHeader from '@/app/components/TV/TvHeader';
import TvGrid from '@/app/components/TV/TvGrid';
import Pagination from '@/app/components/TV/Pagination';
import TvFilterForm from '@/app/components/TV/TvFilterForm';
import { getTvPageData } from '@/app/services/wpApi.tv';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";

interface TvPageProps {
    searchParams: Promise<{
        page?: string;
        pageToken?: string;
        q?: string;
        order?: string;
        from?: string;
        to?: string;
    }>;
}

export const metadata = {
    title: 'The Fourth Estate TV',
    description: 'Watch the latest videos from The Fourth Estate.',
};

/** Convertit une date `YYYY-MM-DD` (input type=date) en RFC 3339 attendu par YouTube. */
function toRfc3339(date: string | undefined, endOfDay = false): string | undefined {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
    return endOfDay ? `${date}T23:59:59Z` : `${date}T00:00:00Z`;
}

export default async function TvPage({ searchParams }: TvPageProps) {
    const { page: pageParam, pageToken, q, order, from, to } = await searchParams;
    const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
    const query = (q ?? '').trim();
    const sortOrder = order === 'viewCount' || order === 'title' ? order : 'date';

    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getTvPageData(page, pageToken, {
            query: query || undefined,
            order: sortOrder,
            publishedAfter: toRfc3339(from, false),
            publishedBefore: toRfc3339(to, true),
        }),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    return (
        <>
            <Header />

            {/*<SiteBanner articles={bannerArticles} categories={bannerCategories} />*/}

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="stories">
                    <TvHeader />
                    <div className="stories-content">
                        <TvFilterForm
                            initialQuery={query}
                            initialOrder={sortOrder}
                            initialFrom={from ?? ''}
                            initialTo={to ?? ''}
                        />

                        {data.videos.length > 0 ? (
                            <TvGrid videos={data.videos} />
                        ) : (
                            <p className="search-empty">No videos match your search.</p>
                        )}

                        <Pagination
                            pagination={data.pagination}
                            nextPageToken={data.nextPageToken}
                            prevPageToken={data.prevPageToken}
                            query={query}
                            order={sortOrder}
                            from={from}
                            to={to}
                        />
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}