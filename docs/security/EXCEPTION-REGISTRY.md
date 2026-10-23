# Sổ đăng ký ngoại lệ bảo mật — Chia Tiền

Mọi văn bản ngoại lệ trong bộ SEC của repo này đều trỏ tới một mục trong
sổ này (quy định của Enterprise Checklist, Phần quản trị mục 7): directive/
khoản được nới + lý do + bằng chứng + ngày hết hạn. **Hết hạn mà không gia
hạn kèm bằng chứng mới = ngoại lệ tự quay về FAIL** — test
`lib/csp.spec.ts` tự động fail khi quá ngày hết hạn để điều đó không bị quên.

| ID | Directive/khoản được nới | Hồ sơ ngoại lệ | Ngày phát hành | Ngày hết hạn | Trạng thái |
|---|---|---|---|---|---|
| EXC-CSP-01 | `script-src 'unsafe-inline'` (chỉ inline script do chính Next static prerender sinh) | [CSP-EXCEPTION-P02.md](./CSP-EXCEPTION-P02.md) | 2026-10-23 | 2027-01-21 (hoặc release kế tiếp — mốc nào sớm hơn) | Đang hiệu lực |
| EXC-CSP-02 | `style-src 'unsafe-inline'` (Tailwind/Next chèn `<style>` + style attribute khi prerender; CSS ngoài vẫn chỉ `'self'`) | [CSP-EXCEPTION-P02.md](./CSP-EXCEPTION-P02.md) — mục verdict style-src tách riêng | 2026-10-23 | 2027-01-21 (hoặc release kế tiếp — mốc nào sớm hơn) | Đang hiệu lực |

Dòng máy đọc được (test `lib/csp.spec.ts` đối chiếu header thật với sổ này):

```text
EXC-CSP-01 | directive: script-src | token: 'unsafe-inline' | expires: 2027-01-21
EXC-CSP-02 | directive: style-src | token: 'unsafe-inline' | expires: 2027-01-21
```

## Quy trình gia hạn

1. Chạy lại thí nghiệm đường A (trích hash inline script từ HTML đã build
   ở 2 lần build liên tiếp, xem hướng dẫn trong hồ sơ P-02) — nếu Next/Vercel
   đã hỗ trợ hash/nonce cho route tĩnh mà không đổi loại route, đóng ngoại
   lệ và chuyển đường chuẩn.
2. Nếu vẫn chưa khả thi: cập nhật bằng chứng trong hồ sơ, đổi ngày hết hạn
   (≤ 90 ngày kể từ ngày gia hạn hoặc ≤ 1 release — mốc sớm hơn), ghi dòng
   vào CHANGELOG.md của repo.
3. Chạy `pnpm test` — test header-assertion phải xanh với ngày mới.
