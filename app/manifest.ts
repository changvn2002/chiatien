import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

/**
 * Web App Manifest — cho phép cài app lên màn hình chính và chạy standalone
 * như app thật. Icon PNG sinh từ logo SVG chính thức bằng
 * scripts/generate-brand-pngs.mjs (artwork không sửa, xem BRAND.md).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: 'vi',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Giấy V3 #FDF5F2 (màn hình chờ khi mở app đã cài) + seed brand V3 #A5482F cho theme.
    background_color: '#FDF5F2',
    theme_color: '#A5482F',
    categories: ['finance', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
