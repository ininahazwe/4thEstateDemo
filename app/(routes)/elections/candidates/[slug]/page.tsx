import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ElectionsView from '@/app/components/Elections/ElectionsView';
import candidatesJson from '@/app/data/elections/candidates.json';
import type { PresidentialAspirant } from '@/app/data/elections/types';

// ---------------------------------------------------------------------------
// /elections/candidates/[slug] — shareable URL of one candidate.
//
// Renders the same view as /elections; CandidateGrid reads the pathname and
// opens the matching modal. Only the metadata differs (title, description,
// canonical), so a shared link previews the right person.
// ---------------------------------------------------------------------------

export const revalidate = 3600;
export const dynamicParams = false;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';
const aspirants = candidatesJson as unknown as PresidentialAspirant[];

export function generateStaticParams() {
    return aspirants.map((a) => ({ slug: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const candidate = aspirants.find((a) => a.id === slug);
    if (!candidate) return {};

    const title = `${candidate.name} — Ghana 2028 Elections`;
    const description = `${candidate.name} (${candidate.party}): ${candidate.facts.map((f) => f.value).join('. ')}.`;

    return {
        title,
        description,
        openGraph: {
            type: 'profile',
            url: `${baseUrl}/elections/candidates/${candidate.id}`,
            title,
            description,
            locale: 'en_GH',
        },
        alternates: { canonical: `${baseUrl}/elections/candidates/${candidate.id}` },
        // Prototype: keep out of search engines until validated.
        robots: { index: false, follow: false },
    };
}

export default async function ElectionsCandidatePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (!aspirants.some((a) => a.id === slug)) return notFound();

    return <ElectionsView />;
}
