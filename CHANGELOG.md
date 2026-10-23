# Changelog — Chia Tiền

Mọi thay đổi đáng kể của dự án ghi tại đây, mới nhất ở trên. Định dạng
theo Keep a Changelog; phiên bản theo SemVer.

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
