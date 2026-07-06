import Link from "next/link";
import {WpArticleCard} from "@/app/services/wpApi.article";
import LatestPodcastWidget from "@/app/components/Article/Latestpodcastwidget";
import {getLatestPodcastEpisode} from "@/app/components/Article/Getlatestpodcastepisode.snippet";

interface ArticleAsideProps {
    mostRead: WpArticleCard[];
    showPodcast?: boolean;
}

export default async function ArticleAside({ mostRead, showPodcast = true }: ArticleAsideProps) {

    const latestPodcast = showPodcast ? await getLatestPodcastEpisode() : null;

    return (
        <aside className="article-aside" data-column="right">
            <section className="forecast-top-articles">
                <div className="section-title" id="most-read-title">
                    Most Read Stories
                </div>
                <div className="wrap">
                    {mostRead.map((item, i) => (
                        <article key={item.id} className="item" data-model="article" data-type="default" data-index={i + 1}>
                            <Link href={item.href} style={{flex: 1}}>
                                <div className="item-text">
                                    <div className="heading">
                                        <p className="most-read-title">{item.category && (
                                            <span className="strapline">{item.category} -</span>
                                        )}{item.title}</p>
                                    </div>
                                </div>
                            </Link>
                        </article>
                    ))}
                </div>
            </section>

            {showPodcast && latestPodcast && <LatestPodcastWidget episode={latestPodcast} />}
        </aside>
    );
}