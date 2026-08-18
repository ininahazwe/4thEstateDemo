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
    // ─── Formats servis ──────────────────────────────────────────────────
    // Par défaut Next ne produit que du WebP. AVIF pèse ~25 à 30 % de moins
    // à qualité perçue égale : c'est le plus gros gain disponible sur le
    // poids des pages, et il ne coûte rien au lecteur (le navigateur
    // annonce ce qu'il sait lire via l'en-tête Accept ; les anciens
    // navigateurs reçoivent le WebP, puis le JPEG d'origine).
    //
    // L'ordre compte : Next prend le PREMIER format accepté par le
    // navigateur. AVIF doit donc précéder WebP.
    //
    // ⚠️ Contrepartie assumée : encoder de l'AVIF est nettement plus lent
    // que du WebP, et cette app tourne avec `cpus: 1`. La PREMIÈRE requête
    // sur une image donnée peut prendre 1 à 3 s. C'est précisément ce que
    // `minimumCacheTTL` ci-dessous rend indolore : on ne paie l'encodage
    // qu'une seule fois par image et par taille.
    formats: ['image/avif', 'image/webp'],

    // ─── Largeurs générées ───────────────────────────────────────────────
    // Défaut Next : [640, 750, 828, 1080, 1200, 1920, 2048, 3840].
    // Le 3840 est retiré : il ne sert que les écrans 4K en densité 2×, ne
    // change rien à la netteté perçue sur le reste du parc, et coûte le
    // plus cher — en CPU d'encodage comme en octets envoyés.
    //
    // Repère utile : exposure.co, cité en référence pour ses grandes
    // images nettes, ne sert jamais plus de 1200 px de large. La netteté
    // vient du cadrage et du taux de compression, pas de la résolution.
    //
    // Ce plafond est aussi un garde-fou : si un composant oublie son
    // attribut `sizes`, Next retombe sur `100vw` et demande la plus grande
    // largeur disponible. Sans ce réglage, ce serait 3840 px.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],

    // ─── Cache des images optimisées ─────────────────────────────────────
    // Durée minimale de conservation d'une variante déjà encodée.
    //
    // Une image de la médiathèque WordPress ne change JAMAIS après
    // publication : si un rédacteur veut une autre photo, il téléverse un
    // nouveau fichier, donc une nouvelle URL. Garder les variantes 30 jours
    // est donc sans risque, et c'est ce qui évite de re-encoder de l'AVIF
    // à chaque expiration — le poste de dépense le plus lourd pour un
    // serveur à 1 CPU.
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours

    // Note : si un jour on veut passer `quality={…}` sur un <Image>, Next 16
    // exige de déclarer les valeurs autorisées ici via `qualities: [...]`.
    // Non ajouté pour l'instant : la qualité par défaut (75) est le bon
    // compromis, et une valeur non déclarée provoquerait une erreur au build.

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