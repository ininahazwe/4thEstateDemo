import type { Metadata } from 'next';
import Script from 'next/script';
import Header from '@/app/components/Header/Header';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';

import { getSpotifyShowEpisodes } from '@/app/services/getSpotifyShowEpisodes';
import { PodcastEpisode } from '@/app/components/Podcasts/Types';
import Podcastriver from '@/app/components/Podcasts/Podcastriver';
import PodcastHeader from '@/app/components/Podcasts/PodcastHeader';
import SiteBanner from '@/app/components/SiteBanner/SiteBanner';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import SubscriptionBanner from "@/app/components/SubscriptionBanner";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

interface SpotifyEpisode {
    id: string;
    name: string;
    description: string;
    release_date: string;
    images: { url: string }[];
    external_urls: { spotify: string };
}

export const metadata: Metadata = {
    title: 'Podcasts - The Fourth Estate',
    description: 'Listen to our investigation podcasts on Spotify and discover in-depth analysis and exclusive interviews.',
    keywords: ['podcast', 'investigation', 'audio', 'news', 'journalism'],
    openGraph: {
        type: 'website',
        url: `${baseUrl}/podcasts`,
        title: 'Podcasts - The Fourth Estate',
        description: 'Investigation, reporting, and analysis in audio format',
        locale: 'en_GH',
        images: [
            {
                url: `${baseUrl}/podcast-cover.jpg`,
                width: 1200,
                height: 630,
                alt: 'The Fourth Estate Podcast',
            },
        ],
    },
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: `${baseUrl}/podcasts`,
    },
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

    // JSON-LD Podcast schema
    const podcastSchema = {
        "@context": "https://schema.org",
        "@type": "Podcast",
        name: "The Fourth Estate Podcast",
        description: "Investigation and analysis podcasts from The Fourth Estate",
        url: `${baseUrl}/podcasts`,
        image: `${baseUrl}/podcast-cover.jpg`,
        author: {
            "@type": "Organization",
            name: "The Fourth Estate",
        },
        publisher: {
            "@type": "Organization",
            name: "The Fourth Estate",
        },
        episode: episodes.slice(0, 10).map((ep) => ({
            "@type": "PodcastEpisode",
            name: ep.title,
            description: ep.description,
            url: ep.spotifyUrl,
            datePublished: ep.publishedAt,
        })),
    };

    return (
        <>
            {/* JSON-LD Structured Data - injected after hydration */}
            <Script
                id="podcast-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastSchema) }}
                strategy="afterInteractive"
            />

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

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}