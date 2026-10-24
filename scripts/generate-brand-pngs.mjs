/**
 * Sinh các bản PNG/ICO phục vụ SEO/PWA từ artwork V4 CHÍNH THỨC:
 *   public/og.png                        1200×630 — ảnh Open Graph / Twitter card
 *   public/icons/icon-192.png            192×192  — icon PWA (app-icon V4)
 *   public/icons/icon-512.png            512×512  — icon PWA (app-icon V4)
 *   public/icons/icon-maskable-512.png   512×512  — icon maskable (app-icon full-bleed)
 *   public/icons/apple-touch-icon.png    180×180  — icon iOS (app-icon full-bleed)
 *   app/favicon.ico                      16/32/48 — favicon (bake THẲNG từ
 *                                        file micro chiatien-logo-micro.svg —
 *                                        Panel #05 F-R1-1, xem mục favicon ở
 *                                        cuối script)
 *
 * Artwork nguồn (REDESIGN-V4, LK-26: favicon + app-icon cùng một nguồn mark):
 * app-icon V4 = file public/products/brand/chiatien-app-icon.svg (chép byte
 * từ redesign-v4/chiatien/assets/app-icon.svg): tile seed #FF5722 bo rx
 * 20/96 + mark «Kẻ Đôi» trắng, mark cùng path với chiatien-logo.svg.
 * Script chỉ raster hoá, không vẽ lại, không đổi màu artwork.
 * Riêng og.png là bố cục riêng cho mạng xã hội: nền trắng #FFFFFF +
 * app-icon nguyên bản + art hero (hero-split.svg, bbox art chiếm 12,6%
 * diện tích OG — trần 30%) + chữ (font hệ thống Noto Sans đủ dấu).
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

const PAPER = '#FFFFFF'; // canvas V4 (nền OG, BRAND.md)
const INK = '#212121';
const MUTED = '#757575';
const BRAND = '#FF5722';
const BRAND_DEEP = '#BF360C'; // brand-900 — chữ trên trắng (domain ở OG)

function readBrand(file) {
  return readFileSync(path.join(root, 'public/products/brand', file), 'utf8');
}

/** Path «Kẻ Đôi» lấy nguyên từ logo SVG chính thức — một nguồn mark duy nhất (LK-26). */
function markPath(logoSvg) {
  const match = logoSvg.match(/<path[^>]*\sd="([^"]+)"/);
  if (!match) throw new Error('Không trích được path mark từ chiatien-logo.svg');
  return match[1];
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
  if (outFile) {
    const out = path.join(root, outFile);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, png);
    console.log(`✓ ${outFile} (${png.length} bytes)`);
  }
  return png;
}

/** ICO chứa PNG 16/32/48 — định dạng favicon.ico hiện hữu của repo. */
function buildIco(pngBySize) {
  const sizes = Object.keys(pngBySize)
    .map(Number)
    .sort((a, b) => a - b);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);
  const entries = [];
  let offset = 6 + sizes.length * 16;
  for (const size of sizes) {
    const png = pngBySize[size];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...sizes.map((s) => pngBySize[s])]);
}

markPath(readBrand('chiatien-logo.svg')); // kiểm nguồn mark còn trích được (LK-26)
const appIcon = readBrand('chiatien-app-icon.svg'); // app-icon V4 nguyên file (tile rx 20/96)
const appIconSquare = appIcon.replace('rx="20"', 'rx="0"'); // full-bleed cho maskable / iOS

// Icon PWA thường: app-icon V4 nguyên bản (tile bo góc trên nền trong suốt).
render(appIcon, 192, 'public/icons/icon-192.png');
render(appIcon, 512, 'public/icons/icon-512.png');

// Icon maskable 512: full-bleed — tile đặc phủ kín, mark giữ đúng vùng an toàn 70% của app-icon.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">` +
    nest(appIconSquare, { x: 0, y: 0, width: 512, height: 512 }) +
    `</svg>`,
  512,
  'public/icons/icon-maskable-512.png',
);

// Apple touch icon 180: iOS tự bo góc + không hỗ trợ nền trong suốt → bản full-bleed.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">` +
    nest(appIconSquare, { x: 0, y: 0, width: 180, height: 180 }) +
    `</svg>`,
  180,
  'public/icons/apple-touch-icon.png',
);

// Favicon ICO 16/32/48 — bake THẲNG từ file micro chuyên dụng
// public/products/brand/chiatien-logo-micro.svg (Panel #05 F-R1-1,
// điều kiện đóng của R1/R4): trước đây favicon thu nhỏ từ app-icon
// (tile brand + mark giấy scale 0.7) nên ở 16px mép mark mềm và mực
// chỉ chiếm ~55% khung. Micro dùng ĐÚNG path nguồn đó (byte-identical
// với chiatien-logo.svg, một nguồn duy nhất LK-26) nhưng mark phủ
// 10–86/96 lưới — render thẳng file micro ở từng cỡ cho mép sắc và
// ink-bbox @16 đạt ngưỡng GATE-C3 (≥11×11, 2 run trên mỗi trục).
// Script chỉ raster hoá nguyên bản file micro, không vẽ lại path.
const microSvg = readBrand('chiatien-logo-micro.svg');
const faviconPngs = {
  16: render(microSvg, 16, null),
  32: render(microSvg, 32, null),
  48: render(microSvg, 48, null),
};
const ico = buildIco(faviconPngs);
writeFileSync(path.join(root, 'app/favicon.ico'), ico);
console.log(`✓ app/favicon.ico (${ico.length} bytes)`);

// OG 1200×630: nền trắng V4, app-icon nguyên bản bên trái, chữ bên phải,
// art hero (hero-split.svg) ở dải dưới — bbox art 560×170 = 12,6% diện
// tích OG, dưới trần 30%.
const heroSvg = readBrand('hero-split.svg');
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="${PAPER}"/>` +
    `<rect x="0" y="0" width="1200" height="14" fill="${BRAND}"/>` +
    nest(appIcon, { x: 80, y: 90, width: 240, height: 240 }) +
    `<text x="360" y="215" font-family="Noto Sans" font-size="105" font-weight="700" fill="${INK}">Chia Tiền</text>` +
    `<text x="364" y="280" font-family="Noto Sans" font-size="38" fill="${MUTED}">Chia tiền nhóm — quyết toán một lần,</text>` +
    `<text x="364" y="330" font-family="Noto Sans" font-size="38" fill="${MUTED}">ai trả ai kèm mã VietQR</text>` +
    `<text x="364" y="400" font-family="Noto Sans" font-size="30" font-weight="700" fill="${BRAND_DEEP}">chiatien.vercel.app</text>` +
    nest(heroSvg, { x: 320, y: 430, width: 560, height: 170 }) +
    `</svg>`,
  1200,
  'public/og.png',
  { withFonts: true },
);

if (!existsSync(path.join(root, 'public/og.png'))) {
  throw new Error('og.png was not written');
}
console.log('Done — brand artwork was only scaled/composited, never modified.');
