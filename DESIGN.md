---
name: Chia Tiền
description: Chia tiền nhóm kiểu Việt Nam — quyết toán một lần, kèm VietQR. (Redesign Wave: wizard 3 bước + thanh chốt dính; bản này thay DESIGN.md cũ từ đợt implementation 2026-10-23.)
colors:
  primary: "#B45309"
  primary-deep: "#92400E"
  primary-soft: "#FAECD7"
  rail: "#FFFBEB"
  paper: "#F7F3EC"
  card: "#FFFFFF"
  ink: "#1C1917"
  muted: "#6F675C"
  line: "#E6DDCF"
  line-strong: "#8A7A5F"
  credit: "#177245"
  debt: "#B3352C"
typography:
  display:
    fontFamily: "Be Vietnam Pro, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 800
  body:
    fontFamily: "Inter, Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Inter, Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  chip-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  stepper-active:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  settlement-rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "12px 16px"
---

# Design System: Chia Tiền (Redesign Wave)

## Overview

**Creative North Star: "The Trusted Ledger"**

Chia Tiền vẫn trông như một cuốn sổ cái được giữ bởi một ngân hàng số Việt
Nam nghiêm túc: giấy ấm, mực đậm, một giọng hổ phách duy nhất, và những con
số không bao giờ chao đảo. Điểm thay đổi của đợt này là *hình dạng của việc
chốt tiền*: thay vì một trang dài cuộn qua thành viên, khoản chi rồi mới tới
kết quả, app dẫn người dùng qua **ba bước có tên** — Thành viên, Khoản chi,
Thanh toán — trong khi **kết quả quyết toán rút gọn luôn nằm trước mắt** ở
thanh chốt dính (Settlement Rail). Người dùng không còn phải cuộn để biết
"ai trả ai bao nhiêu": con số đó đi cùng họ từ bước đầu tiên.

Hệ thống tiếp tục từ chối diện mạo template AI: không gradient ở bất cứ đâu,
không tím-xanh, không card lồng card, không chữ xám trên nền màu, không ô
icon bo tròn trên mọi heading.

**Key Characteristics:**

- Màu đặc duy nhất; độ sâu từ lớp tông phẳng và hai bóng mềm đã khai.
- Một accent hổ phách chỉ dành cho hành động, lựa chọn và focus.
- Wizard 3 bước + Settlement Rail luôn hiển thị; mỗi bước của luồng chính
  hoàn thành trong tối đa 1 lần cuộn viewport trên mobile.
- Tiền luôn đặt bằng Be Vietnam Pro với chữ số tabular, căn phải trong ô
  nhập, định dạng kiểu Việt Nam (`150.000 ₫`).
- Mọi phần tử tương tác tối thiểu 44×44px; focus luôn thấy rõ bằng viền
  hổ phách đậm.
- Tiếng Việt đời thường ở mọi nhãn; không thuật ngữ tài chính.

## Colors

Bảng màu giấy–mực ấm với một accent hổ phách và hai màu ngữ nghĩa số dư.
Mọi cặp chữ/nền đạt tối thiểu 4.5:1 (WCAG AA); các giá trị dưới đây là
chuẩn và sống dưới dạng CSS custom properties trong `app/globals.css`.
Mọi tỉ lệ tương phản trong tài liệu này là số ĐO THẬT ngày 2026-10-23
trên **nền render thật** của app (script
`~/workspace/mini-apps/chiatien-qa/contrast-redesign.mjs`, công thức
WCAG relative luminance) — không đo trên nền trắng lý tưởng; đây là
sửa lỗi phương pháp của UI panel §7.12, nơi bản cũ đã tính tương phản
trên nền trắng thay vì nền thật. Bảng đầy đủ ở cuối mục này.

### Primary

