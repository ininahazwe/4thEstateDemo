import TikTokStoriesSliderClient from './TikTokStoriesSliderClient';
import { getTikTokOEmbedBatch } from './tiktokOEmbed';
import { getFacebookOEmbedBatch } from './facebookOEmbed';
import { getYouTubeThumbnail } from './Tiktokdemodata';
import { getVideoStories } from '@/app/services/wpApi.videoStory';

/**
 * Server Component : fetch les items depuis le CPT "video-story" (WordPress),
 * puis résout les thumbnails/captions manquantes selon la plateforme :
 * - TikTok    : oEmbed public (appel qui doit rester côté serveur, TikTok ne
 *               fournit pas de CORS pour un fetch direct depuis le navigateur).
 * - Facebook  : oEmbed Graph API, nécessite FACEBOOK_APP_ID/FACEBOOK_APP_SECRET
 *               en env (voir facebookOEmbed.ts) — sans ces variables, rend {}
 *               et on retombe sur la thumbnail saisie côté CMS s'il y en a une.
 * - YouTube   : thumbnail prévisible (img.youtube.com), pas d'appel réseau.
 * Délègue ensuite l'affichage et les interactions (scroll, modal) à
 * TikTokStoriesSliderClient.
 *
 * Le squelette HTML reproduit une structure de widget "stories" horizontal
 * générique (classes maison, pas de data-slot-path, data-exchange, etc.).
 */
export default async function TikTokStoriesSlider() {
    const videoStories = await getVideoStories();

    const tiktokUrls = videoStories
        .filter((item) => item.platform === 'tiktok')
        .map((item) => item.url);
    const facebookUrls = videoStories
        .filter((item) => item.platform === 'facebook')
        .map((item) => item.url);

    const [tiktokOembedMap, facebookOembedMap] = await Promise.all([
        getTikTokOEmbedBatch(tiktokUrls),
        getFacebookOEmbedBatch(facebookUrls),
    ]);

    const items = videoStories.map((item) => {
        // Si une thumbnail/caption a déjà été renseignée côté CMS, on la garde.
        let thumbnail = item.thumbnail;
        let caption = item.caption;

        if (item.platform === 'tiktok') {
            thumbnail = thumbnail ?? tiktokOembedMap.get(item.url)?.thumbnailUrl;
            caption = caption ?? tiktokOembedMap.get(item.url)?.title;
        } else if (item.platform === 'facebook') {
            thumbnail = thumbnail ?? facebookOembedMap.get(item.url)?.thumbnailUrl;
            caption = caption ?? facebookOembedMap.get(item.url)?.title;
        } else if (item.platform === 'youtube') {
            thumbnail = thumbnail ?? getYouTubeThumbnail(item.url);
        }

        return { ...item, thumbnail, caption };
    });

    return <TikTokStoriesSliderClient items={items} />;
}
