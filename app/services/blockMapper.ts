import { decode } from "html-entities";
import type { WpBlock } from "./wpApi.article";

// ─────────────────────────────────────────────────────────────────────────────
// blockMapper — convertit l'arbre de blocs Gutenberg brut (WpBlock[], issu de
// parse_blocks() côté WP) en MediaBlock[], le format consommé par
// ArticleMediaLayout. Isole toute la logique de parsing HTML/regex loin du
// composant de présentation : si WordPress change la structure d'un bloc,
// seul ce fichier bouge.
// ─────────────────────────────────────────────────────────────────────────────

export type MediaBlock =
    | { type: "heading"; text: string }
    | { type: "quote"; text: string }
    | { type: "body"; paragraphs: string[] } // HTML inline assaini (cf. sanitizeInlineHtml)
    | { type: "list"; items: string[] }
    | { type: "image"; src: string; alt: string; caption?: string }
    | { type: "gallery"; images: { src: string; alt: string; caption?: string }[] }
    | { type: "mediaText"; src: string; alt: string; paragraphs: string[]; position: "left" | "right" }
    | { type: "cover"; src: string; alt: string; text?: string; overlayColor?: string; dimRatio?: number }
    | { type: "audio"; src: string }
    | { type: "video"; src: string; poster?: string }
    | { type: "embed"; provider: "spotify" | "youtube" | "vimeo"; src: string }
    | {
          type: "podcast";
          episodeId: string;
          title: string;
          show: string;
          description: string;
          cover: string;
          duration?: string;
      };

// ─── Helpers privés ───────────────────────────────────────────────────────────

function stripTags(html: string): string {
    return decode(html.replace(/<[^>]+>/g, "")).trim();
}

/**
 * Balises inline conservées dans les paragraphes : celles qui portent du SENS.
 * Tout le reste (span, font, mark, small, u…) est dépouillé — la balise
 * disparaît, son texte reste.
 */
const ALLOWED_INLINE_TAGS = new Set(["a", "strong", "b", "em", "i", "br", "sup", "sub"]);

/**
 * Neutralise la mise en forme inline injectée par l'éditeur WordPress.
 *
 * L'éditeur de blocs laisse passer, dans le corps d'un paragraphe, des
 * `<span style="color:…">`, des tailles de police en dur, des `<mark>`, des
 * classes `has-*`… Sur le template storytelling, dont la typographie est
 * imposée par le design, ces styles cassent l'uniformité du texte. On ne
 * garde donc que les balises sémantiques, sans aucun attribut — sauf `href`
 * sur les liens.
 *
 * Implémentation par regex et non par DOMParser : ce mapper tourne côté
 * serveur (composant serveur Next), où il n'y a pas de DOM. Acceptable ici
 * parce que l'entrée est du HTML produit par WordPress à partir de la saisie
 * de la rédaction — ce n'est pas une frontière de sécurité face à du contenu
 * arbitraire. Pour ça il faudrait une vraie lib de sanitisation.
 */
function sanitizeInlineHtml(html: string): string {
    return html
        // Commentaires (délimiteurs de blocs Gutenberg résiduels, etc.).
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, rawTag: string, attrs: string) => {
            const tag = rawTag.toLowerCase();

            // Balise non retenue : on la dépouille, le texte qu'elle entoure
            // reste en place (y compris la balise fermante, d'où le traitement
            // identique pour l'ouvrante et la fermante).
            if (!ALLOWED_INLINE_TAGS.has(tag)) return "";

            if (match.startsWith("</")) return `</${tag}>`;
            if (tag === "br") return "<br />";

            // strong / em / sup / sub : aucun attribut n'est utile.
            if (tag !== "a") return `<${tag}>`;

            const href = /\shref=["']([^"']*)["']/i.exec(attrs)?.[1]?.trim() ?? "";
            const isSafe =
                /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) && !/["<>]/.test(href);

            // href absent ou douteux (javascript:, data:…) : on garde un <a>
            // nu plutôt que rien, pour ne pas laisser un </a> orphelin.
            // Le texte s'affiche normalement, sans lien.
            if (!isSafe) return "<a>";

            // Pas de ré-échappement du href : la valeur vient du HTML source,
            // elle est déjà encodée (un &amp; dans une query string le
            // resterait, le ré-échapper donnerait &amp;amp;).
            return /^https?:/i.test(href)
                ? `<a href="${href}" target="_blank" rel="noopener noreferrer">`
                : `<a href="${href}">`;
        })
        .trim();
}

function extractAttr(html: string, tag: string, attr: string): string | undefined {
    const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i");
    return re.exec(html)?.[1];
}

function extractFigcaption(html: string): string | undefined {
    const match = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(html);
    return match ? stripTags(match[1]) : undefined;
}

/**
 * Convertit une URL publique (collée dans l'éditeur via "insérer depuis une
 * URL" → bloc core/embed) en URL d'iframe embarquable. Retourne null si le
 * fournisseur n'est pas géré — le bloc est alors ignoré au rendu.
 */
function toEmbed(url: string): { provider: "spotify" | "youtube" | "vimeo"; src: string } | null {
    // Spotify : open.spotify.com/[intl-xx/](track|episode|album|playlist|show)/<id>
    const spotify = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|episode|album|playlist|show)\/([A-Za-z0-9]+)/i.exec(url);
    if (spotify) {
        return { provider: "spotify", src: `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}` };
    }
    // YouTube : watch?v=, youtu.be/, shorts/, embed/
    const youtube = /(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i.exec(url);
    if (youtube) {
        return { provider: "youtube", src: `https://www.youtube.com/embed/${youtube[1]}` };
    }
    const vimeo = /vimeo\.com\/(\d+)/i.exec(url);
    if (vimeo) {
        return { provider: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };
    }
    return null;
}

