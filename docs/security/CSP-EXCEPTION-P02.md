# Hồ sơ ngoại lệ P-02 — SEC-02 đường C: `script-src 'unsafe-inline'`

- **Mục checklist:** SEC-02 (Enterprise Checklist v1.0) — `'unsafe-inline'`
  trong `script-src` chỉ PASS qua 1 trong 3 đường: A (hash), B (nonce),
  C (ngoại lệ có thời hạn, đủ 5 điều kiện của P-02).
- **Đường đã chọn: C.** Đường A đã thử bằng bằng chứng build thật và
  KHÔNG khả thi với kiến trúc hiện tại (mục 2 dưới đây). Đường B (nonce)
  đòi middleware + dynamic rendering — checklist cấm ép route tĩnh thành
  dynamic vì nonce nếu không có ADR + bằng chứng TTFB, và toàn bộ app là
  static prerender có chủ đích (không server runtime).
- **Sổ đăng ký:** [EXCEPTION-REGISTRY.md](./EXCEPTION-REGISTRY.md),
  mục **EXC-CSP-01** (script-src) và **EXC-CSP-02** (style-src — verdict
  tách riêng theo đúng văn bản SEC-02).
- **Hết hạn:** 2027-01-21 (90 ngày kể từ 2026-10-23) hoặc release kế
  tiếp — mốc nào đến trước. Hết hạn không gia hạn kèm bằng chứng mới =
  quay về FAIL; `lib/csp.spec.ts` tự fail sau ngày này.

## Điều kiện 1 — Phạm vi nới lỏng cụ thể, hẹp nhất có thể

Chỉ một token `'unsafe-inline'` trong `script-src`, phục vụ đúng 2 inline
script do chính Next.js sinh khi static prerender trang chủ (bootstrap
`self.__next_f.push([0])` + flight data của route). Không có bất kỳ nguồn
script ngoài nào được phép: `script-src 'self' 'unsafe-inline'` — không
`*`, không `data:`, không `'unsafe-eval'`, không origin thứ ba. Mọi
directive còn lại giữ mức chặt nhất: `default-src 'self'`,
`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`,
`connect-src 'self'`. JSON-LD (`application/ld+json`) không phải inline
script theo định nghĩa của mục và được escape `\u003c` ở layout.

## Điều kiện 2 — Lý do kỹ thuật + bằng chứng đường A không khả thi

Header CSP của app khai trong `next.config.ts` — được Next/Vercel nạp
**trước** khi prerender, trong khi inline script chứa flight data chỉ
sinh **trong** lúc prerender và nhúng BUILD_ID ngẫu nhiên của chính lần
build đó. Thí nghiệm đã chạy thật trên cây hiện tại (2026-10-23, hai lần
`pnpm build` liên tiếp, source không đổi):

| Lần build | BUILD_ID | Hash bootstrap script | Hash flight-data script |
|---|---|---|---|
| 1 | `TyNNzmz8AT1_hG8JqGyrq` | `sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=` | `sha256-Kp6XaE8lhDQ9W1oOU+NWG5O3v5T5Ghbp7+QVycksDrs=` |
| 2 | `5YNA5gzEwbDe_9kIKdoiX` | `sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=` | `sha256-V/yMb0GYeQfcFLNtHoAs4tVk1ridIxt7nnbGpdirNe8=` |

Hash của flight-data script **khác nhau giữa hai lần build cùng source**
vì BUILD_ID đổi — không tồn tại tập hash tĩnh nào khai trước trong
`next.config.ts` mà khớp được HTML của chính lần build đó, và Vercel
không có cơ chế hậu-build để ghi lại header cho route tĩnh. Ghim
`generateBuildId` cố định để ép hash ổn định bị loại: nó làm suy yếu
cache-busting theo build và vẫn vỡ ngay khi nội dung trang thay đổi hợp
lệ. Kết luận: đường A không khả thi thật với bản build + deploy hiện tại
(không phải chưa thử).

## Điều kiện 3 — Biện pháp bù trừ

1. **Không bề mặt tiêm mã từ dữ liệu người dùng:** mọi dữ liệu từ link
   chia sẻ/localStorage đều qua `lib/sanitize.ts` (whitelist dựng lại
   object mới) trước khi chạm UI; React escape mặc định mọi text node;
   app không có `dangerouslySetInnerHTML` cho dữ liệu người dùng.
2. **Lớp CSP còn lại vẫn siết tối đa** (xem điều kiện 1): kể cả khi một
   inline script lạ lọt vào HTML, nó không tải được tài nguyên ngoài,
   không fetch ra ngoài (`connect-src 'self'`), không nhúng plugin.
3. **Không script bên thứ ba nào tồn tại** để `'unsafe-inline'` che chở
   (kê khai đầy đủ ở `docs/THIRD-PARTIES.md`; network capture đối chiếu).
4. **Header-assertion test tự động** (`lib/csp.spec.ts`, chạy trong CI):
   parse CSP từ chính cấu hình build, khẳng định mọi directive khớp hồ
   sơ này và ngoại lệ chưa hết hạn — lệch directive = CI fail.

## Điều kiện 4 — Thời hạn + sổ đăng ký

Đã đăng ký EXC-CSP-01/EXC-CSP-02 trong
[EXCEPTION-REGISTRY.md](./EXCEPTION-REGISTRY.md) với ngày phát hành
2026-10-23, hết hạn 2027-01-21 hoặc release kế tiếp (mốc sớm hơn) —
đúng trần "≤ 1 release hoặc 90 ngày" của SEC-02 đường C. Quy trình gia
hạn (bắt buộc chạy lại thí nghiệm đường A trước) ghi trong sổ đăng ký.

## Điều kiện 5 — Ô kiểm hồi quy (chạy ở mỗi lần gia hạn + mỗi release)

- [ ] `pnpm test` xanh, gồm `lib/csp.spec.ts` (header khớp hồ sơ + chưa hết hạn).
- [ ] Header dump trên production sau deploy: CSP enforce (không phải
      Report-Only) trên `/`, `/sw.js`, `/manifest.webmanifest`.
- [ ] Render sau CSP: trang chủ hiển thị đủ H1 + nội dung chính; 0 lỗi
      CSP-violation trong console ở 3 flow chính (tạo cuộc chia, ghi
      khoản chi, mở VietQR) — phần listener E2E đầy đủ thuộc CQ-08.
- [ ] **Hồi quy a11y dưới CSP cuối** (theo đúng yêu cầu của SEC-02 khi
      dùng đường C): text-spacing 1.4.12 bằng local override không làm
      vỡ layout; trạng thái focus/trạng thái hiển thị vẫn đúng dưới CSP
      đang enforce. *Trạng thái: ô kiểm này thuộc gói bằng chứng A11Y-EV
      (P0-4) do parent phụ trách — chưa chạy tại thời điểm lập hồ sơ,
      KHÔNG được đánh dấu đạt cho tới khi có artifact của gói đó.*

## Verdict style-src (tách riêng theo SEC-02)

`style-src 'self' 'unsafe-inline'` — lý do: Tailwind/Next chèn `<style>`
và style attribute inline khi prerender; CSS từ nguồn ngoài vẫn bị cấm
(chỉ `'self'`). Đã kê khai riêng thành EXC-CSP-02 trong sổ đăng ký. Theo
văn bản mục, ngoại lệ style này không làm FAIL verdict script-src và
ngược lại.
