interface ArticleHeaderProps {
    strapline?: string;
    title: string;
}

export default function ArticleHeader({
                                          strapline,
                                          title,
                                      }: ArticleHeaderProps) {
    return (
        <div className="article-heading">
            {strapline && (
                <span className="article-strapline">{strapline}</span>
            )}

            <h1
                className="article-title"
                dangerouslySetInnerHTML={{ __html: title }}
            />
        </div>
    );
}