import type { MetadataRoute } from 'next';

// Colours match the light theme's page background and accent. The manifest has
// no per-language variants, so the name and description stay in English.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'TrustLens',
    short_name: 'TrustLens',
    description:
      'Public claims, the evidence on each side, and how reliable the sources are.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#eef1ef',
    theme_color: '#2340c4',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
