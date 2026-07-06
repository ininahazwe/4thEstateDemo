import Header from '@/app/components/Header/Header';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { getMostReadArticles } from '@/app/services/wpApi.article';
import ArticleAside from '@/app/components/Article/ArticleAside';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import SearchForm from '@/app/components/Search/SearchForm';
import SearchRiver from '@/app/components/Search/SearchRiver';
import Pagination from '@/app/components/Search/Pagination';
import { getSearchPageData } from '@/app/services/wpApi.search';

interface SearchPageProps {
    searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}

function resolvePage(pageParam?: string): number {
    return Number(pageParam) > 0 ? Number(pageParam) : 1;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
    const { q } = await searchParams;
    const query = (q ?? '').trim();
    return {
        title: query ? `Search: “${query}” — The Fourth Estate` : 'Search — The Fourth Estate',
        robots: { index: false, follow: true }, // pages de résultats non indexées
    };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q, from, to, page: pageParam } = await searchParams;
    const query = (q ?? '').trim();
    const page = resolvePage(pageParam);

    const [data, mostRead, bannerArticles, bannerCategories] = await Promise.all([
        getSearchPageData({ query, from, to, page }),
        getMostReadArticles(),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    const hasQuery = query.length > 0;
    const hasResults = data.articles.length > 0;

    return (
        <>
            <Header />

            <SiteBanner articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="2" data-section="search">
                    <div className="section-content" data-column="left">
                        <div className="section-header" data-column="full">
                            <h1 className="page-title">Search</h1>
                        </div>

                        <SearchForm
                            initialQuery={data.query}
                            initialFrom={data.from}
                            initialTo={data.to}
                        />

                        {hasQuery && (
                            <p className="search-results-count">
                                {data.total > 0
                                    ? `${data.total} result${data.total > 1 ? 's' : ''} for “${data.query}”`
                                    : `No results for “${data.query}”`}
                            </p>
                        )}

                        {hasResults ? (
                            <>
                                <SearchRiver articles={data.articles} />
                                <Pagination
                                    pagination={data.pagination}
                                    query={data.query}
                                    from={data.from}
                                    to={data.to}
                                />
                            </>
                        ) : hasQuery ? (
                            <p className="search-empty">
                                Try a different keyword or widen the date range.
                            </p>
                        ) : (
                            <p className="search-empty">
                                Type a name or keyword above to search all articles. Use the filters
                                to narrow results by publication date.
                            </p>
                        )}
                    </div>

                    <ArticleAside mostRead={mostRead} />
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
