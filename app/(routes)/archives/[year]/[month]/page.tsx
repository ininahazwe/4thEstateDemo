import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArchiveList from '@/app/components/Archives/ArchiveList';
import Pagination from '@/app/components/Archives/Pagination';
import { MONTH_NAMES } from '@/app/components/Archives/Types';
import { getMonthArchive } from '@/app/services/wpApi.archives';

interface ArchiveMonthPageProps {
    params: Promise<{ year: string; month: string }>;
    searchParams: Promise<{ page?: string }>;
}

export const revalidate = 3600;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

/** Valide et normalise les segments d'URL. Retourne null si invalide. */
function parseParams(year: string, month: string): { year: number; month: number } | null {
    if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) return null;

    const y = Number(year);
    const m = Number(month);
    const currentYear = new Date().getFullYear();

    if (m < 1 || m > 12) return null;
    if (y < 1990 || y > currentYear + 1) return null;

    return { year: y, month: m };
}

function resolvePage(pageParam?: string): number {
    return Number(pageParam) > 0 ? Number(pageParam) : 1;
}

export async function generateMetadata({ params }: ArchiveMonthPageProps): Promise<Metadata> {
    const { year, month } = await params;
    const parsed = parseParams(year, month);
    if (!parsed) return {};

    const label = `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
    const canonical = `${baseUrl}/archives/${parsed.year}/${String(parsed.month).padStart(2, '0')}`;

    return {
        title: `Archives — ${label} - The Fourth Estate`,
        description: `All The Fourth Estate publications from ${label}.`,
        openGraph: {
            type: 'website',
            url: canonical,
            title: `Archives — ${label}`,
            description: `All The Fourth Estate publications from ${label}.`,
            locale: 'en_GH',
        },
        alternates: { canonical },
    };
}

export default async function ArchiveMonthPage({ params, searchParams }: ArchiveMonthPageProps) {
    const [{ year, month }, { page: pageParam }] = await Promise.all([params, searchParams]);

    const parsed = parseParams(year, month);
    if (!parsed) notFound();

    const page = resolvePage(pageParam);

    const data = await getMonthArchive({ year: parsed.year, month: parsed.month, page });

    const label = `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;

    return (
        <main className="site-main" id="site-main">
            <section className="section" data-section="archives-month">
                <div className="section-content">
                    <div className="section-header" data-column="full">
                        <Link className="archives-back" href="/archives">
                            ← All archives
                        </Link>
                        <h1 className="page-title">{label}</h1>
                        {data.total > 0 && (
                            <p className="archives-count">
                                {data.total} publication{data.total > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    <ArchiveList items={data.items} />

                    <Pagination
                        pagination={data.pagination}
                        year={parsed.year}
                        month={parsed.month}
                    />
                </div>
            </section>
        </main>
    );
}
