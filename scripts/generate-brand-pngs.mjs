/**
 * Sinh các bản PNG/ICO phục vụ SEO/PWA từ artwork V3 CHÍNH THỨC:
 *   public/og.png                        1200×630 — ảnh Open Graph / Twitter card
 *   public/icons/icon-192.png            192×192  — icon PWA (app-icon V3)
 *   public/icons/icon-512.png            512×512  — icon PWA (app-icon V3)
 *   public/icons/icon-maskable-512.png   512×512  — icon maskable (app-icon full-bleed)
 *   public/icons/apple-touch-icon.png    180×180  — icon iOS (app-icon full-bleed)
 *   app/favicon.ico                      16/32/48 — favicon (cùng nguồn mark, LK-26)
 *
 * Artwork nguồn (REDESIGN-V3, LK-26: favicon + app-icon cùng một nguồn mark):
 * app-icon V3 = tile brand-500 #A5482F bo rx 20/96 + mark «Kẻ Đôi» bằng giấy
 * #FDF5F2, mark lấy NGUYÊN path từ public/products/brand/chiatien-logo.svg
 * (bản thân file đó chép nguyên từ redesign-v3/chiatien/assets/logo-mark.svg) —
 * đúng phép biến đổi của redesign-v3/chiatien/assets/app-icon.svg:
 * translate(14.4 14.4) scale(0.7) trên lưới 96. Script chỉ raster hoá, không
 * vẽ lại, không đổi màu artwork.
 * Riêng og.png là bố cục riêng cho mạng xã hội: nền giấy #FDF5F2 + app-icon
 * nguyên bản + chữ (font hệ thống Noto Sans có đủ dấu tiếng Việt).
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

const PAPER = '#FDF5F2'; // giấy V3 (nền app, BRAND.md)
const INK = '#140F0E';
const MUTED = '#685E5B';
const BRAND = '#A5482F';

function readBrand(file) {
  return readFileSync(path.join(root, 'public/products/brand', file), 'utf8');
}

/** Path «Kẻ Đôi» lấy nguyên từ logo SVG chính thức — một nguồn mark duy nhất (LK-26). */
function markPath(logoSvg) {
  const match = logoSvg.match(/<path[^>]*\sd="([^"]+)"/);
  if (!match) throw new Error('Không trích được path mark từ chiatien-logo.svg');
  return match[1];
}

/** App-icon V3 trên lưới 96: tile brand + mark giấy, phép biến đổi của assets/app-icon.svg. */
function appIconSvg(d, { rx = 20 } = {}) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="${rx}" fill="${BRAND}"/>` +
    `<g transform="translate(14.4 14.4) scale(0.7)"><path fill="${PAPER}" d="${d}"/></g>` +
    `</svg>`
  );
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

const d = markPath(readBrand('chiatien-logo.svg'));
const appIcon = appIconSvg(d); // rx 20/96 như assets/app-icon.svg
const appIconSquare = appIconSvg(d, { rx: 0 }); // full-bleed cho maskable / iOS / favicon

// Icon PWA thường: app-icon V3 nguyên bản (tile bo góc trên nền trong suốt).
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

// Favicon ICO 16/32/48 từ cùng app-icon (LK-26).
const faviconPngs = {
  16: render(appIconSquare, 16, null),
  32: render(appIconSquare, 32, null),
  48: render(appIconSquare, 48, null),
};
const ico = buildIco(faviconPngs);
writeFileSync(path.join(root, 'app/favicon.ico'), ico);
console.log(`✓ app/favicon.ico (${ico.length} bytes)`);

// OG 1200×630: nền giấy, app-icon nguyên bản bên trái, chữ bên phải.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="${PAPER}"/>` +
    `<rect x="0" y="0" width="1200" height="14" fill="${BRAND}"/>` +
    nest(appIcon, { x: 80, y: 155, width: 320, height: 320 }) +
    `<text x="460" y="290" font-family="Noto Sans" font-size="110" font-weight="700" fill="${INK}">Chia Tiền</text>` +
    `<text x="464" y="360" font-family="Noto Sans" font-size="40" fill="${MUTED}">Chia tiền nhóm — quyết toán một lần,</text>` +
    `<text x="464" y="412" font-family="Noto Sans" font-size="40" fill="${MUTED}">ai trả ai kèm mã VietQR</text>` +
    `<text x="464" y="492" font-family="Noto Sans" font-size="30" font-weight="700" fill="${BRAND}">chiatien.vercel.app</text>` +
    `</svg>`,
  1200,
  'public/og.png',
  { withFonts: true },
);

if (!existsSync(path.join(root, 'public/og.png'))) {
  throw new Error('og.png was not written');
}
console.log('Done — brand artwork was only scaled/composited, never modified.');
