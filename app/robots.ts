import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://thefourthestategh.com";

/**
 * robots.txt du front.
 *
 * Note d'exploitation : Cloudflare *prepend* son bloc « Content Signals Policy »
 * (commentaires search / ai-input / ai-train) avant ce contenu. Les deux sont
 * concatenes dans une seule reponse, les directives ci-dessous restent donc
 * bien actives. Verifie le 18/08/2026 sur la production.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/wp-admin',
          '/wp-json',
          // Routes applicatives : toutes declenchees par une action utilisateur
          // (formulaires, favoris, traduction, tracking). Aucune n'alimente le
          // rendu initial, les bloquer ne prive donc pas Googlebot de contenu.
          '/api/',
          '/*.json$',
          '/search',
          '/connexion',
          '/sso',
        ],
        // Pas de `crawlDelay` : Google l'ignore et Bing le respecte au pied de
        // la lettre (1 requete/seconde), ce qui ralentit l'indexation d'un site
        // d'actualite ou la fraicheur est l'enjeu principal.
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    // `host` retire : directive Yandex historique, ignoree par Google et Bing.
  };
}
