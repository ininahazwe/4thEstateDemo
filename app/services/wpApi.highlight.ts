// ---------------------------------------------------------------------------
// wpApi.highlight.ts — dédié au CPT "highlight" (créé via ACF, rest_base
// "highlight"), consommé par le bandeau vignettes de SiteBannerV2.
// Fichier indépendant, même convention que wpApi.tv.ts / wpApi.videoStory.ts.
//
// Champs ACF (voir GET /wp-json/wp/v2/highlight) :
//   acf.type      — 'serie' | 'podcast' | 'video' | 'upcoming', requis
//   acf.tag       — tag WP, optionnel. Depuis tfe-highlight.php le champ est
//                   un sélecteur de taxonomie et ACF renvoie un ID DE TERME
//                   (nombre). Les anciennes entrées contiennent encore une
//                   CHAÎNE (nom ou slug saisi à la main) : les deux formats
//                   sont acceptés, voir resolveTags. Si le tag est résolu, le
//                   lien pointe vers /tag/{slug} et le badge affiche son nom.
//   acf.badge     — libellé du badge, optionnel. Saisi à la main, il prime sur
//                   tout le reste. Vide, on retombe sur le nom du tag, puis sur
//                   le libellé générique du type.
//   acf.title     — texte libre affiché, optionnel
//   acf.href      — lien utilisé seulement si acf.tag est vide ou non résolu
//   acf.thumbnail — ID média WP (nombre) ou "" si vide. Utilisée pour tous
//                   les types sauf podcast et upcoming (icône fixe côté
//                   composant, même si un média est renseigné). Pour
//                   "video" sans thumbnail renseignée : fallback icône
//                   video (voir showThumbnail plus bas).
//
// À NOTER : `href` est FACULTATIF. Une entrée sans destination exploitable
// (ni tag résolu, ni href) est rendue sans lien du tout, plutôt qu'avec un
// `#` mort — c'est le cas légitime d'un "upcoming" annoncé avant que la page
// cible n'existe.
//
// Limite éditoriale : 4 entrées, pas une limite technique côté API.
// ---------------------------------------------------------------------------

import { decode } from 'html-entities';

export type HighlightType = 'serie' | 'podcast' | 'video' | 'upcoming';

export interface HighlightItem {
    id: string;
    type: HighlightType;
    /** Texte libre affiché (acf.title) — peut être vide si l'éditeur a tout laissé au tag. */
    title: string;
    /** Destination. `undefined` = aucune destination exploitable, la vignette est rendue sans lien. */
    href?: string;
    /** Libellé badge : acf.badge si saisi, sinon nom du tag, sinon libellé générique du type. */
    badge: string;
    /** Absente pour type=podcast/upcoming (icône fixe côté composant), et pour video sans image renseignée. */
    thumbnail?: string;
}

const WP_BASE = process.env.NEXT_PUBLIC_WP_API_URL || 'https://cms.thefourthestategh.com/wp-json/wp/v2';

interface WPHighlightPost {
    id: number;
    acf: {
        type?: HighlightType;
        badge?: string;
        // `null` quand aucun tag n'est selectionne — c'est ce que renvoie
        // le champ Taxonomy d'ACF, pas une chaine vide.
        tag?: string | number | null;
        title?: string;
        href?: string;
        thumbnail?: number | string;
    };
}

interface WPTagTerm {
    id: number;
    name: string;
    slug: string;
}

interface WPMediaItem {
    id: number;
    source_url: string;
}

const TYPE_BADGE_FALLBACK: Record<HighlightType, string> = {
    serie: 'Series',
    podcast: 'Podcast',
    video: 'Video',
    upcoming: 'Coming soon',
};

/**
 * Normalise une saisie éditoriale (nom OU slug) en slug WordPress plausible.
 * « Big Push » et « L'Éducation » donnent « big-push » et « leducation »,
 * ce qui correspond à la façon dont WordPress fabrique ses slugs.
 */
