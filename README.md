# Chia Tiền — Chia tiền nhóm, quyết toán một lần, kèm VietQR

Đi chơi chung, ăn nhậu, ở trọ chung… rồi đến màn "để tính sau" là hay cãi nhau.
**Chia Tiền** ghi lại ai đã trả khoản nào, tự chia cho nhóm, triệt tiêu nợ chồng
chéo và cho ra danh sách **ai trả ai bao nhiêu với số lần chuyển tiền ít nhất** —
kèm mã **VietQR** sẵn cho từng lần chuyển.

Không cần đăng nhập. Không có máy chủ. Dữ liệu nằm ngay trong trình duyệt của
bạn; cần gửi cho cả nhóm thì bấm một nút lấy link chia sẻ.

## Tính năng

- **Nhiều cuộc chia độc lập** — mỗi chuyến đi / bữa tiệc / kỳ trọ là một cuộc
  chia riêng: đặt tên, sửa, xoá, lưu tự động trên máy.
- **3 kiểu chia** cho từng khoản chi:
  - *Chia đều* cho nhóm người được chọn (xử lý lẻ đồng chính xác tuyệt đối).
  - *Tuỳ chỉnh số tiền* từng người (ví dụ người không uống rượu không chịu tiền rượu).
  - *Theo phần/trọng số* (ở 2/3 đêm, ăn 1/2 bữa…).
- **Chỉ chia cho một nhóm nhỏ** — khoản chi nào thì chọn đúng những người liên quan.
- **Quyết toán tối thiểu giao dịch** — thuật toán đơn giản hoá nợ ghép chủ nợ
  lớn nhất với con nợ lớn nhất: n người chỉ cần tối đa n−1 lần chuyển.
- **VietQR thật cho từng giao dịch** — thành viên nào có tài khoản ngân hàng
  (chọn theo mã BIN trong danh sách ngân hàng Việt Nam) thì lần chuyển tới
  người đó có sẵn mã QR đúng số tiền, đúng nội dung, quét là chuyển.
- **Copy bản quyết toán** dạng text, dán thẳng vào Zalo/Messenger cho cả nhóm.
- **Link chia sẻ chứa trọn cuộc chia** (nén lz-string trong URL) — gửi link là
  người nhận mở ra xem/sửa tiếp được, không cần tài khoản hay máy chủ trung gian.
- **Tiền VND chuẩn Việt Nam** — gõ `150000` hiển thị `150.000 ₫`, mọi phép tính
  là số nguyên đồng, không bao giờ lệch 1 đồng vì làm tròn.

## Công nghệ

- Next.js 16 + React 19 + Tailwind CSS 4, hoàn toàn client-side.
- Logic thuần tách riêng trong `lib/` (`split`, `settle`, `vietqr`, `share`,
  `storage`, `money`) và được kiểm chứng bằng Vitest — gồm property test cho
  thuật toán quyết toán: sau quyết toán mọi số dư về 0, số giao dịch ≤ n−1,
  tổng luôn cân bằng.
- SEO/PWA đầy đủ: metadata + Open Graph, JSON-LD, sitemap, robots, web app
  manifest, icon cài lên màn hình chính, chạy standalone.

## Chạy local

```bash
pnpm install
pnpm dev        # http://localhost:3100
pnpm test       # unit test cho logic chia/quyết toán
pnpm build      # bản production
```

Biến môi trường duy nhất (tuỳ chọn): `NEXT_PUBLIC_SITE_URL` — URL gốc của bản
production cho SEO, mặc định `https://chiatien.vercel.app`. Xem `.env.example`.

## Quyền riêng tư

App không thu thập dữ liệu: mọi cuộc chia lưu trong `localStorage` của chính
trình duyệt bạn đang dùng. Link chia sẻ mang dữ liệu trong phần hash của URL —
phần này không bao giờ được gửi lên máy chủ khi tải trang.

## Giấy phép

MIT — xem `LICENSE`. Logo và artwork trong `public/products/brand/` thuộc về
dự án; xem `BRAND.md`.
