import type { NextConfig } from "next";

// Host des médias WordPress, dérivé de NEXT_PUBLIC_WP_API_URL pour rester
// aligné automatiquement avec la source de données : si le WP déménage sur un
// sous-domaine (ex. cms.thefourthestategh.com), les uploads suivent sans
// second endroit à modifier. Sans ça, next/image bloque les images du
// nouveau host et toute la home casse.
const WP_ORIGIN = (() => {
    try {
        return new URL(
            process.env.NEXT_PUBLIC_WP_API_URL || "https://cms.thefourthestategh.com/wp-json/wp/v2"
        ).origin;
    } catch {
        return "https://cms.thefourthestategh.com";
    }
})();

const WP_MEDIA_HOSTNAME = new URL(WP_ORIGIN).hostname;

const nextConfig: NextConfig = {
  // Le compte cPanel a plusieurs package-lock.json à côté de ce projet
  // (Mediascape/, .trash/) : sans ce paramètre, Next.js remonte
  // l'arborescence, trouve plusieurs lockfiles, et choisit le dossier
  // home comme "root" au lieu de TFEDemo/ — ce qui peut désynchroniser
  // la résolution des variables d'environnement au runtime.
  outputFileTracingRoot: __dirname,
  // L'hébergement WP (shared hosting) sature sous la charge de 3 workers
  // de build tapant l'API en parallèle sur 237 pages statiques (tags +
  // articles) -> timeouts >60s puis 500 côté WP après retries. On donne
  // plus de marge (défaut 60s) et on limite la concurrence des workers.
  staticPageGenerationTimeout: 180,
  experimental: {
    cpus: 1,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: WP_MEDIA_HOSTNAME,
        pathname: '/wp-content/uploads/**',
      },
      // Les articles déjà publiés référencent en base des images sur l'ancien
      // host (thefourthestategh.com), qui sert désormais CE Next.js. On garde
      // le host autorisé pour next/image, et le rewrite ci-dessous se charge
      // de proxifier la requête vers le CMS pour qu'elle ne finisse pas en 404.
      {
        protocol: 'https',
        hostname: 'thefourthestategh.com',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
    ],
  },
  // Bascule de domaine : thefourthestategh.com servait WordPress et sert
  // maintenant Next.js. Tout le contenu déjà en base pointe ses <img> sur
  // https://thefourthestategh.com/wp-content/uploads/... — sans ce proxy,
  // c'est 404 sur les images de tout l'historique. `beforeFiles` pour passer
  // avant le routage de l'app (aucune route Next ne commence par
  // /wp-content, mais on évite toute surprise avec un catch-all futur).
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/wp-content/uploads/:path*',
          destination: `${WP_ORIGIN}/wp-content/uploads/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // wp-admin / wp-login sur l'ancien domaine : on renvoie les rédacteurs et
  // les bookmarks vers le CMS. Volontairement non permanent (307) : si le WP
  // redéménage, un 301 resterait gravé dans les navigateurs.
  async redirects() {
    return [
      {
        source: '/wp-admin/:path*',
        destination: `${WP_ORIGIN}/wp-admin/:path*`,
        permanent: false,
      },
      {
        source: '/wp-login.php',
        destination: `${WP_ORIGIN}/wp-login.php`,
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;