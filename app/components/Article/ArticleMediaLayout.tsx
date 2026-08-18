import Image from 'next/image';
import ArticleHeroVideo from './ArticleHeroVideo';
import ArticleMediaPodcast from './ArticleMediaPodcast';
import ArticleMediaVideoWrap from './ArticleMediaVideoWrap';
import HeroTitle from './HeroTitle';
import ArticleShareButton from '@/app/components/UI/ArticleShareButton';
import TTSButton from '@/app/components/UI/TTSButton';
import BookmarkButton from '@/app/components/UI/BookmarkButton';
import type { MediaBlock } from '@/app/services/blockMapper';

// ---------------------------------------------------------------------------
// ArticleMediaLayout — template "storytelling" (ACF is_storytelling).
//
// Architecture "pin + panneau" :
// - le HERO est épinglé (position:sticky, z-index 0, enfant direct de
//   <article>) : il ne bouge plus une fois collé sous le header et se laisse
//   progressivement voiler par le contenu qui remonte.
// - tout le contenu courant est regroupé en SECTIONS blanches
//   (.container-background : fond blanc opaque, pleine largeur, z-index 2)
//   qui remontent au scroll et recouvrent le hero épinglé.
// - un COVER est un panneau autonome de 100vh (.am-cover-media, z-index 2) :
//   image immobile CONFINÉE à ce panneau (background-attachment:fixed) et
//   texte centré par-dessus. Le panneau reste dans le flux : il se dévoile
//   en entrant par le bas et se couvre en sortant par le haut, l'image ne
//   bougeant jamais. Rien n'est peint hors du panneau.
// - le flux de blocs est donc DÉCOUPÉ à chaque bloc 'cover' : les blocs entre
//   deux covers forment une section blanche, le cover est émis entre elles.
//
// OPTIMISATION DES IMAGES — état et limite
//
// hero, 'image' et 'mediaText' passent par next/image : conversion AVIF/WebP et
// redimensionnement à la largeur réellement affichée (cf. images.formats et
// images.deviceSizes dans next.config.ts). Ces trois blocs représentent
// l'essentiel du poids d'un article storytelling.
//
// 'cover' et 'gallery' NE PEUVENT PAS en bénéficier : leur image est portée par
// un `background-image` CSS, et next/image n'optimise que les <img> qu'il
// génère. Ce choix de background n'est pas un oubli — il est ce qui permet
// l'image immobile confinée au panneau (background-attachment: fixed) et
// l'accordéon sans recalcul de géométrie. Les convertir en <Image> casserait
// ces deux effets (voir la note en tête de la section 5 et 6 de
// article-storytelling.css). Ces deux blocs restent donc servis en JPEG à la
// taille insérée par la rédaction ; leur poids se maîtrise en amont, via le
// seuil de redimensionnement de WordPress (tfe-media-guardrails.php).
// ---------------------------------------------------------------------------

export interface ArticleMediaAuthor {
    displayName: string;
    slug: string;
}

export interface ArticleMediaData {
    id: number;
    slug: string;
    link: string;
    category?: string;
    title: string;
    /** Chapô (excerpt WordPress). Optionnel : affiché sous le titre du hero
     *  seulement s'il est renseigné sur le post. */
    excerpt?: string;
    authors: ArticleMediaAuthor[];
    /**
     * `src` : image mise en avant. `video` : panneau « Hero video » de
     * l'éditeur, optionnel — s'il est renseigné, la vidéo joue en boucle à la
     * place de l'image, qui
     * reste utilisée comme `poster` (et pour l'Open Graph et les vignettes,
     * côté page).
     */
    hero: { src: string; alt: string; video?: string };
    blocks: MediaBlock[];
}

/**
 * Largeur annoncée quand WordPress n'a pas écrit les dimensions sur son <img>.
 * Sert uniquement à réserver la place (ratio 3:2) — le ratio réel du fichier
 * reprend la main au chargement grâce à `height: auto`.
 */
