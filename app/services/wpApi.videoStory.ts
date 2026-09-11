import { type VideoStoryItem, detectPlatform } from '../components/VideoSlider/Tiktokdemodata';

// ---------------------------------------------------------------------------
// wpApi.videoStory.ts — dédié au custom post type "video-story", consommé
// par le slider "Video Stories" de la homepage.
// Fichier indépendant de wpApi.ts, même convention que wpApi.tv.ts.
//
// Depuis le mu-plugin tfe-video-story.php (wordpress/mu-plugins/), ce CPT
// n'est plus géré par ACF : champs natifs WordPress, exposés en REST sous
// `meta` (register_post_meta + show_in_rest, pas de clé `acf`) :
//   meta.tfe_video_url        — lien de la vidéo source (TikTok, YouTube,
//                                Facebook…), requis
//   meta.tfe_video_caption    — optionnel, sinon fallback sur l'oEmbed/titre
//   meta.tfe_video_thumbnail  — optionnel (URL), sinon fallback résolu par
//                                plateforme
//   meta.tfe_video_duration   — optionnel, purement visuel ("1:42")
// ---------------------------------------------------------------------------

const WP_BASE = process.env.NEXT_PUBLIC_WP_API_URL || 'https://cms.thefourthestategh.com/wp-json/wp/v2';

interface WPVideoStoryPost {
    id: number;
    title: { rendered: string };
    date: string;
    meta: {
        tfe_video_url?: string;
        tfe_video_caption?: string;
        tfe_video_thumbnail?: string;
        tfe_video_duration?: string;
    };
}

/**
 * Récupère les items du CPT "video-story", triés par date de publication
 * décroissante (le plus récent en premier dans le slider).
 * Ignore silencieusement les posts sans meta.tfe_video_url (champ requis
 * manquant).
 */
export async function getVideoStories(perPage: number = 20): Promise<VideoStoryItem[]> {
    try {
        const res = await fetch(
            `${WP_BASE}/video-story?per_page=${perPage}&status=publish&orderby=date&order=desc&_fields=id,title,date,meta`,
            { next: { revalidate: 600 } }
        );

        if (!res.ok) {
            console.error(`Erreur wpApi.videoStory [getVideoStories]: ${res.status}`);
            return [];
        }

        const posts: WPVideoStoryPost[] = await res.json();

        return posts
            .filter((post) => !!post.meta?.tfe_video_url)
            .map((post) => {
                const url = post.meta.tfe_video_url!;
                return {
                    id: `video-story-${post.id}`,
                    url,
                    platform: detectPlatform(url),
                    caption: post.meta.tfe_video_caption || undefined,
                    thumbnail: post.meta.tfe_video_thumbnail || undefined,
                    duration: post.meta.tfe_video_duration || undefined,
                };
            });

    } catch (error) {
        console.error('Erreur wpApi.videoStory [getVideoStories]:', error);
        return [];
    }
}
