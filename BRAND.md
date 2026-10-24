# BRAND — Chia Tiền

## Nhận diện

- **Logo chính thức (REDESIGN-V4):** `public/products/brand/chiatien-logo.svg` —
  mark «Kẻ Đôi Kết Toán»: một khối sổ đặc bị một kênh dọc (chia 65:35) và
  một kênh ngang cắt thành bốn khối, một path, một fill seed #FF5722.
  Hình học GIỮ NGUYÊN BYTE từ V3 — V4 chỉ đổi fill theo neo Material
  literal. Kẻ đôi tổng kết của hệ thống chính là hai cạnh của kênh ngang
  trong mark. Bản mono một màu: `chiatien-logo-mono.svg` (cùng path, fill
  #000000). Bản cỡ nhỏ: `chiatien-logo-micro.svg` (cùng path — render-check
  16px kèm theo khi ship). Lockup mark + wordmark «Chia Tiền»:
  `chiatien-lockup.svg` (wordmark dạng `<text>` Be Vietnam Pro 700, mực
  #212121). App icon: `chiatien-app-icon.svg` (tile seed #FF5722 bo góc +
  mark trắng). Art hero: `hero-split.svg`. Glyph khía đôi
  `glyph-khia-doi.svg` chỉ đóng vai glyph quyết toán tĩnh — không bao giờ
  là mark.
- **Nguồn asset V4:** chép byte nguyên bản từ
  `~/workspace/mini-apps/redesign-v4/chiatien/assets/` (mark.svg,
  mark-micro.svg, mono.svg, lockup.svg, app-icon.svg, hero-split.svg) —
  hồ sơ thiết kế V4 là nguồn sự thật; token duy nhất ở
  `redesign-v4/chiatien/assets/tokens.json`.
- **Màu thương hiệu (V4 — Google Material literal, NEO-0):** seed
  `#FF5722` (Deep Orange 500, chép nguyên giá trị công bố) — chỉ dùng làm
  solid CTA với nhãn mực đen #000000, mark, app-icon tile; CẤM làm chữ
  trên trắng và cấm chữ trắng cỡ thường trên nền seed. Hover/pressed CTA
  `#F4511E` (brand-600, nhãn vẫn đen). Chữ brand/link, focus ring và kẻ
  đôi cấu trúc: `#BF360C` (brand-900). Tint: `#FFCCBC` (brand-100). Canvas
  app: trắng `#FFFFFF` + thang Grey Material; mực chính `#212121`. Thang
  đầy đủ chép trong `app/globals.css` từ tokens.json (brand 50–900 +
  A700 `#DD2C00` — bậc 800 `#D84315` là bậc bẫy, không vai chữ).
- **Không gradient** ở bất cứ đâu. Không tím-xanh kiểu template AI.
- **Màu ngữ nghĩa (bậc công bố Material theo họ):** credit (được trả)
  solid `#2E7D32` / ink `#1B5E20` / bg `#E8F5E9`; debt (còn nợ) solid
  `#D32F2F` / ink `#B71C1C` / bg `#FFEBEE`; warning solid `#FF6F00` /
  bg `#FFF8E1`; info solid `#1565C0` / ink `#0D47A1` / bg `#E3F2FD`.
- **Avatar:** DiceBear `initials` — nền bậc 100 của 16 họ Material, chữ
  initials luôn là mực #212121 (Be Vietnam Pro 700) trên mọi nền.
- **Font:** Archivo variable (display — wght 800/900 + wdth 125) +
  Be Vietnam Pro (nội dung) + Inter 600/700 (mọi con số, `tnum`).

## Quy tắc artwork

Logo SVG là nguồn sự thật duy nhất; mọi biến thể (mono, micro, lockup,
app-icon, favicon) sinh từ **cùng một path mark** (LK-26). PNG/ICO cho
SEO/PWA (icons, og.png, favicon.ico) sinh bằng
`scripts/generate-brand-pngs.mjs`: app-icon lấy từ file
`chiatien-app-icon.svg` V4, favicon bake thẳng từ file micro, OG bố cục
trên trắng với art hero (art ≤30% diện tích OG) — script chỉ raster
hoá/thu phóng nguyên bản, không vẽ lại, không đổi màu artwork. Icon
maskable và apple-touch-icon dùng bản full-bleed của app-icon vì nền
tảng bắt buộc nền đục/tự bo góc. Cấm đặt mark seed trần trên nền đen/tối
(dùng tile trắng chứa mark hoặc mono trắng).
