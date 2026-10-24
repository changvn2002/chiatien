# SHOT-LIST — screenshot pack chiatien (studio-catalog/chiatien/)

> **Trạng thái (2026-10-25): ĐÃ CHỤP LẠI trên bản live v1.9.0 «Giấy thật»
> (REDESIGN-V4 + đợt redesign 2026-10-24/25: panel quyết toán thành
> sheet trắng có biên trên nền bàn xám, phiếu gấp có dấu xé một ấn
> bản, nắp phiếu mở họ giấy trắng; panel R11 PASS 5/5 + §6 5/5).
> Riêng gallery-03 đã chụp lại trên live v1.9.1 sau khi khiếm
> khuyết TC6 được vá; Checker A-DELTA2 PASS 4/4.**
> Pack trước chụp ở v1.7.2 (bản này bắt kịp cả phần còn nợ của v1.8.0
> «MỞ PHIẾU»). Xem SHOT-V190-STATE.md ở repo root để biết sha256 mới
> + kết quả R2.
> Lưu ý lịch sử khi đối chiếu: bản gallery-03 đầu tiên chụp trên
> v1.9.0 từng bị dải chip thành viên (z-30) vẽ đè lên góc trên-trái
> của hộp thoại VietQR và che một phần tiêu đề «VietQR — An».
> Parent đã vá ở v1.9.1 bằng cách render Sheet qua portal ra
> `document.body`; bản gallery-03 hiện tại không còn hiện tượng
> này — tiêu đề đọc trọn và dải thành viên bị scrim làm mờ như
> nền. Chi tiết + số đo ở mục Delta v1.9.1 trong
> SHOT-V190-STATE.md và biên bản SHOT-V190-VERIFY-A-DELTA2.md.
> File này ghi lại hợp đồng chụp (tên file giữ nguyên như pack cũ để catalog
> không gãy) và các TRẠNG THÁI nội dung phải đúng sự thật khi chụp — đặc
> biệt: pack v1 (HEAD 044b960) từng bị grader bắt lỗi DOC-03/DATA-03 vì
> gallery-01 in số tài khoản đầy đủ + banner cảnh báo ngân hàng của thiết kế
> v1, trong khi app hiện tại không còn cả hai. Không được tái sử dụng ảnh cũ.

## Hợp đồng file (giữ nguyên tên — R2 studio-catalog/chiatien/)

| File | Kích thước | Trạng thái phải chụp |
|---|---|---|
| chiatien-desktop.png | 1440×900 | Không gian làm việc của cuộc chia mẫu (4 người, 3 khoản) ở trạng thái đã quyết toán xong: sổ trực tiếp + cột quyết toán bên phải + hàng VietQR của lần chuyển có bank trên máy chụp |
| chiatien-mobile.png | 390×844 | Cùng cuộc chia trên mobile, thấy khoản chi + quyết toán |
| chiatien-social.png | 1280×640 | Khung social có cả khoản chi + quyết toán (không chứa số TK) |
| gallery-01-thanh-vien.png | 1440×900 | Danh sách thành viên: CHỈ có trạng thái "đã lưu ngân hàng trên máy này" — **tuyệt đối không số tài khoản, không banner cảnh báo kiểu v1** |
| gallery-02-chia-tuy-chinh.png | 1440×900 | Form khoản chi tuỳ chỉnh đã khớp tổng ("đã phân bổ … đã khớp") |
| gallery-03-vietqr.png | 1440×900 | Sheet VietQR mở: QR thật + ngân hàng/số TK/tên chủ TK của ĐÚNG giao dịch (đây là nơi duy nhất số TK được phép xuất hiện — trong sheet thanh toán) |

## Dữ kiện chụp (dữ liệu mẫu trên production, máy chụp)

- Cuộc chia: "Nhậu cuối tuần" — thành viên An (có ngân hàng Vietcombank
  **lưu trên máy chụp**), Bình, Chi, Dũng.
- Khoản chi: Ăn tối 800.000 ₫ (An trả, chia đều 4 người); Tiền rượu
  300.000 ₫ (Bình trả, tuỳ chỉnh 3 người × 100.000 ₫ — An, Bình, Dũng; Chi
  không tham gia); Taxi 160.000 ₫ (Dũng trả, chia đều 4 người).
  (Sửa 2026-10-23: bản cũ ghi Lẩu 700k / Khô mực 260k / Rượu 300k — bộ số đó
  cho quyết toán Dũng → An 320k + Dũng → Chi 20k + Bình → An 40k, KHÔNG khớp
  "Quyết toán kỳ vọng" ngay dưới đây. Dataset đúng là dataset trong
  README.md, cho số dư An +460.000 / Bình −40.000 / Chi −240.000 /
  Dũng −180.000.)
- Quyết toán kỳ vọng: Chi → An 240.000 ₫ · Dũng → An 180.000 ₫ · Bình → An
  40.000 ₫ (3 lần chuyển); VietQR mở trên lần Chi → An 240.000 ₫.
- Caption chuẩn cho từng ảnh đã được viết sẵn trong README.md (mục
  Screenshots) — chụp xong đối chiếu caption ↔ ảnh, lệch thì sửa caption,
  không sửa số.

## Quy tắc chụp

- Chụp từ **bản production sau deploy** (redesign-v2), không chụp build local.
- Máy chụp phải có sẵn bank của An trong localStorage (để có trạng thái
  VietQR) — số TK dùng cho ảnh là tài khoản minh hoạ của nhóm, đối chiếu
  thêm chuẩn DATA-03: ngoài sheet thanh toán, không ảnh nào được chứa số TK.
