import TikTokStoriesSliderClient from './TikTokStoriesSliderClient';
import { getTikTokOEmbedBatch } from './tiktokOEmbed';
import { getYouTubeThumbnail } from './Tiktokdemodata';
import { getVideoStories } from '@/app/services/wpApi.videoStory';

/**
 * Server Component : fetch les items depuis le CPT "video-story" (WordPress/ACF),
 * puis résout les thumbnails/captions manquantes selon la plateforme :
 * - TikTok  : oEmbed (appel qui doit rester côté serveur, TikTok ne fournit
 *             pas de CORS pour un fetch direct depuis le navigateur).
 * - YouTube : thumbnail prévisible (img.youtube.com), pas d'appel réseau.
 * Délègue ensuite l'affichage et les interactions (scroll, modal) à
 * TikTokStoriesSliderClient.
 *
 * Le squelette HTML reproduit la structure du widget "Storylines" (Sitestream)
 * utilisé par Courrier International, en classes génériques sans dépendance
 * propriétaire (pas de data-slot-path, data-exchange, etc.).
 */
export default async function TikTokStoriesSlider() {
    const videoStories = await getVideoStories();

    const tiktokUrls = videoStories
        .filter((item) => item.platform === 'tiktok')
        .map((item) => item.url);
    const oembedMap = await getTikTokOEmbedBatch(tiktokUrls);

    const items = videoStories.map((item) => {
        // Si une thumbnail/caption a déjà été renseignée dans ACF, on la garde.
        let thumbnail = item.thumbnail;
        let caption = item.caption;

        if (item.platform === 'tiktok') {
            thumbnail = thumbnail ?? oembedMap.get(item.url)?.thumbnailUrl;
            caption = caption ?? oembedMap.get(item.url)?.title;
        } else if (item.platform === 'youtube') {
            thumbnail = thumbnail ?? getYouTubeThumbnail(item.url);
        }

        return { ...item, thumbnail, caption };
    });

    return <TikTokStoriesSliderClient items={items} />;
}