function innerText(block: WpBlock): string {
    // Concatène le texte des innerBlocks (utilisé pour quote/cover/media-text,
    // dont le texte réel vit dans un core/paragraph imbriqué plutôt que
    // directement dans innerHTML).
    return block.innerBlocks
        .map((b) => stripTags(b.innerHTML))
        .filter(Boolean)
        .join(" ");
}

// ─── Mapper principal ─────────────────────────────────────────────────────────

export function mapWpBlocksToMediaBlocks(blocks: WpBlock[]): MediaBlock[] {
    const result: MediaBlock[] = [];
    let pendingParagraphs: string[] = [];

    const flushParagraphs = () => {
        if (pendingParagraphs.length) {
            result.push({ type: "body", paragraphs: pendingParagraphs });
            pendingParagraphs = [];
        }
    };

    for (const block of blocks) {
        // Regroupe les core/paragraph consécutifs en un seul bloc "body"
        // (plusieurs <p> à la suite dans l'éditeur = un seul paragraphe de
        // lecture côté design, pas une section par phrase).
        if (block.blockName === "core/paragraph") {
            // Le regex capture l'INTÉRIEUR du <p> : les attributs du <p>
            // lui-même (class="has-large-font-size", style inline, alignement)
            // sont donc déjà écartés. sanitizeInlineHtml s'occupe de ce qui
            // reste à l'intérieur.
            const inner = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block.innerHTML)?.[1] ?? "";

            // Test de vacuité sur le texte nu : écarte <p></p>, <p>&nbsp;</p>
            // et <p><span></span></p>, qui donneraient un paragraphe vide.
            if (!stripTags(inner)) continue;

            // Volontairement PAS de decode() ici : la chaîne part en
            // dangerouslySetInnerHTML, les entités doivent rester des entités.
            // Les décoder d'abord transformerait un &lt;script&gt; écrit dans
            // l'éditeur en vraie balise à l'affichage.
            pendingParagraphs.push(sanitizeInlineHtml(inner));
            continue;
        }
        flushParagraphs();

        switch (block.blockName) {
            case "core/heading": {
                const text = stripTags(block.innerHTML);
                if (text) result.push({ type: "heading", text });
                break;
            }

            case "core/quote": {
                const text = innerText(block);
                if (text) result.push({ type: "quote", text });
                break;
            }

            case "core/list": {
                const items = [...block.innerHTML.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
                    .map((m) => stripTags(m[1]))
                    .filter(Boolean);
                if (items.length) result.push({ type: "list", items });
                break;
            }

            case "core/image": {
                const src = extractAttr(block.innerHTML, "img", "src");
                const alt = extractAttr(block.innerHTML, "img", "alt") ?? "";
                const caption = extractFigcaption(block.innerHTML);
                if (src) result.push({ type: "image", src, alt, caption });
                break;
            }

            case "core/gallery": {
                const images = block.innerBlocks
                    .filter((b) => b.blockName === "core/image")
                    .map((b) => ({
                        src: extractAttr(b.innerHTML, "img", "src") ?? "",
                        alt: extractAttr(b.innerHTML, "img", "alt") ?? "",
                        caption: extractFigcaption(b.innerHTML),
                    }))
                    .filter((img) => img.src);
                if (images.length) result.push({ type: "gallery", images });
                break;
            }

            case "core/media-text": {
                const src = extractAttr(block.innerHTML, "img", "src");
                const alt = extractAttr(block.innerHTML, "img", "alt") ?? "";
                // Un paragraphe par innerBlock — préservés séparément (la
                // longueur du texte pilote la durée d'épinglage de l'image).
                const paragraphs = block.innerBlocks
                    .map((b) => stripTags(b.innerHTML))
                    .filter(Boolean);
                if (src) {
                    result.push({
                        type: "mediaText",
                        src,
                        alt,
                        paragraphs,
                        position: block.attrs.mediaPosition === "right" ? "right" : "left",
                    });
                }
                break;
            }

            case "core/cover": {
                const src = (block.attrs.url as string) ?? extractAttr(block.innerHTML, "img", "src");
                if (src) {
                    result.push({
                        type: "cover",
                        src,
                        alt: "",
                        text: innerText(block) || undefined,
                        overlayColor: block.attrs.customOverlayColor as string | undefined,
                        dimRatio: block.attrs.dimRatio as number | undefined,
                    });
                }
                break;
            }

            case "core/audio": {
                const src = (block.attrs.src as string) ?? extractAttr(block.innerHTML, "audio", "src");
                // src absent = bloc inséré dans l'éditeur sans fichier
                // attaché (cas du post test) : rien d'affichable.
                if (src) result.push({ type: "audio", src });
                break;
            }

            case "core/video": {
                const src = (block.attrs.src as string) ?? extractAttr(block.innerHTML, "video", "src");
                const poster = (block.attrs.poster as string) ?? extractAttr(block.innerHTML, "video", "poster");
                if (src) result.push({ type: "video", src, poster });
                break;
            }

            case "core/embed": {
                // Bloc créé quand un lien (Spotify, YouTube…) est collé dans
                // l'éditeur — l'URL vit dans attrs.url.
                const url = block.attrs.url as string | undefined;
                const embed = url ? toEmbed(url) : null;
                if (embed) result.push({ type: "embed", ...embed });
                break;
            }

            default:
                // Bloc non géré (embed, html brut, spacer…) — ignoré plutôt que
                // planter le rendu. À étendre au besoin.
                break;
        }
    }

    flushParagraphs();
    return result;
}
