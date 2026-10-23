# BRAND — Chia Tiền

## Nhận diện

- **Logo chính thức:** `public/products/brand/chiatien-logo.svg` — dấu chia (÷)
  trắng/kem trên nền hổ phách bo góc. Khái niệm: "chia" theo đúng nghĩa đen,
  nhìn một cái hiểu ngay app làm gì.
- **Màu thương hiệu:** hổ phách đậm `#B45309` (brand), đậm hơn `#92400E`
  (brand-deep), tint nền `#FAECD7` (brand-soft). Nền app kem ấm `#F7F3EC`,
  mực `#1C1917`.
- **Không gradient** ở bất cứ đâu. Không tím-xanh kiểu template AI.
- **Màu ngữ nghĩa số dư:** xanh lá `#177245` (được nhận lại), đỏ gạch
  `#B3352C` (phải trả thêm).
- **Font:** Be Vietnam Pro (nội dung, đủ dấu tiếng Việt) + Outfit (số tiền,
  tiêu đề — font-display).

## Quy tắc artwork

Logo SVG là nguồn sự thật duy nhất. PNG cho SEO/PWA (icons, og.png) sinh bằng
`scripts/generate-brand-pngs.mjs` — script chỉ raster hoá/thu phóng nguyên bản,
không vẽ lại, không đổi màu. Icon maskable và apple-touch-icon đặt logo nguyên
bản trên nền kem `#F7F3EC` vì nền tảng bắt buộc nền đục.