const FALLBACK_IMAGE_WIDTH = 2048;

type CoverBlock = Extract<MediaBlock, { type: 'cover' }>;
type Segment =
    | { kind: 'flow'; blocks: MediaBlock[] }
    | { kind: 'cover'; block: CoverBlock };

/** Découpe le flux de blocs en sections "flow" séparées par les covers. */
function splitAtCovers(blocks: MediaBlock[]): Segment[] {
    const segments: Segment[] = [];
    for (const block of blocks) {
        if (block.type === 'cover') {
            segments.push({ kind: 'cover', block });
        } else {
            const last = segments[segments.length - 1];
            if (last?.kind === 'flow') last.blocks.push(block);
            else segments.push({ kind: 'flow', blocks: [block] });
        }
    }
    return segments;
}

function Block({ block }: { block: MediaBlock }) {
    switch (block.type) {
        case 'heading':
            return (
                <div className="am-wrap">
                    <h2 className="am-heading">{block.text}</h2>
                </div>
            );

        case 'quote':
            return (
                <div className="am-wrap am-quote-wrap">
                    <blockquote className="am-quote">{block.text}</blockquote>
                </div>
            );

        case 'body':
            // className="wp-block-paragraph" : même classe que celle posée par
            // WordPress sur les posts standards, pour que les paragraphes du
            // storytelling héritent des mêmes règles (custom.css). Le mapper
            // ne renvoie que le CONTENU des <p>, c'est ici qu'on reconstruit
            // la balise — donc ici qu'on pose la classe.
            return (
                <div className="am-wrap am-body">
                    {block.paragraphs.map((p, i) => (
                        <p key={i} className="wp-block-paragraph" dangerouslySetInnerHTML={{ __html: p }} />
                    ))}
                </div>
            );

        case 'list':
            return (
                <div className="am-wrap">
                    <ul className="am-list">
                        {block.items.map((it, i) => (
                            <li key={i}>{it}</li>
                        ))}
                    </ul>
                </div>
            );

        case 'image': {
            // .am-media-full n'a pas de max-width : l'image occupe toute la
            // largeur de la plaque, elle-même en 100vw — d'où sizes="100vw".
            //
            // Dimensions réelles quand WordPress les a écrites sur son <img>
            // (cf. extractDimensions dans blockMapper.ts), sinon un 3:2 par
            // défaut. Elles ne servent qu'à réserver la place : le CSS
            // `.am-media-full img { width: 100% }` et `height: auto` laissent
            // le ratio intrinsèque du fichier gouverner l'affichage, donc
            // aucune déformation même si le ratio annoncé est faux.
            const width = block.width ?? FALLBACK_IMAGE_WIDTH;
            const height = block.height ?? Math.round(width / 1.5);

            return (
                <figure className="am-media-full">
                    <Image
                        src={block.src}
                        alt={block.alt}
                        width={width}
                        height={height}
                        sizes="100vw"
                        style={{ width: '100%', height: 'auto' }}
                    />
                    {block.caption && <figcaption className="am-figcaption">{block.caption}</figcaption>}
                </figure>
            );
        }

        case 'gallery':
            // ⚠️ Pas de next/image ici : l'image est un background, cf. la note
            // « OPTIMISATION DES IMAGES » en tête de fichier. Ne pas convertir
            // sans avoir résolu le problème du recalcul de géométrie.
            //
            // Accordéon : chaque vignette est une piste flex (flex: 1) qui
            // s'élargit au survol (flex-grow). L'image est portée par le
            // BACKGROUND d'un calque interne et non par un <img> — c'est ce qui
            // permet à la boîte de changer de largeur sans que l'image ait la
            // moindre géométrie propre à recalculer, donc sans saut pendant la
            // transition (voir article-storytelling.css § 6).
            return (
                <div className="am-gallery">
                    {block.images.map((img, i) => (
                        <figure key={i} className="am-gallery-item">
                            <div
                                className="am-gallery-image"
                                style={{ backgroundImage: `url("${img.src}")` }}
                                role="img"
                                aria-label={img.alt || undefined}
                            />
                            {img.caption && <figcaption className="am-figcaption">{img.caption}</figcaption>}
                        </figure>
                    ))}
                </div>
            );

        case 'mediaText':
            // Image sticky (épinglée sous le header) pendant que le texte
            // défile dans l'autre colonne — jusqu'à la fin du texte, où la
            // grille entière quitte l'écran. align-self:start dans le CSS
            // est indispensable (sinon l'item grid s'étire à la hauteur de
            // la rangée et le sticky n'a aucune marge de déplacement).
            return (
                <div className={`am-media-text${block.position === 'right' ? ' am-media-text--reverse' : ''}`}>
                    <div className="am-media-text-media">
                        {/* `fill` et non width/height : le conteneur a une
                            hauteur imposée (100vh moins le header) et le CSS
                            recadre en object-fit: cover. Le parent est en
                            position: sticky, ce qui satisfait l'exigence de
                            next/image d'un ancêtre positionné.

                            sizes : la grille fait 80vw en deux colonnes égales
                            au-dessus de 860px, soit 40vw par colonne ; en
                            dessous elle passe sur une seule colonne. */}
                        <Image
                            src={block.src}
                            alt={block.alt}
                            fill
                            sizes="(max-width: 860px) 100vw, 40vw"
                        />
                    </div>
                    <div className="am-media-text-content am-body">
                        <div>
                            {block.paragraphs.map((p, i) => (
                                <p key={i} className="wp-block-paragraph">{p}</p>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'audio':
            return (
                <div className="am-wrap">
                    <audio className="am-audio" src={block.src} controls preload="metadata" />
                </div>
            );

        case 'video':
            // ArticleMediaVideoWrap remplace le <div className="am-video-wrap">
            // : même markup, plus le passage en fond noir de la plaque
            // englobante quand la vidéo atteint le centre de l'écran.
            return (
                <ArticleMediaVideoWrap>
                    <video className="am-video" src={block.src} poster={block.poster} controls preload="metadata" playsInline />
                </ArticleMediaVideoWrap>
            );

        case 'embed':
            // Lien collé dans l'éditeur (core/embed) : Spotify en player
            // compact largeur texte, YouTube/Vimeo en iframe 16/9.
            return block.provider === 'spotify' ? (
                <div className="am-wrap">
                    <iframe
                        className="am-embed-spotify"
                        src={block.src}
                        loading="lazy"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        title="Spotify player"
                    />
                </div>
            ) : (
                <ArticleMediaVideoWrap>
                    <iframe
                        className="am-embed-video"
                        src={block.src}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title="Video player"
                    />
                </ArticleMediaVideoWrap>
            );

        case 'podcast':
            return (
                <ArticleMediaPodcast
                    episodeId={block.episodeId}
                    title={block.title}
                    show={block.show}
                    description={block.description}
                    cover={block.cover}
                    duration={block.duration}
                />
            );

        // 'cover' n'arrive jamais ici : extrait en amont par splitAtCovers().
        default:
            return null;
    }
}

// Panneau plein écran (100vh) : l'image est portée par le BACKGROUND d'un
// calque interne et non par un <img>. C'est le seul moyen d'avoir à la fois
// une image immobile au scroll (background-attachment:fixed) ET strictement
// confinée à son bloc — un <img> en position:fixed serait peint sur toute la
// fenêtre pendant tout l'article, et `overflow:hidden` sur le parent ne clippe
// pas un descendant fixed.
// ⚠️ Pas de next/image dans ce panneau : l'image est un background, condition
// de l'effet « immobile et confinée ». Voir la note « OPTIMISATION DES IMAGES »
// en tête de fichier.
function Cover({ block }: { block: CoverBlock }) {
    return (
        <section className="am-cover-media">
            {/* Calque décoratif (l'ACF cover WordPress ne fournit pas d'alt) :
                pas de role="img" sans libellé, il serait annoncé à vide. */}
            <div className="am-cover-image" style={{ backgroundImage: `url("${block.src}")` }} />
            <div
                className="am-cover-overlay"
                style={{
                    backgroundColor: block.overlayColor ?? '#00000080',
                    opacity: (block.dimRatio ?? 50) / 100,
                }}
            />
            {block.text && <p className="am-cover-text">{block.text}</p>}
        </section>
    );
}

export default function ArticleMediaLayout({ article }: { article: ArticleMediaData }) {
    const segments = splitAtCovers(article.blocks);

    // Les blocs de la première section "flow" rejoignent la section d'entête
    // (auteur + outils) pour former UNE seule plaque blanche continue sous le
    // hero — évite un raccord visible entre deux sections.
    const firstFlow = segments[0]?.kind === 'flow' ? (segments.shift() as Extract<Segment, { kind: 'flow' }>) : null;

    return (
        <article className="article-media" data-template="media">
            {/* Hero : image épinglée sous le header (position:sticky, aucune
                animation propre), titre en overlay qui dérive doucement au
                scroll (HeroTitle). */}
            <div className="am-hero-media">
                {article.hero.video ? (
                    <ArticleHeroVideo
                        src={article.hero.video}
                        poster={article.hero.src || undefined}
                        label={article.hero.alt}
                    />
                ) : (
                    /* `fill` : .am-hero-media impose sa hauteur (--am-hero-height)
                       et le CSS partage déjà les mêmes règles pour <img> et
                       <video> (width/height 100%, object-fit: cover) — inutile
                       de les redéclarer ici. Le parent est en position: sticky,
                       donc positionné : `fill` est valide.

                       `priority` : le hero est l'élément LCP de la page. Il
                       désactive le lazy loading, ce qui est le comportement
                       voulu pour une image plein écran au-dessus de la ligne de
                       flottaison.

                       sizes="100vw" : le hero est en pleine largeur de fenêtre
                       (width: 100vw dans le CSS). */
                    <Image
                        src={article.hero.src}
                        alt={article.hero.alt}
                        fill
                        priority
                        sizes="100vw"
                    />
                )}
                <HeroTitle title={article.title} excerpt={article.excerpt} />
            </div>

            {/* Première plaque blanche : auteur + outils + premiers blocs. */}
            <div className="container-background">
                <div className="am-wrap">
                    <div className="article-authors-vo">
                        <div className="article-authors">
                            <div className="default-authors" style={{ marginBottom: '20px' }}>
                                <span style={{ marginRight: '5px' }}>By</span>
                                {article.authors.length ? (
                                    article.authors.map((author, index) => (
                                        <span key={author.slug}>
                                            <a href={`/author/${author.slug}`} className="author-link" style={{ fontWeight: 'bold' }}>
                                                {author.displayName}
                                            </a>
                                            {index < article.authors.length - 1 && ' | '}
                                        </span>
                                    ))
                                ) : (
                                    <span>The Fourth Estate</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Outils (partage/écoute/favoris) — même bloc que l'article
                    standard (ArticleBody.tsx). */}
                <div className="am-wrap">
                    <aside className="article-tools" data-hide-kne="">
                        <div className="tools-list">
                            <ArticleShareButton title={article.title} />
                            <TTSButton containerSelector=".article-media" />
                            <BookmarkButton
                                articleId={article.id}
                                slug={article.slug}
                                title={article.title}
                                link={article.link}
                                imageUrl={article.hero.src}
                                category={article.category}
                            />
                        </div>
                    </aside>
                </div>

                {firstFlow?.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                ))}
            </div>

            {/* Suite : alternance cover épinglé / plaque blanche. */}
            {segments.map((segment, s) =>
                segment.kind === 'cover' ? (
                    <Cover key={s} block={segment.block} />
                ) : (
                    <div key={s} className="container-background">
                        {segment.blocks.map((block, i) => (
                            <Block key={i} block={block} />
                        ))}
                    </div>
                )
            )}
        </article>
    );
}