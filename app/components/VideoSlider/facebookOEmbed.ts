// ---------------------------------------------------------------------------
// oEmbed Facebook (Vidéos + Reels), même rôle que tiktokOEmbed.ts.
//
// Contrairement à TikTok, l'oEmbed Facebook n'est pas public : il faut un
// "App Access Token" (FACEBOOK_APP_ID|FACEBOOK_APP_SECRET) créé sur
// developers.facebook.com. Sans ces deux variables d'env, la fonction rend
// silencieusement {} — le slider retombe alors sur `acf.thumbnail` saisie à
// la main (voir TikTokStoriesSlider.tsx), pas d'erreur visible.
//
// Doit rester côté serveur : appel signé par le secret de l'app, jamais
// exposé au navigateur.
// ---------------------------------------------------------------------------

export interface FacebookOEmbedData {
    thumbnailUrl?: string;
    title?: string;
}

const OEMBED_ENDPOINT = 'https://graph.facebook.com/v21.0/oembed_video';

function getAppAccessToken(): string | undefined {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    return appId && appSecret ? `${appId}|${appSecret}` : undefined;
}

export async function getFacebookOEmbed(videoUrl: string): Promise<FacebookOEmbedData> {
    const accessToken = getAppAccessToken();

    // Pas de token configuré : on ne tente même pas l'appel (évite de
    // marteler l'API Graph avec des requêtes vouées à un 400).
    if (!accessToken) return {};

    try {
        const res = await fetch(
            `${OEMBED_ENDPOINT}?url=${encodeURIComponent(videoUrl)}&access_token=${encodeURIComponent(accessToken)}`,
            { next: { revalidate: 86400 } }
        );

        if (!res.ok) return {};

        const data = await res.json();

        return {
            thumbnailUrl: data.thumbnail_url,
            title: data.title,
        };
    } catch (error) {
        console.error('Erreur facebookOEmbed [getFacebookOEmbed]:', error);
        return {};
    }
}

export async function getFacebookOEmbedBatch(
    videoUrls: string[]
): Promise<Map<string, FacebookOEmbedData>> {
    const results = await Promise.all(
        videoUrls.map(async (url) => [url, await getFacebookOEmbed(url)] as const)
    );
    return new Map(results);
}
