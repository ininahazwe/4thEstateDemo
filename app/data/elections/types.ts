// Types and constants for the Ghana elections explorer (/elections).
// Data lives in ./*.json (static, front-end only for now — see source/ for the
// original CSVs). When the WordPress backend is ready, only the data loading
// in app/(routes)/elections/page.tsx needs to change.

export type PartyCode = 'NDC' | 'NPP' | 'IND';

export interface Region {
    id: string;
    code: string;
    name: string;
    /** SVG path, already projected to the viewBox of the region map. */
    d: string;
    /** Label anchor (centroid) in viewBox coordinates. */
    cx: number;
    cy: number;
}

export interface RegionMapData {
    viewBox: string;
    regions: Region[];
}

export interface Constituency {
    id: string;
    name: string;
    /** Region id (slug), matches Region.id. */
    region: string;
    mp: string;
    party: PartyCode;
    prevMp: string | null;
    prevParty: PartyCode | null;
    /** True when the party differs from the previous MP's party. */
    flipped: boolean;
}

export interface CandidateFact {
    label: string;
    value: string;
}

export interface PresidentialAspirant {
    /** Slug, also used in the URL: /elections/candidates/{id}. */
    id: string;
    name: string;
    party: string;
    /** 'nominated' | 'lost_primary' (more statuses will come with the backend). */
    status: string;
    /** One-line descriptor shown on the card. Editorial: to be reviewed. */
    tagline: string;
    facts: CandidateFact[];
    /** Constituency id when the person is a sitting MP, else null. */
    constituencyId: string | null;
    /** Path under /public (e.g. "/elections/bawumia.jpg") or null → initials. */
    photo: string | null;
    primaryVotes: number;
    primaryPct: number;
    sourceUrl: string;
    sourceDate: string;
}

export const PARTY_META: Record<PartyCode, { label: string; color: string; letter: string }> = {
    NDC: { label: 'NDC', color: '#0a8f3c', letter: 'D' },
    NPP: { label: 'NPP', color: '#1d4ed8', letter: 'P' },
    IND: { label: 'Independent', color: '#b45309', letter: 'I' },
};

export const PARTY_ORDER: PartyCode[] = ['NDC', 'NPP', 'IND'];

/** Accent used for "seats that changed hands" views. */
export const FLIP_COLOR = '#d9480f';
