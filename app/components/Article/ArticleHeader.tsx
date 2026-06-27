interface ArticleHeaderProps {
    strapline?: string;
    title: string;
    category?: { name: string; slug: string };
}

export default function ArticleHeader({
                                          strapline,
                                          title,
                                          category,
                                      }: ArticleHeaderProps) {
    return (
        <div className="article-heading">
            {category && (
                <span className="strapline">{category.name}</span>
            )}

            {strapline && (
                <span className="strapline">{strapline}</span>
            )}

            <h1
                className="article-title"
                dangerouslySetInnerHTML={{ __html: title }}
            />
        </div>
    );
}