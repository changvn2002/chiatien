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
 *   'unsafe-inline' — NGOẠI LỆ P-02 ĐƯỜNG C ĐÃ ĐĂNG KÝ (SEC-02):
 *   Next static prerender nhúng inline bootstrap script (flight data /
 *   hydration) chứa BUILD_ID ngẫu nhiên của từng lần build — đường A
 *   (hash sha256) đã thử bằng 2 lần build liên tiếp và KHÔNG khả thi
 *   (hash flight-data đổi theo build), đường B (nonce) đòi dynamic
 *   rendering trái bản chất app tĩnh. Hồ sơ đầy đủ + bằng chứng + biện
 *   pháp bù trừ: docs/security/CSP-EXCEPTION-P02.md; sổ đăng ký:
 *   docs/security/EXCEPTION-REGISTRY.md (EXC-CSP-01, hết hạn
 *   2027-01-21 hoặc release kế tiếp). Test lib/csp.spec.ts đối chiếu
 *   header này với sổ đăng ký trong CI — lệch là fail.
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
