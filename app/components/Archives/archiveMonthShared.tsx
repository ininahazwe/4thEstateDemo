import type { Metadata } from 'next';
import Link from 'next/link';
import ArchiveList from '@/app/components/Archives/ArchiveList';
import Pagination from '@/app/components/Archives/Pagination';
import { MONTH_NAMES } from '@/app/components/Archives/Types';
import { getMonthArchive } from '@/app/services/wpApi.archives';

// ─────────────────────────────────────────────────────────────────────────────
// Partagé entre /archives/[year]/[month] (page 1, pas de searchParams) et
// /archives/[year]/[month]/page/[pageNum] (pagination par segment d'URL).
//
// Pourquoi un segment et pas ?page= : dans ce Next.js, lire `searchParams`
// classe la route comme "request-time" -> plus jamais mise en cache, même
// avec `revalidate` déclaré (voir node_modules/next/dist/docs, section
// caching-without-cache-components). Sur l'hébergement WP mutualisé actuel
// (lent, cf. next.config.ts), ça veut dire un aller-retour live à CHAQUE
// visite d'archive, y compris deux fois le même mois de suite. Un segment de
// route (`params`) reste lui éligible à l'ISR classique : chaque
// (year, month, page) devient son propre chemin caché `revalidate` secondes.
// ─────────────────────────────────────────────────────────────────────────────

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thefourthestategh.com';

export interface ParsedYearMonth {
    year: number;
    month: number;
}

/** Valide et normalise les segments d'URL. Retourne null si invalide. */
export function parseYearMonth(year: string, month: string): ParsedYearMonth | null {
    if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) return null;

    const y = Number(year);
    const m = Number(month);
    const currentYear = new Date().getFullYear();

    if (m < 1 || m > 12) return null;
    if (y < 1990 || y > currentYear + 1) return null;

    return { year: y, month: m };
}

/** Valide le segment `page/[pageNum]` : entier >= 2 (page 1 vit sur l'URL sans segment). */
export function parsePageSegment(pageParam: string): number | null {
    if (!/^\d+$/.test(pageParam)) return null;
    const page = Number(pageParam);
    return page >= 2 ? page : null;
}

function monthCanonical(year: number, month: number, page: number): string {
    const base = `${baseUrl}/archives/${year}/${String(month).padStart(2, '0')}`;
    return page > 1 ? `${base}/page/${page}` : base;
}

export function buildArchiveMonthMetadata(
    { year, month }: ParsedYearMonth,
    page: number
): Metadata {
    const label = `${MONTH_NAMES[month - 1]} ${year}`;
    const title = page > 1 ? `Archives — ${label} (page ${page})` : `Archives — ${label}`;
    const canonical = monthCanonical(year, month, page);

    return {
        title: `${title} - The Fourth Estate`,
        description: `All The Fourth Estate publications from ${label}.`,
        openGraph: {
            type: 'website',
            url: canonical,
            title,
            description: `All The Fourth Estate publications from ${label}.`,
            locale: 'en_GH',
        },
        alternates: { canonical },
    };
}

interface ArchiveMonthContentProps {
    parsed: ParsedYearMonth;
    page: number;
}

/** Corps <main> de la page mois — identique quelle que soit l'URL (segment ou racine). */
export async function ArchiveMonthContent({ parsed, page }: ArchiveMonthContentProps) {
    const { year, month } = parsed;
    const data = await getMonthArchive({ year, month, page });
    const label = `${MONTH_NAMES[month - 1]} ${year}`;

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

                    <Pagination pagination={data.pagination} year={year} month={month} />
                </div>
            </section>
        </main>
    );
}
