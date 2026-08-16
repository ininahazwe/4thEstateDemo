import { cache } from "react";
import { decode } from "html-entities";
import { buildHref, WPPost } from "./wpApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WpArticleAuthor {
    displayName: string;
    slug: string;
    avatarUrl?: string;
}

export interface WpArticle {
    id: number;
    slug: string;
    title: string;
    /**
     * Excerpt tel que renvoyé par WordPress — rédigé ou auto-généré, sans
     * distinction. Réservé aux usages où il FAUT toujours un texte : meta
     * description, Open Graph, JSON-LD. Pour l'affichage, utiliser `lede`.
     */
    excerpt: string;
    /**
     * Chapô réellement RÉDIGÉ dans la boîte « Extrait » du back-office, ou
     * `undefined` si elle est vide. C'est le champ à afficher (hero
     * storytelling, .article-lede). Voir pickManualExcerpt().
     */
    lede?: string;
    content: string;
    strapline?: string;
    source?: string;
    authors: WpArticleAuthor[];
    readTime?: string;
    publishedAt: string;
    publishedAtISO: string;
    featuredImage?: string;
    /**
     * Vidéo de hero, jouée en boucle à la place de l'image mise en avant —
     * celle-ci reste renseignée et sert de `poster`. Alimentée par le panneau
     * « Hero video » de l'éditeur (mu-plugin `tfe-hero-video.php`), exposée en
     * REST sous `hero_video`. Voir pickHeroVideoUrl().
     */
    heroVideo?: string;
    imageCaption?: string;
    imageCredit?: string;
    category?: { name: string; slug: string };
    country?: { name: string; slug: string };
    tags: Array<{ label: string; href: string }>;
    // IDs bruts pour les requêtes de recommandation
    tagIds: number[];
    categoryIds: number[];
    // Template "storytelling" (case ACF is_storytelling)
    isStorytelling: boolean;
    // Arbre de blocs Gutenberg brut (register_rest_field 'blocks', null si !isStorytelling)
    blocks: WpBlock[] | null;
}

/**
 * Bloc Gutenberg brut tel que renvoyé par parse_blocks() côté WP.
 *
 * Exposé par le mu-plugin `tfe-storytelling.php`
 * (wp-content/mu-plugins/), PAS par le functions.php du thème : le code y
 * vivait auparavant, mais Foxiz est un thème commercial mis à jour, et le
 * champ était calculé même en `context=edit`, ce qui cassait l'éditeur de
 * blocs sur les posts storytelling.
 *
 * Seulement présent quand acf.is_storytelling est coché, et seulement en
 * contexte `view` — voir mapWpBlocksToMediaBlocks() dans ./blockMapper.ts
 * pour la conversion en MediaBlock[] (front).
 */
export interface WpBlock {
    blockName: string;
    attrs: Record<string, unknown>;
    innerHTML: string;
    innerBlocks: WpBlock[];
}

