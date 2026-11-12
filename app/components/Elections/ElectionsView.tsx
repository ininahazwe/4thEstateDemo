import Header from '@/app/components/Header/Header';
import SiteBannerV2 from '@/app/components/SiteBannerV2/SiteBannerV2';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import ElectionsExplorer from './ElectionsExplorer';
import CandidateGrid from './CandidateGrid';
import regionMapJson from '@/app/data/elections/regions.json';
import constituenciesJson from '@/app/data/elections/constituencies.json';
import candidatesJson from '@/app/data/elections/candidates.json';
import type { Constituency, PresidentialAspirant, RegionMapData } from '@/app/data/elections/types';

/**
 * Shared body of /elections and /elections/candidates/[slug].
 *
 * Both routes render exactly the same tree: the candidate modal is driven by
 * the pathname on the client (see CandidateGrid), so opening a candidate from
 * the grid is a pushState (no navigation) and a direct visit to a candidate
 * URL shows the page with that candidate's modal open.
 */
export default async function ElectionsView() {
    const [bannerArticles, bannerCategories] = await Promise.all([
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    const regionMap = regionMapJson as unknown as RegionMapData;
    const constituencies = constituenciesJson as unknown as Constituency[];
    const aspirants = candidatesJson as unknown as PresidentialAspirant[];

    return (
        <>
            <Header />

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} showHighlights={false} />

            <main className="site-main" id="site-main">
                <section className="section" data-columns="1" data-section="elections">
                    <div className="section-content" data-column="full">
                        <h1 className="page-title">Ghana 2028 Elections</h1>
                        <p className="el-intro">
                            One place to follow who is running for president in 2028, who holds Ghana’s 276
                            parliamentary seats today and which seats changed hands in 2024. Open a candidate, or
                            click the map, a region or a party to cross the data.
                        </p>

                        <CandidateGrid aspirants={aspirants} />

                        <ElectionsExplorer regionMap={regionMap} constituencies={constituencies} />

                        <aside className="el-sources" aria-labelledby="el-sources-title">
                            <h2 id="el-sources-title" className="el-sources__title">Sources and method</h2>
                            <ul>
                                <li>
                                    Parliament: members elected on 7 December 2024 and previous members, from
                                    Wikipedia’s list of MPs. “Changed hands” means the winning party differs from the
                                    previous MP’s party; by-elections held since may not be reflected.
                                </li>
                                <li>
                                    Presidential race: NPP primary results of 31 January 2026 declared by the Electoral
                                    Commission. The NDC has not yet chosen its candidate.
                                </li>
                                <li>
                                    Region boundaries: geoBoundaries (OpenStreetMap contributors), CC BY-SA 2.0.
                                    Constituency tiles are a schematic grid, not geographic shapes.
                                </li>
                            </ul>
                        </aside>
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}
