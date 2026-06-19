import RelatedArticleCard from "./RelatedArticleCard";
import ReadMoreCard from "./ReadMoreCard";
import { WpArticleCard } from "@/app/services/wpApi.article";

interface ArticleBodyProps {
    content: string;
    featuredImage?: string;
    imageCaption?: string;
    imageCredit?: string;
    relatedArticles: WpArticleCard[];   // grille "Sur le même sujet" en bas
    readMoreArticles: WpArticleCard[];  // encarts "À lire aussi" intercalés dans le texte
    tags: Array<{ label: string; href: string }>;
}

/**
 * Découpe le HTML WordPress en paragraphes (<p>...</p>) et intercale
 * les ReadMoreCard toutes les N occurrences.
 * Les blocs non-<p> (images, iframes, figures…) sont regroupés avec le paragraphe suivant.
 */
function interleaveReadMore(html: string, cards: WpArticleCard[], every = 3): React.ReactNode[] {
    // Sépare sur les fins de bloc </p>, </figure>, </ul>, </ol>, </h2>–</h6>
    const chunks = html
        .split(/(?<=<\/(?:p|figure|ul|ol|h[2-6]|blockquote)>)/gi)
        .map((c) => c.trim())
        .filter(Boolean);

    const nodes: React.ReactNode[] = [];
    let cardIndex = 0;
    let pCount = 0;

    chunks.forEach((chunk, i) => {
        nodes.push(
            <div key={`chunk-${i}`} dangerouslySetInnerHTML={{ __html: chunk }} />
        );

        // On compte uniquement les <p> pour décider quand insérer une card
        if (/<\/p>/i.test(chunk)) {
            pCount++;
            if (pCount % every === 0 && cardIndex < cards.length) {
                const card = cards[cardIndex++];
                nodes.push(
                    <ReadMoreCard
                        key={`readmore-${card.id}`}
                        strapline={card.strapline}
                        title={card.title}
                        href={card.href}
                    />
                );
            }
        }
    });

    return nodes;
}

export default function ArticleBody({
                                        content,
                                        featuredImage,
                                        imageCaption,
                                        imageCredit,
                                        relatedArticles,
                                        readMoreArticles,
                                        tags,
                                    }: ArticleBodyProps) {
    const hasReadMore = readMoreArticles.length > 0;

    return (
        <div className="article-content" data-column="left">
            {featuredImage && (
                <div className="article-illustration">
                    <figure className="article-infographic">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={featuredImage}
                            alt={imageCaption ?? ""}
                            fetchPriority="high"
                            style={{width: "100%", height: "auto"}}
                        />
                        {(imageCaption || imageCredit) && (
                            <figcaption className="infographic-caption">
                                {imageCaption && (
                                    <span className="caption-text">{imageCaption}</span>
                                )}
                                {imageCredit && (
                                    <span className="caption-credit">{imageCredit}</span>
                                )}
                            </figcaption>
                        )}
                    </figure>
                </div>
            )}

            <aside className="article-tools" data-hide-kne="">
                <div className="tools-list">
                    <button className="item  ithalc" data-model="button" data-icon="share-from-square" data-share=""
                            data-share-url="//www.courrierinternational.com/article/commerce-droits-de-douane-le-parlement-europeen-impose-des-clauses-paratonnerre-aux-etats-unis_245343"
                            data-share-box="share-box" data-need-js="" data-hide-kne=""
                            data-ithal="bouton_partage_article" data-ithalc="[cta_bloc]">Partager
                    </button>
                    <button className="tts" data-model="button" title="Écouter l’article"
                            aria-describedby="title-Y291cnJpZXI6QXJ0aWNsZToyNDUzNDM" data-modal-open="tts-reserved"
                            data-audio-url="" data-need-js=""><span data-icon="headphones">Écouter <span
                        className="sr-only">l’article</span></span></button>
                    <button className="favorites" data-model="button" data-article-favorite="" data-in-favorites="false"
                            data-article-id="Y291cnJpZXI6QXJ0aWNsZToyNDUzNDM" data-modal-open="favorites-reserved"
                            title="Ajouter aux favoris" aria-describedby="title-Y291cnJpZXI6QXJ0aWNsZToyNDUzNDM"
                            data-icon="bookmark-off" data-need-js=""><span className="action">Ajouter aux favoris</span>
                    </button>
                </div>
            </aside>

            <div className="article-text">
                {hasReadMore
                    ? interleaveReadMore(content, readMoreArticles)
                    : <div dangerouslySetInnerHTML={{__html: content}}/>
                }
            </div>

            <div className="article-secondary">

                <div className="article-authors-vo">
                    <div className="article-authors">
                        <div className="default-authors"><span>Courrier international</span></div>
                    </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="article-tags" aria-label="Mots-clés">
                        {tags.map((tag) => (
                            <a key={tag.href} href={tag.href} className="tag">
                                {tag.label}
                            </a>
                        ))}
                    </div>
                )}
                {relatedArticles.length > 0 && (
                <div className="article-readmore no-mobile">
                    <div className="section-title">Nos lecteurs ont lu aussi</div>
                    <div className="readmore-list" data-count="4">
                        {/* Grille "Sur le même sujet" */}
                        {relatedArticles.map((article) => (
                            <RelatedArticleCard key={article.id} {...article} />
                        ))}
                    </div>
                </div>
                )}
            </div>


        </div>
    );
}