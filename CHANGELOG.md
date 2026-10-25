# Changelog — Chia Tiền

Mọi thay đổi đáng kể của dự án ghi tại đây, mới nhất ở trên. Định dạng
theo Keep a Changelog; phiên bản theo SemVer.

## [Unreleased] — 2026-10-26

### Changed

- Làm tươi hồ sơ ngân sách route '/' trong perf-budget.json —
  thêm mốc đo hiện hành 241.982 B của v2.1.0 (measuredLatest),
  giữ mốc khai 221.205 B (2026-10-23) làm baseline lịch sử;
  lý do: phân xử CT-0 (SPEC A11Y-FIX chiatien §5) — 221.205 B
  từng bị đọc nhầm thành «ngân sách thứ hai» trong khi ngân
  sách duy nhất có thẩm quyền luôn là 243.000 B; ngân sách và
  trần cứng KHÔNG đổi nên không cần ADR theo growthLock.

### Fixed

- Sửa 3 vi phạm A11Y serious + đĩa định danh theo SPEC
  A11Y-FIX chiatien (Team 1B-7/1B-8), từ gói VERIFY-3 trên
  live v2.1.0: (V-1) tên thành viên trên chip «Người cùng
  chia» đang chọn đổi sang token scoped mới `--brand-950`
  `#A62B0A` (derived vì AA — ngoại lệ học thuyết «0 token
  loại C», provenance ghi trong tokens.chiatien-v4.json):
  3,90 → 4,92:1; `--brand-900` dùng chung giữ nguyên.
  (V-2) alias `--ink-2` nâng `#757575` → `#616161` tại một
  điểm: 5,28:1 trên brand-50, 5,93:1 trên grey-50, 6,19:1
  trên trắng. (V-3) bỏ `aria-label` thừa trên div chứa
  canvas Phaser (`game/phaser/stage.tsx`) — nhãn đã có ở
  H2 kề trên, không thêm role. (Đĩa định danh) giữ nguyên
  100% bảng màu đĩa, thêm bảng glyph theo colorIndex
  (trắng hoặc mực `#212121`, chọn tỉ lệ cao hơn) áp ở cả 4
  bề mặt vẽ glyph: mọi đĩa ≥ 3:1, thấp nhất 4,11:1, 10/12
  ≥ 4,5:1 (trước: idx 0/7/9 chỉ 2,04–2,43:1).

## [2.1.0] — 2026-10-25 — «FLOW-3STEP»: luồng vào game đúng 3 bước + đợt UI-SLIM

Phát hành tại commit `9f06996` (tag `v2.1.0`). Nguồn: user chê sau
v2.0.2 (nút «?»/«Thoát game» lỗi vị trí trên mobile, khối Quyết toán
hiển thị 2 nơi, còn nhiều cái thừa) và lệnh đơn giản hoá «đúng 3 bước»
kèm luật bấm nút khi thiếu phải cuộn tới vị trí thiếu — hồ sơ:
docs/reviews/v2.1.0-review-record.md.

### Added

- **Wizard vào game đúng 3 bước** (có chỉ báo tiến trình): Bước 1
  «Tiền & QR quán» — tổng tự điền từ phiên + QR quán chụp camera,
  giải mã VietQR/EMVCo 100% client-side (thử BarcodeDetector trước,
  jsQR nạp lười thành chunk riêng 45.789 B gzip ngoài critical path);
  Bước 2 «Thêm người»; Bước 3 «Chọn game & chơi» — 2 thẻ game lớn có
  minh hoạ + radio, khối đồng thuận + số chung, nút «Chơi — cả nhóm
  đồng ý». Ratio từng bước đo bằng driver: 1,00 / 1,00 / 1,03 (QR đã
  nạp + khối đối chiếu vẫn 1,00).
- **QR chụp ở Bước 1 thành đích thanh toán thật ở màn kết quả M7**
  (QR tự sinh parse đúng từng trường qua cùng hàm giải mã như camera;
  M7 hiện phiếu trả cho quán kèm mã QR). QR không giải mã được không
  bao giờ thành đích thanh toán; DATA-04 nguyên vẹn.

### Changed

- **Luật validation mới:** `firstBlocker()` là nguồn sự thật duy nhất;
  nút Tiếp/Chơi KHÔNG disabled nữa — bấm khi thiếu sẽ chuyển đúng bước
  chứa trường thiếu (kể cả nhảy ngược 3→1), cuộn mượt + focus + viền
  đỏ + dòng lý do ngay tại trường (đã chứng minh 3 ca bằng driver:
  thiếu tổng, QR chưa đối chiếu, thiếu số chung).
- **Đổi người chơi / nhân vật / avatar qua POPUP bottom-sheet**
  (GameSheet mới, dùng chung mẫu Sheet của app: portal ra
  `document.body`, scrim, khoá cuộn nền, Esc, trả focus) thay panel
  nhúng — overlay không còn bị đẩy dài (đứng yên 921px thay vì bị kéo
  tới 1.283px/3.204px), đóng sheet giữ nguyên scrollTop + dữ liệu đã
  nhập.
- **Header game về 1 hàng** (tiêu đề trái; «?» + «Thoát game» phải,
  cùng hàng) — đóng lỗi vị trí user chê.
- Ô nhân vật đã chọn nói trạng thái trực tiếp ngay trên ô («{Tên} đã
  chọn» / «Mẫu này đã đủ người», sprite mờ) — câu chữ gây đoán cũ xoá
  hẳn.
- Rà từng thành phần C1–C47 của đợt UI-SLIM, mỗi mục một kết luận
  ĐẠT / ĐÃ GỌN / GIỮ CÓ LÝ DO (hồ sơ UI-SLIM-STATE.md của đợt).

### Fixed

- **Dock strip hết hiện trùng lệnh quyết toán (T1):** xoá hàng tóm
  tắt lệnh đầu trong dock strip (trùng panel «Ai trả ai»); strip nay
  chỉ còn hành động chính + 1 số tổng (127 → 121px). 2 test khoá cấu
  trúc cũ được viết lại theo hợp đồng mới.

### Invariants

- `git diff -- lib` = 0 byte — logic/engine/seed/kết quả, giao thức
  QR + đối chiếu, «Ghi vào sổ» + chống trùng giữ nguyên. Cổng parent
  tự chạy lại trên cây phát hành: app **252/252**, game **237/237**,
  tsc PASS, eslint PASS, prettier --check 16 file PASS, build PASS;
  ngân sách route '/' **241.982 / 243.000 B** (dư 1.018 B — giảm
  241 B so với v2.0.2 dù thêm wizard + sheet); console khi chụp pack
  0 lỗi. Service worker `v11-2026-10-25`.

