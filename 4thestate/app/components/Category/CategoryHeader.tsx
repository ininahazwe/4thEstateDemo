import { CategoryTag } from './Types';

interface CategoryHeaderProps {
    title: string;
    tags: CategoryTag[];
}

export default function CategoryHeader({ title, tags }: CategoryHeaderProps) {
    return (
        <>
            <div className="section-header" data-column="full">
                <h1 className="page-title">{title}</h1>
            </div>

            {tags.length > 0 && (
                <div className="section-tags">
                    <div className="tags-list expandable">
                        {tags.map((tag) => (
                            <a key={tag.href} className="item" data-model="button" data-icon="tag" href={tag.href}>
                                {tag.label}
                            </a>
                        ))}
                        <button className="toggle-tags" title="Show more" />
                    </div>
                </div>
            )}
        </>
    );
}