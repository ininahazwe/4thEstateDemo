export interface ArchiveItem {
    id: string;
    href: string;
    title: string;
    /** Date ISO brute renvoyée par WordPress */
    date: string;
    /** Date formatée pour l'affichage, ex "05 Aug 2026" */
    dateLabel: string;
}

export interface ArchivePagination {
    currentPage: number;
    totalPages: number;
}

export interface ArchiveMonthData {
    year: number;
    month: number; // 1-12
    items: ArchiveItem[];
    total: number;
    pagination: ArchivePagination;
}

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
] as const;
