import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'syns6',
    short_name: 'syns6',
    description: 'Neon-soaked bass-pounding karaoke machine',
    start_url: '/start_url',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#00ff00',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}

