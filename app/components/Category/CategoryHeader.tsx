import { CategoryTag } from './Types';
import CategoryTags from './CategoryTags';

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

            {/* section-tags rendu par CategoryTags (client) : le bouton See more/less
                y bascule la classe .expanded. Ne rend rien si tags est vide (ex:
                page /tag/[slug] qui passe toujours tags=[]). */}
            <CategoryTags tags={tags} />
        </>
    );
}
