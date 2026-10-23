import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  // App hiện có đúng một route trang: "/" (toàn bộ trải nghiệm nằm trong một màn hình).
  // Khi có thêm route trang thật, bổ sung vào danh sách này.
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
