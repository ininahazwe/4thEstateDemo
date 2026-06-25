import Header from '@/app/components/Header/Header';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';

import { getSpotifyShowEpisodes } from '@/app/services/getSpotifyShowEpisodes';
import { PodcastEpisode } from '@/app/components/Podcasts/Types';
import Podcastriver from '@/app/components/Podcasts/Podcastriver';
import PodcastHeader from '@/app/components/Podcasts/PodcastHeader';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';

interface SpotifyEpisode {
    id: string;
    name: string;
    description: string;
    release_date: string;
    images: { url: string }[];
    external_urls: { spotify: string };
}

export const metadata = {
    title: 'The Fourth Estate Podcast',
    description: 'Listen to the latest episodes from The Fourth Estate.',
};

function formatDisplayDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function mapToPodcastEpisode(episode: SpotifyEpisode): PodcastEpisode {
    return {
        id: episode.id,
        title: episode.name,
        description: episode.description,
        cover: episode.images?.[0]?.url ?? '',
        publishedAt: formatDisplayDate(episode.release_date),
        spotifyUrl: episode.external_urls.spotify,
    };
}

export default async function PodcastPage() {
    let episodes: PodcastEpisode[] = [];
    let hasError = false;

    const [data, bannerArticles, bannerCategories] = await Promise.all([
        getSpotifyShowEpisodes().catch((error) => {
            console.error('Erreur lors de la récupération des épisodes:', error);
            hasError = true;
            return null;
        }),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

    episodes = (data?.items ?? []).map(mapToPodcastEpisode);

    if (hasError) {
        return <div className="text-red-500 p-6">Impossible de charger les épisodes pour le moment.</div>;
    }

    return (
        <>
            <Header />

            <SiteBanner articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="stories">
                    <PodcastHeader />
                    <div className="stories-content">
                        <Podcastriver episodes={episodes} />
                    </div>
                </section>
            </main>

            <SiteFooter />
        </>
    );
}