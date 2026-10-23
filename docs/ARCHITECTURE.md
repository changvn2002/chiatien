# Kiến trúc — Chia Tiền (chiatien)

Tài liệu kiến trúc của repo (ARC-08). README trỏ tới đây từ mục
[Kiến trúc](../README.md#kiến-trúc); các quyết định lớn nằm ở
[docs/adr/](adr/).

## 1. Overview

Chia Tiền là một **Next.js 16 static prerender, hoàn toàn client-side**:
không API route, không database, không tài khoản. Toàn bộ logic nghiệp
vụ (chia tiền, quyết toán, VietQR, share link) chạy trong trình duyệt
của người dùng; máy chủ (Vercel) chỉ phát nội dung tĩnh. Hệ quả trực
tiếp: dữ liệu của người dùng không rời thiết bị trừ khi chính họ gửi
link chia sẻ — và link đó, theo thiết kế v2, không chứa dữ liệu ngân
hàng (xem ADR-002).

```text
Trình duyệt người dùng
├── app/            — vỏ Next.js: layout/metadata/JSON-LD, route '/' duy nhất
├── components/     — UI (wizard 3 bước + Settlement Rail)
│   └── chiatien/
│       ├── app.tsx           — thuần trình bày (ARC-11 khoản 2)
│       ├── use-sessions.ts   — wiring storage: nạp/lưu/đồng bộ xuyên tab
│       └── web-vitals.tsx    — RUM tự host (PERF-12), ghi console tại máy
└── lib/            — logic thuần, không React/Next (ARC-04)
    ├── split.ts / settle.ts  — chia tiền + đơn giản hoá nợ (số nguyên đồng, BigInt-exact)
    ├── sanitize.ts           — lớp làm sạch: ĐIỂM NGHẼN DUY NHẤT cho mọi dữ liệu ngoài
    ├── share.ts              — encode/decode share link (payload v2, fragment URL)
    ├── storage.ts            — adapter localStorage duy nhất (ARC-05) + sổ ngân hàng per-device
    └── vietqr.ts             — dựng payload VietQR EMVCo + danh sách ngân hàng (NAPAS BIN)
```

## 2. Module map

| Tầng | Trách nhiệm | Không được làm |
|---|---|---|
| `lib/` | Tính toán + làm sạch + (de)serialize. Hàm thuần, test bằng Vitest ở môi trường node. | Import react/next; chạm `window` ngoài adapter `storage.ts`. |
| `components/chiatien/` | Render + tương tác. Mọi thay đổi dữ liệu đi qua handler từ `use-sessions.ts`. | Tự đọc/ghi localStorage; tự parse share link. |
| `app/` | Metadata SEO, JSON-LD, manifest, robots/sitemap, mount app. | Chứa logic nghiệp vụ. |

Phụ thuộc một chiều: `app` → `components` → `lib`. Vòng phụ thuộc = 0
(madge, kiểm ở các đợt chấm checklist).

### Session view — ranh giới module (ARC-11)

`session-view.tsx` từng là một file 1.056 dòng ôm mọi trách nhiệm của
Màn B. Từ v1.4.x nó được tách thuần cấu trúc (không đổi hành vi, không
đổi giao diện) thành các module cùng thư mục `components/chiatien/`:

| File | Trách nhiệm |
|---|---|
| `session-view.tsx` | **Composition root**: giữ state của phiên, dữ liệu dẫn xuất (số dư, lệnh quyết toán, tổng, màu danh tính), handler nghiệp vụ (thành viên, khoản chi, copy/chia sẻ, tiêu đề), `panelProps` dùng chung cho hai biến thể SettlementPanel, khung lưới 2 cột (Command Bar desktop + cột quyết toán desktop) và lắp các module dưới. Bề mặt export không đổi: `SessionView` (app.tsx + test import từ đây). |
| `session-view-helpers.ts` | Helper thuần ngoài component: `touch` (đóng dấu `updatedAt`), `expenseFromDraft`, type `MemberEditState`. |
| `session-view-hooks.ts` | Ba hook hạ tầng: `useStripExpansion` (mở/thu gọn Settlement Strip + history push/popstate), `useStripHeightPublisher` (xuất bản `--strip-h` từ dock để Sheet không che Strip), `useSessionKeyboard` (Esc lùi lớp, N/M/C/⌘K). Thứ tự đăng ký effect giữ nguyên: expansion → strip-height → keyboard. |
| `session-app-bar.tsx` | AppBar của Màn B: tiêu đề phiên (H1 duy nhất của workspace, sửa tại chỗ) + nút mở bảng hành động. |
| `session-member-strip.tsx` | Rail thành viên ngang: chip avatar + chấm trạng thái ngân hàng + nút Thêm. |
| `session-ledger.tsx` | Cột sổ: thông báo thành viên, hai trạng thái rỗng, danh sách khoản chi kèm phần chia mở rộng tại hàng, hàng tổng chân cột. |
| `session-settlement-strip.tsx` | Dải quyết toán mobile: tóm tắt (tổng + lệnh đầu), panel mở rộng, DOCK neo đáy (StatusLine + nút tóm tắt + Action Deck). |
| `session-sheets.tsx` | Wiring mọi lớp phủ: Member/Expense Sheet, bảng hành động của hàng sổ và của cuộc chia, Share Sheet cảnh báo 2 lớp, ba ConfirmDialog xoá. |

Vì sao tách như vậy: mỗi khối trên là một trách nhiệm thật của file
gốc (khung view, rail, sổ, dải quyết toán, lớp phủ, hạ tầng effect) —
tách theo đúng các đường nối đó để diff hành vi bằng 0 và review từng
module độc lập được. Bất biến: không module con nào import ngược
`session-view.tsx` (phụ thuộc vẫn một chiều, state + handler chỉ sống
ở composition root và truyền xuống bằng props); `lib/` không đổi một
byte trong đợt tách này.

## 3. Data flow

1. **Nạp:** `use-sessions` gọi `loadSessions()` (localStorage → sanitize)
   và `readShareFromHashWithReport()` nếu URL có `#chia=` (payload →
   sanitize → clone với id mới → chèn đầu danh sách → xoá hash).
2. **Sửa:** UI gọi `commit()` — cập nhật state + `trySaveSessions()`
   ghi ngay; lỗi ghi (quota/private mode) hiện cảnh báo, không nuốt im lặng.
3. **Đồng bộ xuyên tab:** sự kiện `storage` trên cả khoá sessions lẫn
   khoá sổ ngân hàng; tab thấy dữ liệu khác lần ghi của chính mình thì
   nạp lại bản mới nhất + báo người dùng (không còn ghi đè im lặng).
4. **Chia sẻ:** `buildShareUrl()` nén payload v2 vào fragment (`#chia=`)
   — fragment không bao giờ được gửi lên server khi tải trang.
5. **Thanh toán:** VietQR dựng payload EMVCo + vẽ QR 100% tại máy từ sổ
   ngân hàng local (không request ra ngoài — xem `docs/THIRD-PARTIES.md`).

## 4. Data storage & versioning

- **Sessions:** khoá `chiatien:sessions:v1`, blob
  `{ schemaVersion: 1, sessions: [...] }` — `schemaVersion` theo ARC-10
  khoản 1; blob legacy không có trường này (schema 0) đọc như thường,
  ghi lại là tự mang version hiện tại. Thành viên trong blob **luôn ở
  dạng đã cắt bank**.
- **Sổ ngân hàng:** khoá riêng `chiatien:bank-book:v1`, ánh xạ
  sessionId → memberId → BankInfo. Chỉ sống trên máy này (ADR-002).
- **Draft khoản chi:** khoá `chiatien:expense-draft:v1:<session>:<expense|new>`,
  xoá khi lưu/huỷ.
- **Share payload:** trường `v` trong payload (= 2). Decoder đọc cả v1
  (cắt bank khi import) lẫn v2; fixture link v1 dạng chuỗi cứng + test
  hồi quy nằm ở `lib/share.spec.ts`.

## 5. Security layers

- **Sanitize là điểm nghẽn duy nhất** (ARC-09): cả hai đường dữ liệu
  ngoài (share link, localStorage) đều qua `lib/sanitize.ts` — whitelist
  dựng object mới, trần tiền/trọng số, loại khoản tuỳ chỉnh lệch tổng
  thay vì tính tiếp.
- **CSP enforce** khai ở `next.config.ts`; `'unsafe-inline'` trong
  script-src đi đường ngoại lệ P-02 đã đăng ký —
  `docs/security/CSP-EXCEPTION-P02.md` + `docs/security/EXCEPTION-REGISTRY.md`,
  có test đối chiếu tự động (`lib/csp.spec.ts`).
- **Masking** (DATA-03): số tài khoản chỉ tồn tại trong sổ local và
  sheet thanh toán; component test `components/chiatien/masking.spec.tsx`
  khoá hành vi này.
- **Hai lớp trần số tiền:** tầng sanitize giữ trần TOÀN VẸN
  `MAX_AMOUNT_VND = 10^16` — dữ liệu đã tồn tại (link, localStorage cũ)
  vẫn được tính chính xác tuyệt đối tới mức đó. Tầng nhập liệu (form,
  `validateExpenseDraft`) áp trần UI thấp hơn nhiều —
  `MAX_UI_AMOUNT_VND = 999.999.999.999 ₫`: một khoản chi nhóm thật không
  tới gần mức này, nên mọi con số lớn hơn đều là nhập nhầm hoặc phá hoại
  và bị chặn ngay ở form kèm thông điệp, không đợi tới sanitize.
- **Bên thứ ba:** kê khai đầy đủ ở `docs/THIRD-PARTIES.md` — ngoài
  Vercel hosting/CDN, app không gửi dữ liệu đi đâu.

## 6. Extension points

- **Thêm ngân hàng:** thêm 1 dòng vào `BANKS` (`lib/vietqr.ts`) — dữ
  liệu thuần, không đổi code.
- **Thêm kiểu chia:** thêm biến thể vào union `SplitMode` + 1 nhánh ở
  `computeShares`/`sanitize` — lõi quyết toán không đổi.
- **Thêm trường cho member/session:** phải qua whitelist của
  `lib/sanitize.ts` (điểm nghẽn có chủ đích) + cân nhắc bump
  `schemaVersion`/payload `v` nếu trường đó đi vào share link.
- **Thêm route nội dung:** route mới phải khai metadata/JSON-LD theo
  mẫu `app/layout.tsx` và nằm trong ngân sách JS (`perf-budget.json`).

## 7. Decisions (ADR)

- [ADR-001](adr/ADR-001-localstorage-only.md) — Lưu trữ localStorage-only, không backend.
- [ADR-002](adr/ADR-002-share-format-v2.md) — Share format v2: ngân hàng không bao giờ nằm trong link.