## [2.0.2] — 2026-10-25 — «UIUX-GAME-V2»: làm lại trình bày game — gần như không cuộn, cắt tối đa chữ

Phát hành tại commit `e5bf88e` (tag `v2.0.2`). Nguồn: user chê tiếp
sau v2.0.1 — «mô tả còn quá nhiều, gây rối mắt và phải cuộn nhiều».
Hồ sơ: docs/reviews/v2.0.2-review-record.md.

### Changed

- **Làm lại TRÌNH BÀY game mode thuần (7 file game):** màn thiết lập
  nén (tổng 1 dòng + nút Sửa; chọn trò 2 chip ngang; người chơi/nhân
  vật 1 khối; QR 1 hàng; đồng thuận 2 dòng); màn trong ván chỉ còn
  sân + chip tên·màu + chip điều khiển; màn kết quả M7 rút gọn (cảnh
  báo QR 1 câu, diễn biến thu gọn, frame kết ván thành thumbnail
  180px). Đo bằng driver CDP (dữ kiện «Nhậu cuối tuần» 600.000 ₫ /
  4 người; ratio = scrollHeight/viewport của overlay):
  - Thiết lập 390×844: ratio **1,86 → 1,18**; từ hiển thị 245 → 134
    (−45%); khối dài nhất 34 → 11 từ. Thiết lập 1440: 1,48 → 1,06.
  - Trong ván G2/G1: ratio 1,33 → **1,00**; từ −67% / −66%.
  - Kết quả: G2 1,70 → 1,19; G1 1,95 → 1,42; khối dài nhất 28 → 13
    từ; frame kết ván 358px → thumbnail 180px.
- **Không đoạn văn mặc định nào dài hơn 13 từ:** mọi giải thích dài
  sống trong sheet «Luật chơi & chi tiết» mở bằng nút «?» — cổng duy
  nhất. Đoạn cảnh báo offline bỏ khỏi đầu màn thiết lập (bản đầy đủ
  vào sheet luật + 1 dòng trong «Chi tiết ván»).
- 2 hằng chữ QR (`QR_NO_NAME_WARNING`, `QR_FINAL_CHECK_LINE`) rút
  còn 1 dòng theo lệnh user — bản trách nhiệm QR đầy đủ nguyên văn
  vẫn hiển thị trong sheet luật.

### Invariants

- Logic/engine/seed/kết quả, giao thức QR + đối chiếu, «Ghi vào sổ»
  + chống trùng, sửa camera F9, CTA lối vào giữ nguyên 100%;
  `git diff -- lib` = 0. Cổng: app **252/252**, game **237/237**,
  tsc/eslint PASS, build PASS, prettier --check 7 file PASS; ngân
  sách route '/' **242.223 / 243.000 B** (dư 777 B, không đổi);
  console khi đo 0 lỗi. Service worker `v10-2026-10-25`.

## [2.0.1] — 2026-10-25 — «FIX-UX-GAME»: sửa UX game theo phản hồi trực tiếp trên bản live

Phát hành tại commit `867ea4e` (tag `v2.0.1`), trên nền v2.0.0 + sửa
CI `8f03ed5`. Nguồn: người dùng mở live v2.0.0 và phản hồi «không tìm
thấy game, lỗi quá, nhiều mô tả, chưa tối ưu khó chơi»; parent chơi
thử thật trên production và ghi findings F1–F10. Hồ sơ:
docs/reviews/v2.0.1-review-record.md.

### Fixed

- **Không tìm thấy game (F1):** lối vào thành CTA đặc full-width
  «Chơi game đãi» — desktop ngay dưới tiêu đề «Quyết toán», mobile
  ngay trên dải quyết toán dính (trước là nút mờ ở cuối cột).
- **Luồng 7 màn nối tiếp gộp còn 1 màn thiết lập:** tổng tiền tự điền
  từ tổng phiên (sửa được, hết bắt nhập lại — F2); chọn trò ngay tại
  màn (mặc định «Mâm cơm xoay»); người chơi mặc định cả bàn, nhân
  vật gán sẵn — «Đổi người chơi»/«Đổi nhân vật» chỉ mở dạng nhúng
  khi cần (hết 2 màn bắt buộc dù mặc định đã đúng — F3). Đường vào
  ván sau sửa: trang phiên → 2 lần bấm + 1 lần gõ số chung → ván
  chạy (trước: 25 thao tác / 14 lần bấm).
- **QR thành tuỳ chọn:** «Thêm QR» / «Chơi không cần QR»; QR lỗi =
  cảnh báo 1 dòng tại chỗ; QR đọc được = đối chiếu gọn ngay tại màn,
  lệch số tiền thì chặn (trước QR là cổng cứng sinh thêm màn đối
  chiếu — F2).
- **Ô Số chung nằm TRƯỚC nút Bắt đầu** trong khối đồng thuận (trước
  nằm dưới nút — F4); thanh Bắt đầu dính đáy luôn hiện dòng lý do đỏ
  khi nút mờ.
- **Tường chữ (F5/F7):** mỗi khối tối đa 1 dòng mô tả; chi tiết kỹ
  thuật (C1/seed/luật hoà/đột tử) gom vào «Chi tiết ván» thu gọn ở
  màn thiết lập + kết quả; miễn trừ QR rút còn 1 dòng; màn kết quả
  phân biệt đúng ván không-QR với QR không giải mã được.
- **Khung sân trắng nhá khi mở ván (F8):** khung sân / «Đang mở
  sân…» hiện ngay từ render đầu, hạ xuống khi scene chạy.
- **Vòng sân bị cắt hai bên trên mobile (F9):** sửa gốc ở camera G1
  (`game/phaser/scenes-g1.ts`) — kẹp tâm camera để toàn bộ bbox +
  đệm luôn nằm trong khung khi zoom, cộng đai phụ stage (canvas
  max-width 100%); sau sửa cả 4 plate trọn khung giữa trận và ở
  frame kết ván.
- **Sơ đồ vòng bàn tràn khung, cắt tên (F10):** đóng theo cấu trúc —
  sơ đồ vòng bàn không còn trong luồng.

### Added

