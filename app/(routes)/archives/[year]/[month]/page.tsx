import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
    parseYearMonth,
    buildArchiveMonthMetadata,
    ArchiveMonthContent,
} from '@/app/components/Archives/archiveMonthShared';

interface ArchiveMonthPageProps {
    params: Promise<{ year: string; month: string }>;
}

// Page 1 uniquement — AUCUN searchParams lu ici (voir archiveMonthShared.tsx
// pour le pourquoi). C'est ce qui rend cette route éligible à l'ISR normal :
// chaque (year, month) devient un chemin caché, revalidate s'applique enfin.
export const revalidate = 3600;

export async function generateMetadata({ params }: ArchiveMonthPageProps): Promise<Metadata> {
    const { year, month } = await params;
    const parsed = parseYearMonth(year, month);
    if (!parsed) return {};
    return buildArchiveMonthMetadata(parsed, 1);
}

export default async function ArchiveMonthPage({ params }: ArchiveMonthPageProps) {
    const { year, month } = await params;
    const parsed = parseYearMonth(year, month);
    if (!parsed) notFound();

    return <ArchiveMonthContent parsed={parsed} page={1} />;
}
