import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le compte cPanel a plusieurs package-lock.json à côté de ce projet
  // (Mediascape/, .trash/) : sans ce paramètre, Next.js remonte
  // l'arborescence, trouve plusieurs lockfiles, et choisit le dossier
  // home comme "root" au lieu de TFEDemo/ — ce qui peut désynchroniser
  // la résolution des variables d'environnement au runtime.
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
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