import Link from "next/link";
import Image from "next/image";
import {WpArticleCard} from "@/app/services/wpApi.article";

export default function RelatedArticleCard({
                                               category,
                                               title,
                                               href,
                                               image,
                                           }: WpArticleCard) {
    return (
        <article className="item" data-model="article-vertical" data-type="default">
            <Link href={href}>
                {image && (
                    <div className="item-image">
                        {/* next/image et non <img> : conversion AVIF/WebP et
                            redimensionnement à la taille d'affichage réelle.
                            L'enjeu est quantitatif — la grille compte quatre
                            cartes, chacune servie jusqu'ici en 768px de JPEG
                            pour être affichée autour de 250px.

                            Le <picture> sans <source> a été retiré : il
                            n'apportait rien, next/image négocie lui-même le
                            format via l'en-tête Accept.

                            `fill` et non width/height : `.item-image` impose
                            déjà sa géométrie (width: 100% + aspect-ratio: 16/9
                            + overflow: hidden). Annoncer des dimensions
                            reviendrait à faire entrer une image 3:2 dans une
                            boîte 16/9, donc à la laisser rogner par le bas de
                            façon arbitraire — ou l'étirer, selon la règle `img`
                            héritée de base.css. `fill` + object-fit: cover
                            recadre au centre, et l'aspect-ratio du conteneur
                            réserve la place : aucun décalage au chargement.

                            ⚠️ `.item-image` DOIT être en position: relative
                            (cf. le correctif CSS livré avec ce fichier) : c'est
                            l'exigence de `fill`, sans quoi l'image se
                            positionnerait par rapport au premier ancêtre
                            positionné — ou au viewport.

                            sizes : 4 colonnes sur desktop (data-count="4" dans
                            ArticleBody), soit ~25vw par carte. La grille est
                            masquée sous mobile (.no-mobile) ; la première
                            clause ne sert que pour un usage futur du
                            composant. */}
                        <Image
                            src={image}
                            alt=""
                            fill
                            sizes="(max-width: 759px) 100vw, 25vw"
                            style={{ objectFit: 'cover' }}
                        />
                    </div>
                )}
                <div className="item-text">
                    <div className="heading">
                        <p className="title">{/*{category && <span className="strapline">{category} -</span>}*/}
                            {title}</p>
                    </div>
                </div>
            </Link>
        </article>
    );
}