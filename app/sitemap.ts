import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";
const WP_API = process.env.NEXT_PUBLIC_WP_API_URL || "https://thefourthestategh.com/wp-json/wp/v2";

interface WPPost {
  id: number;
  slug: string;
  date: string;
  modified: string;
}

async function getArticles(): Promise<WPPost[]> {
  try {
    const response = await fetch(
      `${WP_API}/posts?per_page=100&status=publish&_fields=slug,date,modified`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticles();

  const articleRoutes: MetadataRoute.Sitemap = articles.map((post) => {
    const date = new Date(post.date);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return {
      url: `${baseUrl}/${year}/${month}/${post.slug}`,
      lastModified: new Date(post.modified || post.date),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/abonnements`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/podcasts`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tv`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ];

  return [...staticRoutes, ...articleRoutes];
}
