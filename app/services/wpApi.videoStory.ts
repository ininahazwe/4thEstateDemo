import { type VideoStoryItem, detectPlatform } from '../components/VideoSlider/Tiktokdemodata';

// ---------------------------------------------------------------------------
// wpApi.videoStory.ts — dédié au custom post type "video-story" (créé via
// ACF), consommé par le slider "Video Stories" de la homepage.
// Fichier indépendant de wpApi.ts, même convention que wpApi.tv.ts.
//
// Champs ACF attachés au CPT (voir GET /wp-json/wp/v2/video-story) :
//   acf.url        — lien de la vidéo source (TikTok, YouTube…), requis
//   acf.caption    — optionnel, sinon fallback sur l'oEmbed/titre du post
//   acf.thumbnail  — optionnel, sinon fallback résolu par plateforme
//   acf.duration   — optionnel, purement visuel ("1:42")
// ---------------------------------------------------------------------------

const WP_BASE = process.env.NEXT_PUBLIC_WP_API_URL || 'https://thefourthestategh.com/wp-json/wp/v2';

interface WPVideoStoryPost {
    id: number;
    title: { rendered: string };
    date: string;
    acf: {
        url?: string;
        caption?: string;
        thumbnail?: string;
        duration?: string;
    };
}

/**
 * Récupère les items du CPT "video-story", triés par date de publication
 * décroissante (le plus récent en premier dans le slider).
 * Ignore silencieusement les posts sans acf.url (champ requis manquant).
 */
export async function getVideoStories(perPage: number = 20): Promise<VideoStoryItem[]> {
    try {
        const res = await fetch(
            `${WP_BASE}/video-story?per_page=${perPage}&status=publish&orderby=date&order=desc&_fields=id,title,date,acf`,
            { next: { revalidate: 600 } }
        );

        if (!res.ok) {
            console.error(`Erreur wpApi.videoStory [getVideoStories]: ${res.status}`);
            return [];
        }

        const posts: WPVideoStoryPost[] = await res.json();

        return posts
            .filter((post) => !!post.acf?.url)
            .map((post) => {
                const url = post.acf.url!;
                return {
                    id: `video-story-${post.id}`,
                    url,
                    platform: detectPlatform(url),
                    caption: post.acf.caption || undefined,
                    thumbnail: post.acf.thumbnail || undefined,
                    duration: post.acf.duration || undefined,
                };
            });

    } catch (error) {
        console.error('Erreur wpApi.videoStory [getVideoStories]:', error);
        return [];
    }
}
