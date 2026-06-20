import Header from "@/app/components/Header/Header";
import SiteBanner from "@/app/components/SiteBanner/SiteBanner";
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
    getStoriesArticles
} from "@/app/services/wpApi";
import GeneralNewsZone from "@/app/components/GeneralNews/GeneralNewsZone";
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import EnvironmentZone from "@/app/components/Environmentzone/Environmentzone";
import AntiCorruptionZone from "@/app/components/AntiCorruption/Corruptionzone";
import OurImpactZone from "@/app/components/Impact/ImpactZone";
import StoriesZone from "@/app/components/Stories/Storieszone";
import HumanRightsZone from "@/app/components/HumanRights/HumanRightZone";
import TikTokStoriesSlider from "@/app/components/VideoSlider/TikTokStoriesSlider";


export default async function App() {
    // Récupération automatique et asynchrone des articles en direct de l'API de The Fourth Estate
    const { zone1, zone2 } = await getFourthEstateArticles();
    const articles = await getLatestBannerArticles();
    const generalNews = await getGeneralNewsArticles(3);
    const environmentlNews = await getEnvironmentArticles(3);
    const antiCorruptionNews = await getAntiCorruptionArticles();
    const impactNews = await getOurImpactArticles();
    const storiesNews = await getStoriesArticles();
    const humanRightsNews = await getHumanRightArticles();

    return (
        <>
            <Header />

            <SiteBanner articles={articles} />

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
                            {/* On injecte ici les 4 articles récupérés depuis le service API */}

                            {/* 1. Zone d'actualités alimentée par l'API WordPress */}
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

                            <EnvironmentZone articles={environmentlNews} />

                        </section>
                    </main>
                </div>
            </div>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}