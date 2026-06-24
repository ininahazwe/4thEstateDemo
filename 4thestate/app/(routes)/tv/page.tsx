import { notFound } from 'next/navigation';
import Header from '@/app/components/Header/Header';
import TvHeader from '@/app/components/TV/TvHeader';
import TvGrid from '@/app/components/TV/TvGrid';
import Pagination from '@/app/components/TV/Pagination';
import { getTvPageData } from '@/app/services/wpApi.tv';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';

interface TvPageProps {
    searchParams: Promise<{ page?: string; pageToken?: string }>;
}

export const metadata = {
    title: 'The Fourth Estate TV',
    description: 'Watch the latest videos from The Fourth Estate.',
};

export default async function TvPage({ searchParams }: TvPageProps) {
    const { page: pageParam, pageToken } = await searchParams;
    const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getTvPageData(page, pageToken),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    return (
        <>
            <Header />

            <SiteBanner articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="stories">
                    <TvHeader />
                    <div className="stories-content">
                        <TvGrid videos={data.videos} />
                        <Pagination
                            pagination={data.pagination}
                            nextPageToken={data.nextPageToken}
                            prevPageToken={data.prevPageToken}
                        />
                    </div>
                </section>
            </main>
        </>
    );
}