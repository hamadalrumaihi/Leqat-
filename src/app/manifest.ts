import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'برنامج مهندس الحياة — Life Engineer Program',
    // Official Arabic name; launchers truncate long labels themselves.
    short_name: 'برنامج مهندس الحياة',
    description: 'منصة برنامج مهندس الحياة التربوي',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#1F5C3A',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      // Scalable SVG covers all launcher sizes; PNG variants were
      // referenced but never shipped (install-time 404s), so removed.
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
