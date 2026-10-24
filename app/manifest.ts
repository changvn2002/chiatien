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
    // Canvas trắng V4 #FFFFFF (màn hình chờ khi mở app đã cài) + seed brand V4 #FF5722 cho theme.
    background_color: '#FFFFFF',
    theme_color: '#FF5722',
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
