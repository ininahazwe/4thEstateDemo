import type { Metadata } from 'next';
import ElectionsView from '@/app/components/Elections/ElectionsView';

// ---------------------------------------------------------------------------
// /elections — Ghana 2028 elections explorer (prototype, 12/11/2026)
//
// Data is static (app/data/elections/*.json) until the WordPress backend
// exists. The page is noindex until it has been validated editorially.
// Candidate URLs live in ./candidates/[slug] and render the same view.
// ---------------------------------------------------------------------------

export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

export const metadata: Metadata = {
    title: 'Ghana 2028 Elections: candidates, constituencies and seats',
    description:
        'Meet the 2028 presidential contenders and explore Ghana’s 276 parliamentary constituencies and 16 regions on one interactive map.',
    openGraph: {
        type: 'website',
        url: `${baseUrl}/elections`,
        title: 'Ghana 2028 Elections',
        description: 'Presidential contenders and an interactive map of Ghana’s constituencies and seats.',
        locale: 'en_GH',
    },
    alternates: { canonical: `${baseUrl}/elections` },
    // Prototype: keep out of search engines until validated.
    robots: { index: false, follow: false },
};

export default function ElectionsPage() {
    return <ElectionsView />;
}
