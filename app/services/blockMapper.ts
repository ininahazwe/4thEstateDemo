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
    | { type: "body"; paragraphs: string[] } // HTML interne conservé (gras, liens…)
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
            const inner = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block.innerHTML)?.[1] ?? "";
            const text = decode(inner).trim();
            if (text) pendingParagraphs.push(text);
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
