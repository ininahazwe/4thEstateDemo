import type { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

export const metadata: Metadata = {
    title: 'Subscriptions - Support Independent Journalism',
    description: 'Access our exclusive investigations and support quality independent journalism. Discover our subscription plans.',
    keywords: ['subscription', 'journalism', 'investigation', 'exclusive content'],
    openGraph: {
        type: 'website',
        url: `${baseUrl}/subscriptions`,
        title: 'Subscriptions - The Fourth Estate',
        description: 'Support our independent journalism with a subscription',
        locale: 'en_GH',
    },
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: `${baseUrl}/subscriptions`,
    },
};

export default function SubscriptionsPage() {
    return (
        <main style={{ padding: '40px' }}>
            <h1>Support Independent Journalism</h1>
            <p>Discover our subscription plans</p>
        </main>
    );
}