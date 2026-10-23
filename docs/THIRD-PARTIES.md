# Kê khai bên thứ ba — Chia Tiền (DATA-08 / SEC-16)

Cập nhật: 2026-10-23. File này là cột kê khai trong bảng đối chiếu 3 cột
của SEC-16 (origin trong CSP ↔ kê khai này ↔ origin quan sát thực tế khi
tải trang). Bằng chứng quan sát: network capture 1 phiên production đầy
đủ flow — `~/workspace/mini-apps/chiatien-qa/network-capture-2026-10-23.md`
(+ dữ liệu thô `.json` cùng thư mục): **28/28 request mạng thật đi tới
đúng một origin là domain của chính app; 0 POST; 0 request chứa dữ liệu
người dùng rời thiết bị.**

## Bên thứ ba duy nhất

| Bên | Vai trò | Dữ liệu có thể thấy | Quốc gia xử lý |
|---|---|---|---|
| **Vercel** (Vercel Inc.) | Hosting + CDN cho bản build tĩnh (HTML/CSS/JS/font/ảnh của chính app) và TLS termination | Chỉ nội dung của các request tải tài nguyên tĩnh công khai (địa chỉ IP người truy cập, user-agent, URL của asset tĩnh) — đúng như mọi web tĩnh. App **không** gửi dữ liệu cuộc chia, thông tin ngân hàng hay bất kỳ dữ liệu người dùng nào lên: mọi dữ liệu nằm trong `localStorage` của trình duyệt và trong fragment của share link (fragment không bao giờ được gửi lên server khi tải trang) | Hạ tầng Vercel (mạng biên toàn cầu; region build/functions theo cấu hình dự án — app này thuần tĩnh, không function xử lý dữ liệu) |

## Các luồng từng tồn tại — đã loại bỏ

| Luồng cũ | Trạng thái |
|---|---|
| `img.vietqr.io` nhận BIN + số tài khoản + tên chủ tài khoản + số tiền mỗi lần render QR | **Đã xoá khỏi code (đợt DATA-08).** VietQR nay dựng payload EMVCo và vẽ QR 100% tại máy bằng thư viện `qrcode` đóng gói trong bundle; network capture xác nhận 0 request phát sinh khi mở sheet VietQR |
| Font qua CDN ngoài (nếu có) | Không tồn tại: font Be Vietnam Pro + Inter self-host qua Fontsource, phát từ chính origin (capture thấy 15 request font, tất cả `chiatien-five.vercel.app`) |

## Khẳng định hiện tại

- **Không analytics, không tracker, không error-tracking bên ngoài.**
  RUM hiệu năng (PERF-12) là thư viện `web-vitals` chạy tại máy và ghi
  kết quả vào **console của chính trình duyệt người dùng** — không
  endpoint, không beacon, không dữ liệu rời máy (xem
  `components/chiatien/web-vitals.tsx`).
- **Avatar** (DiceBear initials) sinh tại client từ tên + id — không
  gọi DiceBear HTTP API, không định danh nào rời máy.
- **Script bên thứ ba thực thi trong trang: 0.** CSP `script-src 'self'`
  (cộng ngoại lệ inline đã đăng ký cho chính script của Next — xem
  `docs/security/`) khớp 1-1 với kê khai này: ngoài origin của chính
  app, không origin nào được phép nạp script.
- **Màn hình nhạy cảm** (form nhập tài khoản, sheet thanh toán): số
  script bên thứ ba thực thi = 0, không ngoại lệ.

Mọi thay đổi làm phát sinh một bên thứ ba mới (thêm analytics, CDN,
dịch vụ ảnh/API ngoài) đều phải cập nhật file này TRONG CÙNG thay đổi
đó và đối chiếu lại CSP — thiếu kê khai = FAIL theo DATA-08/SEC-16.
