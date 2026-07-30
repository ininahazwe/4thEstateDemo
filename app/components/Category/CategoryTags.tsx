'use client';

import { useState } from 'react';
import { CategoryTag } from './Types';

interface CategoryTagsProps {
    tags: CategoryTag[];
}

/**
 * Liste de tags "section-tags" avec bascule See more / See less.
 * Client Component : le CSS hérité clampe .tags-list sur une seule ligne
 * (white-space:nowrap; overflow:hidden) et .expanded la fait wrapper pour
 * révéler TOUS les tags. Rien ne basculait la classe .expanded auparavant
 * (CategoryHeader était un Server Component, bouton sans handler). Ici le
 * bouton toggle-tags gère l'état côté client.
 */
export default function CategoryTags({ tags }: CategoryTagsProps) {
    const [expanded, setExpanded] = useState(false);

    if (!tags.length) return null;

    return (
        <div className="section-tags">
            <div className={`tags-list expandable${expanded ? ' expanded' : ''}`}>
                {tags.map((tag) => (
                    <a
                        key={tag.href}
                        className="item"
                        data-model="button"
                        data-icon="tag"
                        href={tag.href}
                    >
                        {tag.label}
                    </a>
                ))}
                <button
                    type="button"
                    className="toggle-tags"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    title={expanded ? 'See less' : 'See more'}
                />
            </div>
        </div>
    );
}
