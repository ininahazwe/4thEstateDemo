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
// Architecture "pin + cover" :
// - hero et cover sont des images position:sticky (z-index:0), enfants
//   directs de <article> — elles s'épinglent sous le header et ne bougent
//   plus.
// - tout le reste du contenu est regroupé en SECTIONS blanches
//   (.container-background : fond blanc, pleine largeur de page,
//   z-index supérieur) qui remontent au scroll et finissent par recouvrir
//   l'image épinglée qui les précède.
// - le flux de blocs est donc DÉCOUPÉ à chaque bloc 'cover' : les blocs
//   entre deux covers forment une section blanche ; le cover lui-même est
//   émis entre les sections (image sticky + son texte qui, lui, monte au
//   scroll en flux normal).
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
    authors: ArticleMediaAuthor[];
    hero: { src: string; alt: string };
    blocks: MediaBlock[];
}

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

        case 'image':
            return (
                <figure className="am-media-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.src} alt={block.alt} loading="lazy" />
                    {block.caption && <figcaption className="am-figcaption">{block.caption}</figcaption>}
                </figure>
            );

        case 'gallery': {
            const cols = Math.min(block.images.length, 4);
            return (
                <div className="am-gallery" style={{ '--am-cols': cols } as React.CSSProperties}>
                    {block.images.map((img, i) => (
                        <figure key={i} className="am-gallery-item">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.src} alt={img.alt} loading="lazy" />
                            {img.caption && <figcaption className="am-figcaption">{img.caption}</figcaption>}
                        </figure>
                    ))}
                </div>
            );
        }

        case 'mediaText':
            // Image sticky (épinglée sous le header) pendant que le texte
            // défile dans l'autre colonne — jusqu'à la fin du texte, où la
            // grille entière quitte l'écran. align-self:start dans le CSS
            // est indispensable (sinon l'item grid s'étire à la hauteur de
            // la rangée et le sticky n'a aucune marge de déplacement).
            return (
                <div className={`am-media-text${block.position === 'right' ? ' am-media-text--reverse' : ''}`}>
                    <div className="am-media-text-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={block.src} alt={block.alt} loading="lazy" />
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

function Cover({ block }: { block: CoverBlock }) {
    return (
        <>
            <div className="am-cover-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt} loading="lazy" />
                <div
                    className="am-cover-overlay"
                    style={{
                        backgroundColor: block.overlayColor ?? '#000',
                        opacity: (block.dimRatio ?? 50) / 100,
                    }}
                />
            </div>
            {block.text && (
                <div className="am-cover-text-flow">
                    <p className="am-cover-text">{block.text}</p>
                </div>
            )}
        </>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={article.hero.src} alt={article.hero.alt} />
                <HeroTitle title={article.title} />
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
