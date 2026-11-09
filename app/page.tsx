import Header from "@/app/components/Header/Header";
import NewsZone from "@/app/components/NewsZone/NewsZone";
import SiteFooter from "@/app/components/SiteFooter/SiteFooter";
import {
    getAntiCorruptionArticles,
    getEnvironmentArticles,
    getFourthEstateArticles,
    getGeneralNewsArticles,
    getHealthArticles,
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
import HealthZone from "@/app/components/Health/HealthZone";
import TikTokStoriesSlider from "@/app/components/VideoSlider/TikTokStoriesSlider";
import {BANNER_CATEGORY_SLUGS} from "@/app/components/SiteBanner/bannerCategorySlugs";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";
import NewsZoneV2 from "@/app/components/NewsZoneV2/NewsZoneV2";
import VideoZone from "@/app/components/VideoZone/VideoZone";
import NewsletterSignup from "@/app/components/NewsletterSignup/NewsletterSignup";
import HeroStacked from "@/app/components/Hero/HeroStacked";
import Hero from "@/app/components/Hero/Hero";
import { getSpotlightIds } from "@/app/services/wpApi.spotlight";


export default async function App() {
    // Automatic async article fetching from The Fourth Estate API
    //
    // Before: 8 sequential calls (each await blocks the next). None of these
    // functions depend on each other's results — parallelizing via Promise.all
    // reduces total time to the slowest fetch instead of the sum.
    // IDs des 3 articles du Hero (zone "spotlight" de la composition WP).
    // Recupere AVANT le Promise.all : les zones par categorie en ont besoin
    // pour les exclure de leur requete WP, sinon un article en Hero
    // reapparait plus bas dans sa categorie. Requete composition deja mise en
    // cache par HeroStacked (meme URL, revalidate 300) : cout ~0.
    const spotlightIds = await getSpotlightIds(3);

    // "More stories" (zone2) est charge AVANT les zones par categorie : ses IDs
    // s'ajoutent a ceux du Hero dans le `exclude` WP, sinon un article recent
    // apparait deux fois (More stories + sa rubrique). Seule zone2 est rendue
    // (zone1 est commentee dans NewsZone). Cout : une requete de plus en serie,
    // deja couverte par le cache de fetchPosts.
    const { zone1, zone2 } = await getFourthEstateArticles(spotlightIds);
    const moreStoriesIds = zone2
        .map((a) => Number(a.id.replace('wp-post-', '')))
        .filter((id) => Number.isFinite(id));
    const shownIds = [...spotlightIds, ...moreStoriesIds];

    const [
        bannerArticles,
        generalNews,
        environmentlNews,
        antiCorruptionNews,
        impactNews,
        storiesNews,
        humanRightsNews,
        healthNews,
        bannerCategories,
    ] = await Promise.all([
        getLatestBannerArticles(),
        getGeneralNewsArticles(6, shownIds),
        getEnvironmentArticles(6, shownIds),
        getAntiCorruptionArticles(shownIds),
        getOurImpactArticles(shownIds),
        getStoriesArticles(),
        getHumanRightArticles(shownIds),
        getHealthArticles(shownIds),
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
                            <h1 className="sr-only">The Fourth Estate — Investigative Journalism and Public Interest News</h1>
                            {/* Inject articles fetched from API service */}

                            {/* Main news zone powered by WordPress API
                            <NewsZoneV2
                                zone1Articles={zone1}
                                zone2Articles={zone2}
                            />*/}

                            <HeroStacked />
                            {/*<Hero />*/}

                            <OurImpactZone articles={impactNews} />

                            <NewsZone
                                zone1Articles={zone1}
                                zone2Articles={zone2}
                            />

                            <GeneralNewsZone articles={generalNews} />

                            <HumanRightsZone articles={humanRightsNews} />

                            <TikTokStoriesSlider />

                            {/*<StoriesZone articles={storiesNews} />*/}

                            <AntiCorruptionZone articles={antiCorruptionNews} />

                            <VideoZone />

                            <EnvironmentZone articles={environmentlNews} />

                            <HealthZone articles={healthNews} />

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
