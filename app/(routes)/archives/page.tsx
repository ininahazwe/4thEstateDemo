import type { Metadata } from 'next';
import ArchiveYearGrid from '@/app/components/Archives/ArchiveYearGrid';
import { getArchiveYears } from '@/app/services/wpApi.archives';

// Page statique + ISR : la liste des années ne bouge qu'une fois par an.
export const revalidate = 86400;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

export const metadata: Metadata = {
    title: 'Archives - The Fourth Estate',
    description: 'Browse all The Fourth Estate publications by year and month.',
    openGraph: {
        type: 'website',
        url: `${baseUrl}/archives`,
        title: 'Archives',
        description: 'Browse all The Fourth Estate publications by year and month.',
        locale: 'en_GH',
    },
    alternates: {
        canonical: `${baseUrl}/archives`,
    },
};

export default async function ArchivesPage() {
    const years = await getArchiveYears();

    return (
        <main className="site-main" id="site-main">
            <section className="section" data-section="archives">
                <div className="section-content">
                    <div className="section-header" data-column="full">
                        <h1 className="page-title">Archives</h1>
                        <p className="archives-intro">
                            Pick a year, then a month to see every publication of that month.
                        </p>
                    </div>

                    <ArchiveYearGrid years={years} />
                </div>
            </section>
        </main>
    );
}
