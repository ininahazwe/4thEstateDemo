import TikTokStoriesSliderClient from './TikTokStoriesSliderClient';
import { getTikTokOEmbedBatch } from './tiktokOEmbed';
import {tiktokDemoItems} from "@/app/components/VideoSlider/Tiktokdemodata";


/**
 * Server Component : résout les thumbnails manquantes via l'oEmbed TikTok
 * (appel qui doit rester côté serveur, TikTok ne fournit pas de CORS pour
 * un fetch direct depuis le navigateur), puis délègue l'affichage et les
 * interactions (scroll, modal) à TikTokStoriesSliderClient.
 *
 * Le squelette HTML reproduit la structure du widget "Storylines" (Sitestream)
 * utilisé par Courrier International, en classes génériques sans dépendance
 * propriétaire (pas de data-slot-path, data-exchange, etc.).
 */
export default async function TikTokStoriesSlider() {
    const urls = tiktokDemoItems.map((item) => item.url);
    const oembedMap = await getTikTokOEmbedBatch(urls);

    const items = tiktokDemoItems.map((item) => {
        // Si une thumbnail a déjà été fournie manuellement, on la garde ;
        // sinon on utilise celle résolue via l'oEmbed.
        const thumbnail = item.thumbnail ?? oembedMap.get(item.url)?.thumbnailUrl;
        return { ...item, thumbnail };
    });

    return <TikTokStoriesSliderClient items={items} />;
}