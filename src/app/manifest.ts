import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tidepool · Campus events',
    short_name: 'Tidepool',
    description: 'Campus invitations and event passes',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf9f4',
    theme_color: '#203d49',
    icons: [
      { src: '/identity/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/identity/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/identity/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
