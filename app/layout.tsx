import type { Metadata, Viewport } from 'next';
import { FAQ_ITEMS, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';
import './globals.css';

import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import '@fontsource/be-vietnam-pro/900.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

export const viewport: Viewport = {
  // Màu seed V4 #FF5722 — thanh trạng thái/trình duyệt trên mobile nhuộm theo app.
  themeColor: '#FF5722',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'chia tiền',
    'chia tiền nhóm',
    'chia tiền đi chơi',
    'chia tiền ăn nhậu',
    'quyết toán tiền nhóm',
    'split bill việt nam',
    'tính tiền nhóm',
    'chia tiền phòng trọ',
    'vietqr chia tiền',
    'ai trả ai bao nhiêu',
  ],
  alternates: {
    canonical: '/',
  },
  verification: {
    google: '4vR-FfACE45r_MqkVxeYtSg9ZY_VjsLS137PyDewq5E',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/products/brand/chiatien-logo.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

/**
 * Dữ liệu có cấu trúc (JSON-LD) — chỉ khai đúng sự thật về app:
 * miễn phí, không cần tài khoản, chạy trên trình duyệt. Phần FAQPage dùng
 * đúng nội dung FAQ đang hiển thị trên trang (chung nguồn FAQ_ITEMS).
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      inLanguage: 'vi',
    },
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      alternateName: 'chiatien',
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      inLanguage: 'vi',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'VND',
      },
    },
    {
      '@type': 'FAQPage',
      inLanguage: 'vi',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        {children}
      </body>
    </html>
  );
}
