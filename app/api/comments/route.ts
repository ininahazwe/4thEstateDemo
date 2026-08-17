import { NextResponse } from 'next/server';

/**
 * Dépôt d'un commentaire.
 *
 * Le navigateur ne parle jamais à WordPress directement : cette route valide,
 * limite le débit, puis relaie vers `tfe/v1/comment` (mu-plugin
 * tfe-comments.php) avec la clé API server-to-server. Côté WordPress, tout
 * commentaire arrive **en attente de modération**, et Akismet est appliqué.
 */

const NAME_MIN = 2;
const NAME_MAX = 60;
const CONTENT_MIN = 5;
const CONTENT_MAX = 5000;

/** 3 commentaires par IP et par tranche de 10 minutes. */
const RATE_MAX = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Compteur en mémoire de process.
 *
 * Volontairement simple : c'est un ralentisseur, pas une sécurité. Il ne
 * survit pas à un redémarrage de l'app et n'est pas partagé entre les process
 * Passenger — la vraie barrière reste la modération a priori plus Akismet. Une
 * limite mutualisée demanderait un store partagé (option WP, Redis), ce qui
 * n'en vaut pas le coût ici.
 */
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const cutoff = now - RATE_WINDOW_MS;

    // Purge globale : sans elle, la Map grossit indéfiniment sur un process
    // qui tourne des semaines.
    for (const [key, stamps] of hits) {
        const kept = stamps.filter((t) => t > cutoff);
        if (kept.length) {
            hits.set(key, kept);
        } else {
            hits.delete(key);
        }
    }

    const recent = hits.get(ip) ?? [];

    if (recent.length >= RATE_MAX) return true;

    hits.set(ip, [...recent, now]);
    return false;
}

/**
 * IP réelle du visiteur. Cloudflare est devant le site, `cf-connecting-ip` est
 * donc la source la plus fiable ; `x-forwarded-for` sert de repli (premier
 * maillon de la chaîne).
 */
function visitorIp(req: Request): string {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();

    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();

    return 'unknown';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
    const apiUrl = process.env.TFE_CMS_API_URL;
    const apiKey = process.env.TFE_CMS_API_KEY;

    if (!apiUrl || !apiKey) {
        console.error(
            'comments : TFE_CMS_API_URL / TFE_CMS_API_KEY absentes — cf. wordpress/mu-plugins/tfe-comments.php'
        );
        return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }

    let body: {
        postId?: number | string;
        parent?: number | string;
        name?: string;
        email?: string;
        content?: string;
        website?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    // Honeypot : champ invisible pour un humain, rempli par les bots qui
    // remplissent tout ce qu'ils trouvent. On répond 200 sans rien écrire —
    // un 400 apprendrait au bot à contourner le champ.
    if (body.website) {
        return NextResponse.json({ ok: true, pending: true });
    }

    const postId = Number(body.postId);
    const parent = Number(body.parent ?? 0);
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim();
    const content = (body.content ?? '').trim();

    if (!Number.isInteger(postId) || postId <= 0) {
        return NextResponse.json({ error: 'invalid_post' }, { status: 400 });
    }

    if (name.length < NAME_MIN || name.length > NAME_MAX) {
        return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    }

    if (!EMAIL_RE.test(email) || email.length > 100) {
        return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    if (content.length < CONTENT_MIN || content.length > CONTENT_MAX) {
        return NextResponse.json({ error: 'invalid_content' }, { status: 400 });
    }

    if (isRateLimited(visitorIp(req))) {
        return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    try {
        const res = await fetch(`${apiUrl}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-TFE-API-Key': apiKey,
                // Transmis pour qu'Akismet et le contrôle de flood de
                // WordPress voient le visiteur, et non le serveur Next.
                'X-TFE-Visitor-IP': visitorIp(req),
                'X-TFE-Visitor-UA': req.headers.get('user-agent') ?? '',
            },
            body: JSON.stringify({
                post: postId,
                parent: Number.isInteger(parent) && parent > 0 ? parent : 0,
                author_name: name,
                author_email: email,
                content,
            }),
            cache: 'no-store',
        });

        if (!res.ok) {
            // Le message de WordPress est déjà lisible par un humain
            // (commentaires fermés, doublon, flood) : on le fait remonter au
            // formulaire plutôt qu'un « erreur » opaque.
            const detail = (await res.json().catch(() => null)) as { message?: string } | null;
            console.error(`comments : WP a renvoyé ${res.status}`, detail?.message ?? '');

            return NextResponse.json(
                { error: 'rejected', message: detail?.message ?? null },
                { status: res.status === 403 || res.status === 400 ? res.status : 502 }
            );
        }

        return NextResponse.json({ ok: true, pending: true }, { status: 201 });
    } catch (err) {
        console.error('comments : fetch vers WP échoué', err);
        return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 });
    }
}
