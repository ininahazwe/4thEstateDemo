import { getMostReadArticles } from '@/app/services/wpApi.article';
import ArticleAside from './ArticleAside';

/**
 * Wrapper serveur qui fetch lui-même getMostReadArticles (et, via ArticleAside,
 * le dernier podcast). Destiné à être placé dans un <Suspense> : le contenu
 * principal de la page (river d'articles) est envoyé immédiatement, et l'aside
 * arrive en streaming dès que ses données sont prêtes — au lieu de bloquer tout
 * le rendu de la page dans un Promise.all commun.
 */
export default async function ArticleAsideStream({ showPodcast = true }: { showPodcast?: boolean }) {
    const mostRead = await getMostReadArticles();
    return <ArticleAside mostRead={mostRead} showPodcast={showPodcast} />;
}
