import PodcastPromoWidgetClient from './PodcastPromoWidgetClient';
import { getLatestPodcastEpisode } from '@/app/services/getSpotifyShowEpisodes';

/**
 * Server Component : va chercher le dernier épisode Spotify (même source que
 * LatestPodcastWidget.tsx) et délègue l'affichage/interaction à
 * PodcastPromoWidgetClient.
 *
 * Contrairement à LatestPodcastWidget.tsx (aside article, format carte,
 * dépend de la classe héritée `.ci-services`), ce composant est autonome —
 * pas de classe partagée avec un autre système d'affichage — pour pouvoir
 * être posé n'importe où sur le site. Largeur adaptative via container
 * query, voir podcast-promo-widget.css.
 *
 * Ne rend rien si aucun épisode n'est disponible (même garde que les autres
 * widgets du site, cf. composant-most-read.md) — pas de titre orphelin.
 */
export default async function PodcastPromoWidget() {
    const episode = await getLatestPodcastEpisode();
    if (!episode) return null;

    return <PodcastPromoWidgetClient episode={episode} />;
}
