import VideoZoneClient from './VideoZoneClient';
import { getVideoZoneItems } from '@/app/services/wpApi.videoZone';

/**
 * Server Component : fetch la playlist YouTube dédiée (voir wpApi.videoZone.ts),
 * délègue l'affichage et les interactions (changement de vidéo active) à
 * VideoZoneClient.
 */
export default async function VideoZone() {
    const items = await getVideoZoneItems();
    return <VideoZoneClient items={items} />;
}