- **Ghi kết quả game vào sổ (F6):** màn kết quả nói rõ 1 dòng «Kết
  quả này chưa tự ghi vào sổ» + nút «Ghi vào sổ: {người đãi} đã trả
  {tổng}» qua API phiên hiện hữu (không đụng lib; chống ghi trùng
  theo mã ván; cùng đãi = mỗi người một khoản, lẻ dồn người cuối).
  Đã kiểm chứng end-to-end bằng ảnh: sổ thêm khoản «Game đãi — ván
  #0476CC · 600.000 ₫», tổng phiên 600.000 → 1.200.000 ₫.

### Invariants

- `git diff -- lib` = 0; game vẫn là lazy chunk riêng. Cổng parent
  tự chạy lại: test app **252/252**, test game **237/237**, tsc
  PASS, prettier --check trên toàn bộ file đã đụng PASS; ngân sách
  JS critical path route '/' **242.223 / 243.000 B** (dư 777 B).

## [2.0.0] — 2026-10-25 — Game mode «Ai Đãi»: G1 đấu trường + G2 mâm cơm xoay

Phát hành tại commit `d7a5607` (tag `v2.0.0`). Hồ sơ:
docs/reviews/v2.0.0-review-record.md.

### Added

- **Game mode tuỳ chọn tại lúc quyết toán** (MỞ PHIẾU vẫn là mặc
  định):
  - **G1 «Đấu trường tự động»** — engine kết quả xác định (TypeScript
    thuần, nhật ký sự kiện có hash để phát lại), trình bày bằng
    Phaser, bộ sprite CC0 dựng sẵn.
  - **G2 «Mâm cơm xoay»** — mâm xoay với kim đũa chỉ người đãi.
  - **3 bộ nhân vật CC0** (KayKit Adventurers, KayKit Skeletons,
    Kenney Blocky Characters 2.0), mỗi người chơi chọn một nhân vật,
    nạp lười theo bộ.
  - **Avatar ảnh chụp bằng camera**, chỉ lưu trên máy (localStorage)
    — không bao giờ vào engine/seed/link chia sẻ (DATA-04 giữ
    nguyên).
  - **Chặn kép chống lạm dụng:** tổng hoá đơn ≤ 2.000.000 ₫ và phần
    gánh thêm ≤ 500.000 ₫ / người / ván.
- **Google Search Console verification meta** (`verification.google`
  trong `app/layout.tsx`).

### Invariants

- Engine chia tiền không đổi: `git diff -- lib` = 0 byte. Cổng trên
  cây phát hành: vitest app **252/252**, vitest game **237/237**,
  `tsc --noEmit` PASS, eslint PASS, `next build` PASS. Ngân sách:
  A 419.369 / 500.000; B theo bộ ≤ 400.000 (adventurers 324.076 /
  skeletons 350.424 / blocky 388.583); D 1.244.385 / 1.500.000.

### Notes

- Bản này phát hành theo lệnh trực tiếp của user; cổng panel hình
  ảnh §6/rule 12 được user miễn cho riêng bản này (pack v4 không đạt
  đã được FIX-V4 xử lý cả 5 cụm finding và pack v5 đã chụp, nhưng
  panel v5 chưa chạy tại thời điểm phát hành) — vòng chấm hình ảnh
  tiếp tục trên bản live.
- Chưa có số đo FPS trên máy thật và bài kiểm 15 người chơi thật
  (G-GAME) tại thời điểm phát hành — cả hai ghi UNKNOWN trong hồ sơ
  phát hành, không suy đoán.

## [1.9.1] — 2026-10-25 — Sửa nóng TC6: sheet modal không còn bị dải thành viên vẽ đè

### Fixed

- **Sheet bị dải thành viên che đầu (TC6 — phát hiện bởi đợt
  chụp pack live v1.9.0, Checker A):** trên desktop, chip thành
  viên cuối + nút «+ Thêm» vẽ ĐÈ lên đầu sheet VietQR và scrim
  không làm mờ được dải thành viên — tiêu đề sheet không đọc
  trọn. Gốc rễ: sheet VietQR render bên trong SettlementPanel,
  mà panel nằm trong các stacking context đứng dưới dải thành
  viên z-30 (aside `sticky` ở desktop; section z-20 của
  Settlement Strip ở mobile) nên z-50 của lớp phủ bị giam dưới
  z-30. Mọi sheet khác (render ở gốc SessionView) không dính.
  Sửa: **Sheet render qua portal ra `document.body`** (mọi
  sheet, gồm ConfirmDialog, đều thoát context của cây gọi);
  biến `--strip-h` được xuất bản đồng thời lên `documentElement`
  để sheet qua portal vẫn neo đúng đáy theo Finding E và được
  gỡ khi rời Màn B. Hành vi còn lại (focus trap, exit 125ms,
  trả focus) giữ nguyên — suite 252/252.

### Invariants

- `git diff -- lib` = 0 byte. Cổng parent: suite 252/252,
  typecheck/lint/format/tokens:verify PASS, build PASS.

## [1.9.0] — 2026-10-25 — Thiết kế lại «Giấy thật»: phiếu gấp thành vật giấy thật trên tờ sheet có biên

Đợt thiết kế lại toàn diện theo lệnh user 2026-10-24 (hồ sơ:
~/workspace/mini-apps/chiatien-redesign/, 11 vòng chụp–chấm–sửa;
panel vòng cuối R11 **PASS 5/5 + §6 5/5 designer-grade, 0 phiếu
AI-made** — biên bản docs/reviews/v1.9.0-review-record.md).

### Changed

- **Panel quyết toán thành SHEET có biên thật:** nền bàn xám trung
  tính phía trên, sheet trắng bo góc trên + bóng đổ lên + vành cố
  định không cuộn; nội dung cuộn bên trong sheet. Toà nhà đọc
  thành AppBar / bàn xám / sheet trắng / dock ở cả 390 và 1440.
- **Điểm nghỉ cuộn được bảo chứng:** scroll-snap trên các khối/hàng
  + neo snap cuối panel — tại mọi điểm nghỉ VÀ ở đáy tuyệt đối của
  cả 3 luồng (bảng đầy đủ, hoàn tất, nhóm 12) hàng đầu luôn nguyên
  vẹn: 0 ký tự cắt giữa thân, 0 ghost xuyên lớp (hai dải fade bán
  trong của các vòng trước đã xoá hẳn).
