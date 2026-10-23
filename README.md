<p align="center">
  <img src="public/products/brand/chiatien-logo.svg" alt="Chia Tiền" width="110" />
</p>

# Chia Tiền (chiatien)

> Chia tiền nhóm, quyết toán một lần cho xong — kèm VietQR đúng số tiền cho từng lần chuyển.
>
> Đi ăn, đi chơi nhóm: ghi ai đã trả khoản nào, app tự tính ai chuyển cho ai bao nhiêu, ít lần chuyển nhất.

[![Live app](https://img.shields.io/badge/app-live-brightgreen)](https://chiatien-five.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**🔴 Live app: https://chiatien-five.vercel.app** — không cần đăng nhập, không cài app, mở link là dùng ngay trên trình duyệt.
Repository: https://github.com/changvn2002/chiatien

<p align="center">
  <img src="docs/screenshots/chiatien-desktop.png" alt="Chia Tiền — quyết toán hoàn chỉnh của cuộc chia “Nhậu cuối tuần”: số dư từng người và 3 lần chuyển cần thiết" width="900">
</p>
<p align="center"><em>Một cuộc chia đã chốt xong: 4 người, 3 khoản chi, tổng 1.260.000 ₫ — app rút gọn thành đúng 3 lần chuyển (Chi → An 240.000 ₫, Dũng → An 180.000 ₫, Bình → An 40.000 ₫), mỗi lần chuyển có sẵn VietQR. Ảnh chụp thật từ bản production đang chạy.</em></p>

**Tóm tắt:** Đi chơi chung, ăn nhậu, ở trọ chung… rồi đến màn "để tính sau" là hay
cãi nhau. **Chia Tiền** ghi lại ai đã trả khoản nào, tự chia cho nhóm, triệt tiêu nợ
chồng chéo và cho ra danh sách **ai trả ai bao nhiêu với số lần chuyển tiền ít nhất** —
kèm mã **VietQR** sẵn cho từng lần chuyển. Không có máy chủ: dữ liệu nằm ngay trong
trình duyệt của bạn; cần gửi cho cả nhóm thì bấm một nút lấy link chia sẻ chứa trọn
cuộc chia.

## ✨ Tính năng

- **Nhiều cuộc chia độc lập** — mỗi chuyến đi / bữa tiệc / kỳ trọ là một cuộc
  chia riêng: đặt tên, sửa, xoá, lưu tự động trên máy.
- **3 kiểu chia** cho từng khoản chi:
  - *Chia đều* cho nhóm người được chọn (xử lý lẻ đồng chính xác tuyệt đối).
  - *Tuỳ chỉnh số tiền* từng người (ví dụ người không uống rượu không chịu tiền rượu) —
    form chỉ cho lưu khi tổng các phần đúng bằng số tiền của khoản chi.
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

### Toàn vẹn dữ liệu — không bao giờ lệch tiền trong im lặng

App tiền bạc thì dữ liệu lạ (link bị sửa tay, dữ liệu lưu trên máy bị hỏng) không
được phép tạo ra một bản quyết toán sai mà không ai hay biết. Hai lớp chốt chặn:

- **Lớp làm sạch nghiêm ngặt khi nạp dữ liệu** (`lib/sanitize.ts`, dùng chung cho
  cả link chia sẻ lẫn `localStorage`): mọi số tiền bị ép về số nguyên đồng ≥ 0;
  một khoản chia *tuỳ chỉnh* mà tổng các phần ≠ số tiền của khoản chi sẽ **bị loại
  hẳn** thay vì giữ lại tính tiếp, và app báo rõ số khoản đã bị loại ngay khi mở link.
- **Chốt chặn khi trình bày**: nếu tổng số dư toàn phiên ≠ 0 vì bất kỳ lý do gì,
  khu vực quyết toán hiện cảnh báo đỏ nêu số tiền lệch, và bản quyết toán dạng text
  khi copy cũng chèn dòng cảnh báo — không có đường nào để một quyết toán lệch
  được trình bày như thể đã khớp hết.

### Cảnh báo ngân hàng khi chia sẻ link

Link chia sẻ chứa toàn bộ cuộc chia — gồm cả **số tài khoản và tên chủ tài khoản**
của thành viên nào đã nhập thông tin ngân hàng (để có VietQR). App nói thẳng điều
này thay vì giấu trong chữ nhỏ:

- Ngay khi có thành viên nhập tài khoản, trang cuộc chia hiện **banner cảnh báo
  thường trực** nêu đích danh thành viên đó.
- Bấm "Chia sẻ link" khi cuộc chia có thông tin ngân hàng, app **hỏi xác nhận lại**
  trước khi copy — huỷ là không copy.

## 🖼️ Screenshots

Tất cả ảnh dưới đây được chụp trực tiếp từ bản production
[https://chiatien-five.vercel.app](https://chiatien-five.vercel.app) khi app đang ở
trạng thái **đã dùng thật**: cuộc chia "Nhậu cuối tuần" gồm 4 người (An, Bình, Chi,
Dũng), 3 khoản chi và quyết toán hoàn chỉnh — không phải màn hình trống lúc mới mở
app hay ảnh dựng sẵn.

### Quyết toán — giá trị cốt lõi của app

![Desktop 1440×900 — quyết toán hoàn chỉnh: số dư từng người và ai trả ai](docs/screenshots/chiatien-desktop.png)

_Trên desktop: bên trái là số dư từng người sau 3 khoản chi (An đã trả 800.000 ₫ nên
được nhận lại +460.000 ₫; Bình −40.000 ₫, Chi −240.000 ₫, Dũng −180.000 ₫); bên phải
là danh sách chuyển tiền đã rút gọn — cả nhóm chỉ cần 3 lần chuyển là xong nợ, mỗi
lần chuyển tới An đều có nút VietQR vì An đã nhập tài khoản Vietcombank._

| Mobile (390×844) | Social / link-preview (1280×640) |
| --- | --- |
| ![Mobile — 3 khoản chi và quyết toán xếp dọc trên điện thoại](docs/screenshots/chiatien-mobile.png) | ![Social — bản xem trước khi chia sẻ liên kết](docs/screenshots/chiatien-social.png) |
| _Trên điện thoại, khoản chi và quyết toán xếp dọc: cuộn một mạch là thấy đủ ai nợ ai, mỗi lần chuyển vẫn có nút VietQR riêng._ | _Khung 1280×640 dùng cho ảnh xem trước khi gửi link app qua Zalo/Facebook — vẫn thấy trọn 3 khoản chi và bản quyết toán._ |

### Theo từng bước sử dụng

**Bước 1 — Tạo cuộc chia và thêm cả nhóm.** Ai sẽ nhận tiền qua VietQR thì nhập
thêm tài khoản ngân hàng của người đó. Ngay khi có thành viên nhập tài khoản, app
hiện banner đỏ cảnh báo link chia sẻ sẽ chứa thông tin ngân hàng — như trong ảnh,
An (Vietcombank) là người duy nhất có VietQR trong nhóm.

![Bước 1 — cuộc chia “Nhậu cuối tuần” với 4 thành viên và banner cảnh báo ngân hàng](docs/screenshots/gallery-01-thanh-vien.png)

**Bước 2 — Ghi từng khoản chi, chọn đúng người cùng chia.** Khoản "Tiền rượu"
300.000 ₫ do Bình trả, chia *tuỳ chỉnh số tiền*: chỉ 3 người uống (An, Bình, Dũng)
mỗi người 100.000 ₫, Chi không uống nên không phải chịu. App cộng tổng ngay trên
form và chỉ cho lưu khi "đã phân bổ 300.000 ₫ / 300.000 ₫ — đã khớp".

![Bước 2 — form khoản chi tuỳ chỉnh số tiền đã điền khớp tổng](docs/screenshots/gallery-02-chia-tuy-chinh.png)

**Bước 3 — Chốt quyết toán và quét VietQR trả ngay.** Bấm nút VietQR ở lần chuyển
Chi → An 240.000 ₫: mã QR thật của Vietcombank hiện ra với đúng số tiền và nội dung
chuyển khoản đã điền sẵn — mở app ngân hàng quét là chuyển, không phải gõ lại số
tài khoản hay sợ sai số tiền.

![Bước 3 — VietQR của lần chuyển Chi → An 240.000 ₫ đang mở](docs/screenshots/gallery-03-vietqr.png)

## 🧭 Cách hoạt động

1. **Tạo cuộc chia**, thêm từng thành viên (ai nhận tiền qua VietQR thì nhập thêm tài khoản ngân hàng của họ).
2. **Ghi từng khoản chi**: ai trả, bao nhiêu, chia cho những ai — chia đều, tuỳ chỉnh số tiền, hoặc theo phần.
3. **Chốt quyết toán**: app tính số dư từng người và rút gọn thành ít lần chuyển nhất. Quét VietQR để trả ngay, hoặc copy bản quyết toán gửi thẳng vào nhóm Zalo/Messenger.

## 🛠️ Công nghệ

- Next.js 16 + React 19 + Tailwind CSS 4, hoàn toàn client-side.
- Logic thuần tách riêng trong `lib/` (`split`, `settle`, `vietqr`, `share`,
  `sanitize`, `storage`, `money`) và được kiểm chứng bằng Vitest (55 test) — gồm
  property test cho thuật toán quyết toán (sau quyết toán mọi số dư về 0, số giao
  dịch ≤ n−1, tổng luôn cân bằng) và test hồi quy cho lớp làm sạch dữ liệu: khoản
  tuỳ chỉnh lệch tổng bị loại, số âm/số lẻ phân số không lọt qua được.
- SEO/PWA đầy đủ: metadata + Open Graph, JSON-LD, sitemap, robots, web app
  manifest, icon cài lên màn hình chính, chạy standalone.

## 🚀 Chạy local

```bash
pnpm install
pnpm dev        # http://localhost:3100
pnpm test       # unit test cho logic chia/quyết toán + lớp làm sạch dữ liệu
pnpm build      # bản production
```

Biến môi trường duy nhất (tuỳ chọn): `NEXT_PUBLIC_SITE_URL` — URL gốc của bản
production cho SEO; khi không đặt, app dùng `https://chiatien-five.vercel.app`
(khai trong `lib/site.ts`). Xem `.env.example`.

## 🔒 Quyền riêng tư

App không thu thập dữ liệu: mọi cuộc chia lưu trong `localStorage` của chính
trình duyệt bạn đang dùng. Link chia sẻ mang dữ liệu trong phần hash của URL —
phần này không bao giờ được gửi lên máy chủ khi tải trang. Đổi lại, hãy coi link
chia sẻ như một bản sao đầy đủ của cuộc chia: nếu có thành viên đã nhập tài khoản
ngân hàng, link chứa cả số tài khoản và tên chủ tài khoản của họ — chỉ gửi cho
người trong nhóm (app cũng cảnh báo điều này ngay trong giao diện, xem mục
"Cảnh báo ngân hàng khi chia sẻ link" ở trên).

## 📄 Giấy phép

MIT — xem `LICENSE`. © chang2tech.

Logo và artwork trong `public/products/brand/` thuộc về dự án và **không** nằm
trong giấy phép MIT — nếu fork, hãy thay bằng thương hiệu của bạn; xem `BRAND.md`.
