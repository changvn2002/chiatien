# SHOT-LIST — screenshot pack chiatien (studio-catalog/chiatien/)

> **Trạng thái (2026-10-23): HOÃN theo lệnh redesign toàn bộ mini app.**
> Thiết kế v2 sẽ thay đổi hoàn toàn lớp giao diện nên parent sẽ chụp lại
> pack SAU khi redesign-v2 deploy lên production. File này ghi lại hợp
> đồng chụp (tên file giữ nguyên như pack cũ để catalog không gãy) và các
> TRẠNG THÁI nội dung phải đúng sự thật v2 khi chụp — đặc biệt: pack cũ
> (HEAD 044b960) đã bị grader bắt lỗi DOC-03/DATA-03 vì gallery-01 in số
> tài khoản đầy đủ + banner cảnh báo ngân hàng của thiết kế v1, trong khi
> app v2 không còn cả hai. Không được tái sử dụng ảnh cũ.

## Hợp đồng file (giữ nguyên tên — R2 studio-catalog/chiatien/)

| File | Kích thước | Trạng thái phải chụp |
|---|---|---|
| chiatien-desktop.png | 1440×900 | Bước Thanh toán của cuộc chia mẫu (4 người, 3 khoản), vùng quyết toán + hàng VietQR của lần chuyển có bank trên máy chụp |
| chiatien-mobile.png | 390×844 | Cùng cuộc chia trên mobile, thấy khoản chi + quyết toán |
| chiatien-social.png | 1280×640 | Khung social có cả khoản chi + quyết toán (không chứa số TK) |
| gallery-01-thanh-vien.png | 1440×900 | Bước Thành viên: danh sách thành viên CHỈ có trạng thái "đã lưu ngân hàng trên máy này" — **tuyệt đối không số tài khoản, không banner cảnh báo kiểu v1** |
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
