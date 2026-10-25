---
name: Chia Tiền
description: Chia tiền nhóm kiểu Việt Nam — quyết toán luôn trước mắt, kèm VietQR.
colors:
  primary: "#A5482F"
  primary-deep: "#8C361E"
  primary-soft: "#FFE0D7"
  strip: "#FFFFFF"
  deck-sand: "#DDD1CE"
  paper: "#FDF5F2"
  card: "#FFFFFF"
  ink: "#140F0E"
  ink-2: "#685E5B"
  muted: "#685E5B"
  line: "#DDD1CE"
  line-strong: "#534946"
  credit: "#1D7725"
  debt: "#A80011"
  identity-01: "#CF284D"
  identity-02: "#353C1D"
  identity-03: "#607200"
  identity-04: "#4C654C"
  identity-05: "#00423F"
  identity-06: "#224A71"
  identity-07: "#006CD3"
  identity-08: "#061D9D"
  identity-09: "#5E56DE"
  identity-10: "#5637A7"
  identity-11: "#9F43C3"
  identity-12: "#8A5673"
  ink-inverse-segment: "#140F0E"
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
- Màu đặc duy nhất (brand seed V3 #A5482F); độ sâu từ lớp tông phẳng + hairline — bóng bề mặt tĩnh = 0 từ REDESIGN-V3 (xem hiệu đính V3 cuối tài liệu).
- Mọi phần tử tương tác ≥44×44px; biên control đạt ≥3:1 trên nền render thật; disabled không dùng opacity và luôn kèm lý do.
- Ngân sách bề ngang cứng: không chuỗi dữ liệu nào được quyết định bề rộng layout (LAYOUT-SPEC §0.1).

## Colors

Bảng màu giấy–mực hue-seed với một seed brand duy nhất và bộ semantic dịch shift +0,02 (REDESIGN-V3 — nguồn duy nhất: `redesign-v3/chiatien/COLOR-SYSTEM.md`, thang token chép nguyên byte vào `app/globals.css`). Mọi tỉ lệ tương phản dưới đây là **số đã ký trong COLOR-SYSTEM §3/§6** hoặc tính lại bằng công thức WCAG relative luminance (script Python, 2026-10-24) trên nền render thật. Ngưỡng: chữ ≥4.5:1; tín hiệu phân định non-text ≥3.0:1.

### Primary — thang tonal brand (neo Material Deep Orange, LK-01/02/03)

- **Brand-500 · Seed** (#A5482F): giọng thương hiệu — nút chính «Chốt chia», mark, app icon. Trắng trên seed: **5.89:1**.
- **Brand-600** (#8C361E): hover/pressed của nút chính; chữ hành động (vai cũ của `brand-deep`). **7.89:1** trên trắng, 7.33:1 trên paper, 6.35:1 trên Brand Tint, **5.29:1 trên Deck Sand** (cặp của trạng thái disabled), 6.40:1 trên editor.
- **Brand-700** (#702612): kẻ đôi (hàng tổng + chân Strip) và focus ring — hai vai brand duy nhất trên ledger ngoài CTA (LK-22/LK-41). 9.88:1 trên paper, 10.63:1 trên trắng.
- **Brand-100 · Tint** (#FFE0D7): nền chip đã chọn (người cùng chia), vùng lặng. Chữ trên tint luôn là Brand-600 (6.35:1) hoặc Ink (15.30:1).
- Brand-300/400 (#EBA38F/#D67D65) **cấm trên màn quyết toán/QR/chia sẻ** (LK-41); brand-900 (#3A0F04) **không vai** — cấm gán cho bất kỳ bề mặt/chữ/mark nào.

### Neutral & Surfaces — thang hue-seed (C trần 0,010)

- **Paper** (#FDF5F2): nền app. Ink trên paper: **17.67:1**.
- **Strip** (#FFFFFF, token `strip`): bề mặt dải quyết toán + cột quyết toán desktop (V3: Strip là chân bảng trắng cùng bề mặt với ledger, phân tầng bằng hairline — thay Settlement Cream của V2). Ink **19.01:1** · muted 6.29:1 · credit-solid 5.65:1 · debt-solid 7.86:1 · brand-600 7.89:1.
- **Deck Sand** (#DDD1CE, neutral-200): bề mặt duy nhất của trạng thái disabled. Brand-600 trên sand 5.29:1 · ink 12.75:1 · muted 4.22:1 (muted không đứng trên sand — chỉ ink và brand-600 gánh chữ trên sand).
- **Card White** (#FFFFFF): bề mặt sheet, ô nhập, chip nghỉ. Ink 19.01:1.
- **Ink** (#140F0E, neutral-950): chữ chính + **mọi con số ở mọi frame** (LK-22 — kể cả số dư mang ngữ nghĩa: dấu +/− và chú thích dấu gánh ngữ nghĩa, số vẫn là Ink; trạng thái số dư đọc thêm qua nhãn/chip semantic ở kề bên).
- **Muted / Placeholder** (#685E5B, neutral-600): họ chữ phụ duy nhất của V3 — paper 5.84:1 · trắng 6.29:1 · editor 5.10:1 (cặp placeholder/editor đã ký). Token `ink-2` giữ làm alias của muted cho meta ledger.
- **Line** (#DDD1CE, neutral-200): hairline chia hàng trong bảng (1.49:1 trên trắng — **không bao giờ** là tín hiệu phân định duy nhất; luôn đi kèm khoảng trắng + thay đổi nội dung).
- **Line Control** (#534946, neutral-700; token `line-strong` trỏ về đây): biên ô nhập/control + biên trên của Settlement Strip + biên trái cột quyết toán desktop — **8.10:1** trên paper · 8.72:1 trên trắng · 7.07:1 trên editor, mọi nơi đều ≥3:1.

### Semantic — instance dịch shift +0,02 (LK-13, đủ 4 phần bg/border/solid/ink)

- **Credit** (được trả): bg #E4FDE3 · border #9CCD9B · solid #1D7725 · ink #004F09 (ink/bg **9.17:1** · trắng/solid 5.65:1) — luôn kèm dấu `+` và chú thích dấu thường trực ở bảng số dư.
- **Debt** (còn nợ): bg #FFF2F0 · border #FFA096 · solid #A80011 · ink #6B0006 (ink/bg **11.80:1** · trắng/solid 7.86:1) — luôn kèm dấu `−` hoặc chữ mô tả.
- **Warning** (đang chờ): bg #FFF3E9 · border #F1AD76 · solid #AB5E00 · ink #783F00 (ink/bg **7.67:1** · trắng/solid 4.85:1).
- **Info**: bg #E4F0FF · solid #255EA6 (5.64:1 trên bg · 6.04:1 trên paper · trắng/solid 6.50:1).

### Identity (danh tính thành viên — COLOR-SYSTEM §4, LK-14/15/16)

Palette **riêng cho avatar**, 12 ô của lens-11 (`identity-01…12` ở frontmatter) — đầu ra phép tìm kiếm max-min trên lưới OKLCH với ràng buộc kênh đĩa + initials + viền, KHÔNG phải nền đặc. Số ký I-1 (contrast của initials trên giấy / trên đĩa #FAF3F1): #CF284D (4.80/4.71) · #353C1D (10.75/10.55) · #607200 (5.00/4.91) · #4C654C (5.96/5.85) · #00423F (10.55/10.35) · #224A71 (8.54/8.38) · #006CD3 (4.78/4.69) · #061D9D (11.69/11.47) · #5E56DE (5.05/4.96) · #5637A7 (7.81/7.66) · #9F43C3 (4.80/4.71) · #8A5673 (5.33/5.23) — mọi ô ≥4.5:1 trên cả hai nền (test hồi quy trong `lib/identity.spec.ts`). Cơ chế render (đĩa + initials + viền) và cơ chế gán (QUYẾT ĐỊNH M-2: seed chỉ-tên + thứ tự chuẩn) ở mục Avatar và hiệu đính V3.

**The Identity Palette Rule.** Màu danh tính chỉ lấy từ `identity-01…12`. **Cấm tuyệt đối** dùng `brand`, `credit`, `debt`, `warning` làm màu avatar — màu ngữ nghĩa tiền và màu hành động không bao giờ đóng vai danh tính một con người. Ngược lại, màu `identity-*` không được dùng cho số dư, nút, focus hay trạng thái. Bộ palette cũ của V2 chết hẳn (LK-14) — không hex nào của nó được quay lại ở bất kỳ sink nào.

### Bảng tương phản (số đã ký COLOR-SYSTEM §6 + đo lại 2026-10-24)

| Chữ / tín hiệu | Nền thật | Tỉ lệ | Đạt |
|---|---|---:|---|
| Trắng #FFFFFF | brand-500 #A5482F | 5.89:1 | AA ✓ |
| Trắng #FFFFFF | brand-600 #8C361E | 7.89:1 | AA ✓ |
| Ink #140F0E | paper #FDF5F2 | 17.67:1 | AA ✓ |
| Ink #140F0E | trắng #FFFFFF (strip/card) | 19.01:1 | AA ✓ |
| Muted #685E5B | paper | 5.84:1 | AA ✓ |
| Placeholder #685E5B | editor #F1E5E1 | 5.10:1 | AA ✓ |
| Brand-600 #8C361E | tint #FFE0D7 | 6.35:1 | AA ✓ |
| Brand-600 #8C361E (disabled) | Deck Sand #DDD1CE | 5.29:1 | AA ✓ |
| Brand-700 #702612 (kẻ đôi/focus) | paper / trắng | 9.88 / 10.63:1 | ≥3:1 ✓ |
| Line Control #534946 (non-text) | paper / trắng / editor | 8.10 / 8.72 / 7.07:1 | ≥3:1 ✓ |
| Credit ink #004F09 | credit-bg #E4FDE3 | 9.17:1 | AA ✓ |
| Debt ink #6B0006 | debt-bg #FFF2F0 | 11.80:1 | AA ✓ |
| Warning ink #783F00 | warning-bg #FFF3E9 | 7.67:1 | AA ✓ |
| Info solid #255EA6 | paper | 6.04:1 | AA ✓ |

### Named Rules

**The No Gradient Rule.** Không gradient — trang trí, thương hiệu hay chữ — ở bất cứ đâu.

**The One Brand Rule** (V2 gọi là One Amber Rule — đổi tên theo hệ màu V3, luật không đổi). Brand chỉ cho: hành động chính, lựa chọn đang active, focus, kẻ đôi tổng kết. Không nền trang trí, không icon tô brand hàng loạt, không chip nghỉ màu brand. Trên ledger/Strip, điểm brand ngoài tập đóng {CTA «Chốt chia» · kẻ đôi hàng tổng · kẻ đôi chân Strip · focus ring đang active} = 0 (LK-41).

**The Selected States Rule (Panel-02 MINOR — hệ thống hoá ba mẫu "đã chọn").** Bản live dùng ba ngôn ngữ "đã chọn" trong cùng một sheet (brand đặc / brand tint + dấu tích / segmented ink) mà không khai luật — trên giấy căng thẳng với One Brand Rule. V2 khai thành **ba token có tên, mỗi mẫu một vai duy nhất, không hoán đổi**: (1) `chip-select-solid` (brand đặc, chữ trắng) = **chọn-1 mang tính cam kết tức thì** — người trả của khoản chi (radio semantics); (2) `chip-selected` (Brand Tint + chữ Brand-600 + dấu tích) = **chọn-nhiều đang tích luỹ** — người cùng chia (`aria-pressed`); (3) `segmented-selected-ink` (Ink đặc, chữ trắng) = **chuyển chế độ/chế độ xem** — segmented kiểu chia và mọi segmented control về sau. Ink ở mẫu (3) là ngoại lệ **đã khai** của One Brand Rule: segmented chuyển *chế độ làm việc*, không phải chọn *đối tượng tiền*, nên nó mang màu mực trung tính thay vì màu hành động — ghi rõ ở đây để hết căng thẳng trên giấy; mẫu thứ tư cho "đã chọn" bị cấm.

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

Độ sâu theo tông và kẻ: bảng phẳng trên paper, Strip trắng cùng bề mặt với ledger, sheet trắng. **REDESIGN-V3: bóng trên bề mặt tĩnh = 0** (LK-32) — Strip phân tầng bằng hairline `line-control` phía trên, sheet phân tầng bằng lớp phủ + hairline; hai bóng của V2 (Strip shadow hướng lên, Card shadow) đã bị xoá cùng token `--shadow-card`/`--shadow-lift`. Không bóng cứng, không quầng màu, không kính mờ, không glow (loại tường minh ảnh hưởng Raycast-dark ở điểm này).

### Named Rules

**The Flat Table Rule.** Ledger và bảng quyết toán là bảng: hàng chia bằng hairline hoặc kẻ đôi (ở hàng tổng), không bằng hộp bo tròn có nền riêng. Không card trong card; v2 đi xa hơn v1 — không card bao quanh bảng.

**The Double Rule.** Hàng tổng luôn có kẻ đôi brand-700 ở phía trên: hai đường `brand-700` cao 1px, cách nhau 3px (tổng vệt 5px), triển khai bằng hai lớp background-image để độ dày nằm trong token — không dùng `border-top: 3px double` vì độ dày của nó không kiểm soát được theo token. Đây là dấu chữ ký của hệ — nó chính là hai cạnh của kênh ngang trong mark «Kẻ Đôi» — và chỉ sống ở đúng 2 vị trí {hàng tổng, chân Strip}, ≤1 cụm/viewport ở mọi frame (LK-22/LK-41).

## Shapes

Radius: sheet/dialog 16px (chỉ bo hai góc trên ở mobile), nút/ô nhập 12px, nút QR 8px, chip/avatar full-round, bảng (ledger/quyết toán) **0px** — bảng không bo góc vì bảng không phải card. Viền: hairline `line` trong bảng; biên control + biên Strip/cột bằng `line-strong`.

## Components

### Buttons

- **Primary:** nền Brand-500 đặc, nhãn Be Vietnam Pro 700 trắng 15px, radius 12px, cao 48px ở Deck/CTA chính (tối thiểu 44px ở nơi khác). Hover/pressed: Brand-600. **Disabled:** nền Deck Sand + nhãn Brand-600 (5.29:1 trên sand) + biên line-strong + lý do 1 dòng ink-2 13px ngay tại nút (`aria-describedby`) + giữ focus được bằng `aria-disabled` — **không bao giờ dùng opacity**. Một nút chính mỗi bề mặt.
- **Ghost:** nền trắng, viền `line`, nhãn Ink; hover viền brand + chữ brand-deep.
- **Icon button:** 44×44px (48px trong Deck), nền trong suốt trên Strip / trắng trên paper, viền `line`; biến thể danger hover sang Brick Red. Luôn có `aria-label`.
- **Focus (mọi control):** outline 2px Brand-700 (9.88:1 trên paper) offset 2px ở `:focus-visible`.

### Action Deck & Settlement Strip (signature)

Deck là hàng hành động ghim trong Strip: nút chính bất biến `+ Thêm khoản` + nút Chia sẻ + nút Thành viên. Strip thu gọn (108px) = dòng chốt 36px (tổng Figure-L + lệnh đầu + nút mở) + Deck 56px + đệm. Strip mở rộng = bảng quyết toán toàn văn (Ai trả ai → Số dư + chú thích dấu → hàng tổng kẻ đôi → Copy/Chia sẻ). Cập nhật sống theo mọi thay đổi dữ liệu, kể cả khi sheet đang mở phía trên (sheet neo trên Strip, không che Strip).

### Ledger Row

Hàng 52px, grid `minmax(0,1fr) auto`: trái 2 dòng (tên khoản Inter 500 15px truncate; meta ink-2 13px truncate), phải Figure 600 15px tối đa 128px. Toàn hàng là 1 nút (mở bảng hành động của hàng). Breakdown mở rộng trong hàng, 1 hàng tại một thời điểm.

### Chips (thành viên)

Chip ở Member Strip: đĩa avatar 28px (cơ chế đĩa + initials + viền ở mục Avatar) + tên truncate ≤96px + chấm trạng thái QR 8px (chấm/`Có QR` chỉ khẳng định với bank đã qua validation — Verified Claim Rule). Trong sheet, ba mẫu "đã chọn" theo **Selected States Rule**: chọn-1 (người trả) = `chip-select-solid` brand đặc chữ trắng (radio); chọn-nhiều (người cùng chia) = `chip-selected` Brand Tint + chữ Brand-600 + dấu tích (`aria-pressed`); segmented (kiểu chia) mẫu đã chọn = `segmented-selected-ink` Ink đặc chữ trắng. Không mẫu thứ tư.

### Sheets

Action Sheet neo trên Strip (mobile) / dialog 560px (desktop): header 52px (đối tượng + đóng), thân cuộn nội bộ, footer (chính/phụ + gợi ý kbd ở desktop). Nền **trắng** (v2 bỏ nền editor tint toàn sheet của v1 — một nền duy nhất cho mọi control, một bảng contrast duy nhất). Focus trap, Esc đóng, trả focus khi đóng.

### Inputs / Fields

Nền trắng, viền **Line Control 1px** (≥3:1 trên mọi nền thật — bảng ở trên), radius 12px, chữ 16px. Focus: viền Brand-600 + outline toàn cục. Placeholder #685E5B — và placeholder phải vừa ở 320px, không cụt giữa từ (§0.1 luật 7 của LAYOUT-SPEC). **MoneyInput:** Figure (Inter tnum) căn phải, hậu tố `₫` ink-2, tự nhóm nghìn khi gõ, vùng chạm/focus của toàn khung ≥44px cao (diệt finding MoneyInput 24px của panel); **trần nhập 999.999.999.999 ₫** — không nhận thêm chữ số tại trần, dán vượt trần bị chặn kèm lỗi tại trường (Panel-02 M-4; quan hệ với trần sanitize `MAX_AMOUNT_VND = 10¹⁶` ở DESIGN-LANGUAGE §12.3). Lỗi: Debt solid #A80011 + `role="alert"`, nêu vấn đề + cách sửa, tại trường **và** liệt kê ngay trên nút Lưu của sheet — theo **Mẫu Validation Thống Nhất** (DESIGN-LANGUAGE §13.1, Panel-02 D-5): một thời điểm kiểm, một vị trí lỗi, một nguồn hàm kiểm ở lib cho mỗi loại dữ kiện. Ô Số tài khoản dùng `accountNumberError` của `lib/vietqr.ts` (8–19 ký tự chữ-số sau chuẩn hoá, ≥1 chữ số — Panel-02 M-3).

**The Verified Claim Rule (Panel-02 T2-11).** Mọi khẳng định trên UI về một dữ kiện ("Có QR", "đã điền sẵn", trạng thái đã lưu/đã đồng bộ) chỉ được hiển thị khi dữ kiện đó đã qua kiểm chứng tương ứng tại thời điểm hiển thị; dữ liệu cũ chưa qua kiểm chứng phải kiểm lại khi hiển thị, không đạt thì hiện trạng thái trung thực thay vì giữ khẳng định. Khẳng định không suy được từ trạng thái đã kiểm chứng là một AI-tell loại provenance — cấm ở mọi bề mặt, gồm FAQ và bản copy.

### Avatar

**Cơ chế V3 (LK-15/16 — thay hẳn DiceBear và nền đặc):** đĩa tròn nền neutral-50 #FAF3F1 **chung cho mọi thành viên, đĩa không mang identity, ĐÓNG BĂNG**; **initials** từ tên hiển thị, Inter 600 mang màu ô identity của thành viên (11px @ đĩa 28 · 12px @ 32 · 10px @ 24); **viền** solid cùng ô (2px @ 28/32 · 1,5px @ 24). Đĩa chuẩn ledger 28px, trần cứng 32px, ≤8 đĩa/viewport (>8 → 24px). Tên luôn đứng cạnh avatar — avatar không bao giờ là tín hiệu duy nhất (kênh 3: khung hình học theo chỉ số + tầng L). Identity tĩnh tuyệt đối: 0 animation/pulse/scale-khi-chọn (LK-17).

**Cơ chế gán — QUYẾT ĐỊNH M-2 của wave V3 (2026-10-24, thay cơ chế (tên + ordinal) của Panel-02 M-2):** màu ứng viên chỉ suy từ **tên đã chuẩn hoá** — `fnv1a32(nameKey) % 12` → `identity-01…12` — ordinal bị bỏ khỏi seed; việc gán đi theo **thứ tự chuẩn** (nameKey tăng dần, ordinal gốc làm tie-break cuối cho tên trùng tuyệt đối) với thăm tuyến tính chống va chạm, rồi ánh xạ về vị trí gốc; nhóm >12 giữ vòng hai (màu, glyph). **Không dùng member id** ở bất kỳ bước nào. Hệ quả: tên phân biệt ⇒ màu chỉ phụ thuộc tập tên — bất biến chéo thứ tự/máy/id; tên trùng ⇒ tập màu của nhóm tên ổn định, gán cá nhân theo thứ tự chèn trong nhóm; thêm người chỉ đổi màu trong chuỗi va chạm chứa tên mới. Chi tiết thuật toán + test bất biến: `lib/identity.ts` / `lib/identity.spec.ts`. Palette danh tính riêng ở mục Colors (Identity Palette Rule — cấm brand/credit/debt/warning làm màu người).

### Navigation

Không tab bar, không stepper. AppBar: mark + tên (H1 duy nhất) + trạng thái lưu + nút ⋯ (Session Action Sheet). Back trình duyệt: thu gọn dải → về danh sách (theo lớp). Phím desktop: `N` thêm khoản, `M` thêm người, `⌘K`/`Ctrl+K` bảng hành động của hàng, `Enter` hành động chính, `Esc` lùi lớp, `C` copy khi dải mở — chỉ gán cho hành động có thật.

### Settlement (bảng quyết toán)

Ai trả ai trước, Số dư sau (kèm dòng chú thích `Dấu + là được nhận lại, dấu − là trả thêm.` thường trực), hàng tổng kẻ đôi cuối. Mỗi lệnh: avatar + tên hai đầu (truncate), glyph khía đôi tĩnh màu Ink (di sản mark B ở vai glyph quyết toán — không bao giờ là brand, không animate), Figure 700, nút VietQR **hoặc** trạng thái hạng nhất "Chưa có mã QR trên máy này" + 2 đường đi (LAYOUT-SPEC §5). Toàn văn copy được thành text cho Zalo/Messenger (định dạng giữ nguyên bản hiện hành).

### Share & VietQR — luật dữ liệu (BLOCKER)

Theo **DATA-04/09a + SEC-12.5**: ngân hàng **không bao giờ** trong share link — ở tầng schema của payload, không ngoại lệ. Link chỉ mang tên cuộc chia, thành viên (id + tên), khoản chi; quyết toán tính lại ở máy nhận. VietQR dựng payload EMVCo + render **100% client-side** từ bank lưu local trên máy đang xem (chạy cả offline). Máy chưa có bank của người nhận → trạng thái "Chưa có mã QR trên máy này" với 2 đường đi tiếp. Chi tiết: `LAYOUT-SPEC.md` §5, `COPY-DIET.md` §4.

## App shell & offline

App đăng ký **service worker** và precache **app shell** — trang gốc, manifest, icon PWA, logo, hero chính (hero-split); bundle CSS/JS/font (hash trong tên) vào runtime cache ở lần tải đầu. Cache đặt tên theo phiên bản, dọn cũ khi bản mới kích hoạt. SW + manifest hiện có (standalone, icon, `start_url`) ⇒ đạt **installable**.

Sau khi shell đã cache, luồng chính chạy offline **hoàn toàn** (thuần client + localStorage): ledger, Strip, mọi sheet, tính số dư/rút gọn nợ, VietQR từ bank local, tạo/copy share link. Máy chưa từng tải app cần mạng cho lần đầu.

Chỉ báo offline nằm **trong Settlement Strip** (dòng trên dòng chốt; ở Màn A: chân card tạo mới; ở desktop: dòng cuối cột quyết toán): `Đang offline — vẫn chia tiền được, dữ liệu lưu trên máy này.` + icon `wifi-off` + chữ, `aria-live="polite"`, không nền đỏ, không chặn thao tác; có mạng lại → `Đã có mạng trở lại` rồi tự ẩn.

**Không còn điểm phụ thuộc mạng nào trong luồng lõi**: QR render tại client, avatar sinh tại client, font tự host, share encode tại client. Trạng thái QR duy nhất là trạng thái dữ liệu ("chưa có mã QR trên máy này"), không phải trạng thái mạng.

**The Offline Is Not An Error Rule.** Offline không bao giờ trình bày như sự cố: không trang lỗi trình duyệt, không banner đỏ, không chữ kỹ thuật.

## Motion

**Bộ motion C1–C9 của REDESIGN-V3** (INTERFACE-SPEC §3 — thay bộ ba chuyển động của V2): tập duration hợp lệ duy nhất {65, 90, 100, 125, 170, 190, 240}ms; mọi easing là token có tên — `--ease-lock: cubic-bezier(0.15, 0, 0, 1)` · `--ease-step: cubic-bezier(0.3, 0, 0, 1)` · `--ease-leave: cubic-bezier(0.3, 0, 1, 1)` (LK-37: easing vô danh = 0). Hạt nhân là C1 settle-lock 240ms cho ô số quyết toán (số luôn là `--ink` ở mọi frame); kẻ đôi tĩnh xuất hiện ở t=0 không animation riêng (C7); identity + QR tĩnh tuyệt đối (C8); cấm count-up/odometer, overshoot/bounce, stagger trên danh sách tiền (C9). Chỉ `transform`/`opacity`, không animate layout. `prefers-reduced-motion`: theo bảng rút gọn của C1–C9 (số đổi tức thì, displacement 0px).

## Do's and Don'ts

### Do

- **Do** đặt mọi số tiền ở Figure (Inter `tnum`), căn phải, nhóm nghìn kiểu Việt — ở mọi vị trí, kể cả meta danh sách.
- **Do** giữ Strip luôn hiện và luôn đúng: nó là quyết toán, không phải bản xem trước của quyết toán.
- **Do** để mọi chuỗi động truncate trong ô `min-width: 0` — dữ liệu dài là ca thường, không phải ca biên.
- **Do** thiết kế disabled bằng bề mặt + lý do, giữ focus được.
- **Do** tiêu brand chỉ cho hành động, lựa chọn, focus, kẻ đôi tổng kết.

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

## Hiệu đính ngân sách chữ dạng công thức (2026-10-24 — Panel #04, Finding F-R2-01)

**Rút tuyên bố của đợt hiệu đính 2026-10-23.** Panel #04 (báo cáo `ui-panels/chiatien-panel-04.md` §6) đã đếm lại bằng `innerText` trên render thật và bác tuyên bố hoàn thành của đợt trước: câu «mọi bề mặt đo trong ngân sách mới» và việc đóng Finding I **vô điều kiện** là **sai trên render** và bị rút tường minh tại đây. Ngân sách điểm của đợt 2026-10-23 (workspace có dữ kiện: thu gọn ≤45 · mở rộng ≤90 đã-có-QR / ≤125 chưa-QR) được hiệu chuẩn bằng đếm-từ-nguồn trên mẫu đồ chơi (2 người/1 lệnh cho bề mặt mở rộng) **không có hệ số thang đo theo cỡ mẫu** — trên fixture chuẩn S2, cả ba bề mặt workspace đều vượt trần ở mọi biến thể đếm (thu gọn 54; mở rộng 143 có-QR / 178 chưa-QR theo bộ đếm ở mục này — Panel #04 công bố 143–144 / 178–180, lệch 1–2 chỉ vì token cặn «₫)»). Lỗi nằm ở hiệu chuẩn và ở tuyên bố, không nằm ở chữ trên render: mô hình chi phí template suy từ render tái lập chính xác kế toán của chính đợt hiệu đính trước.

**Finding I đóng CÓ ĐIỀU KIỆN — và điều kiện đã thỏa ở đợt này.** Điều kiện đóng là cả hai việc sau, không việc nào được thiếu: (1) ngân sách của bề mặt workspace-có-dữ-kiện được viết lại **dạng công thức** có hệ số theo hàng khoản / hàng lệnh / hàng số dư / khối chưa-QR, suy từ số đo render trên fixture chuẩn S1/S2 (định nghĩa ở dưới) — chính là công thức ở mục này; (2) **cắt chữ khối chưa-QR** — câu giải thích 19 từ của khối (theo cách đếm của panel; 17 từ tĩnh theo bộ đếm ở mục này) lặp ~50% ý tiêu đề đã được cắt xuống còn 8 từ tĩnh, giữ trọn thông tin thật duy nhất của câu (số lệnh + tổng tiền đang chờ QR): «{count} lệnh chuyển (tổng {amount}) đang chờ mã QR này.» Bằng chứng thỏa điều kiện: hồ sơ đo render của wave Docs+Media (`WORD-LOG.md` — baseline + phân rã hệ số; `WORD2-LOG.md` — đối chứng kiểm soát và đo sau cắt trên build next 16.4.2) và Panel #04 §6 + §8 mục 1. Ngoài hai điều kiện này, Finding I không được tuyên bố là đã đóng.

**Phương pháp đếm (chuẩn cho mọi đo lại về sau).** Đếm trên `innerText` của render thật (build local, mobile 390×844, trạng thái mặc định của bề mặt), tách từ theo khoảng trắng. **Chỉ tính chữ tĩnh của app** — loại dữ kiện người dùng: tiêu đề cuộc chia, tên thành viên, tiêu đề khoản (khớp nguyên cụm), chữ viết tắt avatar, mọi token số (số tiền / số đếm suy từ dữ kiện) và đơn vị đi ngay sau số («nghìn»/«triệu»/«tỷ»/«₫», gồm token cặn «₫)» của mẫu «(tổng {số} ₫)»). **Tính cả** nhãn nút, placeholder và token «·». **Không tính:** `aria-label`/`title`/`sr-only`, chữ trong sheet/dialog/banner chỉ hiện theo sự kiện. **Khoản đồng-render của Strip:** ở trạng thái mở rộng, dock thu gọn (dòng «Đã lưu trên máy này» 5 từ + Strip thu gọn 6 từ = 11 từ tĩnh) vẫn nằm trong `innerText` — công thức tính tường minh khoản này trong **cả hai** họ bề mặt, không trừ ra ở bề mặt mở rộng.

**Fixture chuẩn.** Sinh bằng chính `lz-string` của repo theo `lib/share.ts`, nạp bằng link `#chia=…`; sổ bank per-device được seed sau import, khớp theo tên thành viên (đúng đường Panel #04 đã kiểm chứng).

- **S1:** 5 thành viên (1 tên dài 45 ký tự + An/Bình/Chi/Dũng); 2 khoản chia đều (tên-dài trả 999.999.999.999.999 ₫ chia 5; An trả 800.000 ₫ chia 5); bank seed cho tên-dài + An → 4 lệnh đều về tên-dài, đều có VietQR.
- **S2:** 4 thành viên (An/Bình/Chi/Dũng); 3 khoản chia đều 4 (An 800.000 · Bình 600.000 · Chi 100.000) → số dư An +425.000 · Bình +225.000 · Chi −275.000 · Dũng −375.000 → lệnh Dũng→An 375.000 (VietQR) · Chi→An 50.000 (VietQR) · Chi→Bình 225.000 (không VietQR); bank seed chỉ cho An → đúng 1 khối chưa-QR (Bình).
- **S2-QR** (biến thể): S2 + seed thêm bank cho Bình → 0 khối chưa-QR, 3/3 lệnh có VietQR.
- **S2-nobank** (biến thể): S2 không seed bank nào → 2 khối chưa-QR (An: 2 lệnh/425.000 · Bình: 1 lệnh/225.000), 0 VietQR.

**Công thức ngân sách (thay ngân sách điểm cho workspace-có-dữ-kiện).** Biến: **M** = số thành viên · **E** = số khoản · **Q** = số thành viên đã có QR trên máy này · **V** = số lệnh mà người nhận có QR · **K** = số người nhận chưa có QR trên máy này.

- **Thu gọn = 22 + 3M − Q + 7E**
- **Mở rộng = Thu gọn + 31 + V + 5M + 27K**

| Hệ số | Giá trị | Cách suy từ render (phân rã theo vùng trên dump `innerText`) |
|---|---:|---|
| Hằng số thu gọn | 22 | header app-shell 6 + nút «Thêm» 1 + hàng tổng «TỔNG CHI · n KHOẢN» 4 + dock đồng-render 11 (dòng lưu 5 + Strip thu gọn 6) |
| Chip thành viên | 3/chưa-QR, 2/có-QR | cơ số 3M, trừ 1 cho mỗi thành viên có QR → `3M − Q` |
| Hàng khoản | 7/hàng | mẫu meta «đã trả · {kiểu chia} cho … người» của hàng chia-đều (hệ số hiệu chuẩn trên hàng chia-đều — cả hai fixture đều chia đều) |
| Khung panel mở rộng | 31 | đầu panel «Quyết toán/Thu gọn» 4 + «AI TRẢ AI» 3 + «SỐ DƯ TỪNG NGƯỜI» 4 + chú thích dấu 11 + «TỔNG CHUYỂN» 2 + CTA 7 |
| Hàng lệnh | 1 nếu người nhận có QR («VietQR»), 0 nếu không | cộng dồn = V |
| Hàng số dư | 5/người | «Đã trả · Phải chịu» + dấu → 5M |
| Khối chưa-QR | **27/khối (sau cắt)** | tiêu đề 8 + câu giải thích **sau cắt 8** + «Nhắn xin QR của» 4 + «Nhập tài khoản của … trên máy này» 7. Trước cắt là 36 (câu cũ 17); hệ số 27 được **đo** trên hai bề mặt độc lập sau cắt (K=1: Δ −9; K=2: Δ −18) và đếm trực tiếp trên phân rã vùng — không phải số suy luận |

Một bề mặt workspace-có-dữ-kiện «trong ngân sách» khi số từ tĩnh đo trên render **không vượt** giá trị công thức tại đúng (M, E, Q, V, K) của bề mặt đó.

**Kiểm chứng dự báo-vs-đo** (render của build local next 16.4.2, sau cắt; sáu bề mặt không chứa khối chưa-QR khớp tuyệt đối baseline đo trên 16.3.6 — bản nâng next không đổi render chữ):

| Bề mặt | (M, E, Q, V, K) | Dự báo | Đo | Lệch |
|---|---|---:|---:|---:|
| S1 thu gọn | (5, 2, 2, –, 0) | 49 | 49 | 0 |
| S1 mở rộng | (5, 2, 2, 4, 0) | 109 | 109 | 0 |
| S2 thu gọn | (4, 3, 1, –, 1) | 54 | 54 | 0 |
| S2 mở rộng | (4, 3, 1, 2, 1) | 134 | 134 | 0 |
| S2-QR thu gọn | (4, 3, 2, –, 0) | 53 | 53 | 0 |
| S2-QR mở rộng | (4, 3, 2, 3, 0) | 107 | 107 | 0 |
| S2-nobank thu gọn | (4, 3, 0, –, 2) | 55 | 55 | 0 |
| S2-nobank mở rộng | (4, 3, 0, 0, 2) | 160 | 160 | 0 |

**Phạm vi.** Công thức trên chỉ quản bề mặt **workspace-có-dữ-kiện**. Trần điểm của **trang chủ** (≤95 từ tĩnh mobile · ≤155 desktop gồm aside) và **workspace rỗng** (≤50 mobile, Strip thu gọn) ở mục hiệu đính 2026-10-23 **giữ nguyên không đổi** — Panel #04 đã kiểm đạt trên live (trang chủ 77 ≤ 95 mobile · 126 ≤ 155 desktop); đợt này không đo lại và không tuyên bố gì thêm về hai bề mặt đó.

**Quy tắc Verified Claim cho tuyên bố ngân sách về sau.** Mọi tuyên bố «trong ngân sách» / «đã đóng Finding ngân sách» từ nay phải kèm đủ: bề mặt + fixture + bộ biến (M, E, Q, V, K) + phương pháp đếm ở mục này + số đo trên render của **chính build được tuyên bố**. Số suy từ mã nguồn, từ mẫu khác cỡ, hoặc từ build khác đều không được tuyên bố là số đo render. Finding ngân sách chỉ được đóng khi dự báo công thức khớp số đo render trong ±3 từ trên mọi bề mặt của fixture chuẩn (đợt này: khớp tuyệt đối 8/8).

## Hiệu đính REDESIGN-V3 (2026-10-24 — hồ sơ redesign-v3/chiatien, verdict vòng 3 + LK-01→47)

**Phạm vi hiệu đính.** Mục này ghi lại đợt thay hệ thiết kế V3 («Kẻ Đôi Kết Toán» / «Sổ kép hai cột kẻ») trên nền tài liệu V2 ở trên. Nơi nào thân tài liệu đã được sửa trực tiếp sang hệ V3 (frontmatter, mục Colors, Avatar, Elevation, Motion, Double Rule, Buttons/Inputs) thì bản sửa là hiện hành; mục này là sổ ghi quyết định để truy vết. Nguồn sự thật duy nhất của V3: `~/workspace/mini-apps/redesign-v3/chiatien/` (IDENTITY.md · COLOR-SYSTEM.md · TYPE-AND-ICON.md · INTERFACE-SPEC.md · assets/) — cấm dùng `assets-draft/`. Chuỗi cảnh báo DATA-04(ii), headline/bullets được bảo vệ và công thức ngân sách chữ ở hai mục hiệu đính ngay trên **không đổi một ký tự** trong đợt này.

**Seed + thang token mới.** Brand seed khoá nguyên byte **#A5482F** (LK-02; sàn chroma vĩnh viễn 0,129 — LK-03), thang tonal brand-50…950 suy từ neo Material Deep Orange (LK-01), neutral hue-seed (paper #FDF5F2 · ink #140F0E · line-control #534946), semantic là instance dịch **+0,02** đủ 12/12 phần bg/border/solid/ink (LK-13), identity là **12 ô mới của lens-11** (LK-14 — bộ cũ chết hẳn). Toàn bộ thang đã chép nguyên byte vào `app/globals.css` từ `assets/tokens.css`; ba hex strict-white bị cấm (#A9404A · #4571A1 · #904530 — LK-04) xuất hiện 0 lần ở mọi sink. Mark mới «Kẻ Đôi»: một khối sổ bị kênh dọc 65:35 và kênh ngang cắt thành bốn khối, một path một fill — kẻ đôi tổng kết chính là hai cạnh của kênh ngang của mark. Bóng bề mặt tĩnh = 0 (token `--shadow-card`/`--shadow-lift` bị xoá; Strip phân tầng bằng hairline).

**Cơ chế avatar đĩa/initials/viền.** Nền avatar đặc (kể cả DiceBear `backgroundColor`) chết hẳn (LK-16). Render mới: đĩa tròn neutral-50 #FAF3F1 chung cho mọi thành viên (đĩa không mang identity, ĐÓNG BĂNG — đổi đĩa = chữ ký I-1/I-2/I-3 hết hiệu lực), initials Inter 600 mang màu ô identity (11px @ đĩa 28 · 12px @ 32 · 10px @ 24), viền solid cùng ô (2px @ 28/32 · 1,5px @ 24); đĩa chuẩn 28px, trần 32px, ≤8 đĩa/viewport (>8 → 24px); kênh 3 giữ nguyên (khung hình học theo chỉ số + tầng L + tên đầy đủ luôn kề bên). Identity tĩnh tuyệt đối (LK-17). Một nguồn generated duy nhất cho cả ba sink (globals.css + `lib/identity.ts` + `lib/identity.spec.ts`) kèm test hồi quy a11y I-1 trong spec.

**QUYẾT ĐỊNH M-2 (avatar seed).** Chốt hướng (i): **seed chỉ-tên + tie-break xác định theo thứ tự chuẩn** — chi tiết bằng chứng và thuật toán khoá ở `V3-IMPL-STATE.md` mục 1 và `lib/identity.ts`. Tóm tắt: ứng viên = `fnv1a32(nameKey) % 12` (bỏ ordinal khỏi seed); gán theo thứ tự chuẩn (nameKey↑, ordinal↑) với thăm tuyến tính + vòng hai (màu, glyph) cho nhóm >12; giới hạn ghi thẳng: tên phân biệt ⇒ màu chỉ phụ thuộc tập tên (bất biến chéo thứ tự/máy/id — đóng tranh chấp 2 của Panel #04 ở tầng cơ chế), tên trùng ⇒ tập màu của nhóm tên ổn định.

**Motion C1–C9.** Bộ motion duy nhất của V3 (INTERFACE-SPEC §3, LK-35/37): duration chỉ thuộc tập {65, 90, 100, 125, 170, 190, 240}ms; easing chỉ là token có tên (`--ease-lock` · `--ease-step` · `--ease-leave`); C1 settle-lock 240ms là hạt nhân (số quyết toán luôn `--ink` ở mọi frame, debounce gộp một lần khoá ở giá trị cuối); sheet C4 enter 190ms/exit 125ms (keyframe `ct-sheet-in` cũ bị giết đích danh); kẻ đôi tĩnh t=0 (C7); identity + QR tĩnh tuyệt đối (C8); cấm count-up/odometer/overshoot/stagger (C9).

**Layout «Sổ kép hai cột kẻ» 1:2:3** (INTERFACE-SPEC §1–§2, LK-32/29): desktop [ledger 640px @lg / 720px @xl][cột quyết toán 320/360px] kẻ dọc `border-l`, hai cột từ 900px (cột 288px); nhịp thở 8:16:24; hàng ledger 52px mobile / 56px desktop; bán kính Ledger/Deck/Strip = 0, control 8, sheet 16 chỉ ở hai góc trên (`rounded-xl` cấm ở vai mặc định); Deck phẳng hoá trên cùng bề mặt paper với ledger — hộp chỉ sống ở sheet/modal; Strip = chân bảng trắng cùng bề mặt với ledger, ngân sách chrome mobile ≤212px @ 844px; kẻ đôi ≤2 vị trí toàn app {hàng tổng, chân Strip} và ≤1 cụm/viewport (LK-22/41); tám luật D4-CT-1→8 (sàn tên trong Strip, thứ tự hy sinh bề rộng, giao 0 giữa các cụm, sheet × Strip, CTA/heading, chip thành viên) là hợp đồng nghiệm thu trên render thật.

## Hiệu đính REDESIGN-V4 (2026-10-24 — hồ sơ redesign-v4/chiatien, NEUTRAL-FIRST + neo Material literal)

**Phạm vi hiệu đính.** Mục này ghi lại đợt thay hệ thiết kế V4 trên nền tài liệu V2/V3 ở trên; thân tài liệu phía trên KHÔNG bị sửa trong đợt này (mọi quyết định V4 sống ở mục hiệu đính này và ở hồ sơ nguồn). Nguồn sự thật duy nhất của V4: `~/workspace/mini-apps/redesign-v4/chiatien/` (IDENTITY.md · COLOR-SYSTEM.md · TYPE-AND-ICON.md · INTERFACE-SPEC.md · VISUAL-LAYER.md · assets/tokens.json — tokens.json là nguồn token duy nhất). Chuỗi cảnh báo DATA-04(ii), headline/bullets được bảo vệ và công thức ngân sách chữ ở các mục hiệu đính trước **không đổi một ký tự** trong đợt này.

**NEUTRAL-FIRST + NEO-0.** Canvas chính của mọi bề mặt là trắng `#FFFFFF` + thang Grey công bố của Material (grey-50 `#FAFAFA` … grey-900/ink `#212121`); giấy nhuộm V3 (`#FDF5F2`, `#FAF3F1`) chết hẳn. Seed V4 = Deep Orange 500 `#FF5722` chép nguyên byte giá trị công bố của Material (loại A, Δbyte = 0) — seed suy-ra V3 `#A5482F` chết hẳn ở mọi sink. Vai màu khoá: seed chỉ làm solid CTA «Chốt chia» với nhãn mực đen `#000000` (ink-on-seed, 6,64:1), mark và app-icon tile; hover/pressed CTA = brand-600 `#F4511E` (nhãn vẫn đen); chữ brand/link, focus ring (outline ≥2px) và kẻ đôi cấu trúc = brand-900 `#BF360C`; brand-800 `#D84315` là bậc bẫy — không vai chữ; semantic lấy nguyên bậc công bố Material theo họ (credit Green 800/900/50 · debt Red 700/900/50 · warning Amber 900/50 · info Blue 800/900/50) và token semantic `*-border` của V3 chết — phân tách bằng hairline grey-200 khi cần.

**Chữ.** Ba vai tách tuyệt đối: hiển thị/thương hiệu = Archivo variable (wght 800/900 + wdth 125 — Expanded) chỉ cho h1/h2 và tuyên bố tổng; nội dung = Be Vietnam Pro 400/500/700; số/tiền = Inter 600/700 + `tnum` (vai duy nhất của Inter). Thang chữ đóng: body/nhãn/nút BVP 16px · h3 BVP 700 20px · h2 Archivo Expanded 800 25px · h1 Archivo Expanded 800/900 32px · tuyên bố tổng panel quyết toán 40px (phần số vẫn Inter 700 tnum). Ngoại lệ ngoài thang giữ nguyên như hồ sơ: nhãn cột Inter 600 12px uppercase tracking 0,06em và meta phụ 12px. Archivo chỉ sống khi qua cổng render của hồ sơ (computed-style audit + render-check dấu chồng ở 900/125); trượt cổng thì vai hiển thị rơi về Be Vietnam Pro 900 theo dự phòng đã định trước.

**Avatar.** DiceBear `initials` (khôi phục theo lệnh user, cơ chế seed M-2 giữ nguyên — `lib/identity.ts` không đổi một byte): nền = bậc 100 của 16 họ Material công bố, chữ initials = mực Grey 900 `#212121` trên mọi nền (V-11.5, đo 9,75–15,03, đạt 16/16) bằng Be Vietnam Pro 700; bảng nền sống ở tầng component (`AVATAR_BACKGROUNDS_V4` trong `ui-bits.tsx`) theo thứ tự key của tokens.json, chỉ số gán 0..11 vẫn do `assignIdentityColors` đóng băng cấp.

**Mark + asset.** Mark «Kẻ Đôi Kết Toán» giữ nguyên hình học byte từ V3, chỉ đổi fill sang seed V4; asset trong `public/products/brand/` chép byte từ `redesign-v4/chiatien/assets/` (mark → `chiatien-logo.svg`, mark-micro → `chiatien-logo-micro.svg`, mono → `chiatien-logo-mono.svg`, lockup → `chiatien-lockup.svg`, app-icon → `chiatien-app-icon.svg`, hero → `hero-split.svg`); favicon + app-icon cùng một nguồn mark (F-10) và service worker bump version cùng đợt đổi asset. Cấm mark seed trần trên nền đen/tối — chỉ dùng tile trắng chứa mark hoặc mono trắng.

## Khai báo bề mặt game mode «Ai Đãi» (2026-10-25 — đợt sửa PRES vòng 2, mục 14)

**Phạm vi.** Mục này là khai báo riêng cho bề mặt game mode «Ai Đãi» (thư mục `game/` — vỏ React M1–M8 và canvas Phaser G1/G2), lập để đóng 17 advisory của Impeccable detector source-mode trên `game/` (hồ sơ: `chiatien-game-v2/panels-v2/impeccable-source-mode.txt` — 14 advisory font-size + 3 advisory màu trên 2 hex). Các cỡ/màu dưới đây CHỈ có hiệu lực trên bề mặt game/canvas; thang chữ đo thật của app chính ở mục Typography ({12, 13, 14, 15, 16, 19}px) không đổi, và không cỡ nào ở đây được dùng làm tiền lệ cho bề mặt app chính.

**Bậc chữ phụ của game mode (khai mới).**

| Token khai báo | Cỡ | Vai trò — nơi dùng thật trong `game/` |
|---|---:|---|
| `game-type-10` | 10px | Chữ initials trong badge fallback trên nameplate canvas G1 (`scenes-g1.ts`) — bề mặt canvas nhỏ cố định, không phải chữ HTML |
| `game-type-20` | 20px | Tiêu đề H1 của game mode (`game/entry.tsx`) · tiêu đề card chọn game ở M4 · số sát thương bay (floatText) trên canvas G1 |
| `game-type-22` | 22px | Tiêu đề màn game (`ScreenTitle` ở `game/screens/shared.tsx`) · tiêu đề màn chơi M6 (`play-screen.tsx`) · dòng «Cùng đãi ván này» ở M7 · số sát thương thường trên canvas G1 |
| `game-type-26` | 26px | Tuyên bố người đãi ở M7 (`m7-result-screen.tsx`) · banner hiệp phụ/hoà trên canvas G1 |
| `game-type-28` | 28px | Tên chủ tài khoản đọc từ QR ở M2 (`m2-qr-screen.tsx`) · số sát thương CHÍ MẠNG trên canvas G1 (đi cùng màu `game-crit` ở dưới) |

**Cỡ đã thuộc ramp đo thật — KHÔNG khai trùng.** Hai cỡ trong advisory đã nằm trong thang đo thật của app chính ở mục Typography nên không khai lại ở đây: **13px** (bậc Meta — nhãn choáng «@ @» trên canvas G1) và **15px** (bậc Figure/Body — chữ initials + tên ghế trên canvas G2). Advisory nhắc các cỡ này chỉ vì detector đối chiếu với tuyên bố thang cũ; về hệ thống, chúng đã có nhà.

**Màu của bề mặt canvas/game (khai mới).**

| Token khai báo | Hex | Vai trò |
|---|---|---|
| `game-ink` | `#212121` | Mực chữ initials trên badge trong canvas — DiceBear `textColor` của badge G1/G2 (`game/phaser/textures.ts`) và chữ initials fallback ở nameplate G1 / ghế G2 (`scenes-g1.ts`, `scenes-g2.ts`). Đây là Material Grey 900 — cùng hex với mực Grey 900 của hệ V4; khai riêng ở đây vì nó sống trong canvas Phaser, ngoài tầm token CSS của app chính |
| `game-crit` | `#DC2626` | Số sát thương CHÍ MẠNG trên canvas G1 (`scenes-g1.ts`) — chỉ dùng cho con số crit bay lên rồi mờ dần; không dùng cho chữ tĩnh, nút, hay trạng thái nợ của app chính (debt có semantic riêng). Khai dạng chuẩn hoá `#DC2626`; trong source Phaser hiện ghi thường `#dc2626` — cùng một màu |

**Kỷ luật.** Ngoài hai hex trên và palette màu áo người chơi đã khai ở `game/assets/palette.ts`, bề mặt game không tự thêm màu literal mới: màu literal tiếp theo trong `game/` phải được khai vào mục này trước (hoặc đưa về token/palette đã có) thì mới qua detector mà không thành advisory mới.
