import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Impahla app · Party Registry',
    short_name: 'Impahla app',
    description: 'A private, offline-first contribution registry for your celebration.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f6f1',
    theme_color: '#3c2636',
    icons: [
      {
        src: '/registry-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
