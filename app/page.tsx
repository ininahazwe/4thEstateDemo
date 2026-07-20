import Header from "@/app/components/Header/Header";
import NewsZone from "@/app/components/NewsZone/NewsZone";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import {
    getAntiCorruptionArticles,
    getEnvironmentArticles,
    getFourthEstateArticles,
    getGeneralNewsArticles,
    getHumanRightArticles,
    getLatestBannerArticles,
    getOurImpactArticles,
    getStoriesArticles,
    getBannerCategories
} from "@/app/services/wpApi";
import GeneralNewsZone from "@/app/components/GeneralNews/GeneralNewsZone";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import EnvironmentZone from "@/app/components/Environmentzone/Environmentzone";
import AntiCorruptionZone from "@/app/components/AntiCorruption/Corruptionzone";
import OurImpactZone from "@/app/components/Impact/ImpactZone";
//import StoriesZone from "@/app/components/Stories/Storieszone";
import HumanRightsZone from "@/app/components/HumanRights/HumanRightZone";
import TikTokStoriesSlider from "@/app/components/VideoSlider/TikTokStoriesSlider";
import {BANNER_CATEGORY_SLUGS} from "@/app/components/SiteBanner/bannerCategorySlugs";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";
import NewsZoneV2 from "@/app/components/NewsZoneV2/NewsZoneV2";
import VideoZone from "@/app/components/VideoZone/VideoZone";
import NewsletterSignup from "@/app/components/NewsletterSignup/NewsletterSignup";
import Hero from "@/app/components/Hero/Hero";


export default async function App() {
    // Automatic async article fetching from The Fourth Estate API
    //
    // Before: 8 sequential calls (each await blocks the next). None of these
    // functions depend on each other's results — parallelizing via Promise.all
    // reduces total time to the slowest fetch instead of the sum.
    const [
        { zone1, zone2 },
        bannerArticles,
        generalNews,
        environmentlNews,
        antiCorruptionNews,
        impactNews,
        storiesNews,
        humanRightsNews,
        bannerCategories,
    ] = await Promise.all([
        getFourthEstateArticles(),
        getLatestBannerArticles(),
        getGeneralNewsArticles(3),
        getEnvironmentArticles(3),
        getAntiCorruptionArticles(),
        getOurImpactArticles(),
        getStoriesArticles(),
        getHumanRightArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    return (
        <>
            <Header />

            {/*<SiteBanner articles={bannerArticles} categories={bannerCategories} />*/}
            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} />

            <div className="site-content-wrap">
                <div className="dfpcontainer">
                    <div id="dfp-habillage" className="dfp-slot" data-format="habillage" aria-hidden="true"></div>
                </div>
                <div className="dfpcontainer">
                    <div id="banniere_haute" className="dfp-slot" data-format="banniere_haute" aria-hidden="true"></div>
                </div>

                <div className="site-main-wrap">
                    <main className="site-main" id="site-main">
                        <section className="home">
                            {/* Inject articles fetched from API service */}

                            {/* Main news zone powered by WordPress API
                            <NewsZoneV2
                                zone1Articles={zone1}
                                zone2Articles={zone2}
                            />*/}

                            <Hero />

                            <NewsZone
                                zone1Articles={zone1}
                                zone2Articles={zone2}
                            />

                            <OurImpactZone articles={impactNews} />

                            <GeneralNewsZone articles={generalNews} />

                            <HumanRightsZone articles={humanRightsNews} />

                            <TikTokStoriesSlider />

                            {/*<StoriesZone articles={storiesNews} />*/}

                            <AntiCorruptionZone articles={antiCorruptionNews} />

                            <VideoZone />

                            <EnvironmentZone articles={environmentlNews} />

                            <NewsletterSignup />

                        </section>
                    </main>
                </div>
            </div>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}