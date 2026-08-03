import type { Metadata } from 'next';
import Header from '@/app/components/Header/Header';
import SubscriptionBanner from '@/app/components/SubscriptionBanner';
import SiteFooter from '@/app/components/SiteFooter/SiteFooter';
import ArticleMediaLayout, { type ArticleMediaData } from '@/app/components/Article/ArticleMediaLayout';

export const metadata: Metadata = {
    title: 'Article media layout — preview',
    robots: { index: false, follow: false },
};

// Données FICTIVES pour visualiser le layout avant branchement backend.
// Images de démo via picsum.photos (seed stable => rendu reproductible).
const img = (seed: string, w = 1600, h = 900) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const DEMO: ArticleMediaData = {
    category: 'Investigation',
    date: 'July 30, 2026',
    title: 'Rivers of Salt: Inside a Two-Year Visual Investigation',
    author: {
        name: 'Ama Serwaa',
        role: 'Investigative Producer, The Fourth Estate',
        avatar: img('reporter-avatar', 200, 200),
    },
    hero: {
        src: img('salt-hero', 1400, 1050),
        alt: 'Workers walking across a wide salt flat at dawn',
    },
    blocks: [
        {
            type: 'heading',
            text: 'In The Beginning: A Question and a Camera',
        },
        {
            type: 'body',
            paragraphs: [
                'For two years, a small team followed a single question across three regions: who really controls the country’s largest salt lagoon, and at what cost to the communities living on its edge?',
                'The reporting began with a leaked lease document and a borrowed camera. It grew into hundreds of hours of footage, dozens of interviews, and a paper trail that stretched from a district assembly office to the highest levels of government.',
                'This is a story told as much in images as in words. The film and the reporting were built together, so that neither could be dismissed as the other’s shadow.',
            ],
        },
        {
            type: 'player',
            poster: img('doc-poster', 1800, 1013),
            alt: 'Documentary trailer poster',
        },
        /*{
            type: 'image',
            src: img('field-team', 1800, 1000),
            alt: 'Three members of the field team standing in a green valley',
            caption: 'The field team during the second reporting trip. Names withheld at their request.',
        },*/
        {
            type: 'heading',
            text: 'Neighbours & Consequences',
        },
        {
            type: 'body',
            paragraphs: [
                'The investigation is designed to surface what official records leave out. Working with local fixers and community elders, the team pieced together how a public resource became a private concession.',
                'The reporting rests on four pillars, each verifiable and each documented on camera:',
            ],
        },
        {
            type: 'list',
            items: [
                'Primary documents obtained under the Right to Information law.',
                'On-the-record testimony from affected fishing communities.',
                'Independent mapping of the concession boundaries.',
                'Cross-checks against parliamentary and court records.',
            ],
        },
        {
            type: 'image',
            src: img('salt-wide', 1800, 1000),
            alt: 'A wide view of the salt lagoon under a heavy sky',
        },
        {
            type: 'body',
            paragraphs: [
                'Quality, in a visual investigation, cannot be an afterthought. The way an interview is lit, the way a landscape is framed, the way silence is allowed to sit — all of it shapes whether a viewer believes what they are seeing.',
                'The character of a story changes from region to region. What holds true near the coast falls apart inland, and the team learned to let the footage argue with itself rather than force a single, tidy narrative.',
            ],
        },
        {
            type: 'image',
            src: img('interview', 1800, 1000),
            alt: 'A subject being interviewed against a bright doorway',
        },
        {
            type: 'body',
            paragraphs: [
                'For this piece, the team followed a single lease from signature to the water’s edge. Every claim on screen is anchored to a document you can read, or a person who agreed to be named.',
                'What follows is a selection of frames from the final cut — the moments that survived the edit because they carried the story forward on their own.',
            ],
        },
        {
            type: 'podcast',
            // ⚠️ Remplacer par un vrai ID d'épisode Spotify pour voir l'embed
            // réel (segment final de open.spotify.com/episode/<id>).
            episodeId: '4rOoJ6Egrf8K2IrywzwOMk',
            show: 'The Fourth Estate Podcast',
            title: 'Episode 12 — What the Lagoon Remembers',
            description:
                'The reporting team unpacks how a leaked lease turned into a two-year visual investigation, and what it cost the communities who spoke on the record.',
            cover: img('podcast-cover', 600, 600),
            duration: '38 min',
        },
        {
            type: 'gallery',
            images: [
                { src: img('gal-1', 900, 1200), alt: 'Portrait of a community elder' },
                { src: img('gal-2', 900, 1200), alt: 'Hands holding coarse salt' },
                { src: img('gal-3', 900, 1200), alt: 'A boat resting on cracked earth' },
            ],
        },
        {
            type: 'body',
            paragraphs: [
                'After the edit, the film was handed to a newsroom of one: a single fact-checker who watched every frame against the underlying evidence, flagging anything that outran the record.',
                'The result is a story that is meant to be watched and read together — where the pictures do not decorate the facts, and the facts do not apologise for the pictures.',
            ],
        },
    ],
};

export default function ArticleMediaPreviewPage() {
    return (
        <>
            <Header />
            {/* data-template="media" : marqueur qui permet au CSS de neutraliser
                le max-width / padding hérités de #site-main pour CETTE page
                seulement (cf. article-media.css). */}
            <main className="site-main" id="site-main" data-template="media">
                <ArticleMediaLayout article={DEMO} />
            </main>
            <SubscriptionBanner />
            <SiteFooter />
        </>
    );
}
