# ADR-002 — Share format v2: dữ liệu ngân hàng không bao giờ nằm trong link

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-23
- **Thay thế:** share format v1 (payload chứa trọn session, gồm bank của
  thành viên) + cơ chế "banner cảnh báo + hỏi xác nhận" của v1.

## Bối cảnh

Ở v1, link chia sẻ chứa cả số tài khoản và tên chủ tài khoản của thành
viên đã nhập bank. Cách giảm rủi ro lúc đó là cảnh báo trong UI (banner
thường trực + confirm trước khi copy). Enterprise Checklist phân xử dứt
khoát (DATA-04/DATA-09a/SEC-12.5, mức BLOCKER): dữ liệu ngân hàng trong
share link bị **cấm ở tầng kiến trúc** — cảnh báo/opt-in không đủ, vì
link bị chuyển tiếp là nằm ngoài mọi kiểm soát của UI.

## Quyết định

1. **Payload v2 chỉ chứa `{ v: 2, session: {id, title, members: [{id,
   name}], expenses, ...} }`** — trường bank bị loại ở tầng ENCODE
   (`lib/share.ts`), không phải ẩn ở tầng hiển thị.
2. **Thông tin ngân hàng tách thành sổ per-device**
   (`chiatien:bank-book:v1` trong localStorage, khoá theo sessionId +
   memberId) — không bao giờ serialize vào blob sessions hay link.
3. **Decoder vẫn đọc link v1** (link cũ đã phát hành) nhưng **cắt bank
   khi import** và báo cho người nhận biết (`strippedBank`).
4. **VietQR chỉ sinh từ sổ local của máy đang xem** — máy chưa lưu tài
   khoản của người nhận thì hiện trạng thái "Chưa có mã QR trên máy
   này" với 2 đường đi tiếp, thay vì lấy bank từ link.

## Hệ quả

- **Được:** đường phát tán dữ liệu ngân hàng qua link chết ở tầng kiến
  trúc (SEC-12.5/DATA-09a PASS ở đợt chấm lại vòng 2 bằng bằng chứng
  decode độc lập); banner đỏ + confirm của v1 bị xoá hẳn — ít nhiễu UI
  hơn mà an toàn hơn.
- **Trả giá:** người nhận link không thấy sẵn VietQR của người khác
  trên máy mình (điều kiện thiết bị này phải được nói rõ trong README
  và trong app — FAQ đã ghi đúng); mỗi máy tự lưu sổ bank của mình.
- **Ràng buộc kèm theo:** mọi thay đổi schema share tương lai phải giữ
  bất biến "không trường bank nào trong payload ở bất kỳ chế độ nào" —
  test `lib/share.spec.ts` mục DATA-04 khoá điều này, gồm cả payload bị
  sửa tay chèn bank.
