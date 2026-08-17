import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/revalidate — invalidation à la demande du cache Next.
//
// Appelée par le mu-plugin tfe-revalidate.php à chaque publication /
// modification côté WordPress. Sans elle, une mise à jour n'apparaît qu'au
// bout de la fenêtre ISR la plus courte de la page (300 s sur la home) — et
// souvent seulement à la DEUXIÈME visite, puisque Next sert la version
// périmée pendant qu'il régénère en arrière-plan.
//
// Authentification par en-tête `x-tfe-revalidate-secret`, comparé à la
// variable d'environnement REVALIDATE_SECRET. Volontairement PAS de secret en
// query string : les query strings finissent dans les access logs Apache et
// dans les journaux Cloudflare.
//
// À déclarer dans cPanel → Application Manager (variable runtime, pas de
// préfixe NEXT_PUBLIC_ : elle ne doit jamais partir dans le bundle client).
//
// Pourquoi seulement des chemins et pas de revalidateTag : aucun fetch du
// projet ne pose de `tags` sur ses appels, une invalidation par tag ne ferait
// donc rien aujourd'hui. Et en Next 16 la signature est devenue
// revalidateTag(tag, profile) — inutile d'exposer une API qu'on n'utilise pas.
// Le jour où des tags seront posés sur les fetch, ça s'ajoute ici.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

/** Plafond de sécurité : évite qu'un appel malveillant ne fasse régénérer tout le site. */
const MAX_ITEMS = 20;

interface RevalidateBody {
    paths?: unknown;
}

/**
 * Comparaison à temps constant.
 *
 * On hache les deux valeurs avant de comparer : timingSafeEqual exige des
 * buffers de même longueur, et un sha256 les normalise à 32 octets. Comparer
 * les chaînes brutes avec `===` divulguerait la longueur du secret et
 * s'arrêterait au premier octet différent.
 */
function secretMatches(provided: string | null): boolean {
    const expected = process.env.REVALIDATE_SECRET;

    if (!expected || !provided) {
        return false;
    }

    return timingSafeEqual(
        createHash('sha256').update(provided).digest(),
        createHash('sha256').update(expected).digest(),
    );
}

/**
 * Ne garde que des chemins absolus internes.
 *
 * Sans ce filtre, un `//evil.com` ou un `../` traverserait jusqu'à
 * revalidatePath et ferait au mieux du bruit, au pire une invalidation
 * inattendue.
 */
function sanitizePaths(input: unknown): string[] {
    if (!Array.isArray(input)) {
        return [];
    }

    return input
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(
            (value) =>
                value.startsWith('/') &&
                !value.startsWith('//') &&
                !value.includes('..'),
        )
        .slice(0, MAX_ITEMS);
}


export async function POST(request: Request) {
    // Un secret absent de l'environnement est une erreur de configuration, pas
    // un refus d'accès : on le distingue d'un 401 pour que le diagnostic soit
    // immédiat côté cPanel.
    if (!process.env.REVALIDATE_SECRET) {
        return NextResponse.json(
            { revalidated: false, error: 'REVALIDATE_SECRET non configurée sur le serveur' },
            { status: 503 },
        );
    }

    if (!secretMatches(request.headers.get('x-tfe-revalidate-secret'))) {
        return NextResponse.json({ revalidated: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: RevalidateBody = {};

    try {
        body = (await request.json()) as RevalidateBody;
    } catch {
        // Corps vide ou JSON invalide : on retombe sur la home, qui est le cas
        // d'usage à 90 % (slider vidéos, Hero, dernières publications).
        body = {};
    }

    let paths = sanitizePaths(body.paths);

    if (paths.length === 0) {
        paths = ['/'];
    }

    for (const path of paths) {
        revalidatePath(path);
    }

    return NextResponse.json({
        revalidated: true,
        paths,
        now: Date.now(),
    });
}

/**
 * GET renvoie seulement un état de configuration — jamais d'invalidation.
 *
 * Une invalidation déclenchable en GET serait à la portée du premier crawler
 * qui devine l'URL, et pourrait être mise en cache par Cloudflare.
 */
export async function GET() {
    return NextResponse.json({
        ok: true,
        configured: Boolean(process.env.REVALIDATE_SECRET),
        hint: 'POST avec en-tête x-tfe-revalidate-secret et corps {"paths":["/"]}',
    });
}
