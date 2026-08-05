import Header from '@/app/components/Header/Header';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';

// Layout partagé par /archives et /archives/[year]/[month]. Header/Banner/
// Footer vivent ICI (hors du Suspense créé par loading.tsx dans
// [year]/[month]) pour rester visibles pendant la navigation : seul le
// <main> de page.tsx est remplacé par le skeleton de loading.tsx.
export default async function ArchivesLayout({ children }: { children: React.ReactNode }) {
    const [bannerArticles, bannerCategories] = await Promise.all([
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    return (
        <>
            <Header />

            <SiteBanner articles={bannerArticles} categories={bannerCategories} />

            {children}

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
