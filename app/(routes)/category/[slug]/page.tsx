import { notFound } from 'next/navigation';
import { getMostReadArticles } from '@/app/services/wpApi.article';
import CategoryHeader from '@/app/components/Category/CategoryHeader';
import CategoryRiver from '@/app/components/Category/CategoryRiver';
import Pagination from '@/app/components/Category/Pagination';
import ArticleAside from '@/app/components/Article/ArticleAside';
import { getCategoryPageData, getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import Header from "@/app/components/Header/Header";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

function resolvePage(pageParam?: string): number {
    return Number(pageParam) > 0 ? Number(pageParam) : 1;
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);

    // Même slug + même page que l'appel fait dans CategoryPage ci-dessous =>
    // React.cache() dédoublonne ce fetch sur TOUTES les pages, pas seulement
    // la page 1 (auparavant generateMetadata appelait toujours page=1, donc
    // le cache ne matchait jamais sur les pages 2+).
    const data = await getCategoryPageData(slug, page);
    if (!data) return {};

    return {
        title: page > 1 ? `${data.title} — Page ${page}` : data.title,
        description: data.seoDescription,
    };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const page = resolvePage(pageParam);

    const [data, mostRead, bannerArticles, bannerCategories] = await Promise.all([
        getCategoryPageData(slug, page),
        getMostReadArticles(),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    if (!data) return notFound();

    return (
        <>
            <Header />

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

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}