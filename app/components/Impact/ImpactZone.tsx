import OurImpactCard from './ImpactCard';
import { type OurImpactArticle } from './Types';
interface OurImpactZoneProps {
    articles: OurImpactArticle[];
}

export default function OurImpactZone({ articles }: OurImpactZoneProps) {
    if (!articles.length) return null;

    return (
        <section className="zone-toparticles-puzzle" data-columns="2">

            {/* Colonne gauche : liste des articles les plus lus */}
            <section className="forecast-top-articles" data-flex-grow="" data-column="left">
                <div className="section-title">Our Impact</div>
                <div className="wrap">
                    {articles.map((article) => (
                        <OurImpactCard key={article.id} article={article} />
                    ))}
                </div>
            </section>

            {/* Colonne droite : bloc statique — reproduit à l'identique du HTML de référence */}
            <section className="zone zone-puzzle" data-column="right">
                <a
                    href="https://thefourthestategh.com/category/our-impact/"
                    className="item ithalc"
                >
                    <div className="item-text">
                        <div className="heading">
                            <span className="icon"></span>
                            <p className="title">Our Impact</p>
                            <p className="description">
                                Discover how our journalism makes a difference in communities across Ghana.
                            </p>
                            <div className="button" data-model="button">Read more</div>
                        </div>
                    </div>
                </a>
            </section>

        </section>
    );
}