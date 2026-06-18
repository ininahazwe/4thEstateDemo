interface ArticleHeaderProps {
    strapline?: string;
    title: string;
    lede: string;
    source: string;
    readTime?: string;
    publishedAt: string;
    imageUrl?: string;
    imageCaption?: string;
    imageCredit?: string;
}

export default function ArticleHeader({
    strapline,
    title,
    lede,
    source,
    readTime,
    publishedAt,
    imageUrl,
    imageCaption,
    imageCredit,
}: ArticleHeaderProps) {
    return (
        <header className="article-header">
            {strapline && (
                <span className="article-strapline">{strapline}</span>
            )}

            <h1
                className="article-title"
                dangerouslySetInnerHTML={{ __html: title }}
            />

            <p className="article-lede">{lede}</p>

            <div className="article-rule" aria-hidden="true" />

            <div className="article-meta">
                <div className="meta-source">
                    {source}
                </div>
                {readTime && (
                    <>
                        <span className="meta-dot" aria-hidden="true">·</span>
                        <span className="meta-info">{readTime}</span>
                    </>
                )}
                <span className="meta-dot" aria-hidden="true">·</span>
                <time className="meta-info">{publishedAt}</time>
            </div>

            {imageUrl && (
                <figure className="article-infographic">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt={imageCaption ?? ""}
                        fetchPriority="high"
                        style={{ width: "100%", height: "auto" }}
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
            )}
        </header>
    );
}
