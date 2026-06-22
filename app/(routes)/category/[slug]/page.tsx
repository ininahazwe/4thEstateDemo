import { notFound } from 'next/navigation';
import { getMostReadArticles } from '@/app/services/wpApi.article';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import CategoryRiver from '@/app/components/Category/CategoryRiver';
import Pagination from '@/app/components/Category/Pagination';
import ArticleAside from '@/app/components/Article/ArticleAside';
import { getCategoryPageData, getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps) {
    const { slug } = await params;
    const data = await getCategoryPageData(slug, 1);
    if (!data) return {};
    return {
        title: data.title,
        description: data.seoDescription,
    };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = Number(pageParam) > 0 ? Number(pageParam) : 1;

    const [data, mostRead, bannerArticles, bannerCategories] = await Promise.all([
        getCategoryPageData(slug, page),
        getMostReadArticles(),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    return (
        <>
            <SiteBanner articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="2" data-section={data.slug}>
                    <div className="section-content" data-column="left">
                        <CategoryHeader title={data.title} tags={data.tags} />
                        <CategoryRiver articles={data.articles} />
                        <Pagination pagination={data.pagination} />
                    </div>

                    <ArticleAside mostRead={mostRead} />
                </section>
            </main>
        </>
    );
}