- **Dấu mở = một ấn bản dựng nguyên rồi mới xẻ:** hai bản sao của
  cùng một ấn bản, mỗi bản clip theo đa giác giấy phía nó; khe xé
  hằng số 4px trên mọi phiếu, tick nối thẳng qua khe. Dấu đóng thu
  về một họ hình học duy nhất (xoay ±5°, tỉ lệ 0.96–1.04) — biến
  thiên còn lại chỉ ở mực xốp, như dấu đóng tay thật.
- **Nắp phiếu mở thành mặt sau của tờ giấy:** trường hạt mịn đếm
  được thay thớ vẽ tay; ghost in xuyên phân tầng theo mật độ mực
  thật (tên đậm nhất → avatar chỉ còn vòng + initials, hết đĩa
  đặc); tông ấm thu về ~11% sát nếp gấp (R11), phần còn lại cùng
  họ giấy trắng với thân phiếu.
- **Nhóm đông có tín hiệu đếm người:** chip «+N» (vd «+10») thay
  chip thứ ba cắt dở — đọc ngay là «còn N người», cuộn cuối hiện
  trọn mọi thành viên + nút Thêm.
- **Lớp 1 desktop ôm khít nội dung:** khay co theo số phiếu, hết
  vùng xám đóng khung trống; footer nằm trong khung hình.

### Fixed

- **Cả 4 MINOR của Panel #07** (đầu vào bắt buộc của đợt):
  MINOR-1 thẻ hoàn tất làm mới dấu sau khi sửa phiên (phiếu mở tự
  tái dàn theo `session.updatedAt`, hết mảnh phiếu kẹt); MINOR-2
  import cùng một link không còn tạo phiên trùng; MINOR-3 toàn bộ
  thẻ phiếu là vùng chạm mở phiếu; MINOR-4 nội dung phiếu mở phía
  người nhận về đúng dạng inline §4 («An nhận từ: Chi 240.000 ·
  Dũng 180.000 · Bình 40.000»).
- Tem «ĐÃ CHỐT» trên thẻ hoàn tất nằm trọn trong thẻ ở mọi bề
  rộng (104→96px).

### Design tokens

- 13 hex mới của đợt (họ bàn/sheet + họ giấy phiếu) đăng ký vào
  `design/tokens.chiatien-v4.json` nhóm `redesign-wave-additions`
  (class W, có provenance) — `tokens:verify` PASS (62 giá trị);
  seed V4 #FF5722 và thang V4 giữ nguyên byte-identical.

### Invariants

- `git diff -- lib` = **0 byte** (Test Tắt Game giữ nguyên);
  payload/schema link chia sẻ không đổi; luật nhãn lớp 1
  «bản N của link này» giữ nguyên. Suite **252/252**; test duy
  nhất được sửa trong cả đợt là test khoá định dạng cũ mà Panel
  #07 MINOR-4 ra lệnh bỏ (R8, parent phê duyệt). Parent chạy lại
  cổng trên cây phát hành: suite 252/252, typecheck PASS,
  format:check PASS trên file phát hành, tokens:verify PASS.

## [1.8.1] — 2026-10-24 — Sửa nóng S-1 của Panel #07: dấu bản lớp 1 hết nói sai giờ chốt

### Fixed

- **Dấu bản phía người nhận (Panel #07 S-1, SERIOUS — chặn rule
  12):** lớp 1 của link từng mượn nhãn «chốt lúc HH:MM» của người
  gửi nhưng hiện giờ *import* trên máy nhận — khẳng định sai tái
  tạo mỗi lần mở link (bản cũ mở muộn còn hiện giờ «chốt» mới hơn
  bản mới). Lớp 1 nay chỉ ghi **«bản N của link này»** — không giờ,
  không «chốt lúc» (`linkSealLabel` trong `components/`; payload
  và `lib/` không đổi). Phía người gửi giữ nguyên «chốt lúc
  HH:MM · bản N» (giờ chốt thật của chính họ).
- **Khai phạm vi công tắc phiếu (Panel #07 F2, spec-debt đã phân
  xử):** dưới công tắc «Đóng phiếu khi chốt» trong Action Sheet
  thêm đúng một dòng: «Link chia sẻ luôn hiện phiếu cho người
  nhận.» — công tắc chỉ điều khiển thẻ chốt trên máy người gửi;
  link luôn mang dạng phiếu theo §9(a). Phiên tĩnh cưỡng bức giữ
  nguyên dòng «Phiên này giữ dạng tĩnh.».

### Invariants

- `git diff -- lib` vẫn = 0 byte. Suite **252/252** (gồm khẳng
  định mới: lớp 1 chứa «bản N của link này» và KHÔNG chứa «chốt
  lúc»). MINOR-1..4 của Panel #07 chuyển cho đợt thiết kế lại
  đang chạy (đầu vào bắt buộc trong hồ sơ đợt).

## [1.8.0] — 2026-10-24 — «MỞ PHIẾU»: lớp nghi thức phiếu gấp cho khoảnh khắc chốt chia

Thiết kế: ~/workspace/mini-apps/chiatien-game/ (WINNER-SPEC v2.1 +
PARENT-ADJUDICATION + RED-TEAM-ATTACK + DELTA-REVIEW).

### Added

- Khi chốt chia, kết quả được đóng thành PHIẾU GẤP theo từng người
  (giấy sổ trắng + kẻ mực; seed #FF5722 chỉ ở kẻ đôi đầu phiếu, vòng
  dấu chốt, cạnh chọn; accent-solid thẻ 3,62% @390 / 3,76% @1440,
  trần F-1 10,3%). Mở phiếu 240ms, nội dung (số tiền + VietQR) có
  sẵn từ frame đầu — animation không làm cổng nội dung. Avatar
  DiceBear tĩnh tuyệt đối; chỉ phiếu được chuyển động.
- Link người nhận lớp 1: tóm tắt trung tính + phiếu đóng của mọi
  thành viên + «Bảng đầy đủ» đúng 1 chạm. Dấu «chốt lúc HH:MM ·
  bản N» nhất quán trên thẻ, lớp 1 và text chia sẻ; sửa phiên rồi
  gửi lại mang bản N+1.
- Nhóm đông: trên 8 phiếu, lưới chuyển tĩnh (ngưỡng parent duyệt).

### Changed

- **Text chia sẻ mặc định chỉ còn tóm tắt** (tên phiên, tổng, số
  lần chuyển, link, dấu bản/giờ) ở cả chế độ thường và tĩnh — chuỗi
  «A → B: số» không còn đi vào tin nhắn nhóm. Chi tiết đầy đủ thành
  hành động riêng «Sao chép chi tiết đầy đủ» trong Action Sheet.
