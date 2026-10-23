---
name: Chia Tiền
description: Chia tiền nhóm kiểu Việt Nam — quyết toán luôn trước mắt, kèm VietQR.
colors:
  primary: "#B45309"
  primary-deep: "#92400E"
  primary-soft: "#FAECD7"
  strip: "#FFF7E8"
  deck-sand: "#EFE6D8"
  paper: "#F7F3EC"
  card: "#FFFFFF"
  ink: "#1C1917"
  ink-2: "#5C554B"
  muted: "#6F675C"
  line: "#E6DDCF"
  line-strong: "#8A7A5F"
  credit: "#177245"
  debt: "#B3352C"
  identity-01: "#7C4A1E"
  identity-02: "#8A5A2B"
  identity-03: "#7A3B2E"
  identity-04: "#946B00"
  identity-05: "#5E503F"
  identity-06: "#855C1F"
  identity-07: "#4A6741"
  identity-08: "#6E5636"
  identity-09: "#654321"
  identity-10: "#7D5A3C"
  identity-11: "#596235"
  identity-12: "#8C6A3F"
  ink-inverse-segment: "#1C1917"
typography:
  display:
    fontFamily: "Be Vietnam Pro, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 800
  figure:
    fontFamily: "Inter, Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontFeatureSettings: '"tnum"'
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
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-primary-disabled:
    backgroundColor: "{colors.deck-sand}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  ledger-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "8px 0px"
  settlement-strip:
    backgroundColor: "{colors.strip}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "8px 16px"
  chip-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-select-solid:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  segmented-selected-ink:
    backgroundColor: "{colors.ink-inverse-segment}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
---

# Design System: Chia Tiền (REDESIGN-V2 — bản hiện hành, áp dụng từ đợt implementation v2 2026-10-23)

## Overview

**Creative North Star: "Settlement in Sight" — Số chốt luôn trước mắt**

V2 bỏ hẳn hình dạng "đi từng bước" của v1. Chia Tiền v2 là **một màn hình làm việc duy nhất**: sổ khoản chi dạng bảng phẳng (Live Ledger) chiếm thân, **dải quyết toán sống (Settlement Strip)** ghim đáy luôn hiển thị tổng + lệnh chuyển đầu tiên và cập nhật theo thời gian thực, và mọi thao tác thêm/sửa đều mở bằng **Action Sheet trượt lên từ dải đáy (Action Deck)** mà không rời màn hình. Quyết toán toàn văn + VietQR là *chế độ mở rộng của chính dải đáy* — không có "bước 3", không có màn kết quả riêng. Trên desktop, dải đáy hoá thành **cột quyết toán cố định dạng bảng số** (header, hàng lệnh, hàng tổng, dòng trạng thái) theo kỷ luật bảng của Stripe Dashboard.

Hệ tham chiếu định hình mọi quyết định (bảng truy vết: `REFERENCE-MAP.md`): **Stripe** cho kỷ luật số tiền và bảng dữ liệu (hàng tổng là một hàng của bảng; numeral tabular trên bề mặt bảng; accent chỉ là dấu chấm câu), **Raycast** cho tốc độ hành động (một hành động chính bất biến, bảng hành động theo đối tượng bằng một thao tác/`⌘K`, footer gợi ý phím, `Esc` lùi theo lớp), **Figma** cho hệ token đóng (thang spacing/type có tên, cùng quan hệ = cùng token).

Hệ thống tiếp tục từ chối diện mạo template AI: không gradient ở bất cứ đâu, không tím-xanh, không card lồng card, không chữ xám trên nền màu chưa đo, không ô icon bo tròn trên heading.

**Key Characteristics:**

- Một màn hình làm việc; settlement luôn hiển thị (thu gọn) và mở rộng tại chỗ (toàn văn).
- Mọi số tiền bằng **Inter + `tnum` đã kiểm chứng ở mức file** — xem Typography; Be Vietnam Pro chỉ gánh chữ display.
- Action Deck: nút chính `+ Thêm khoản` bất biến vị trí + nhãn ở mọi trạng thái.
- Màu đặc duy nhất (amber); độ sâu từ lớp tông phẳng + 1 bóng hướng lên duy nhất cho dải/sheet.
- Mọi phần tử tương tác ≥44×44px; biên control đạt ≥3:1 trên nền render thật; disabled không dùng opacity và luôn kèm lý do.
- Ngân sách bề ngang cứng: không chuỗi dữ liệu nào được quyết định bề rộng layout (LAYOUT-SPEC §0.1).

## Colors

Bảng màu giấy–mực ấm với một accent hổ phách và hai màu ngữ nghĩa số dư. Mọi tỉ lệ tương phản dưới đây tính bằng **công thức WCAG relative luminance trên nền render dự kiến thật** (script Python, 2026-10-23) — nền mà phần tử thật sự nằm (paper / trắng / strip / tint / sand), không tính trên nền lý tưởng. Ngưỡng: chữ ≥4.5:1; tín hiệu phân định non-text ≥3.0:1.

### Primary

