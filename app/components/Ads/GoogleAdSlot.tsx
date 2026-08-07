import ArticleAside from "@/app/components/Article/ArticleAside";
import { getMostReadArticles } from '@/app/services/wpApi.article';
/**
 * Emplacement pub Google (démo). Structure calquée sur le DFP/GAM natif du
 * thème (aside.zone-aside[data-column=right] > .dfpcontainer > #pave_haut) :
 * réutilise les CSS déjà présents dans base.css/home-critical.css pour
 * l'outline + le label "Publicité" ainsi que la colonne 300px @min-width:1000px
 * ([data-columns="2"] > [data-column=right]). #pave_haut doit rester non-vide
 * pour que ces styles s'appliquent (:not(:empty)) — le rectangle gris en est
 * le contenu, à remplacer par le tag GAM réel le jour venu.
 */

type MostReadArticles = Awaited<ReturnType<typeof getMostReadArticles>>;
interface GoogleAdSlotProps {
    mostRead: MostReadArticles;
    showPodcast?: boolean;
}

export default function GoogleAdSlot({ mostRead, showPodcast = false }: GoogleAdSlotProps) {
    return (
        <aside className="zone-aside" data-column="right">
            <div className="dfpcontainer">
                <ArticleAside mostRead={mostRead} showPodcast={showPodcast} />
            </div>
        </aside>
    );
}