- **Deep Amber** (#B45309): giọng thương hiệu. Nút chính, bước đang active
  trên stepper, chip người trả đã chọn, viền focus, liên kết. Chữ trắng
  (#FFFFFF) trên nền brand đo thật 5.02:1; brand làm chữ trên nền trắng
  5.02:1 và trên paper (#F7F3EC) 4.54:1.
- **Dark Amber** (#92400E): trạng thái hover/pressed của nút chính và chữ
  trên tint. Đo thật: 6.09:1 trên Amber Tint (#FAECD7), 6.27:1 trên
  editor tint (#F8F0E4 — Amber Tint pha 40% trên paper), 7.09:1 trên
  trắng, 6.41:1 trên paper.
- **Amber Tint** (#FAECD7): nền lặng — chip người cùng chia đã chọn, nền
  bottom-sheet khi đang sửa. Chữ trên tint luôn là Dark Amber hoặc Ink.

### Neutral

- **Warm Paper** (#F7F3EC): nền app; kem ấm, không bao giờ trắng tinh hay xám.
- **Rail Cream** (#FFFBEB): nền dải stepper và Settlement Rail — dấu hiệu
  thị giác cho "khung điều hướng/kết quả", phân biệt với vùng nội dung mà
  không cần bóng đổ hay đường kẻ đậm.
- **Card White** (#FFFFFF): bề mặt nội dung — card, ô nhập, chip lúc nghỉ.
- **Ink** (#1C1917): chữ chính. Đo thật trên các nền render: 15.81:1
  trên paper (#F7F3EC), 17.49:1 trên trắng (#FFFFFF), 15.03:1 trên
  Amber Tint (#FAECD7), 16.86:1 trên Rail Cream (#FFFBEB), 15.47:1
  trên editor tint (#F8F0E4).
- **Warm Muted** (#6F675C): chữ phụ, chỉ trên paper hoặc trắng (đo thật:
  5.04:1 trên paper, 5.57:1 trên trắng). Không bao giờ đặt trên nền
  có màu.
- **Warm Line** (#E6DDCF): hairline và đường chia hàng; tín hiệu tách hàng
  luôn đi kèm thay đổi tông/nội dung, không bao giờ là tín hiệu duy nhất.
  Đo thật chỉ 1.35:1 trên trắng / 1.22:1 trên paper — **không bao giờ**
  dùng làm biên duy nhất của ô nhập/control (xem Line Strong).
- **Line Strong** (#8A7A5F, token `--line-strong`): nâu-taupe ấm cho
  **biên ô nhập và control** — tín hiệu non-text phải đạt ≥3.0:1. Đo
  thật: 4.18:1 trên trắng (#FFFFFF), 3.77:1 trên paper (#F7F3EC),
  3.69:1 trên editor tint (#F8F0E4) — đạt cả ba nền. Đây là giá trị
  nhạt nhất trong họ taupe đạt ngưỡng, để biên rõ mà không nặng mắt.

### Semantic

- **Ledger Green** (#177245): số dư dương — luôn kèm dấu `+` và nhãn chữ.
  Đo thật: 5.95:1 trên trắng, 5.11:1 trên Amber Tint, 5.26:1 trên
  editor tint.
- **Brick Red** (#B3352C): số dư âm, hành động phá huỷ, lỗi — luôn kèm
  dấu `−` hoặc chữ mô tả, không chỉ dựa vào màu. Đo thật: 6.07:1 trên
  trắng, 5.21:1 trên Amber Tint, 5.37:1 trên editor tint.

### Bảng tương phản đo thật (2026-10-23, nền render thật)

Editor tint = Amber Tint (#FAECD7) pha 40% trên paper (#F7F3EC), blend
theo kênh sRGB = **#F8F0E4**. Ngưỡng: chữ AA ≥4.5:1; non-text ≥3.0:1.

| Chữ | Nền render thật | Tỉ lệ | AA chữ (≥4.5) |
|---|---|---:|---|
| Ink #1C1917 | paper #F7F3EC | 15.81:1 | Đạt |
| Ink #1C1917 | trắng #FFFFFF | 17.49:1 | Đạt |
| Ink #1C1917 | Amber Tint #FAECD7 | 15.03:1 | Đạt |
| Ink #1C1917 | Rail Cream #FFFBEB | 16.86:1 | Đạt |
| Ink #1C1917 | editor tint #F8F0E4 | 15.47:1 | Đạt |
| Muted #6F675C | paper #F7F3EC | 5.04:1 | Đạt |
| Muted #6F675C | trắng #FFFFFF | 5.57:1 | Đạt |
| Brand #B45309 | trắng #FFFFFF | 5.02:1 | Đạt |
| Brand #B45309 | paper #F7F3EC | 4.54:1 | Đạt (sát ngưỡng — chỉ dùng cho chữ lớn/link ngắn) |
| Brand-deep #92400E | trắng #FFFFFF | 7.09:1 | Đạt |
| Brand-deep #92400E | paper #F7F3EC | 6.41:1 | Đạt |
| Brand-deep #92400E | Amber Tint #FAECD7 | 6.09:1 | Đạt |
| Brand-deep #92400E | editor tint #F8F0E4 | 6.27:1 | Đạt |
| Credit #177245 | trắng #FFFFFF | 5.95:1 | Đạt |
| Credit #177245 | Amber Tint #FAECD7 | 5.11:1 | Đạt |
| Credit #177245 | editor tint #F8F0E4 | 5.26:1 | Đạt |
| Debt #B3352C | trắng #FFFFFF | 6.07:1 | Đạt |
| Debt #B3352C | Amber Tint #FAECD7 | 5.21:1 | Đạt |
| Debt #B3352C | editor tint #F8F0E4 | 5.37:1 | Đạt |
| Trắng #FFFFFF | brand #B45309 | 5.02:1 | Đạt |
| Trắng #FFFFFF | brand-deep #92400E | 7.09:1 | Đạt |
| Brand-deep #92400E (CTA disabled mới) | Amber Tint #FAECD7 (nền CTA disabled) | 6.09:1 | Đạt |
| Line Strong #8A7A5F (biên input, non-text) | trắng #FFFFFF | 4.18:1 | Đạt non-text (≥3.0) |
| Line Strong #8A7A5F (biên input, non-text) | paper #F7F3EC | 3.77:1 | Đạt non-text (≥3.0) |
| Line Strong #8A7A5F (biên input, non-text) | editor tint #F8F0E4 | 3.69:1 | Đạt non-text (≥3.0) |

### Named Rules

**The No Gradient Rule.** Không gradient — trang trí, thương hiệu hay
chữ — ở bất cứ đâu. Nhấn mạnh đến từ đậm-nhạt, cỡ chữ và màu đặc.

**The One Amber Rule.** Hổ phách chỉ đánh dấu hành động, lựa chọn và
focus. Một màn hình dùng hổ phách để trang trí là đã trượt review.

**The Rail Rule.** Settlement Rail là nơi duy nhất được phép lặp lại kết
quả quyết toán ngoài bước Thanh toán — và nó bắt buộc phải có mặt ở mọi
bước. Kết quả không bao giờ chỉ tồn tại ở cuối một trang cuộn.

## Typography

**Display Font:** Be Vietnam Pro (800/700) — tiêu đề, nhãn bước, nút
chính, avatar và mọi con số tiền.
**Body Font:** Inter (400/500/600) — toàn bộ chữ còn lại, với Be Vietnam
Pro làm fallback đầu tiên.

**Vì sao đổi font (bằng chứng, không phải khẩu vị):** font display cũ
(Outfit) không có subset tiếng Việt (Fontsource metadata chỉ có latin +
latin-ext) nên glyph tiếng Việt âm thầm fallback; ứng viên Space Grotesk
không chứng minh được glyph dấu xếp chồng ở mức file nguồn. Be Vietnam Pro
là neo-grotesque do đội ngũ Việt Nam thiết kế, có subset `vietnamese` đầy
đủ đã kiểm chứng ở mức file; Inter có hỗ trợ tiếng Việt được ghi nhận độc
lập và chữ số tabular. Chuỗi nghiệm thu bắt buộc trước panel:
"Quyết toán · Ệ Ộ Ữ Ỡ Đ 1.500.000 ₫" phải hiển thị đủ dấu, đúng font đã
khai ở computed style, ở cả hai họ font.

**Character:** một hệ grotesque sổ sách: Be Vietnam Pro đậm và nén nhẹ
(`letter-spacing: -0.02em` ở cỡ ≥20px) tạo giọng fintech gọn; Inter trung
tính giữ thân bài lặng. Tiền luôn dùng chữ số tabular
(`font-variant-numeric: tabular-nums`) để cột số tiền thẳng hàng tới đồng.

### Hierarchy

- **Display** (Be Vietnam Pro, 800, 24px mobile / 28px từ breakpoint sm):
  tên cuộc chia, sửa tại chỗ.
- **Headline** (Be Vietnam Pro, 700, 20px): tên sản phẩm ở AppBar — H1
  duy nhất của trang.
- **Title** (Be Vietnam Pro, 700, 17–18px): tiêu đề trạng thái trong bước,
  tên cuộc chia trong danh sách.
- **Step label** (Be Vietnam Pro, 700, 14px): nhãn trên stepper.
- **Body** (Inter, 400, 16px): giá trị form, nội dung danh sách. Ô nhập
  không bao giờ nhỏ hơn 16px (chống iOS tự zoom).
- **Label** (Inter, 600, 14px): nhãn form và metadata phụ.
- **Caption** (Inter, 400, 12px): breakdown từng người, caption dưới QR.

## Layout

Khung: AppBar 56px + Stepper dính 52px + vùng bước + Settlement Rail
dính đáy (mobile, ~76px) hoặc cột phải dính 320px (desktop ≥1024px).
Chiều rộng nội dung tối đa 1120px; vùng bước tối đa 720px trên desktop.

Ngân sách cuộn cứng: mỗi bước của luồng chính hoàn thành trong ≤1 lần
cuộn viewport 390×844; CTA chính của bước luôn nằm trong Rail (không cần
cuộn); nội dung dài (giới thiệu, cách dùng, FAQ) nằm trong accordion mặc
định đóng bên dưới khu vực công cụ, không đẩy công cụ khỏi fold.

Nhịp dọc: 24px giữa các khối trong một bước, 32px giữa các khối lớn —
ít nhất hai mức khoảng cách section khác nhau trên mỗi màn hình. Hàng
danh sách tối thiểu 56px; nhóm liên quan cách 8px, nhóm không liên quan
cách 24–32px.

## Elevation & Depth

Độ sâu theo tông trước: card trắng trên giấy ấm, Rail Cream phân tầng
điều hướng, hàng trong card chia bằng hairline thay vì nổi thành card
riêng. Hai bóng mềm tông ấm giữ nguyên; không bóng cứng, không quầng màu,
không kính mờ.

### Shadow Vocabulary

- **Card shadow** (`0 1px 2px rgba(28,25,23,.05), 0 8px 24px rgba(28,25,23,.06)`): card và hàng lúc nghỉ.
- **Lift shadow** (`0 2px 4px rgba(28,25,23,.06), 0 16px 40px rgba(28,25,23,.1)`): chỉ cho bottom-sheet/dialog nổi.

### Named Rules

**The Flat Rows Rule.** Trong một card, hàng chia bằng hairline hoặc
khoảng trắng — không bao giờ bằng một hộp bo tròn có nền khác. Card không
lồng card.

## Shapes

Mềm nhưng không bong bóng: 16px cho card và sheet, 12px cho nút/ô nhập/
nút icon, 8px cho nút bật QR, full-round cho chip người, avatar và số
bước trên stepper. Viền 1px Warm Line cho hairline/card; riêng **biên
ô nhập và control** dùng Line Strong (#8A7A5F) để đạt ≥3.0:1 non-text;
sheet đang sửa có thể viền hổ phách 40% để đánh dấu "đang sửa ở đây".

## Components

### Buttons

- **Primary:** nền Deep Amber đặc, nhãn Be Vietnam Pro 700 trắng, radius
  12px, cao tối thiểu 44px (CTA chính trong Rail: 48px). Hover sang Dark
  Amber; disabled dùng nền Amber Tint + chữ Dark Amber (đo thật 6.09:1
  trên nền #FAECD7 — không dùng opacity mờ, trạng thái disabled phải
  đọc rõ là "chưa bấm được" chứ không phải "bị khoá") + cursor
  not-allowed. **Một** nút chính mỗi view.
- **Ghost:** nền trắng, viền Warm Line, nhãn Ink; hover viền hổ phách +
  chữ Dark Amber. Cho hành động phụ ("Thêm người", "Copy bản quyết toán").
- **Icon button:** 44×44px, nền trắng, viền Warm Line; biến thể nguy hiểm
  hover sang Brick Red. Luôn có `aria-label`.
- **Focus (mọi nút):** outline 2px Dark Amber, offset 2px, ở
  `:focus-visible`, cộng với mọi thay đổi viền.

### Stepper (mới)

Ba bước ngang, mỗi bước gồm vòng số 28px + nhãn 14px. Bước xong: vòng
Ledger Green với dấu tích + nhãn Ink. Bước đang làm: vòng Deep Amber,
chữ trắng. Bước bị khoá: vòng viền Line, nhãn Muted, kèm lý do 1 dòng khi
được chạm. Stepper là điều hướng thật — chạm bước đã mở được để quay lại.
Không dùng icon trang trí trên stepper.

### Settlement Rail (signature component)

Dải Rail Cream dính đáy (mobile) / cột phải dính (desktop). Nội dung tối
đa 2 dòng số liệu + 1 CTA: tổng chi (tabular, Display 700), lệnh chuyển
rút gọn đầu tiên dạng "An → Bình 500.000 ₫" + "+N lệnh" khi còn, và nút
chính của bước hiện tại. Ở bước Thanh toán trên desktop, Rail ẩn vì nội
dung đã là chính văn. Rail không bao giờ chứa đoạn văn giải thích.

### Chips

Chip người full-round kèm avatar 22px + tên. Vai người trả (chọn 1,
radio): chip đã chọn nền Deep Amber đặc, chữ trắng. Vai người cùng chia
(chọn nhiều, `aria-pressed`): chip đã chọn nền Amber Tint, chữ Dark Amber
+ dấu tích. Cao tối thiểu 44px.

### Cards / Containers

- **Card:** trắng, viền Warm Line 1px, radius 16px, card shadow, padding
  16–20px. Hàng bên trong chia bằng hairline (Flat Rows Rule).
- **Bottom-sheet editor:** thay editor panel chèn inline. Mobile trượt
  từ đáy (radius trên 16px, lift shadow); desktop là dialog 640px giữa
  màn hình. Nền Amber Tint 40% trên giấy + viền hổ phách 40% giữ vai
  "đang sửa ở đây". Focus trap, Esc đóng, đóng xong trả focus.
- **Empty state:** illustration phẳng `empty-state.webp` (tối đa 180px
  cao), tiêu đề Display, đúng 1 câu hướng dẫn, 1 CTA. Không khung dashed.

### Inputs / Fields

- **Style:** nền trắng, viền **Line Strong (#8A7A5F)** 1px — biên ô
  nhập là tín hiệu non-text, phải đạt ≥3.0:1 trên nền render thật
  (đo thật: 4.18:1 trên trắng, 3.77:1 trên paper, 3.69:1 trên editor
  tint; Warm Line cũ chỉ đạt 1.22–1.35:1 nên chỉ còn dùng cho hairline
  chia hàng, không dùng cho biên control). Radius 12px, padding
  10px×12px, chữ 16px. Focus chuyển viền sang Deep Amber (+ outline
  toàn cục cho bàn phím).
- **Placeholder:** taupe ấm riêng (#786D5B, đo thật 5.08:1 trên trắng)
  — không xám mờ.
- **Money input:** số Be Vietnam Pro tabular căn phải, hậu tố "đ" muted;
  tự nhóm nghìn khi gõ (`150000` → `150.000`).
- **Error:** chữ Brick Red kèm `role="alert"`, nêu vấn đề + cách sửa;
  nút Lưu của sheet bị khoá khi còn lỗi, lỗi liệt kê ngay trên nút.

### Navigation

Không tab bar. AppBar gồm logo mark, tên sản phẩm (H1 duy nhất) và liên
kết quay lại "Tất cả cuộc chia" (cao tối thiểu 44px). Bước hiện tại lưu
ở query `?buoc=`; Back của trình duyệt quay lại bước trước.

### Settlement (bước Thanh toán)

Hai khối xếp theo trọng số mới: **Ai trả ai** trước (giá trị cốt lõi),
**Số dư từng người** sau. Mỗi lệnh chuyển là 1 hàng phẳng: avatar + tên
hai đầu, mũi tên Lucide hổ phách, số tiền Display 700, và một trong hai
trạng thái QR theo luật dữ liệu ở mục dưới. Toàn bộ quyết toán copy được
thành văn bản thuần cho Zalo/Messenger.

### Share & VietQR — luật dữ liệu (BLOCKER)

Theo Enterprise Checklist **DATA-04/09a + SEC-12.5 (BLOCKER)**: thông
tin ngân hàng **không bao giờ** nằm trong link chia sẻ — ở tầng schema
của payload, không có ngoại lệ opt-in, không cảnh-báo-rồi-vẫn-chia-sẻ.
Link chỉ mang tên cuộc chia, thành viên (id + tên) và khoản chi; kết quả
quyết toán được tính lại ở máy người nhận. VietQR chỉ dựng từ thông tin
ngân hàng đã lưu **local trên chính máy đang xem**. Lệnh chuyển mà máy
đang xem chưa có tài khoản của người nhận thì hiển thị trạng thái hạng
nhất "Chưa có mã QR trên máy này" kèm hai đường đi (nhờ người nhận mở
link trên máy của họ / nhập tài khoản tại máy này) — không hiển thị QR
rỗng, không mượn dữ liệu từ link. Chi tiết luồng và câu chữ chốt:
`LAYOUT-SPEC.md` §5, `COPY-DIET.md` §3.

## App shell & offline

App đăng ký **service worker** (`public/sw.js`, xem ADR-4) và precache
**app shell** ở các URL ổn định — trang gốc `/`, manifest, icon PWA,
favicon, logo và illustration của empty state — để app mở được khi
offline thay vì rơi vào trang lỗi của trình duyệt. Bundle CSS/JS/font
(tên file có hash) vào runtime cache ngay ở lần tải đầu (cache-first /
stale-while-revalidate) nên từ lần mở thứ hai shell đầy đủ chạy
offline. Cache đặt tên theo phiên bản và dọn cache cũ khi bản mới
kích hoạt. Service worker cộng với manifest hiện có (standalone,
icon, `start_url`) phải làm app đạt tiêu chí **cài đặt PWA
(installable)**.

Chia Tiền thuần client-side + localStorage, nên sau khi shell đã cache,
luồng chính chạy offline **hoàn toàn**: wizard 3 bước và Settlement Rail
tính số dư, rút gọn nợ, lưu và mở lại cuộc chia từ localStorage — dữ liệu
phiên vẫn nguyên khi mất mạng và khi reload offline. Máy chưa từng tải
app vẫn cần mạng cho lần tải đầu tiên; spec không hứa hẹn ngược lại.

Trạng thái offline là trạng thái thiết kế hạng nhất, không phải lỗi: một
dòng chỉ báo nằm **trong Settlement Rail** (dòng đầu của rail dính đáy
trên mobile, dòng đầu của cột rail trên desktop; ở bước Thanh toán trên
desktop, nơi rail ẩn, dòng này nằm ở đầu khối "Ai trả ai"), với câu chữ
`Đang offline — vẫn chia tiền được, dữ liệu lưu trên máy này.` Chỉ báo
kèm icon Lucide `wifi-off` và chữ (không chỉ màu), dùng `aria-live=
"polite"`, không nền đỏ, không chặn thao tác; khi có mạng trở lại, đổi
thành `Đã có mạng trở lại` rồi tự ẩn.

Chia sẻ link không phụ thuộc mạng (payload encode hoàn toàn ở client,
copy/share chạy offline). **App không còn điểm phụ thuộc mạng nào**:
VietQR dựng payload EMVCo và render QR hoàn toàn client-side từ thông
tin ngân hàng local (xem ADR-2) — không còn ảnh tải từ vietqr.io, nên
QR vẫn sinh được khi offline, miễn máy đang xem có tài khoản của
người nhận. Khi máy chưa có tài khoản đó, trạng thái là "Chưa có mã QR trên
máy này" theo luật Share & VietQR ở trên — một trạng thái dữ liệu,
không phải lỗi mạng.

**The Offline Is Not An Error Rule.** Offline không bao giờ được trình
bày như một sự cố: không trang lỗi trình duyệt, không banner đỏ, không
chữ kỹ thuật. App chạy tiếp bình thường kèm chỉ báo lặng trong Rail.

## Motion

Chỉ hai chuyển động đã khai: trượt/mờ khi đổi bước (150–200ms) và mở
bottom-sheet (200ms), chỉ animate `transform`/`opacity`, easing
`cubic-bezier(0.2, 0, 0, 1)`. Không bounce/elastic. Khi
`prefers-reduced-motion`: mọi chuyển động tắt, thay bằng xuất hiện tức thì.

## Do's and Don'ts

### Do:

- **Do** giữ mọi số tiền ở Be Vietnam Pro tabular, nhóm nghìn kiểu Việt —
  một con số đổi bề rộng là phá niềm tin.
- **Do** tiêu hổ phách chỉ cho hành động, lựa chọn và focus.
- **Do** giữ vùng chạm ≥44px, kể cả hành động chỉ-chữ như "Chọn tất cả".
- **Do** nêu lỗi kèm vấn đề + cách sửa, bằng tiếng Việt, cạnh form gây lỗi.
- **Do** chia hàng trong card bằng hairline (Flat Rows Rule).
- **Do** để Settlement Rail luôn hiện kết quả rút gọn ở mọi bước.

### Don't:

- **Don't** dùng gradient, ở bất cứ đâu, vì bất cứ lý do gì.
- **Don't** lồng một hộp bo tròn có nền vào trong card.
- **Don't** đặt chữ xám/muted trên nền có màu; trên tint, chữ là Ink,
  Dark Amber hoặc chính màu ngữ nghĩa.
- **Don't** dùng emoji hoặc ký tự unicode làm icon — icon từ Lucide,
  một độ đậm nét.
- **Don't** thu chữ trong ô nhập xuống dưới 16px, hay vùng chạm xuống
  dưới 44px, để layout vừa.
- **Don't** đưa bất kỳ trường ngân hàng nào vào payload link chia sẻ —
  kể cả đã mã hoá, kể cả khi người dùng đồng ý (BLOCKER DATA-04/09a +
  SEC-12.5).

## Quyết định kiến trúc (ADR tóm tắt)

**ADR-1 — Share schema v2: ngân hàng không bao giờ vào link (DATA-04).**
Quyết định: payload link chia sẻ chỉ mang tên cuộc chia, thành viên
(id + tên) và khoản chi; thông tin ngân hàng sống trong "sổ ngân hàng"
lưu local per-device, keyed theo session + member. Lý do: link bị
forward/chụp lại ngoài tầm kiểm soát của người gửi, nên cấm ở tầng
schema là cách duy nhất không rò dữ liệu. Hệ quả: máy nhận link chưa
có tài khoản của người nhận thì hiển thị "Chưa có mã QR trên máy này"
thay vì QR — bất tiện nhỏ, đổi lấy an toàn tuyệt đối.

**ADR-2 — VietQR dựng payload EMVCo + render QR hoàn toàn client-side
(DATA-08).** Quyết định: app tự dựng chuỗi payload VietQR (EMVCo) và
render mã QR ngay trên máy (data URL), không gọi img.vietqr.io hay
bất kỳ dịch vụ QR ngoài nào. Lý do: cách cũ gửi BIN + số tài khoản +
tên chủ tài khoản + số tiền ra máy chủ bên thứ ba mỗi lần render.
Hệ quả: không dữ liệu ngân hàng nào rời máy, QR chạy cả khi offline,
và CSP được phép khoá `img-src`/`connect-src` về `'self'`.

**ADR-3 — CSP mức tĩnh cho app prerender (SEC-02).** Quyết định:
`Content-Security-Policy` tĩnh trong `next.config.ts` với
`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
và `script-src 'self' 'unsafe-inline'`. Lý do `'unsafe-inline'`:
Next static prerender nhúng inline bootstrap script; nonce đòi
middleware + dynamic rendering, phá bản chất app tĩnh — đánh đổi
được ghi nhận, bù bằng cấm mọi nguồn script ngoài. Hệ quả: mọi thay
đổi khiến app cần request ngoài đều phải sửa CSP có chủ đích, không
trôi âm thầm.

**ADR-4 — Service worker app-shell hai lớp cache (W5-01).** Quyết
định: `public/sw.js` viết tay — precache các URL ổn định (shell,
manifest, icon, logo, empty-state) vào cache có version, và runtime
cache cho `/_next/static/` (cache-first nhờ hash trong tên file);
navigation network-first, offline lùi về shell. Lý do: app thuần
client-side nên chỉ cần shell + bundle là chạy offline hoàn toàn.
Hệ quả: mỗi deploy đổi nội dung shell phải bump `CACHE_VERSION`
(activate tự xoá cache cũ); đăng ký SW do tầng UI đảm nhiệm.