- Nhãn nút copy mặc định đổi «Copy bản quyết toán» → **«Copy tóm
  tắt»** (phân xử copy của parent: nhãn phải khớp đầu ra thật).
- Gợi ý trên mặt phiếu: «Chạm để xem phần của bạn».

### Invariants

- **Test Tắt Game ĐẠT: `git diff -- lib` = 0 byte** — engine chia
  + payload share schema v2 nguyên vẹn; lớp phiếu là trình diễn
  thuần, dấu bản đếm local theo phiên, không vào payload. Suite
  252/252 (236 cũ nguyên vẹn + 16 test mới), bundle +2.965 B
  trong ngân sách, 0 dependency mới.

## [1.7.2] — 2026-10-24 — Sửa nhánh ĐK2 của M-HDR-1: nhãn nút back không còn quấn

### Fixed

- **Nút back quấn 2 dòng ở @320** (vòng đo lại Panel #06 trên live
  v1.7.1 bắt được; 2 ghế đo mù nhau cùng số tới 0,01px): đợt v1.7.1
  chỉ kiểm «hiện đủ chữ, không cắt» mà bỏ sót nhánh «nhãn nút 1
  dòng» của điều kiện đóng ĐK2. Sửa đúng 1 dòng class của nút:
  giảm chiều rộng tự nhiên trước (`text-sm` + `px-1.5` ở <431px,
  tự nhiên «Tất cả» 75,95px < 81,47px chỗ trống) rồi mới khoá
  `whitespace-nowrap` + `shrink-0`; ≥431px khôi phục đúng 16px/px-2
  của v1.7.1; breakpoint nhãn đủ 391 giữ nguyên.
- **Nhãn đủ cũng quấn ở dải 391–~406** (phát hiện thêm khi đo):
  cùng cơ chế sửa trên đóng luôn — «Tất cả cuộc chia» ở 14px tự
  nhiên 147,44px < 152,47px chỗ trống ở 391.
- Đo trên build thật ở 320/390/391/400/431→1440 (3 nguồn độc lập):
  nút 1 dòng ở mọi viewport, header scrollW == clientW ở mọi
  viewport, wordmark và banner không thoái hóa. Đóng ĐK2 hoàn toàn
  chỉ khi vòng đo lại trên live cho cùng kết quả.

## [1.7.1] — 2026-10-24 — V4-FIX: chữ hiển thị về Be Vietnam Pro + hero hình người + M-HDR-1/R2-06-F1

### Fixed

- **Chữ hiển thị theo verdict chủ nhân trên live v1.7.0**: Archivo
  Expanded làm dấu tiếng Việt trông như lỗi/máy móc → toàn bộ vai
  hiển thị (wordmark, h1, h2) về **Be Vietnam Pro 700/800**, giữ thang
  cỡ 16→20→25→32→40 và Inter vai số (<25%). 8 chuỗi khó đo trên render
  thật đều đạt (chuỗi dấu chồng vừa 1 dòng ở 32px trong khi Archivo
  cần 2 dòng); gói font BVP nhẹ hơn Archivo nên bundle giảm.
- **Hero vẽ lại thành hình người**: 4 SVG mới (home 4 người quanh bàn
  tròn ăn chung + biên lai · rút gọn 2 người · đã hoà hết 2 người cụng
  tay + biên lai gạch xong · lỗi link 1 người nhún vai + biên lai
  rách) — kiểm mù 3 người độc lập: 3/3 nói «người», 0/12 câu nói từ
  mạch/sơ đồ (theo cách đọc HOẶC đã ghi thành văn bản; nguyên văn
  «ăn chung»/«chia tiền» = 0/12, tín hiệu tiền ở mức tờ hóa đơn).
