import { notFound } from 'next/navigation';
import Header from '@/app/components/Header/Header';
import { getAuthorPageData } from '@/app/services/wpApi.author';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import AuthorHeader from "@/app/components/Author/Authorheader";
import AuthorRiver from "@/app/components/Author/Authorriver";
import Pagination from "@/app/components/Author/Pagination";

interface AuthorPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

function resolvePage(pageParam?: string): number {
    return Number(pageParam) > 0 ? Number(pageParam) : 1;
}

export async function generateMetadata({ params, searchParams }: AuthorPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);

    const data = await getAuthorPageData(slug, page);
    if (!data) return {};

    return {
        title: page > 1 ? `${data.name} — Page ${page}` : data.name,
    };
}

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);

    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getAuthorPageData(slug, page),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    return (
        <>
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
        </>
    );
}