# Changelog — Chia Tiền

Mọi thay đổi đáng kể của dự án ghi tại đây, mới nhất ở trên. Định dạng
theo Keep a Changelog; phiên bản theo SemVer.

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