- **Deep Amber** (#B45309): giọng thương hiệu — nút chính, lựa chọn đang active, focus, kẻ đôi tổng kết. Trắng trên brand: **5.02:1**. Brand làm chữ: 5.02:1 trên trắng, **4.54:1 trên paper** (chỉ chữ lớn/link ngắn), 4.72:1 trên strip (chỉ nhãn ≥14px semibold).
- **Dark Amber** (#92400E): hover/pressed của nút chính; chữ hành động trên tint/trắng/sand. **7.09:1** trên trắng, 6.41:1 trên paper, 6.09:1 trên Amber Tint, 6.66:1 trên strip, **5.73:1 trên Deck Sand** (cặp của trạng thái disabled), 6.27:1 trên editor tint.
- **Amber Tint** (#FAECD7): nền chip đã chọn (người cùng chia), vùng lặng. Chữ trên tint luôn là Dark Amber hoặc Ink (15.03:1).

### Neutral & Surfaces

- **Warm Paper** (#F7F3EC): nền app. Ink trên paper: **15.81:1**.
- **Settlement Cream** (#FFF7E8, token `strip`, MỚI — thay Rail Cream #FFFBEB của v1): bề mặt dải quyết toán + cột quyết toán desktop. Ink **16.42:1** · ink-2 6.91:1 · muted 5.23:1 · credit 5.59:1 · debt 5.70:1 · brand-deep 6.66:1 · biên line-strong trên strip **3.92:1**.
- **Deck Sand** (#EFE6D8, MỚI): bề mặt duy nhất của trạng thái disabled. Brand-deep trên sand 5.73:1 · ink 14.14:1 · ink-2 5.95:1.
- **Card White** (#FFFFFF): bề mặt sheet, ô nhập, chip nghỉ. Ink 17.49:1.
- **Ink** (#1C1917): chữ chính + mọi số tiền (Figure kế thừa màu Ink trừ khi mang ngữ nghĩa số dư).
- **Ink-2** (#5C554B, MỚI): chữ phụ ấm cho meta ledger — đạt ≥4.5:1 trên **mọi** nền của hệ (paper 6.65 · trắng 7.35 · strip 6.91 · editor tint 6.50 · sand 5.95) nên là họ chữ phụ duy nhất được đứng trên tint.
- **Warm Muted** (#6F675C): chữ phụ cấp 3 — chỉ trên paper (5.04:1), trắng (5.57:1), strip (5.23:1). Không đặt trên tint/sand.
- **Warm Line** (#E6DDCF): hairline chia hàng trong bảng (1.35:1 trên trắng — **không bao giờ** là tín hiệu phân định duy nhất; luôn đi kèm khoảng trắng + thay đổi nội dung).
- **Line Strong** (#8A7A5F): biên ô nhập/control + biên trên của Settlement Strip + biên trái cột quyết toán desktop — mọi nơi nó đóng vai phân định đều ≥3:1: trắng **4.18:1** · paper 3.77:1 · editor tint 3.69:1 · strip 3.92:1.
- **Placeholder** (#786D5B): 5.08:1 trên trắng, 4.59:1 trên paper — không xám mờ.

### Semantic

- **Ledger Green** (#177245): số dư dương — luôn kèm dấu `+` và chú thích dấu thường trực ở bảng số dư. Trắng trên green 5.95:1; green trên trắng 5.95:1, trên paper 5.38:1, trên strip 5.59:1.
- **Brick Red** (#B3352C): số dư âm, phá huỷ, lỗi — luôn kèm dấu `−` hoặc chữ mô tả. Trắng trên brick 6.07:1; brick trên trắng 6.07:1, trên paper 5.48:1, trên strip 5.70:1.

### Identity (danh tính thành viên — Panel-02 M-2)

Palette **riêng cho avatar**, 12 màu tông đất/ấm (`identity-01…12` ở frontmatter), mọi màu đạt ≥4.5:1 với chữ initials trắng (đo công thức WCAG, 2026-10-23): #7C4A1E (7.35) · #8A5A2B (5.87) · #7A3B2E (8.43) · #946B00 (4.81) · #5E503F (7.79) · #855C1F (5.92) · #4A6741 (6.35) · #6E5636 (6.89) · #654321 (8.83) · #7D5A3C (6.18) · #596235 (6.52) · #8C6A3F (4.94). Cơ chế gán (seed từ tên chuẩn hoá + thứ tự trong payload, chống trùng xác định trong nhóm) ở DESIGN-LANGUAGE §8.

**The Identity Palette Rule.** Màu danh tính chỉ lấy từ `identity-01…12`. **Cấm tuyệt đối** dùng `brand`, `brand-deep`, `credit`, `debt` làm màu avatar — màu ngữ nghĩa tiền và màu hành động không bao giờ đóng vai danh tính một con người (bản live để `#177245` Ledger Green lọt vào palette avatar — lỗi M-2). Ngược lại, màu `identity-*` không được dùng cho số dư, nút, focus hay trạng thái.

### Bảng tương phản (nền render dự kiến thật)

| Chữ / tín hiệu | Nền thật | Tỉ lệ | Đạt |
|---|---|---:|---|
| Ink #1C1917 | paper #F7F3EC | 15.81:1 | AA ✓ |
| Ink #1C1917 | trắng #FFFFFF | 17.49:1 | AA ✓ |
| Ink #1C1917 | strip #FFF7E8 | 16.42:1 | AA ✓ |
| Ink #1C1917 | Amber Tint #FAECD7 | 15.03:1 | AA ✓ |
| Ink-2 #5C554B | paper / trắng / strip / tint / sand | 6.65 / 7.35 / 6.91 / 6.50 / 5.95:1 | AA ✓ (mọi nền) |
| Muted #6F675C | paper / trắng / strip | 5.04 / 5.57 / 5.23:1 | AA ✓ (chỉ 3 nền này) |
| Trắng #FFFFFF | brand #B45309 | 5.02:1 | AA ✓ |
| Trắng #FFFFFF | brand-deep #92400E | 7.09:1 | AA ✓ |
| Brand-deep #92400E | Amber Tint #FAECD7 | 6.09:1 | AA ✓ |
| Brand-deep #92400E | strip #FFF7E8 | 6.66:1 | AA ✓ |
| Brand-deep #92400E (disabled) | Deck Sand #EFE6D8 | 5.73:1 | AA ✓ |
| Credit #177245 | trắng / paper / strip | 5.95 / 5.38 / 5.59:1 | AA ✓ |
| Debt #B3352C | trắng / paper / strip | 6.07 / 5.48 / 5.70:1 | AA ✓ |
| Placeholder #786D5B | trắng / paper | 5.08 / 4.59:1 | AA ✓ |
| Line Strong #8A7A5F (non-text) | trắng / paper / tint / strip | 4.18 / 3.77 / 3.69 / 3.92:1 | ≥3:1 ✓ |
| Focus (brand-deep, non-text) | paper | 6.41:1 | ≥3:1 ✓ |

### Named Rules

**The No Gradient Rule.** Không gradient — trang trí, thương hiệu hay chữ — ở bất cứ đâu.

**The One Amber Rule.** Hổ phách chỉ cho: hành động chính, lựa chọn đang active, focus, kẻ đôi tổng kết. Không nền trang trí, không icon tô amber hàng loạt, không chip nghỉ màu amber.

**The Selected States Rule (Panel-02 MINOR — hệ thống hoá ba mẫu "đã chọn").** Bản live dùng ba ngôn ngữ "đã chọn" trong cùng một sheet (amber đặc / amber tint + dấu tích / segmented ink) mà không khai luật — trên giấy căng thẳng với One Amber Rule. V2 khai thành **ba token có tên, mỗi mẫu một vai duy nhất, không hoán đổi**: (1) `chip-select-solid` (brand đặc, chữ trắng) = **chọn-1 mang tính cam kết tức thì** — người trả của khoản chi (radio semantics); (2) `chip-selected` (Amber Tint + chữ Dark Amber + dấu tích) = **chọn-nhiều đang tích luỹ** — người cùng chia (`aria-pressed`); (3) `segmented-selected-ink` (Ink đặc, chữ trắng) = **chuyển chế độ/chế độ xem** — segmented kiểu chia và mọi segmented control về sau. Ink ở mẫu (3) là ngoại lệ **đã khai** của One Amber Rule: segmented chuyển *chế độ làm việc*, không phải chọn *đối tượng tiền*, nên nó mang màu mực trung tính thay vì màu hành động — ghi rõ ở đây để hết căng thẳng trên giấy; mẫu thứ tư cho "đã chọn" bị cấm.

**The Strip Rule.** Settlement Strip không bao giờ vắng mặt trên màn làm việc và không bao giờ bị sheet che. Thu gọn nó vẫn là quyết toán (tổng + lệnh đầu); mở rộng nó là toàn văn. Không tồn tại bề mặt quyết toán thứ hai nào khác ngoài cột desktop — và cột đó là cùng một component ở dạng thường trực.

> **Hiệu đính thi hành (2026-10-23 — Panel #03, Finding E).** «Không bao giờ bị sheet che» được thi hành qua cơ chế neo DOCK: phần neo thường trực của Strip (StatusLine + nút tóm tắt chứa TỔNG quyết toán + Action Deck) được đo chiều cao thật và xuất bản qua biến `--strip-h`; mọi Sheet trên mobile neo đáy tại đúng chiều cao đó (đáy lớp phủ = `--strip-h`), nên dock — gồm tổng quyết toán — luôn lộ diện và bấm được kể cả khi sheet đang mở. Panel quyết toán MỞ RỘNG phía trên dock là nội dung cuộn, được phép nằm dưới sheet trong lúc sheet mở (đóng sheet là trở lại nguyên trạng). Đo kiểm chứng độc lập trên bản build local (Panel #03 §9.7): lớp phủ dừng ở y=702/844, hit-test tại tâm nút tóm tắt trúng nội dung «Tổng … Quyết toán», không trúng dialog.

## Typography

**Display:** Be Vietnam Pro 700/800 — tên cuộc chia, tiêu đề sheet/trạng thái, nhãn nút chính. **Chỉ chữ**: chuỗi chứa ≥2 chữ số hoặc `₫` không thuộc vai này.
**Figure:** Inter 600/700 với `font-feature-settings: "tnum"` + `font-variant-numeric: tabular-nums` — **mọi** số tiền ở mọi vị trí (hàng ledger, Strip, bảng quyết toán, số dư, ô nhập, meta danh sách), căn phải trong cột, nhóm nghìn kiểu Việt (`1.500.000 ₫`).
**Body:** Inter 400/500/600, fallback Be Vietnam Pro.
**Ledger Mono:** `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (stack hệ thống, không webfont) — chỉ ký hiệu phím và mã ngắn không mang câu tiếng Việt.

**Bằng chứng kiểm chứng (mức file, fontTools trên package thật trong repo, 2026-10-23):** Be Vietnam Pro subset `vietnamese` chứa đủ U+1EC6/U+1ED8/U+1EEE/U+1EE0/U+0110/U+20AB trong cmap của file woff2 thật; Inter subset `vietnamese` cũng đủ các codepoint đó **và** GSUB của Inter (cả latin lẫn vietnamese) chứa feature `tnum`. Ngược lại, **toàn bộ file woff2 của Be Vietnam Pro không có `tnum`** và bề rộng chữ số của nó là proportional (431–720 trên upem 1000) — nên v1 đặt số tiền ở Be Vietnam Pro + `tabular-nums` là no-op im lặng; v2 sửa ở tầng cơ chế: Figure chuyển hẳn sang Inter. Space Grotesk và Outfit giữ nguyên trạng thái LOẠI của v1 (không chứng minh được glyph tiếng Việt ở mức file / không có subset vietnamese). Chi tiết: DESIGN-LANGUAGE.md §3.

**Character:** display nén nhẹ (`letter-spacing: -0.02em` ở ≥20px) cho giọng fintech gọn; figure thẳng cột tuyệt đối — một con số đổi bề rộng là phá niềm tin; body lặng, không tranh với số.

### Hierarchy (thang chữ — HIỆU ĐÍNH theo census đo thật, 2026-10-23)

> **Hiệu đính (wave v1.4.0, xử lý MINOR thang chữ của Panel #03 theo
> cùng cách đã xử lý Finding I):** tuyên bố cũ của mục này — thang
> đóng **12 → 15 → 19 → 24 → 30** với mọi bước kề **≥1.25:1** — **bị
> rút lại vì không tồn tại trên render**. Panel #03 đo bậc kề thực tế
> 1,06–1,19 và không thấy bậc 24/30 nào. Census của wave (CDP
> `getComputedStyle` trên bản build local v1.4.0, bề mặt trang chủ +
> workspace + sheet khoản chi ở 390px, chỉ tính chữ HTML nhìn thấy)
> khớp số của panel: cỡ chữ render thật = **{12, 13, 14, 15, 16, 19}px**,
> bậc kề 1,07–1,19; 24px và 30px **vắng mặt hoàn toàn**. (Phần tử
> `<text>` 46 đơn vị bên trong SVG avatar là hệ toạ độ nội bộ của
> SVG, không thuộc thang chữ giao diện — loại khỏi census.)
>
> Phân cấp thị giác của app trên thực tế được gánh bằng **trọng lượng**
> (400/500/600/700), **màu** (ink / ink-2 / muted), **tracking + hoa**
> ở nhãn, và **vị trí/bề mặt** — đúng như Panel #03 ghi nhận («phân
> cấp cảm nhận được nhờ trọng lượng/màu»). Tài liệu này từ nay mô tả
> thang ĐO THẬT dưới đây; nếu một đợt thiết kế sau muốn thang ≥1.25:1
> thật, phải đổi cỡ chữ thật và census lại — không tuyên bố trước.

Thang đo thật (census 2026-10-23):

- **Title** (Be Vietnam Pro 700, **19px**): tên cuộc chia ở AppBar (H1 duy nhất của workspace), tiêu đề sheet (đợt này đưa từ 18px về đúng 19px), H1 trang chủ.
- **Section** (700, **16px**): tiêu đề mục ở trang chủ (H2), tổng tiền ở hàng danh sách phiên.
- **Figure-L** (Inter 700 tnum, **19px**): tổng ở Strip thu gọn.
- **Figure** (Inter 600 tnum, **15px**): số tiền hàng ledger, hàng quyết toán; biến thể **16px/700** cho con số tổng ở danh sách và bảng mở rộng.
- **Body** (Inter 400/500/600, **14–16px**): nội dung hàng, nhãn nút, form (ô nhập luôn 16px).
- **Meta** (Inter 400/500, **13px**, ink-2): dòng phụ của hàng, chú thích, trạng thái.
- **Label** (Inter 600, **12px**, tracking 0.06em, uppercase cho chữ Latin — nhãn tiếng Việt giữ nguyên dấu, không ép hoa ký tự có dấu xếp chồng): nhãn cột bảng (`TỔNG CHI`, `QUYẾT TOÁN`), nhãn «Tổng» ở Strip.

## Layout

Khung mobile: AppBar 48px + Member Strip 56px + Ledger (flex-1, cuộn nội bộ) + Settlement Strip dính đáy (108px thu gọn; 136px khi có dòng offline; mở rộng tối đa 70dvh). Khung desktop ≥1024px: max-width 1200px; cột trái ledger max 720px; cột phải quyết toán 360px dính. Chi tiết wireframe + dự toán từng khối: `LAYOUT-SPEC.md`.

Ngân sách: luồng lõi **0 cuộn** để tới hành động chính trên mobile 390×844; ngân sách bề ngang cứng ở LAYOUT-SPEC §0.1 (grid `minmax(0,1fr) auto`, cột tiền trần 128px, chuỗi động truncate, thông tin ngân hàng không nằm trong hàng). Mọi prose hiển thị (FAQ, giới thiệu trong disclosure) có measure tối đa **72ch** — implementation đo lại trên rendered, không để dòng văn bản chạy hết bề rộng desktop.

Nhịp: hàng ledger 52px, hàng quyết toán 56px; nhóm liên quan cách 8px, nhóm không liên quan 24px, khối lớn 32px — ít nhất 2 mức section-gap khác nhau mỗi màn.

## Elevation & Depth

Độ sâu theo tông: bảng phẳng trên paper, Strip kem sâu hơn, sheet trắng. Hai bóng duy nhất: **Strip shadow** hướng lên (`0 -1px 2px rgba(28,25,23,.05), 0 -12px 32px rgba(28,25,23,.07)`) cho Strip + sheet; **Card shadow** của v1 chỉ còn cho card tạo mới ở Màn A (`0 1px 2px rgba(28,25,23,.05), 0 8px 24px rgba(28,25,23,.06)`). Không bóng cứng, không quầng màu, không kính mờ, không glow (loại tường minh ảnh hưởng Raycast-dark ở điểm này).

### Named Rules

**The Flat Table Rule.** Ledger và bảng quyết toán là bảng: hàng chia bằng hairline hoặc kẻ đôi (ở hàng tổng), không bằng hộp bo tròn có nền riêng. Không card trong card; v2 đi xa hơn v1 — không card bao quanh bảng.

**The Double Rule.** Hàng tổng luôn có kẻ đôi amber ở phía trên: hai đường `brand` cao 1px, cách nhau 3px (tổng vệt 5px), triển khai bằng hai pseudo-element để độ dày nằm trong token — không dùng `border-top: 3px double` vì độ dày của nó không kiểm soát được theo token. Đây là dấu chữ ký của hệ, xuất hiện ở: hàng tổng ledger, hàng tổng bảng quyết toán, chân OG, logo.

## Shapes

Radius: sheet/dialog 16px (chỉ bo hai góc trên ở mobile), nút/ô nhập 12px, nút QR 8px, chip/avatar full-round, bảng (ledger/quyết toán) **0px** — bảng không bo góc vì bảng không phải card. Viền: hairline `line` trong bảng; biên control + biên Strip/cột bằng `line-strong`.

## Components

### Buttons

- **Primary:** nền Deep Amber đặc, nhãn Be Vietnam Pro 700 trắng 15px, radius 12px, cao 48px ở Deck/CTA chính (tối thiểu 44px ở nơi khác). Hover/pressed: Dark Amber. **Disabled:** nền Deck Sand + nhãn Dark Amber (5.73:1 trên sand) + biên line-strong + lý do 1 dòng ink-2 13px ngay tại nút (`aria-describedby`) + giữ focus được bằng `aria-disabled` — **không bao giờ dùng opacity**. Một nút chính mỗi bề mặt.
- **Ghost:** nền trắng, viền `line`, nhãn Ink; hover viền brand + chữ brand-deep.
- **Icon button:** 44×44px (48px trong Deck), nền trong suốt trên Strip / trắng trên paper, viền `line`; biến thể danger hover sang Brick Red. Luôn có `aria-label`.
- **Focus (mọi control):** outline 2px Dark Amber (6.41:1 trên paper) offset 2px ở `:focus-visible`.

### Action Deck & Settlement Strip (signature)

Deck là hàng hành động ghim trong Strip: nút chính bất biến `+ Thêm khoản` + nút Chia sẻ + nút Thành viên. Strip thu gọn (108px) = dòng chốt 36px (tổng Figure-L + lệnh đầu + nút mở) + Deck 56px + đệm. Strip mở rộng = bảng quyết toán toàn văn (Ai trả ai → Số dư + chú thích dấu → hàng tổng kẻ đôi → Copy/Chia sẻ). Cập nhật sống theo mọi thay đổi dữ liệu, kể cả khi sheet đang mở phía trên (sheet neo trên Strip, không che Strip).

### Ledger Row

Hàng 52px, grid `minmax(0,1fr) auto`: trái 2 dòng (tên khoản Inter 500 15px truncate; meta ink-2 13px truncate), phải Figure 600 15px tối đa 128px. Toàn hàng là 1 nút (mở bảng hành động của hàng). Breakdown mở rộng trong hàng, 1 hàng tại một thời điểm.

### Chips (thành viên)

Chip ở Member Strip: avatar DiceBear 32px + tên truncate ≤96px + chấm trạng thái QR 8px (chấm/`Có QR` chỉ khẳng định với bank đã qua validation — Verified Claim Rule). Trong sheet, ba mẫu "đã chọn" theo **Selected States Rule**: chọn-1 (người trả) = `chip-select-solid` brand đặc chữ trắng (radio); chọn-nhiều (người cùng chia) = `chip-selected` Amber Tint + chữ Dark Amber + dấu tích (`aria-pressed`); segmented (kiểu chia) mẫu đã chọn = `segmented-selected-ink` Ink đặc chữ trắng. Không mẫu thứ tư.

### Sheets

Action Sheet neo trên Strip (mobile) / dialog 560px (desktop): header 52px (đối tượng + đóng), thân cuộn nội bộ, footer (chính/phụ + gợi ý kbd ở desktop). Nền **trắng** (v2 bỏ nền editor tint toàn sheet của v1 — một nền duy nhất cho mọi control, một bảng contrast duy nhất). Focus trap, Esc đóng, trả focus khi đóng.

### Inputs / Fields

Nền trắng, viền **Line Strong 1px** (≥3:1 trên mọi nền thật — bảng ở trên), radius 12px, chữ 16px. Focus: viền Dark Amber + outline toàn cục. Placeholder #786D5B — và placeholder phải vừa ở 320px, không cụt giữa từ (§0.1 luật 7 của LAYOUT-SPEC). **MoneyInput:** Figure (Inter tnum) căn phải, hậu tố `₫` ink-2, tự nhóm nghìn khi gõ, vùng chạm/focus của toàn khung ≥44px cao (diệt finding MoneyInput 24px của panel); **trần nhập 999.999.999.999 ₫** — không nhận thêm chữ số tại trần, dán vượt trần bị chặn kèm lỗi tại trường (Panel-02 M-4; quan hệ với trần sanitize `MAX_AMOUNT_VND = 10¹⁶` ở DESIGN-LANGUAGE §12.3). Lỗi: Brick Red + `role="alert"`, nêu vấn đề + cách sửa, tại trường **và** liệt kê ngay trên nút Lưu của sheet — theo **Mẫu Validation Thống Nhất** (DESIGN-LANGUAGE §13.1, Panel-02 D-5): một thời điểm kiểm, một vị trí lỗi, một nguồn hàm kiểm ở lib cho mỗi loại dữ kiện. Ô Số tài khoản dùng `accountNumberError` của `lib/vietqr.ts` (8–19 ký tự chữ-số sau chuẩn hoá, ≥1 chữ số — Panel-02 M-3).

**The Verified Claim Rule (Panel-02 T2-11).** Mọi khẳng định trên UI về một dữ kiện ("Có QR", "đã điền sẵn", trạng thái đã lưu/đã đồng bộ) chỉ được hiển thị khi dữ kiện đó đã qua kiểm chứng tương ứng tại thời điểm hiển thị; dữ liệu cũ chưa qua kiểm chứng phải kiểm lại khi hiển thị, không đạt thì hiện trạng thái trung thực thay vì giữ khẳng định. Khẳng định không suy được từ trạng thái đã kiểm chứng là một AI-tell loại provenance — cấm ở mọi bề mặt, gồm FAQ và bản copy.

### Avatar

DiceBear `initials` sinh tại client (@dicebear/core + collection), **không gọi HTTP API** — cơ chế danh tính **viết lại theo Panel-02 M-2** (bản spec gốc ghim màu bằng hash của member id + palette 4 màu chứa cả credit/debt/brand: bị panel bác cả ba điểm). Nay: ký tự lấy từ tên hiển thị của thành viên; **màu suy xác định từ tên đã chuẩn hoá + thứ tự của thành viên trong mảng `members` của payload share v2** (FNV-1a-32 → `identity-01…12`), **không dùng member id** (import cấp id mới — gốc lỗi đổi màu xuyên máy); trong cùng một cuộc chia, màu được **gán phân biệt xác định** (thăm tuyến tính khi va chạm theo thứ tự payload) nên không hai thành viên nào trùng màu trong giới hạn nhóm 12 người. Palette danh tính riêng ở mục Colors (Identity Palette Rule — cấm brand/brand-deep/credit/debt làm màu người). Render bằng **SVG inline trong DOM** (không qua `<img>`) để glyph kế thừa Be Vietnam Pro 700 đã tải của trang — diệt lỗi fallback sans theo OS. Tên luôn đứng cạnh avatar — avatar không bao giờ là tín hiệu duy nhất. Chi tiết thuật toán + giới hạn: DESIGN-LANGUAGE §8.

### Navigation

Không tab bar, không stepper. AppBar: mark + tên (H1 duy nhất) + trạng thái lưu + nút ⋯ (Session Action Sheet). Back trình duyệt: thu gọn dải → về danh sách (theo lớp). Phím desktop: `N` thêm khoản, `M` thêm người, `⌘K`/`Ctrl+K` bảng hành động của hàng, `Enter` hành động chính, `Esc` lùi lớp, `C` copy khi dải mở — chỉ gán cho hành động có thật.

### Settlement (bảng quyết toán)

Ai trả ai trước, Số dư sau (kèm dòng chú thích `Dấu + là được nhận lại, dấu − là trả thêm.` thường trực), hàng tổng kẻ đôi cuối. Mỗi lệnh: avatar + tên hai đầu (truncate), mũi tên Lucide amber, Figure 700, nút VietQR **hoặc** trạng thái hạng nhất "Chưa có mã QR trên máy này" + 2 đường đi (LAYOUT-SPEC §5). Toàn văn copy được thành text cho Zalo/Messenger (định dạng giữ nguyên bản hiện hành).

### Share & VietQR — luật dữ liệu (BLOCKER)

Theo **DATA-04/09a + SEC-12.5**: ngân hàng **không bao giờ** trong share link — ở tầng schema của payload, không ngoại lệ. Link chỉ mang tên cuộc chia, thành viên (id + tên), khoản chi; quyết toán tính lại ở máy nhận. VietQR dựng payload EMVCo + render **100% client-side** từ bank lưu local trên máy đang xem (chạy cả offline). Máy chưa có bank của người nhận → trạng thái "Chưa có mã QR trên máy này" với 2 đường đi tiếp. Chi tiết: `LAYOUT-SPEC.md` §5, `COPY-DIET.md` §4.

## App shell & offline

App đăng ký **service worker** và precache **app shell** — trang gốc, manifest, icon PWA, logo, illustration empty-state; bundle CSS/JS/font (hash trong tên) vào runtime cache ở lần tải đầu. Cache đặt tên theo phiên bản, dọn cũ khi bản mới kích hoạt. SW + manifest hiện có (standalone, icon, `start_url`) ⇒ đạt **installable**.

Sau khi shell đã cache, luồng chính chạy offline **hoàn toàn** (thuần client + localStorage): ledger, Strip, mọi sheet, tính số dư/rút gọn nợ, VietQR từ bank local, tạo/copy share link. Máy chưa từng tải app cần mạng cho lần đầu.

Chỉ báo offline nằm **trong Settlement Strip** (dòng trên dòng chốt; ở Màn A: chân card tạo mới; ở desktop: dòng cuối cột quyết toán): `Đang offline — vẫn chia tiền được, dữ liệu lưu trên máy này.` + icon `wifi-off` + chữ, `aria-live="polite"`, không nền đỏ, không chặn thao tác; có mạng lại → `Đã có mạng trở lại` rồi tự ẩn.

**Không còn điểm phụ thuộc mạng nào trong luồng lõi**: QR render tại client, avatar sinh tại client, font tự host, share encode tại client. Trạng thái QR duy nhất là trạng thái dữ liệu ("chưa có mã QR trên máy này"), không phải trạng thái mạng.

**The Offline Is Not An Error Rule.** Offline không bao giờ trình bày như sự cố: không trang lỗi trình duyệt, không banner đỏ, không chữ kỹ thuật.

## Motion

Ba chuyển động duy nhất đã khai: mở sheet 160ms, mở rộng Strip 200ms, chèn hàng 120ms fade — chỉ `transform`/`opacity`, easing `cubic-bezier(0.2, 0, 0, 1)`. Không bounce/elastic, không animate layout (width/height/top). `prefers-reduced-motion`: tắt hết, xuất hiện tức thì. Mọi thời lượng đề xuất >200ms phải quay lại sửa tài liệu này trước khi implementation dùng.

## Do's and Don'ts

### Do

- **Do** đặt mọi số tiền ở Figure (Inter `tnum`), căn phải, nhóm nghìn kiểu Việt — ở mọi vị trí, kể cả meta danh sách.
- **Do** giữ Strip luôn hiện và luôn đúng: nó là quyết toán, không phải bản xem trước của quyết toán.
- **Do** để mọi chuỗi động truncate trong ô `min-width: 0` — dữ liệu dài là ca thường, không phải ca biên.
- **Do** thiết kế disabled bằng bề mặt + lý do, giữ focus được.
- **Do** tiêu amber chỉ cho hành động, lựa chọn, focus, kẻ đôi tổng kết.

### Don't

- **Don't** dùng gradient, opacity cho disabled, hay card bao quanh bảng.
- **Don't** đặt số tiền ở font display, hay bất kỳ chuỗi số dài nào ở Be Vietnam Pro (không có `tnum` — sẽ lệch cột im lặng).
- **Don't** đưa trường ngân hàng nào vào payload share — kể cả mã hoá, kể cả có đồng ý (BLOCKER DATA-04/09a + SEC-12.5).
- **Don't** dùng emoji/unicode làm icon; icon từ Lucide, một độ đậm nét. (Mũi tên trong hàng lệnh là Lucide `MoveRight`, không phải ký tự `→` trong font chữ — tránh lỗi tofu đã gặp ở OG, xem ASSETS.md.)
- **Don't** thu ô nhập dưới 16px hay vùng chạm dưới 44px để layout vừa; và **Don't** để bất kỳ hàng ngang nào chứa nút phá huỷ thường trực.

## Quyết định kiến trúc (kế thừa, không đổi ở v2)

**ADR-1 — Share schema v2: ngân hàng không bao giờ vào link (DATA-04).** Payload chỉ mang tên cuộc chia, thành viên (id + tên), khoản chi; bank sống trong sổ local per-device keyed theo (session, member). Link cũ chứa bank bị cắt sạch khi nhập + thông báo 1 dòng.

**ADR-2 — VietQR client-side 100% (DATA-08).** Tự dựng payload EMVCo + render QR tại máy; không dịch vụ QR ngoài; QR chạy offline; CSP khoá được về `'self'`.

**ADR-3 — CSP tĩnh cho app prerender (SEC-02).** Giữ nguyên bản hiện hành.

**ADR-4 — Service worker app-shell hai lớp cache (W5-01).** Precache URL ổn định (versioned) + runtime cache cho `/_next/static/`; navigation network-first, offline lùi về shell.

## Hiệu đính ngân sách từ thường trực (2026-10-23 — Panel #03, Finding I)

**Tuyên bố cũ bị thay thế.** Ngân sách «Màn làm việc (Màn B) ≤ 30 từ thường trực» sống ở hồ sơ redesign-v2 `COPY-DIET.md` §1 («| Màn làm việc (Màn B) | **≤ 30 từ** |…») và được lặp ở §6 của cùng file («Chữ thường trực Màn B: từ ~55–65 (v1) → **≤30** (v2)»). Trong repo này, `DESIGN.md` và `PRODUCT.md` không chứa tuyên bố ≤30 đó (đã grep kiểm chứng 2026-10-23) — nhưng tuyên bố đã được dẫn như sự thật thiết kế hiện hành, nên hiệu đính tại đây. Theo đúng tiền lệ hiệu đính §3.3 (văn bản/số đo đúng thắng văn bản in sai): **số đo render thắng tuyên bố cũ** — Panel #03 đo bằng `innerText` trên bản live được **98–121 từ** theo mọi biến thể đếm, và ≈63 từ tĩnh sau khi panel tự trừ dữ kiện người dùng. Tuyên bố ≤30 là **sai trên render** và bị thay thế bởi bảng ngân sách dưới đây; file redesign-v2 là hồ sơ lịch sử, không sửa.

**Phương pháp đo lại (đếm tĩnh từ nguồn, 2026-10-23).** Liệt kê thủ công mọi chuỗi tĩnh render ở trạng thái mặc định của từng bề mặt trong `app.tsx` / `session-list.tsx` / `session-view.tsx` / `settlement.tsx` / `ui-bits.tsx`; đếm từ = tách theo khoảng trắng. **Chỉ tính chữ của app** — trừ dữ kiện người dùng (tên cuộc chia, tên người, tên khoản, số tiền/số đếm suy từ dữ kiện; ở chuỗi mẫu có dữ kiện lồng vào, chỉ tính phần chữ tĩnh của mẫu). Tính cả nhãn nút và placeholder (khác định nghĩa ngân sách ở COPY-DIET §1, vốn loại nhãn nút ≤3 từ — vì vậy hai bộ số không so trực tiếp từng từ, nhưng mọi phương pháp đều cho kết quả vượt xa 30). Không tính: `aria-label`/`title`/`sr-only`, chữ trong sheet/dialog/banner chỉ hiện theo sự kiện, thân accordion đang đóng. Bề mặt chuẩn là mobile; desktop ghi cộng thêm riêng. Lane QA đối chiếu lại bằng `innerText` render sau.

**Số đo tĩnh theo bề mặt:**

| Bề mặt | Số từ tĩnh đo được | Ghi chú |
|---|---:|---|
| Trang chủ, danh sách rỗng (mobile) | **84** | Gồm dòng lý do disabled mới «Đặt tên cho cuộc chia để tạo» (7 từ, thêm ở đợt sửa Finding H — trước đợt này là 77); cộng aside desktop (+49) = **133** |
| Workspace rỗng — 0 người, 0 khoản (mobile, Strip thu gọn) | **43** | Biến thể đã có người nhưng chưa khoản: **42** |
| Workspace có dữ kiện (mobile, Strip thu gọn; mẫu 2 khoản, 1 lệnh) | **35** | Mỗi hàng khoản cộng 7 từ tĩnh của mẫu meta («đã trả · {kiểu chia} cho … người») |
| Workspace có dữ kiện (mobile, Strip **mở rộng**; mẫu 2 người, 1 lệnh, người nhận chưa có QR trên máy này) | **113** | = 35 thu gọn + 78 chữ tĩnh của SettlementPanel (gồm khối thiếu-QR 37 từ tĩnh); biến thể người nhận đã có QR: **77** (113 − 37 khối thiếu-QR + 1 nhãn «VietQR») |

**Ngân sách mới (thay thế ≤30).** Ngân sách đặt theo số đo thật của thiết kế hiện tại + biên ~10–15% cho diễn đạt tương đương, làm tròn lên:

- Trang chủ, danh sách rỗng: **≤95 từ tĩnh (mobile)** · **≤155 (desktop, gồm aside)**.
- Workspace rỗng: **≤50 từ tĩnh (mobile, Strip thu gọn)**.
- Workspace có dữ kiện, Strip thu gọn: **≤45 từ tĩnh** với mẫu 2 khoản/1 lệnh; mỗi hàng khoản thêm được cộng 7 từ mẫu meta.
- Workspace có dữ kiện, Strip mở rộng: **≤125 từ tĩnh** (mẫu chưa-QR) · **≤90** (mẫu đã có QR).

Mọi lần đo lại sau này phải ghi rõ bề mặt, trạng thái Strip và phương pháp đếm kèm số đo — một con số ngân sách không kèm bề mặt/phương pháp là tuyên bố chưa kiểm chứng (Verified Claim Rule).
