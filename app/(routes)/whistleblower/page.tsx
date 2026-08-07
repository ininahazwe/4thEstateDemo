import type { Metadata } from 'next';
import Header from '@/app/components/Header/Header';
import SiteBannerV2 from '@/app/components/SiteBannerV2/SiteBannerV2';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import WhistleblowerForm from '@/app/components/Whistleblower/WhistleblowerForm';

// Page statique (le formulaire est un composant client, la soumission passe
// par /api/whistleblower) — seules les données de bannière sont fetchées.
export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

export const metadata: Metadata = {
    title: 'Whistleblower - The Fourth Estate',
    description:
        'Do you have any credible information or evidence that can help us investigate an issue of public interest?',
    openGraph: {
        type: 'website',
        url: `${baseUrl}/whistleblower`,
        title: 'Know something? Send us the info!',
        description:
            'Do you have any credible information or evidence that can help us investigate an issue of public interest?',
        locale: 'en_GH',
    },
    alternates: {
        canonical: `${baseUrl}/whistleblower`,
    },
};

export default async function WhistleblowerPage() {
    const [bannerArticles, bannerCategories] = await Promise.all([
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    return (
        <>
            <Header />

           {/* <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} />*/}

            <main className="site-main" id="site-main">
                <section className="section" data-section="whistleblower">
                    <div className="section-content">
                        <div className="section-header" data-column="full">
                            <h1 className="page-title">Know something? Send us the info!</h1>
                            <p className="wb-intro">
                                Do you have any credible information or evidence that can help us
                                investigate an issue of public interest?
                            </p>
                            <p className="wb-privacy">*Your identity will remain private!</p>
                        </div>

                        <WhistleblowerForm />
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
