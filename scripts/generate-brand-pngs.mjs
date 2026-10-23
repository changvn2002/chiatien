/**
 * Sinh các bản PNG phục vụ SEO/PWA từ SVG brand CHÍNH THỨC trong public/products/brand/:
 *   public/og.png                        1200×630 — ảnh Open Graph / Twitter card
 *   public/icons/icon-192.png            192×192  — icon PWA (nền trong suốt)
 *   public/icons/icon-512.png            512×512  — icon PWA (nền trong suốt)
 *   public/icons/icon-maskable-512.png   512×512  — icon maskable (logo 80% trên nền kem)
 *   public/icons/apple-touch-icon.png    180×180  — icon iOS (logo 88% trên nền kem)
 *
 * Nguyên tắc brand (xem BRAND.md): artwork KHÔNG bị sửa — không đổi màu, không vẽ lại.
 * Script chỉ raster hoá nguyên bản SVG ở kích thước đích; khi nền tảng bắt buộc
 * nền đục (maskable, iOS) thì đặt nguyên bản logo vào giữa nền kem #F7F3EC.
 * Riêng og.png là bố cục riêng cho mạng xã hội: nền kem + logo nguyên bản + chữ
 * (font hệ thống Noto Sans có đủ dấu tiếng Việt).
 *
 * Cách chạy (cần @resvg/resvg-js — tool sinh ảnh một lần, KHÔNG phải dependency
 * runtime của app; repo này dùng bản đã cài sẵn ở ~/workspace/mini-apps/resvg-tool):
 *   RESVG_DIR=../resvg-tool node scripts/generate-brand-pngs.mjs
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anchor = process.env.RESVG_DIR
  ? path.join(process.env.RESVG_DIR, 'package.json')
  : path.join(root, 'package.json');
const { Resvg } = createRequire(anchor)('@resvg/resvg-js');

const CREAM = '#F7F3EC'; // nền app (BRAND.md)
const INK = '#1C1917';
const MUTED = '#6F675C';
const BRAND = '#B45309';

function readBrand(file) {
  return readFileSync(path.join(root, 'public/products/brand', file), 'utf8');
}

/** Chèn toạ độ/kích thước vào thẻ <svg> gốc để nhúng nguyên bản artwork vào một khung lớn hơn. */
function nest(svg, { x, y, width, height }) {
  return svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${width}" height="${height}" `);
}

function render(svg, width, outFile, { withFonts = false } = {}) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: withFonts, defaultFontFamily: 'Noto Sans' },
  })
    .render()
    .asPng();
  const out = path.join(root, 'public', outFile);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log(`✓ ${outFile} (${png.length} bytes)`);
}

const logo = readBrand('chiatien-logo.svg');

// Icon PWA thường: raster nguyên bản logo, giữ nền trong suốt.
render(logo, 192, 'icons/icon-192.png');
render(logo, 512, 'icons/icon-512.png');

// Icon maskable 512: logo chiếm 80% trong vùng an toàn, trên nền kem.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" fill="${CREAM}"/>` +
    nest(logo, { x: 51, y: 51, width: 410, height: 410 }) +
    `</svg>`,
  512,
  'icons/icon-maskable-512.png',
);

// Apple touch icon 180: iOS không hỗ trợ nền trong suốt nên cũng đặt trên nền kem, logo 88%.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">` +
    `<rect width="180" height="180" fill="${CREAM}"/>` +
    nest(logo, { x: 11, y: 11, width: 158, height: 158 }) +
    `</svg>`,
  180,
  'icons/apple-touch-icon.png',
);

// OG 1200×630: nền kem, logo nguyên bản bên trái, chữ bên phải.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="${CREAM}"/>` +
    `<rect x="0" y="0" width="1200" height="14" fill="${BRAND}"/>` +
    nest(logo, { x: 80, y: 155, width: 320, height: 320 }) +
    `<text x="460" y="290" font-family="Noto Sans" font-size="110" font-weight="700" fill="${INK}">Chia Tiền</text>` +
    `<text x="464" y="360" font-family="Noto Sans" font-size="40" fill="${MUTED}">Chia tiền nhóm — quyết toán một lần,</text>` +
    `<text x="464" y="412" font-family="Noto Sans" font-size="40" fill="${MUTED}">ai trả ai kèm mã VietQR</text>` +
    `<text x="464" y="492" font-family="Noto Sans" font-size="30" font-weight="700" fill="${BRAND}">chiatien.vercel.app</text>` +
    `</svg>`,
  1200,
  'og.png',
  { withFonts: true },
);

if (!existsSync(path.join(root, 'public/og.png'))) {
  throw new Error('og.png was not written');
}
console.log('Done — brand artwork was only scaled/composited, never modified.');
