# Giao thức test hiểu — cảnh báo chia sẻ 2 lớp (DATA-04(ii))

Mục đích: kiểm chứng bằng NGƯỜI THẬT ngoài cuộc rằng cảnh báo trong
Share Sheet («Chia sẻ cuộc chia này») truyền đạt đúng 3 sự thật trước
khi người dùng bấm «Tôi hiểu, tạo link»:

1. Bất kỳ ai có link đều xem **và sửa được một bản sao** của cuộc chia;
   link **không thu hồi được** sau khi gửi.
2. Link chứa tên thành viên, khoản chi và tổng tiền — **không chứa
   thông tin ngân hàng**; mã QR chỉ hiện trên máy đã lưu tài khoản của
   người nhận.
3. Người nhận mở link sẽ có bản sao trên máy của họ và sửa tiếp được —
   cần đối chiếu lại trước khi thanh toán theo.

> Trạng thái: giao thức + mẫu biên bản. Việc chạy với người thật do
> parent tổ chức; wave phát triển KHÔNG tự điền biên bản (không bịa
> dữ liệu người tham gia).

## 1. Người tham gia

- Ít nhất **5 người ngoài cuộc**: chưa từng dùng Chia Tiền, không tham
  gia phát triển/đánh giá sản phẩm này, không được brief trước nội dung.
- Đa dạng tối thiểu: ≥2 người không làm nghề công nghệ; ≥1 người trên
  45 tuổi; tất cả đọc hiểu tiếng Việt.
- Mỗi người một lượt riêng, không nghe lượt của người khác trước.

## 2. Vật liệu & bối cảnh

- Một thiết bị (điện thoại của người tham gia hoặc máy test) chạy bản
  Chia Tiền hiện hành, mở sẵn một cuộc chia có ≥2 thành viên và ≥1
  khoản chi, tới màn hình workspace.
- Người điều phối chỉ nói đúng câu mở: «Đây là màn hình chia sẻ của
  một app chia tiền nhóm. Bạn hãy bấm nút chia sẻ, đọc những gì hiện
  ra, rồi trả lời mấy câu hỏi của mình. Chưa cần bấm nút xác nhận.»
- Người tham gia tự bấm «Chia sẻ link» để mở Share Sheet. Không gợi ý
  thêm bất kỳ điều gì sau khi sheet mở.

## 3. Câu hỏi hiểu (hỏi theo thứ tự, ghi nguyên văn câu trả lời)

| # | Câu hỏi | Đáp án đạt (ý chính, không cần đúng từng chữ) |
|---|---|---|
| Q1 | «Theo những gì vừa đọc, nếu bạn gửi link này cho một người, người đó làm được gì với cuộc chia?» | Xem được **và sửa được bản sao** của cuộc chia (không chỉ xem). |
| Q2 | «Sau khi đã gửi link đi, bạn có thu hồi / vô hiệu hoá được link đó không?» | **Không** thu hồi được. |
| Q3 | «Link này chứa những thông tin gì? Có chứa số tài khoản ngân hàng của ai không?» | Chứa tên thành viên + khoản chi + tổng; **không** chứa thông tin ngân hàng. |
| Q4 | «Người nhận mở link thì mã QR chuyển tiền hiện ra ngay không? Vì sao?» | Chỉ hiện trên máy **đã lưu tài khoản của người nhận**; máy chưa lưu thì không có QR. |
| Q5 | «Người nhận sửa bản sao của họ thì bản của bạn có đổi theo không? Trước khi chuyển tiền theo bản sao đó bạn nên làm gì?» | Bản sao độc lập trên máy người nhận; cần **đối chiếu lại** trước khi thanh toán. |

Quy tắc chấm từng câu: ĐẠT khi người tham gia tự nói ra ý chính mà
không cần gợi ý; người điều phối chỉ được hỏi lại đúng câu hỏi, không
được giải thích thêm. Trả lời sai/«không biết»/nói ngược ý chính =
KHÔNG ĐẠT cho câu đó.

## 4. Tiêu chí qua của đợt test

- **Đạt toàn đợt** khi: mỗi câu Q1–Q5 có ≥4/5 người trả lời ĐẠT.
- **Không đạt** nếu bất kỳ điều kiện nào sau đây xảy ra, dù tỉ lệ trên
  đạt: (a) ≥2 người tin rằng link chứa số tài khoản ngân hàng;
  (b) ≥2 người tin rằng link thu hồi được; (c) ≥2 người tin người nhận
  chỉ xem chứ không sửa được.
- Không đạt → sửa câu chữ cảnh báo (giữ nguyên cấu trúc 2 lớp + đúng
  chữ «Tôi hiểu, tạo link»/«Quay lại»), ghi lại thay đổi, và chạy lại
  đợt test với **nhóm người tham gia mới** (không dùng lại người cũ).

## 5. Mẫu biên bản (MẪU TRỐNG — điền khi chạy thật)

```
Đợt test: #___   Ngày: ____/____/______   Bản app (commit/tag): ____________
Người điều phối: ______________________
Thiết bị chạy app: ______________________

Người tham gia (mã ẩn danh, vd P01): ______
  Nhóm tuổi: [ ] <25  [ ] 25–45  [ ] >45    Nghề công nghệ: [ ] Có  [ ] Không
  Q1: [ ] Đạt  [ ] Không — nguyên văn: «................................................»
  Q2: [ ] Đạt  [ ] Không — nguyên văn: «................................................»
  Q3: [ ] Đạt  [ ] Không — nguyên văn: «................................................»
  Q4: [ ] Đạt  [ ] Không — nguyên văn: «................................................»
  Q5: [ ] Đạt  [ ] Không — nguyên văn: «................................................»

(lặp lại khối trên cho từng người tham gia)

Tổng kết đợt:
  Q1: __/5 đạt   Q2: __/5 đạt   Q3: __/5 đạt   Q4: __/5 đạt   Q5: __/5 đạt
  Điều kiện không-đạt đặc biệt (a/b/c ở mục 4): [ ] Không có  [ ] Có: ______
  Kết luận: [ ] ĐẠT  [ ] KHÔNG ĐẠT — hành động tiếp theo: ______________________
```

## 6. Ghi chú đạo đức & dữ liệu

- Người tham gia đồng ý miệng trước khi bắt đầu; không thu thập họ
  tên, số điện thoại hay dữ liệu cá nhân — biên bản chỉ dùng mã ẩn
  danh + nhóm tuổi + có/không làm nghề công nghệ.
- Cuộc chia dùng khi test là dữ liệu mẫu do đội test tạo (tên/khoản
  chi giả định), không phải dữ liệu thật của người tham gia.
