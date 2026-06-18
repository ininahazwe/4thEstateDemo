'use client';

import { useMemo, JSX } from "react";
import type { WpArticleCard } from "@/app/services/wpApi.article";
import ReadMoreCard from "@/app/components/Article/ReadMoreCard";

interface ArticleContentProps {
    content: string;
    readMoreArticles: WpArticleCard[];
    every?: number;
}

/**
 * Découpe le HTML WordPress en blocs de niveau supérieur et injecte le tag d'origine
 * pour conserver l'exactitude des sélecteurs CSS et éviter les div fantômes.
 */
export default function ArticleContent({
                                           content,
                                           readMoreArticles,
                                           every = 3,
                                       }: ArticleContentProps) {
    const nodes = useMemo(() => {
        if (typeof window === "undefined") return [];

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const topLevelNodes = Array.from(doc.body.children);

        const result: React.ReactNode[] = [];
        let pCount = 0;
        let cardIndex = 0;

        topLevelNodes.forEach((node, i) => {
            const tag = node.tagName.toLowerCase();

            // Création dynamique de l'élément HTML d'origine (ex: 'p', 'h2', 'ul')
            // pour ne pas altérer les sélecteurs CSS (ex: .article-text > p)
            const CustomTag = tag as keyof JSX.IntrinsicElements;

            result.push(
                <CustomTag
                    key={`block-${i}`}
                    // On passe l'innerHTML (le contenu interne de la balise)
                    // car la balise maîtresse est recréée par CustomTag
                    dangerouslySetInnerHTML={{ __html: node.innerHTML }}
                    // On copie également les classes WordPress d'origine si elles existent
                    className={node.className || undefined}
                />
            );

            // Intercaler après chaque Nème paragraphe ou titre principal
            if (tag === "p" || tag === "h2" || tag === "h3") {
                pCount++;
                if (pCount % every === 0 && cardIndex < readMoreArticles.length) {
                    const card = readMoreArticles[cardIndex++];
                    result.push(
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

        return result;
    }, [content, readMoreArticles, every]);

    return <>{nodes}</>;
}