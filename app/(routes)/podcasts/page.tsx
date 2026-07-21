import type { Metadata } from 'next';
import Script from 'next/script';
import Header from '@/app/components/Header/Header';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';

import { getAllPodcastEpisodes } from '@/app/services/getSpotifyShowEpisodes';
import PodcastFilterRiver from '@/app/components/Podcasts/PodcastFilterRiver';
import PodcastHeader from '@/app/components/Podcasts/PodcastHeader';
import { getBannerCategories, getLatestBannerArticles } from '@/app/services/wpApi';
import { BANNER_CATEGORY_SLUGS } from '@/app/components/SiteBanner/bannerCategorySlugs';
import SubscriptionBanner from "@/app/components/SubscriptionBanner";
import SiteBannerV2 from "@/app/components/SiteBannerV2/SiteBannerV2";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

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

export default async function PodcastPage() {
    let hasError = false;

    const [episodes, bannerArticles, bannerCategories] = await Promise.all([
        getAllPodcastEpisodes().catch((error) => {
            console.error('Erreur lors de la récupération des épisodes:', error);
            hasError = true;
            return [];
        }),
        getLatestBannerArticles(),
        getBannerCategories(BANNER_CATEGORY_SLUGS),
    ]);

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

            {/*<SiteBanner articles={bannerArticles} categories={bannerCategories} />*/}

            <SiteBannerV2 articles={bannerArticles} categories={bannerCategories} />

            <main className="site-main" id="site-main">
                <section className="stories">
                    <PodcastHeader />
                    <div className="stories-content">
                        <PodcastFilterRiver episodes={episodes} />
                    </div>
                </section>
            </main>

            <SubscriptionBanner />

            <SiteFooter />
        </>
    );
}