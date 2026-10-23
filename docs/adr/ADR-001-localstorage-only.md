# ADR-001 — Lưu trữ localStorage-only, không backend

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-23 (ghi lại quyết định đã vận hành từ bản đầu)

## Bối cảnh

Chia Tiền xử lý dữ liệu tiền bạc của nhóm nhỏ (ai nợ ai) — dữ liệu nhạy
cảm ở mức cá nhân nhưng có vòng đời ngắn (một chuyến đi, một bữa tiệc)
và không cần đồng bộ đa thiết bị theo thời gian thực. Sản phẩm cam kết
"không cần đăng nhập, mở link là dùng".

## Quyết định

Toàn bộ dữ liệu sống trong `localStorage` của trình duyệt người dùng,
qua MỘT adapter duy nhất (`lib/storage.ts`, ARC-05). Không backend,
không database, không tài khoản. Mang dữ liệu sang máy khác bằng share
link (ADR-002) thay vì đồng bộ server.

## Hệ quả

- **Được:** không máy chủ nào thấy dữ liệu; không chi phí vận hành dữ
  liệu; offline hoàn toàn; bề mặt tấn công phía server = 0 (SEC-08/09
  N/A một cách trung thực).
- **Trả giá:** dữ liệu gắn với một trình duyệt/máy — mất máy là mất sổ
  (giảm nhẹ bằng share link làm bản sao); hai tab cùng sửa vẫn là
  last-writer-wins ở cấp blob nhưng không còn im lặng (banner đồng bộ
  xuyên tab); trần dung lượng localStorage giới hạn quy mô một cuộc chia
  (chấp nhận được với miền bài toán).
- **Ràng buộc kèm theo:** vì localStorage là dữ liệu "ngoài" không đáng
  tin (người dùng/phần mềm khác can thiệp được), mọi lần nạp đều qua
  cùng lớp sanitize với share link (ARC-09).