- **M-HDR-1 (MAJOR, Panel #06)**: wordmark 1 dòng box 32px top đối
  xứng trong header 48px ở 320/390; nút back rút nhãn «‹ Tất cả» ở
  ≤390px; **bỏ `-mr-2` có sẵn từ trước của nút back** — đo trên build
  thật sau sửa: header active scrollW == clientW ở cả 320 (288/288)
  và 390 (358/358), nút hiện đầy đủ, không chữ nào bị cắt. Đóng hoàn
  toàn chỉ khi đo lại live cho cùng kết quả.
- **R2-06-F1 (MAJOR, Panel #06)**: banner import + banner
  externalChange (cùng cặp class, cùng lỗi 3,90:1) đều chuyển nền
  `bg-brand-soft → bg-brand-50` (`#FBE9E7`), giữ chữ `#BF360C`:
  đo pixel trên build thật 4,71–4,78:1 ở @390 và @1440. Đóng hoàn toàn
  chỉ khi đo lại live ≥4,5:1 ở cả 2 viewport cho cả 2 banner.

### Removed

- Gói `@fontsource-variable/archivo` (không còn tham chiếu Archivo
  trong code sau khi gỡ import ở layout).

## [1.7.0] — 2026-10-24 — REDESIGN-V4: Neutral-First, seed Material nguyên văn

### Changed

- **Canvas Neutral-First** theo luật của chủ dự án: trắng / đen / xám
  trung tính chiếm ưu thế tuyệt đối (đo trên render thật: home 96,2% ·
  workspace desktop 96,1% trung tính); giấy nhuộm màu bị cấm làm nền
  chính, màu thương hiệu chỉ còn là accent có ngân sách theo bề mặt
  (trần accent F-1 đạt ở mọi bề mặt theo vùng panel).
- **Seed thương hiệu = Material Deep Orange 500 `#FF5722` nguyên văn**
  (byte-identical với giá trị Google Material công bố — V3 dùng
  derivation trôi xa khỏi gốc nên vẫn bị chê "màu lạ"); chữ/link/focus
  dùng bậc 900 `#BF360C`, bậc 800 bị cấm cho text.
- Thang chữ khoá 16→20→25→32→40: Archivo Expanded cho tiêu đề, Be
  Vietnam Pro cho nội dung, **Inter chỉ còn vai số** (sau đợt tách
  span: <25% ký tự render trên mọi bề mặt, đo độc lập hai fixture).
- Avatar DiceBear `initials`: bảng nền chuyển sang 16 ô bậc-100 của
  thang Material (mực `#212121`, tương phản đo 9,75–15,03 — 16/16 đạt
  ≥4,5); seed vẫn là khoá tên M-2 (bất biến 120/120 hoán vị).

### Added

- Lớp hình vẽ tay: hero đầy đủ `hero-split` ở home chưa có phiên +
  3 biến thể (rút gọn cho phiên chưa có khoản · «Kẻ Đôi Ngang Yên»
  khi đã hoà hết · «Kênh Cắt Đứt» ở bề mặt lỗi link) — mount đúng
  whitelist, ngoài whitelist art = 0.
- **CompletionMark** (canvas-2D) cho khoảnh khắc chốt chia đầu tiên
  của một phiên, kèm nhãn «Đã chốt chia»; three.js bị veto bằng số
  (ngân sách bundle không đủ) nên không dùng. Tôn trọng
  `prefers-reduced-motion` (bản tĩnh), không chặn VietQR.
- `tokens:verify` (script + bản sao token khoá byte-identical tại
  `design/tokens.chiatien-v4.json`): mọi hex trong sink phải thuộc
  tokens.json, hex V3 bị cấm = 0 sau khi strip comment XML (LK4-51).

### Removed

- `empty-state.webp` — không còn bề mặt nào dùng sau khi hero V4
  thay thế (kể cả nhánh ledger 0 thành viên); đồng thời gỡ khỏi
  precache của service worker (SW bump lên v5 trong cùng đợt).

## [1.6.1] — 2026-10-24 — Khôi phục DiceBear + đóng 4 MINOR của Panel #05

### Changed

- **Avatar mặc định render lại bằng thư viện DiceBear** (@dicebear/core +
  @dicebear/collection 9.4.3, style `initials`, render client-side) theo
  luật thường trực của chủ dự án — đợt V3 tự ý thay bằng SVG nội bộ là
  quyết định bị huỷ bỏ. Seed vẫn là khoá tên theo quyết định M-2 nên mỗi
  người giữ nguyên đúng một màu qua mọi phiên và mọi thứ tự thành viên
  (bất biến đã kiểm chứng 120/120 hoán vị); màu nền avatar là đúng ô
  palette M-2 đã gán cho người đó.

### Fixed

- Trường số tài khoản ngân hàng: khi có lỗi, input mang
  `aria-invalid="true"` + `aria-describedby` trỏ tới thông điệp lỗi
  (Panel #05 F-R5-2).
- Mọi icon SVG trang trí trong các nút có nhãn đều có `aria-hidden`
  (mặc định tại gốc bộ icon; quét DOM sau sửa = 0 vi phạm) — Panel #05
  R2-F2.
- Đoạn giải thích khối thiếu-QR dùng `text-wrap: pretty`, hết từ mồ
  côi ở cuối đoạn (Panel #05 R2-F1).
- favicon.ico bake lại từ đúng path nguồn của micro (một nguồn duy
  nhất); render-check ở 16px đạt ngưỡng GATE-C3 (ink-bbox 12×12,
  tách 2 run trên cả hai trục) — Panel #05 F-R1-1.

## [1.6.0] — 2026-10-24 — REDESIGN-V3: nhận diện Deep Orange

### Changed

- Toàn bộ hệ màu chuyển sang khoá V3: seed Deep Orange **#A5482F**
  (Material Deep Orange) thay amber cũ; thang token chép nguyên từ
  hồ sơ thiết kế V3 (mỗi token có nguồn gốc enterprise + derivation),
  giấy #FAF3F1, theme manifest #A5482F. Hex cũ trong sink = 0.
- Mark V3 + glyph «khía đôi»; **micro mới** sản xuất từ cùng path
  (render 16px đạt ngưỡng nhận diện); **lockup đã outline** thành
  path thật từ font Be Vietnam Pro 700 (hết dùng `<text>`).
- Avatar: bỏ DiceBear + nền đặc — SVG initials trên đĩa giấy đóng
  băng, 3 tầng kích thước theo số thành viên. **M-2 đã quyết:**
  màu avatar nay theo TÊN (seed chỉ-tên + tie-break xác định) —
  cùng một người có cùng màu ở mọi phiên/mọi thứ tự thành viên.
- Bố cục «Sổ kép» hai cột từ 900px, cột quyết toán có border;
  motion theo tập khoá V3 (settle-lock 240ms); sàn tên ở Settlement
  Strip 65 → 88px ở khổ 320. Service worker bump `v4-2026-10-24`.

### Removed

- `@dicebear/collection`, `@dicebear/core`, `lucide-react` — 0
  import sau V3 (icons nay là bộ path «Nét Chia» vẽ tay trong repo).
  Gỡ DiceBear cũng xoá hẳn advisory GHSA-gcr2-9v8m-gq45 khỏi cây
  dependency.

### Notes

- Cổng F-1 (histogram brand-solid < 2%): đo thật trên render —
  thu gọn ~3,3%, mở rộng ~7,8–9,6%, desktop ~2,0–2,1%; toàn bộ
  phần vượt là nút hành động solid (mẫu bị khoá bởi hồ sơ V3).
  Parent ghi ngoại lệ có lý do vào biên bản phát hành; Panel #05
  phán trên live.
- Lib lõi (settle/share/sanitize/vietqr/money) byte-diff = 0;
  ngân sách chữ 8/8 bề mặt lệch 0; DATA-04(ii) nguyên văn;
  DATA-08 giữ 0 request ngoài. Suite 217/217; bundle 225.796 B
  gzip / trần 243.000 B.

## [1.5.1] — 2026-10-24 — hotfix audit CI

### Security

- @dicebear/collection 9.4.2 → 9.4.3 (kéo theo @dicebear/initials
  9.4.3): vá GHSA-gcr2-9v8m-gq45 (moderate — SVG injection qua tuỳ
  chọn rotate/fontSize chưa escape trong DiceBear). Step audit CI
  của v1.5.0 đã chặn đúng advisory này — cổng SEC-10 hoạt động.

## [1.5.0] — 2026-10-24 — Docs+media wave (Panel #04 + re-grade r4) + hotfix SEC-10

### Added

- Ngân sách chữ dạng CÔNG THỨC theo hàng/khối suy từ render fixture
  S1/S2 (DESIGN.md hiệu đính lần 2): Thu gọn = 22 + 3M − Q + 7E ·
  Mở rộng = Thu gọn + 31 + V + 5M + 27K — dự báo khớp đo 8/8 bề mặt.
  Tuyên bố đóng Finding I nay có điều kiện và đã thỏa kèm bằng chứng.

### Changed

- Tách session-view.tsx 1.056 → 435 dòng + 7 module (ARC-11), hành
  vi không đổi; ARCHITECTURE.md ghi giải trình ranh giới module.
- Bộ ảnh chụp lại toàn bộ trên v1.4.0 (DOC-03); hero README viết lại
  theo thực tế Action Deck/Ledger/Strip (DOC-04).
- Câu khối chưa-QR rút từ ~19 từ xuống 8 từ tĩnh (ý + hành vi F
  nguyên vẹn; chuỗi bảo vệ DATA-04(ii) không đổi từng ký tự).

### Fixed

- Avatar SVG gắn aria-hidden; 2 dialog xác nhận xoá dùng
  role="alertdialog" + aria-describedby tới đoạn hệ quả (Panel #04).

### Security

- next 16.3.6 → 16.4.2: vá 2 CRITICAL RCE (GHSA-2464-fhr4-w9xw,
  GHSA-673q-mjm6-r5xr) + HIGH SSRF/DoS; step audit CI gỡ
  continue-on-error, chặn thật (SEC-10/CQ-04).

## [1.4.0] — 2026-10-23 — Fix wave theo UI Panel #03 (điều kiện chấm lại §9)

### Fixed
- Settlement Strip thu gọn viết lại 2 hàng: hàng tổng + «Quyết toán»
  tách khỏi hàng lệnh đầu — tên người trả/người nhận có slot flex đọc
  được, không còn bị ép 0–2px hay chồng glyph khi phiên có ≥2 lệnh
  chuyển (Panel #03 Finding A — SERIOUS).
- Hàng lệnh chuyển: nhóm người nhận wrap nguyên vẹn xuống hàng riêng
  khi chật thay vì bị cắt trước người gửi; rail desktop không còn xén
  avatar/tên người nhận (Finding C). Subtitle người trả ở ledger wrap
  toàn văn tại chỗ thay vì elide không đường xem đầy đủ (Finding D).
- Sheet khoản chi: chốt cột `minmax(0,1fr)` ở editor + chip tên dài
  `min-w-0` co/truncate — dialog không còn tràn trong với chip 45 ký
  tự (Finding B); MemberEditor nhận cùng chốt cột.
- Modal sheet không còn che Settlement Strip: lớp phủ dừng ở đỉnh
  phần neo của Strip (biến `--strip-h` do session-view xuất bản theo
  khoảng cách từ đỉnh dock tới đáy viewport, Sheet tiêu thụ ở đáy;
  publish được làm cứng nhiều lớp — ResizeObserver trên section +
  gốc, MutationObserver trên cây con, nhịp trễ sau mount — sau khi
  QA stress-frame bắt được một ca chập chờn do layout dịch vị trí
  thuần) — tổng quyết toán vẫn nhìn thấy khi sheet mở (Finding E,
  điều kiện §9.7).
- «Nhắn xin QR của {Tên}» copy đúng lời nhắn xin QR (chào tên người
  nhận, nêu số lệnh + tổng tiền đang chờ, link quyết toán là bước
  khép vòng); copy thất bại hiện textarea copy thủ công + cảnh báo,
  không còn xác nhận «đã copy» giả (Finding F).
- Esc/khôi phục focus (Finding G): Sheet trả focus về phần tử mở
  theo 3 nhịp (đồng bộ + rAF + 150ms), chuỗi khoá tìm node thay thế
  thêm accessible-name dạng text cho nút chữ thường, và không giật
  focus khi một dialog khác đang mở (sheet chuỗi).
- Form thành viên: nút Lưu ở trạng thái disabled kèm dòng lý do ngay
  từ lúc mở khi chưa nhập tên («Nhập tên thành viên để lưu») — cùng
  mẫu các form khác (Panel #03 MINOR R3-F4). Hệ quả: test flows cho
  MemberEditor được cập nhật sang hợp đồng mới này.
- Nút «Tạo cuộc chia» khi tên trống: disabled kèm dòng lý do hiện
  sẵn «Đặt tên cho cuộc chia để tạo» thay vì im lặng (Finding H,
  điều kiện §9.8).
- Share Sheet: cảnh báo 2 lớp trước khi tạo link — Lớp 1 headline +
  «Tôi hiểu, tạo link» / «Quay lại» trong viewport đầu; Lớp 2 đúng 3
  gạch đầu dòng hệ quả; link chỉ sinh sau khi xác nhận (DATA-04(ii)).
- Workspace chỉ còn một H1 (tiêu đề cuộc chia): logo ÷ không lặp ở
  AppBar workspace, header app-shell hạ «Chia Tiền» xuống thẻ <p>
  khi phiên đang mở (Finding K); hai control dưới 44px (nút tiêu đề
  phiên, nút tóm tắt Strip) nâng lên tối thiểu 44px; bốn chỗ cỡ chữ
  11px ngoài thang (badge cảnh báo + gợi ý phím desktop) về bậc sàn
  12px của thang đã hiệu đính.
- Empty state của workspace căn giữa, minh hoạ lớn hơn, cùng mức
  hoàn thiện với trang chủ (Finding J).
- SVG avatar lọc bỏ khối `<metadata>`/attribution của thư viện
  trước khi chèn — accessible name của nút avatar hết nhiễm chuỗi
  lạ (Panel #03 MINOR).
- `format:check` đỏ ở `session-view.tsx` đã xử lý (prettier).

### Added
- Test cấu trúc Panel #03 (`panel03.spec.tsx`): Strip 2 ca (tên dài/
  tên ngắn × ≥2 lệnh), cổng Share Sheet 2 lớp + payload 0 field ngân
  hàng trên phiên có bank, nội dung clipboard của «Nhắn xin QR» cả
  đường thành công lẫn thất bại, chip sheet khoản chi.
- Harness đo hình học thật `scripts/geometry-stress.mjs` (CDP, bản
  build local): ca stress hợp nhất ở 320/360/375/390/412 + 1150/1440
  + ma trận Esc-focus.
- Giao thức + mẫu biên bản test hiểu cảnh báo chia sẻ với người ngoài
  cuộc: `docs/share-warning-comprehension-test.md` (DATA-04(ii) —
  phần chạy với người thật thuộc parent).

### Changed
- DESIGN.md: hiệu đính thang chữ theo census đo thật trên render
  (thang công bố 12→15→19→24→30 không tồn tại trên render — bậc kề
  đo được 1,06–1,19; phân cấp gánh bằng trọng lượng/màu), cùng cách
  đã xử lý Finding I; tiêu đề sheet về đúng bậc 19px. Cùng đợt:
  hiệu đính ngân sách từ thường trực theo số đo render thật
  (Finding I — tuyên bố «≤30 từ» ở hồ sơ redesign-v2 bị thay bằng
  ngân sách theo bề mặt có phương pháp đếm) và ghi hiệu đính thi
  hành The Strip Rule qua cơ chế neo DOCK (Finding E).
- CQ-02: mọi `eslint-disable` trong components/ + lib nay mang lý
  do ngay trên dòng theo dạng `-- <lý do>` (lint 0 errors).

## [1.3.0] — 2026-10-23 (commit 069972e) — REDESIGN-V2 «Settlement in Sight»

### Added
- Bố cục một màn hình mới: Action Deck + Live Ledger + Settlement Strip
  ghim đáy trên mobile (thu gọn/mở rộng tại chỗ) và cột quyết toán
  thường trực trên desktop — cùng một component SettlementPanel.
- Danh tính avatar ổn định xuyên máy: màu suy từ tên đã chuẩn hoá +
  thứ tự thành viên (FNV-1a-32, palette 12 màu không màu ngữ nghĩa),
  không phụ thuộc member id.
- Thêm thành viên hàng loạt (phân tách dấu phẩy + xem trước + cờ
  trùng) và «Lưu & thêm nữa» cho khoản chi.
- Trạng thái chẩn đoán link hỏng (`#chia=` không giải mã được) trên
  trang chủ; khối chưa-có-QR gom theo người nhận kèm hành động nhắn
  xin QR; StatusLine thường trực (trạng thái lưu + offline) ở tầng
  app-shell.
- Định dạng tiền rút gọn cho số ≥13 chữ số theo quy tắc half-up +
  nâng đơn vị («1 triệu tỷ ₫»), số đầy đủ luôn tới được trong 1 chạm.

### Changed
- Tiền hiển thị bằng Inter 600/700 + `tnum` thật (Be Vietnam Pro
  không có bảng GSUB `tnum`); thang chữ theo tỉ lệ ≥1.25:1.
- Mẫu Validation Thống Nhất cho cả 3 editor; nút vô hiệu luôn kèm
  dòng lý do.
- `app.tsx` rút còn 356 dòng thuần trình bày; nhận diện thương hiệu
  theo pack v2 (logo, OG, minh hoạ empty-state).

### Removed
- Wizard/stepper 3 bước và Settlement Rail của v1.

## [1.2.0] — 2026-10-23 — Fix wave 2 (theo hồ sơ chấm lại checklist vòng 2)

### Added
- CI GitHub Actions: install frozen → typecheck/lint/format/test/coverage/
  build + secret-scan (gitleaks) + `pnpm audit` + kiểm ngân sách JS.
- `docs/THIRD-PARTIES.md`: kê khai bên thứ ba (Vercel hosting/CDN) + khẳng
  định không còn luồng dữ liệu nào tới bên thứ ba từ app.
- `docs/ARCHITECTURE.md` + ADR-001 (localStorage-only) + ADR-002 (share
  format v2).
- Hồ sơ ngoại lệ CSP P-02 đường C (`docs/security/`) + test đối chiếu
  header tự động (`lib/csp.spec.ts`).
- `schemaVersion` trong blob localStorage + test migration từ blob
  không-version (ARC-10 khoản 1).
- RUM tối thiểu tự host: web-vitals ghi console tại máy người dùng
  (PERF-12) + `perf-budget.json` + job kiểm ngân sách JS (PERF-08).
- Component test cho masking ngân hàng (DATA-03/CQ-05) và các flow lõi;
  coverage có ngưỡng theo glob (CQ-06).
- ShareSheet: preview số liệu cuộc chia sắp gửi + dòng "link không thu
  hồi được sau khi đã gửi"; banner import thêm nhãn "dữ liệu do người
  gửi cung cấp, chưa xác thực"; sheet VietQR thêm câu nhắc kiểm tra khớp
  tên chủ tài khoản trước khi quét (UI-11/DATA-04/SEC-12.6).
- `NOTICE`: notice loại trừ brand-assets tách khỏi LICENSE.

### Changed
- `.gitignore`: chặn mọi `.env*` trừ `.env.example` (ARC-02).
- `app.tsx` tách wiring storage sang hook `use-sessions.ts` — component
  gốc thuần trình bày (ARC-11 khoản 2).
- Mọi `eslint-disable` còn lại đều có comment lý do (CQ-02); README viết
  lại theo sự thật v2 (DOC-04).
- Ghim Node 24 (`engines` + `.nvmrc`); README dùng
  `pnpm install --frozen-lockfile` (ARC-03/OPS-02/DOC-02).
- Form thành viên: thêm câu hướng dẫn trách nhiệm tại điểm nhập tài
  khoản (DATA-09b).

## [1.1.0] — 2026-10-23 (commit 044b960)

### Added
- Redesign: wizard 3 bước (Thành viên → Khoản chi → Thanh toán) +
  Settlement Rail; hệ thiết kế riêng (Be Vietnam Pro + Inter, một màu
  Amber), DiceBear initials avatars sinh tại client.
- Share schema v2: link không chứa dữ liệu ngân hàng ở tầng kiến trúc;
  sổ ngân hàng per-device; VietQR dựng payload EMVCo + render 100% tại
  máy (không còn img.vietqr.io).
- CSP enforce + service worker/app-shell (mở lại offline) + chỉ báo
  offline tiếng Việt.

### Removed
- Banner cảnh báo ngân hàng + confirm khi chia sẻ của v1 (không còn cần
  vì link không chứa bank — xem ADR-002).
- Font Outfit (không có subset tiếng Việt).

## [1.0.1] — 2026-10-23 (commit 43b3f22)

### Fixed
- Toàn vẹn tiền: accumulator chống `__proto__`, trần số tiền/trọng số,
  chuẩn hoá trọng số + phân bổ dư bằng BigInt — quyết toán không còn
  lệch trong im lặng qua link sửa tay.
- Mất dữ liệu khi mở nhiều tab: đồng bộ xuyên tab + banner báo rõ.
- Draft khoản chi đang nhập được giữ qua reload.

## [1.0.0] — 2026-10-23 (commit 37c201e)

### Added
- Bản public đầu tiên: chia tiền nhóm 3 kiểu chia (đều / tuỳ chỉnh /
  theo phần), quyết toán tối thiểu số lần chuyển, VietQR cho từng lần
  chuyển, share link nén trong fragment URL, lưu localStorage.
- Bộ screenshot production + README giới thiệu.
