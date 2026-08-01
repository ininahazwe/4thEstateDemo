import { FaXTwitter, FaFacebookF, FaLink } from 'react-icons/fa6';
import { Play } from 'lucide-react';

// ---------------------------------------------------------------------------
// ArticleMediaLayout — 2e type de page article (orienté audio-visuel).
// Présentation pure (Server Component) : reçoit des données déjà normalisées
// et rend une suite de "blocs". Le rendu par bloc facilite le branchement
// backend futur (le contenu WP sera parsé en blocs du même type). Images/
// galeries étirées pleine largeur, tokens couleur/police de l'app.
// ---------------------------------------------------------------------------

export type MediaBlock =
    | { type: 'heading'; text: string }
    | { type: 'body'; paragraphs: string[] }
    | { type: 'list'; items: string[] }
    | { type: 'image'; src: string; alt: string; caption?: string }
    | { type: 'gallery'; images: { src: string; alt: string }[] }
    | { type: 'player'; poster: string; alt: string };

export interface ArticleMediaData {
    category: string;
    date: string;
    title: string;
    author: { name: string; role: string; avatar: string };
    hero: { src: string; alt: string };
    blocks: MediaBlock[];
}

function ShareRail() {
    return (
        <div className="am-share" aria-label="Share">
            <span className="am-share-label">Share</span>
            <a href="#" title="Share on X" aria-label="Share on X"><FaXTwitter size={16} /></a>
            <a href="#" title="Share on Facebook" aria-label="Share on Facebook"><FaFacebookF size={16} /></a>
            <a href="#" title="Copy link" aria-label="Copy link"><FaLink size={16} /></a>
        </div>
    );
}

function Block({ block }: { block: MediaBlock }) {
    switch (block.type) {
        case 'heading':
            return (
                <div className="am-wrap">
                    <h2 className="am-heading">{block.text}</h2>
                </div>
            );
        case 'body':
            return (
                <div className="am-wrap am-body">
                    {block.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
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
        case 'gallery':
            return (
                <div className="am-gallery" style={{ '--am-cols': block.images.length } as React.CSSProperties}>
                    {block.images.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={img.src} alt={img.alt} loading="lazy" />
                    ))}
                </div>
            );
        case 'player':
            return (
                <div className="am-player">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.poster} alt={block.alt} loading="lazy" />
                    <button type="button" className="am-player-play" aria-label="Play video">
                        <Play size={32} fill="currentColor" />
                    </button>
                </div>
            );
        default:
            return null;
    }
}

export default function ArticleMediaLayout({ article }: { article: ArticleMediaData }) {
    return (
        <article className="article-media" data-template="media">
            {/* Hero : bloc titre à gauche chevauchant l'image, image filant
                jusqu'au bord droit de la page (cf. maquette). */}
            <header className="am-hero">
                <div className="am-hero-text">
                    <div className="am-meta">
                        {article.category} · {article.date}
                    </div>
                    <h1 className="am-title">{article.title}</h1>
                    <div className="am-byline">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="am-avatar" src={article.author.avatar} alt={article.author.name} />
                        <div className="am-byline-text">
                            <div className="am-byline-name">By: {article.author.name}</div>
                            <div className="am-byline-role">{article.author.role}</div>
                        </div>
                    </div>
                </div>

                <div className="am-hero-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={article.hero.src} alt={article.hero.alt} />
                </div>
            </header>

            {/* Rail de partage sous le hero */}
            <div className="am-wrap">
                <ShareRail />
            </div>

            {/* Corps : suite de blocs */}
            {article.blocks.map((block, i) => (
                <Block key={i} block={block} />
            ))}

            {/* Partage de fin */}
            <div className="am-wrap">
                <ShareRail />
            </div>
        </article>
    );
}
