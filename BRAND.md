# BRAND — Chia Tiền

## Nhận diện

- **Logo chính thức (REDESIGN-V3):** `public/products/brand/chiatien-logo.svg` —
  mark «Kẻ Đôi»: một khối sổ đặc bị một kênh dọc (chia 65:35) và một kênh
  ngang cắt thành bốn khối, một path, một fill seed #A5482F. Kẻ đôi tổng
  kết của hệ thống chính là hai cạnh của kênh ngang trong mark. Bản mono
  một màu: `chiatien-logo-mono.svg` (cùng path, fill #000000). Bản cỡ nhỏ:
  `chiatien-logo-micro.svg` (cùng path — render-check 16px kèm theo khi
  ship). Lockup mark + wordmark «Chia Tiền» dạng outline (trích từ file
  Be Vietnam Pro 700 thật của repo): `chiatien-lockup.svg`. Glyph khía
  đôi `glyph-khia-doi.svg` chỉ đóng vai glyph quyết toán tĩnh — không
  bao giờ là mark.
- **Màu thương hiệu (V3):** seed `#A5482F` (brand-500), hover/pressed
  `#8C361E` (brand-600), kẻ đôi + focus ring `#702612` (brand-700), tint
  `#FFE0D7` (brand-100). Nền app giấy `#FDF5F2`, mực `#140F0E`. Thang đầy
  đủ: brand-50 `#FFF2EE` · 200 `#FBC6B7` · 300 `#EBA38F` · 400 `#D67D65` ·
  800 `#511707` · 900 `#3A0F04` (không vai — cấm gán bề mặt/chữ/mark) ·
  950 `#1F0401`.
- **Không gradient** ở bất cứ đâu. Không tím-xanh kiểu template AI.
- **Màu ngữ nghĩa (bộ semantic +0,02 của V3):** credit (được trả) solid
  `#1D7725` / ink `#004F09`; debt (còn nợ) solid `#A80011` / ink
  `#6B0006`; warning solid `#AB5E00` / ink `#783F00`; info solid
  `#255EA6`.
- **Font:** Be Vietnam Pro (display, đủ dấu tiếng Việt) + Inter (body và
  mọi con số — Inter 600/700 + `tnum`).

## Quy tắc artwork

Logo SVG là nguồn sự thật duy nhất; mọi biến thể (mono, micro, lockup,
app-icon, favicon) sinh từ **cùng một path mark** (LK-26). PNG/ICO cho
SEO/PWA (icons, og.png, favicon.ico) sinh bằng
`scripts/generate-brand-pngs.mjs` từ app-icon V3 (tile `#A5482F` bo góc
+ mark giấy `#FDF5F2`) — script chỉ raster hoá/thu phóng nguyên bản,
không vẽ lại, không đổi màu. Icon maskable và apple-touch-icon dùng bản
full-bleed của app-icon vì nền tảng bắt buộc nền đục/tự bo góc.
