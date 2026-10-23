import type { NextConfig } from 'next';

/**
 * Content-Security-Policy (SEC-02) — app tĩnh, thuần client-side:
 * không còn bất kỳ request ngoài nào (VietQR nay dựng payload + render
 * QR hoàn toàn local, ảnh img.vietqr.io đã bị loại khỏi lib), font
 * self-host qua Fontsource (đóng gói trong bundle, không CDN).
 * Giải thích từng directive:
 * - default-src 'self': mặc định khoá mọi nguồn ngoài; mọi loại tài
 *   nguyên không khai riêng đều chỉ được tải từ chính origin này.
 * - script-src 'self' 'unsafe-inline': script chỉ từ origin này, cộng
 *   'unsafe-inline' — ĐÁNH ĐỔI CÓ GHI NHẬN: Next static prerender nhúng
 *   inline bootstrap script (flight data / hydration) vào HTML; bỏ
 *   'unsafe-inline' mà không có nonce sẽ phá hydration. Nonce cần
 *   middleware + dynamic rendering, mâu thuẫn với bản chất app tĩnh
 *   prerender — nên giữ 'unsafe-inline' cho script và bù bằng việc
 *   không có nguồn script ngoài nào khác + object-src 'none'.
 *   (Inline JSON-LD trong layout cũng cần directive này.)
 * - style-src 'self' 'unsafe-inline': Tailwind/Next chèn <style> và
 *   style attribute inline khi prerender; CSS ngoài chỉ từ 'self'.
 * - img-src 'self' data: blob: — ảnh tĩnh từ origin này; data: cho mã
 *   QR VietQR sinh local (canvas/data URL ngay trên máy); blob: cho
 *   các URL ảnh tạm do app tạo trong phiên (nếu có).
 * - font-src 'self' data: — font Fontsource self-host phát qua 'self';
 *   data: dự phòng cho font được nhúng dạng data URL trong CSS bundle.
 * - connect-src 'self': fetch/XHR/beacon chỉ về chính origin (app
 *   không gọi API ngoài; dữ liệu ở localStorage).
 * - worker-src 'self': service worker (public/sw.js) và worker chỉ
 *   được đăng ký từ origin này — chặn worker lạ nhúng từ ngoài.
 * - manifest-src 'self': web app manifest chỉ từ origin này.
 * - object-src 'none': cấm <object>/<embed>/plugin — app không dùng,
 *   khoá hẳn một lớp vector nhúng mã.
 * - base-uri 'self': cấm trang ngoài chèn <base> đổi gốc resolve URL
 *   tương đối của app.
 * - form-action 'self': form (nếu có) chỉ submit về origin này,
 *   chống formjacking chuyển dữ liệu sang origin lạ.
 * - frame-ancestors 'none': không trang nào được nhúng app trong
 *   frame/iframe (chống clickjacking; đi cùng X-Frame-Options DENY).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Security headers cho mọi route — bổ sung theo QA chiatien F3 (mẫu
 * dichbome): chống clickjacking / MIME-sniffing / rò referrer.
 * Permissions-Policy tắt các quyền app không dùng (app chỉ tính toán trên
 * trình duyệt, không camera/mic/định vị/thanh toán).
 */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
];

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