export interface WpArticleCard {
    id: number;
    slug: string;
    strapline?: string;
    title: string;
    href: string;
    image?: string;
    isPremium?: boolean;
    category?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const WP_API =
    process.env.NEXT_PUBLIC_WP_API_URL || "https://cms.thefourthestategh.com/wp-json/wp/v2";

// ─── Helpers privés ───────────────────────────────────────────────────────────

function stripHtml(html: string): string {
    // decode() convertit les entités HTML (&#8220;, &#8217;, &hellip;, etc.)
    // en caractères réels — sans ça, WordPress renvoie l'entité brute et
    // React l'affiche telle quelle puisque le texte n'est pas injecté en HTML.
    return decode(html.replace(/<[^>]+>/g, "")).trim();
}

/**
 * Distingue un chapô RÉDIGÉ d'un chapô AUTO-GÉNÉRÉ par WordPress.
 *
 * WordPress renvoie toujours un `excerpt.rendered`, même quand la boîte
 * « Extrait » du back-office est vide : il en fabrique alors un en tronquant
 * le DÉBUT DU CONTENU. Le front affichait donc, sur ces posts-là, la première
 * phrase de l'article en guise de chapô — texte redondant, juste au-dessus de
 * ce même paragraphe.
 *
 * Détection sans authentification : un excerpt auto-généré est, par
 * construction, le préfixe du contenu dépouillé de son HTML. On compare donc
 * les deux. (`excerpt.raw`, qui donnerait la valeur stockée directement,
 * n'existe qu'en `context=edit` — donc seulement pour une requête authentifiée,
 * ce que le front ne fait pas.)
 *
 * La normalisation est indispensable avant comparaison : `excerpt.rendered`
 * passe par wpautop et par `excerpt_more` (le « […] » final), et les espaces
 * insécables / retours ligne diffèrent entre les deux champs.
 */
function pickManualExcerpt(rawExcerpt: string, rawContent: string): string | undefined {
    const excerpt = stripHtml(rawExcerpt);
    if (!excerpt) return undefined;

    // Espaces (y compris insécables) normalisés, marqueur de troncature retiré,
    // casse ignorée : seule la SUITE DE MOTS compte pour la comparaison.
    // L'espace insécable (U+00A0) est traité explicitement : \s le couvre en
    // JS, mais l'écrire en échappement plutôt qu'en caractère littéral évite
    // qu'un invisible dans le source rende la règle illisible. Le marqueur de
    // troncature est retiré APRÈS l'aplatissement des espaces, sinon un « … »
    // précédé d'un insécable échapperait à l'ancrage de fin.
    const normalize = (s: string) =>
        s
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\s*(?:\[\s*(?:\u2026|\.\.\.)?\s*\]|\u2026|\.\.\.)$/, "")
            .trim()
            .toLowerCase();

    const normalizedExcerpt = normalize(excerpt);
    if (!normalizedExcerpt) return undefined;

    // Contenu tronqué à un peu plus que la longueur de l'excerpt : inutile de
    // normaliser un article entier à chaque rendu pour un test de préfixe.
    const normalizedContent = normalize(stripHtml(rawContent).slice(0, normalizedExcerpt.length * 3 + 200));

    // Préfixe du contenu = WordPress a recopié le début de l'article → la boîte
    // « Extrait » est vide, on ne renvoie rien.
    if (normalizedContent.startsWith(normalizedExcerpt)) return undefined;

    return excerpt;
}

/**
 * Lit le champ REST `hero_video`, exposé à la RACINE de l'objet post par le
 * mu-plugin `tfe-hero-video.php` (wp-content/mu-plugins/) — pas dans `acf` :
 * ce n'est pas un champ ACF mais une meta WordPress native, pilotée par un
 * panneau maison dans la sidebar de l'éditeur.
 *
 * Le mu-plugin renvoie déjà l'URL résolue (ou `null`) plutôt que l'ID de la
 * pièce jointe : le front n'a donc aucune requête /wp/v2/media supplémentaire
 * à faire. La valeur stockée en base reste l'ID, pour survivre à un changement
 * de domaine ou au passage des uploads sur un CDN.
 */
