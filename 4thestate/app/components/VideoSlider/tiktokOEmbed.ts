export interface TikTokOEmbedData {
    thumbnailUrl?: string;
    title?: string;
    authorName?: string;
}

const OEMBED_ENDPOINT = 'https://www.tiktok.com/oembed';

export async function getTikTokOEmbed(videoUrl: string): Promise<TikTokOEmbedData> {
    try {
        const res = await fetch(
            `${OEMBED_ENDPOINT}?url=${encodeURIComponent(videoUrl)}`,
            { next: { revalidate: 86400 } }
        );

        if (!res.ok) return {};

        const data = await res.json();

        return {
            thumbnailUrl: data.thumbnail_url,
            title: data.title,
            authorName: data.author_name,
        };
    } catch (error) {
        console.error('Erreur tiktokOEmbed [getTikTokOEmbed]:', error);
        return {};
    }
}

export async function getTikTokOEmbedBatch(
    videoUrls: string[]
): Promise<Map<string, TikTokOEmbedData>> {
    const results = await Promise.all(
        videoUrls.map(async (url) => [url, await getTikTokOEmbed(url)] as const)
    );
    return new Map(results);
}