function toSlugCandidate(input: string): string {
    return input
        .normalize('NFD')                    // décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, '')    // retire les diacritiques
        .toLowerCase()
        .trim()
        .replace(/[\u2018\u2019']/g, '')     // apostrophes droites et typographiques
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Résout les valeurs du champ `tag` en termes WordPress.
 *
 * Trois passes, parce que deux formats coexistent le temps de la migration
 * vers le champ Taxonomy de tfe-highlight.php :
 *   0. IDs de termes (nouveau format) — une requête `?include=`, sans
 *      ambiguïté. C'est le chemin nominal.
 *   1. anciennes saisies texte : requête groupée `?slug=` sur les slugs
 *      candidats, ce qui couvre en un aller-retour ceux qui avaient bien
 *      saisi un slug.
 *   2. saisies encore non résolues : recherche `?search=` par nom, car
 *      l'ancien champ était libre et l'équipe y tapait « Big Push ».
 *
 * La passe 2 exige une correspondance EXACTE (sur le slug, ou sur le nom une
 * fois normalisé). On ne retient jamais « le premier résultat » : `search`
 * matche des fragments, et pointer vers le mauvais tag serait plus nuisible
 * que de ne pas poser de lien.
 *
 * @returns Map indexée sur `String(valeur brute)` — les deux formats
 *          cohabitent, la clé est donc toujours une chaîne.
 */
async function resolveTags(rawInputs: Array<string | number>): Promise<Map<string, WPTagTerm>> {
    const resolved = new Map<string, WPTagTerm>();
    if (!rawInputs.length) return resolved;

    // --- Passe 0 : IDs de termes, format renvoyé par le champ Taxonomy -----
    // C'est le chemin nominal depuis tfe-highlight.php : une seule requête,
    // aucune ambiguïté possible.
    const ids = rawInputs.filter((v): v is number => typeof v === 'number' && v > 0);
    if (ids.length > 0) {
        try {
            const res = await fetch(
                `${WP_BASE}/tags?include=${ids.join(',')}&per_page=${ids.length}`,
                { next: { revalidate: 3600 } }
            );
            if (res.ok) {
                const terms: WPTagTerm[] = await res.json();
                for (const t of terms) {
                    resolved.set(String(t.id), { ...t, name: decode(t.name) });
                }
            }
        } catch (error) {
            console.error('Erreur wpApi.highlight [resolveTags/include]:', error);
        }
    }

    // Reste les saisies texte des entrées non encore reprises.
    const textInputs = rawInputs.filter((v): v is string => typeof v === 'string' && v.trim() !== '');

    // --- Passe 1 : tentative directe par slug, groupée en une requête -------
    const candidates = new Map<string, string>(); // slug candidat -> saisie brute
    for (const raw of textInputs) {
        const slug = toSlugCandidate(raw);
        if (slug) candidates.set(slug, raw);
    }

    if (candidates.size > 0) {
        // encodeURIComponent sur CHAQUE slug, jamais sur la liste entière :
        // les virgules séparatrices doivent rester des virgules.
        const qs = Array.from(candidates.keys()).map(encodeURIComponent).join(',');
        try {
            const res = await fetch(
                `${WP_BASE}/tags?slug=${qs}&per_page=${candidates.size}`,
                { next: { revalidate: 3600 } }
            );
            if (res.ok) {
                const terms: WPTagTerm[] = await res.json();
                for (const t of terms) {
                    const raw = candidates.get(t.slug);
                    if (raw) resolved.set(String(raw), { ...t, name: decode(t.name) });
                }
            }
        } catch (error) {
            console.error('Erreur wpApi.highlight [resolveTags/slug]:', error);
        }
    }

    // --- Passe 2 : recherche par nom pour les saisies non résolues ----------
    const missing = textInputs.filter((raw) => !resolved.has(raw));
    if (missing.length > 0) {
        const found = await Promise.all(
            missing.map(async (raw): Promise<readonly [string, WPTagTerm] | null> => {
                try {
                    const res = await fetch(
                        `${WP_BASE}/tags?search=${encodeURIComponent(raw)}&per_page=20`,
                        { next: { revalidate: 3600 } }
                    );
                    if (!res.ok) return null;

                    const terms: WPTagTerm[] = await res.json();
                    const wanted = toSlugCandidate(raw);
                    const hit = terms.find(
                        (t) => t.slug === wanted || toSlugCandidate(decode(t.name)) === wanted
                    );
                    return hit ? ([raw, { ...hit, name: decode(hit.name) }] as const) : null;
                } catch (error) {
                    console.error('Erreur wpApi.highlight [resolveTags/search]:', error);
                    return null;
                }
            })
        );

        for (const entry of found) {
            if (entry) resolved.set(entry[0], entry[1]);
        }
    }

    // Trace explicite : sans elle, une faute de frappe côté ACF se traduit par
    // une vignette silencieusement dépourvue de lien, impossible à diagnostiquer.
    for (const raw of rawInputs) {
        if (!resolved.has(String(raw))) {
            const detail = typeof raw === 'number'
                ? `ID de terme ${raw} (terme supprimé ?)`
                : `saisie « ${raw} », slug candidat « ${toSlugCandidate(raw)} »`;
            console.warn(`wpApi.highlight : tag introuvable — ${detail}. Repli sur acf.href.`);
        }
    }

    return resolved;
}

async function fetchMediaUrls(ids: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!ids.length) return map;
    const res = await fetch(
        `${WP_BASE}/media?include=${ids.join(',')}&per_page=100`,
        { next: { revalidate: 600 } }
    );
    if (!res.ok) return map;
    const medias: WPMediaItem[] = await res.json();
    medias.forEach((m) => map.set(m.id, m.source_url));
    return map;
}

export async function getHighlights(limit: number = 4): Promise<HighlightItem[]> {
    try {
        const res = await fetch(
            `${WP_BASE}/highlight?per_page=${limit}&status=publish&orderby=date&order=desc&_fields=id,acf`,
            { next: { revalidate: 600 } }
        );

        if (!res.ok) {
            console.error(`Erreur wpApi.highlight [getHighlights]: ${res.status}`);
            return [];
        }

        const posts: WPHighlightPost[] = await res.json();
        const valid = posts.filter((p) => p.acf?.type);

        // `tag` vaut un ID de terme (nouveau format) ou une chaîne (ancien).
        const tagInputs = Array.from(
            new Set(
                valid
                    .map((p) => (typeof p.acf.tag === 'string' ? p.acf.tag.trim() : p.acf.tag))
                    .filter((v): v is string | number => typeof v === 'number' ? v > 0 : !!v)
            )
        );
        const thumbnailIds = Array.from(
            new Set(
                valid
                    .map((p) => p.acf.thumbnail)
                    .filter((id): id is number => typeof id === 'number' && id > 0)
            )
        );

        const [tagMap, mediaMap] = await Promise.all([
            resolveTags(tagInputs),
            fetchMediaUrls(thumbnailIds),
        ]);

        return valid.map((post) => {
            const type = post.acf.type!;
            const rawTag = typeof post.acf.tag === 'string' ? post.acf.tag.trim() : post.acf.tag;
            const hasTag = typeof rawTag === 'number' ? rawTag > 0 : !!rawTag;
            const tag = hasTag ? tagMap.get(String(rawTag)) : undefined;

            // Ordre de priorité : tag résolu, puis acf.href, puis rien.
            // `undefined` et non `'#'` : une vignette sans destination est
            // rendue sans balise <a> par BannerHighlights.
            const rawHref = post.acf.href?.trim();
            const href = tag ? `/tag/${tag.slug}` : (rawHref || undefined);

            // Priorité : saisie manuelle, puis nom du tag, puis libellé
            // générique du type. `trim()` avant le `||` pour qu'un champ
            // rempli d'espaces n'écrase pas le repli.
            const badge = post.acf.badge?.trim() || (tag ? tag.name : TYPE_BADGE_FALLBACK[type]);

            const thumbnailId = typeof post.acf.thumbnail === 'number' ? post.acf.thumbnail : undefined;
            // Thumbnail dispo pour tous les types sauf podcast et upcoming
            // (icône fixe pour ces deux-là, même si un média est renseigné
            // côté ACF — évite qu'une image générique/placeholder envoyée
            // par erreur pour un "upcoming" s'affiche à la place de l'icône).
            // "video" l'utilise ; fallback sur l'icône video si absente.
            const showThumbnail = type !== 'podcast' && type !== 'upcoming';
            const thumbnail = showThumbnail && thumbnailId ? mediaMap.get(thumbnailId) : undefined;

            return {
                id: `highlight-${post.id}`,
                type,
                title: post.acf.title ?? '',
                href,
                badge,
                thumbnail,
            };
        });

    } catch (error) {
        console.error('Erreur wpApi.highlight [getHighlights]:', error);
        return [];
    }
}