function pickHeroVideoUrl(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Tailles WP disponibles sur l'install (thème Foxiz) : thumbnail (150),
 * medium (300), medium_large (768), large (1024), 1536x1536, 2048x2048, full.
 * Les foxiz_crop_* sont des crops à ratio fixe — ignorées, on garde le ratio
 * original de l'image.
 *
 * 'hero' (featuredImage, ~3/4 écran desktop) → large (1024px), suffisant en
 * netteté pour cet usage et nettement plus léger que le full-size (souvent
 * 2500px / plusieurs Mo).
 * 'card' (vignettes ReadMore/Related/MostRead) → medium_large (768px).
 */
function pickWpImageUrl(
    media: Record<string, unknown> | undefined,
    sizePriority: string[]
): string | undefined {
    if (!media) return undefined;
    const mediaDetails = media.media_details as
        | { sizes?: Record<string, { source_url: string }> }
        | undefined;
    const sizes = mediaDetails?.sizes;
    if (sizes) {
        for (const sizeName of sizePriority) {
            const url = sizes[sizeName]?.source_url;
            if (url) return url;
        }
    }
    return (media.source_url as string) ?? undefined;
}

const HERO_SIZE_PRIORITY = ['large', 'medium_large', '1536x1536'];
const CARD_SIZE_PRIORITY = ['medium_large', 'large', 'medium'];

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-EN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function estimateReadTime(htmlContent: string): string {
    const words = stripHtml(htmlContent).split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return `Reading time ${minutes} min.`;
}

function buildArticleCard(post: Record<string, unknown>): WpArticleCard {
    const acf = (post.acf ?? {}) as Record<string, unknown>;
    const embedded = (post._embedded ?? {}) as Record<string, unknown>;
    const media = (
        embedded["wp:featuredmedia"] as Array<Record<string, unknown>>
    )?.[0];
    const terms = (
        embedded["wp:term"] as Array<Array<Record<string, unknown>>>
    )?.[0] ?? [];

    return {
        id: post.id as number,
        slug: post.slug as string,
        title: decode((post.title as { rendered: string }).rendered),
        href: buildHref(post as unknown as WPPost),
        image: pickWpImageUrl(media, CARD_SIZE_PRIORITY),
        strapline: (acf.strapline as string) ?? undefined,
        isPremium: (acf.is_premium as boolean) ?? false,
        category: terms[0]?.name ? decode(terms[0].name as string) : undefined,
    };
}

// ─── Exports publics ──────────────────────────────────────────────────────────

/**
 * Récupère un article complet par son slug.
 *
 * Enveloppé dans React.cache() : si generateMetadata() ET la page elle-même
 * appellent getArticleBySlug(slug) durant le même rendu serveur, le fetch
 * réseau n'est exécuté QU'UNE FOIS — le second appel reçoit le résultat
 * déjà résolu en mémoire. Élimine un fetch WordPress redondant à chaque
 * chargement de page article.
 */
export const getArticleBySlug = cache(async (slug: string): Promise<WpArticle | null> => {
    try {
        const res = await fetch(
            `${WP_API}/posts?slug=${encodeURIComponent(slug)}&_embed=1`,
            // revalidate passé de 60s à 600s : le contenu éditorial change rarement
            // après publication, donc une fenêtre de cache plus longue réduit la
            // fréquence des "cache miss" qui déclenchent le fetch réseau lent
            // (Frankfort ↔ Ghana). Un article déjà visité reste donc rapide
            // beaucoup plus longtemps qu'avant.
            { next: { revalidate: 600 } }
        );
        if (!res.ok) return null;

        const posts = (await res.json()) as Array<Record<string, unknown>>;
        if (!posts.length) return null;

        const post = posts[0];
        const acf = (post.acf ?? {}) as Record<string, unknown>;
        const embedded = (post._embedded ?? {}) as Record<string, unknown>;
        const media = (
            embedded["wp:featuredmedia"] as Array<Record<string, unknown>>
        )?.[0];
        const allTerms = (
            embedded["wp:term"] as Array<Array<Record<string, unknown>>>
        ) ?? [];
        const categoryTerms = allTerms[0] ?? [];
        const tagTerms = allTerms[1] ?? [];
        const rawAuthors = (post.authors as Array<Record<string, unknown>>) ?? [];

        return {
            id: post.id as number,
            slug: post.slug as string,
            title: decode((post.title as { rendered: string }).rendered),
            excerpt: stripHtml((post.excerpt as { rendered: string }).rendered),
            lede: pickManualExcerpt(
                (post.excerpt as { rendered: string }).rendered,
                (post.content as { rendered: string }).rendered
            ),
            content: (post.content as { rendered: string }).rendered,
            strapline: (acf.strapline as string) ?? undefined,
            source: (acf.source as string) ?? undefined,
            authors: rawAuthors.map((a) => ({
                displayName: a.display_name as string,
                slug: a.slug as string,
                avatarUrl: (a.avatar_url as string) ?? undefined,
            })),
            readTime:
                (acf.read_time as string) ??
                estimateReadTime((post.content as { rendered: string }).rendered),
            publishedAt: formatDate(post.date as string),
            publishedAtISO: post.date as string,
            featuredImage: pickWpImageUrl(media, HERO_SIZE_PRIORITY),
            heroVideo: pickHeroVideoUrl(post.hero_video),
            imageCaption: (media?.caption as { rendered: string })?.rendered
                ? stripHtml((media.caption as { rendered: string }).rendered)
                : undefined,
            imageCredit: (acf.image_credit as string) ?? undefined,
            category: categoryTerms[0]
                ? {
                    name: decode(categoryTerms[0].name as string),
                    slug: categoryTerms[0].slug as string,
                }
                : undefined,
            country:
                acf.country_name && acf.country_slug
                    ? {
                        name: acf.country_name as string,
                        slug: acf.country_slug as string,
                    }
                    : undefined,
            tags: tagTerms.map((t) => ({
                label: decode(t.name as string),
                href: `/sujet/${t.slug as string}`,
            })),
            // IDs bruts pour les requêtes getReadMoreArticles
            tagIds: (post.tags as number[]) ?? [],
            categoryIds: (post.categories as number[]) ?? [],
            isStorytelling: (acf.is_storytelling as boolean) ?? false,
            blocks: (post.blocks as WpBlock[] | null) ?? null,
        };
    } catch {
        return null;
    }
});

/**
 * Récupère des articles partageant les mêmes tags ou catégorie.
 * Utilisé à la fois pour les encarts "À lire aussi" et la grille "Sur le même sujet".
 *
 * Les deux fetches (tags puis catégorie) restent séquentiels par nécessité :
 * le second ne se déclenche QUE si le premier n'a pas donné assez de résultats.
 * Pour limiter l'impact, le fetch par tags est prioritaire et suffit dans la
 * majorité des cas (count=3 atteint dès le premier fetch si l'article a des tags).
 */
export async function getReadMoreArticles(
    currentId: number,
    tagIds: number[],
    categoryIds: number[],
    count = 3
): Promise<WpArticleCard[]> {
    const results: WpArticleCard[] = [];
    const seen = new Set<number>([currentId]);

    // 1. Par tags (plus précis)
    if (tagIds.length > 0) {
        try {
            const res = await fetch(
                `${WP_API}/posts?tags=${tagIds.join(",")}&exclude=${currentId}&per_page=${count}&_embed=1`,
                { next: { revalidate: 300 } }
            );
            if (res.ok) {
                const posts = (await res.json()) as Array<Record<string, unknown>>;
                for (const post of posts) {
                    if (results.length >= count) break;
                    if (!seen.has(post.id as number)) {
                        seen.add(post.id as number);
                        results.push(buildArticleCard(post));
                    }
                }
            }
        } catch { /* continue */ }
    }

    // 2. Compléter par catégorie si besoin
    if (results.length < count && categoryIds.length > 0) {
        try {
            const remaining = count - results.length;
            const excludeIds = [...seen].join(",");
            const res = await fetch(
                `${WP_API}/posts?categories=${categoryIds.join(",")}&exclude=${excludeIds}&per_page=${remaining}&_embed=1`,
                { next: { revalidate: 300 } }
            );
            if (res.ok) {
                const posts = (await res.json()) as Array<Record<string, unknown>>;
                for (const post of posts) {
                    if (results.length >= count) break;
                    if (!seen.has(post.id as number)) {
                        seen.add(post.id as number);
                        results.push(buildArticleCard(post));
                    }
                }
            }
        } catch { /* continue */ }
    }

    return results;
}

/**
 * Récupère les articles les plus lus pour la sidebar.
 */
export async function getMostReadArticles(count = 4): Promise<WpArticleCard[]> {
    try {
        const res = await fetch(
            `${WP_API}/posts?per_page=${count}&orderby=date&order=desc&_embed=1`,
            { next: { revalidate: 300 } }
        );
        if (!res.ok) return [];

        const posts = (await res.json()) as Array<Record<string, unknown>>;
        return posts.map(buildArticleCard);
    } catch {
        return [];
    }
}
