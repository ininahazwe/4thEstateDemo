import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import {
    parseYearMonth,
    parsePageSegment,
    buildArchiveMonthMetadata,
    ArchiveMonthContent,
} from '@/app/components/Archives/archiveMonthShared';

interface ArchiveMonthPagedPageProps {
    params: Promise<{ year: string; month: string; pageNum: string }>;
}

// Pagination par segment (/archives/2026/08/page/2) plutôt que ?page=2 :
// pas de searchParams ⇒ route ISR normale, voir archiveMonthShared.tsx.
export const revalidate = 3600;

export async function generateMetadata({ params }: ArchiveMonthPagedPageProps): Promise<Metadata> {
    const { year, month, pageNum } = await params;
    const parsed = parseYearMonth(year, month);
    const page = parsePageSegment(pageNum);
    if (!parsed || !page) return {};
    return buildArchiveMonthMetadata(parsed, page);
}

export default async function ArchiveMonthPagedPage({ params }: ArchiveMonthPagedPageProps) {
    const { year, month, pageNum } = await params;
    const parsed = parseYearMonth(year, month);
    if (!parsed) notFound();

    const page = parsePageSegment(pageNum);
    // /page/1 (ou un segment invalide) n'a pas de raison d'exister : la page
    // 1 vit sur l'URL racine — redirige plutôt que 404 pour un lien du genre
    // /archives/2026/08/page/1 tapé/partagé par erreur.
    if (!page) redirect(`/archives/${year}/${month}`);

    return <ArchiveMonthContent parsed={parsed} page={page} />;
}
