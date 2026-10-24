# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người Việt đi theo nhóm — bạn bè đi ăn, đi nhậu, du lịch chung; người ở trọ
chung chia tiền phòng và chi phí sinh hoạt. Họ dùng app chủ yếu trên điện
thoại, ngay tại bàn ăn, cuối chuyến đi, hoặc cuối tháng — lúc cần chốt "ai
trả ai bao nhiêu" thật nhanh và không ai phải cãi nhau vì tiền lẻ.

Công việc họ cần làm xong: ghi lại ai đã trả khoản nào, chia khoản đó cho
đúng những người liên quan, và nhận được một danh sách chuyển tiền cuối
cùng ngắn nhất, rõ ràng, chuyển ngay được bằng mã QR ngân hàng.

## Product Purpose

Chia Tiền ghi lại các khoản chi chung của một nhóm, tự chia theo ba kiểu
(chia đều, tuỳ chỉnh số tiền từng người, chia theo phần/trọng số), triệt
tiêu nợ chồng chéo bằng thuật toán đơn giản hoá nợ (ghép chủ nợ lớn nhất
với con nợ lớn nhất, tối đa n−1 lần chuyển), và xuất ra danh sách "ai trả
ai bao nhiêu" kèm VietQR đúng số tiền cho từng lần chuyển.

Thành công = một nhóm chốt xong tiền trong vài phút ngay trên điện thoại,
không cần bảng tính, không cần tài khoản, không còn câu "để tính sau".

## Positioning

Không phải app quản lý tài chính cá nhân và không phải sổ nợ dài hạn: Chia
Tiền chỉ làm một việc — biến một đống khoản chi chung lộn xộn thành một
danh sách chuyển tiền tối thiểu, chuyển được ngay bằng VietQR quét từ app
ngân hàng Việt Nam. Toàn bộ chạy ngay trong trình duyệt, dữ liệu không rời
máy người dùng; "máy chủ" duy nhất để chia sẻ là chính đường link chứa
trọn cuộc chia.

## Operating Context

- Dùng trên mobile là chính (điện thoại Android/iPhone phổ thông ở Việt
  Nam), thường trong bối cảnh ồn ào, vội, một tay cầm điện thoại: thao tác
  phải nhanh, chữ số tiền phải đọc được ngay, nút phải bấm trúng bằng ngón
  tay.
- Người dùng không rành công nghệ vẫn phải dùng được: không thuật ngữ tài
  chính, mọi nhãn bằng tiếng Việt đời thường ("Ai trả ai", "Người cùng
  chia").
- Sau khi chốt, kết quả được copy dạng text để dán vào Zalo/Messenger cho
  cả nhóm, hoặc gửi bằng link chia sẻ để người nhận mở ra xem và sửa tiếp
  trên máy của họ.
- Tiền tệ duy nhất là VND, tính bằng số nguyên đồng — không làm tròn gây
  lệch, không tỉ giá.

## Capabilities and Constraints

Đã xác nhận trong code, phải giữ nguyên hành vi:

- Nhiều cuộc chia độc lập, lưu bền bằng `localStorage`, tự lưu sau mọi thay
  đổi; khi trình duyệt chặn lưu trữ (ẩn danh) app phải báo rõ và vẫn dùng
  được trong phiên mở đó.
- Thành viên có thông tin ngân hàng tuỳ chọn (ngân hàng theo mã BIN trong
  danh sách ngân hàng Việt Nam, số tài khoản, tên chủ tài khoản viết hoa
  không dấu). Chỉ giao dịch trả cho thành viên có ngân hàng mới sinh VietQR.
- 3 kiểu chia mỗi khoản chi: chia đều (xử lý lẻ đồng chính xác tuyệt đối),
  tuỳ chỉnh số tiền (bắt tổng khớp số tiền khoản chi), theo phần/trọng số.
- Copy tóm tắt quyết toán dạng text (tên phiên, tổng, số lần chuyển,
  link); chi tiết đầy đủ là hành động sao chép riêng trong app. Link
  chia sẻ nén toàn bộ cuộc chia trong
  hash của URL (lz-string) — hash không bao giờ gửi lên máy chủ.
- Hoàn toàn client-side: không tài khoản, không backend, không analytics,
  không thu thập dữ liệu.
- Logic tiền/quyết toán nằm trong `lib/` thuần, có unit test và property
  test (sau quyết toán mọi số dư về 0, số giao dịch ≤ n−1); UI không được
  thay đổi hành vi của `lib/`.

## Brand Commitments

- Tên sản phẩm: "Chia Tiền". Logo chính thức là dấu chia (÷) trắng/kem
  trên nền hổ phách bo góc — file nguồn sự thật duy nhất:
  `public/products/brand/chiatien-logo.svg`, quy tắc đầy đủ trong
  `BRAND.md`.
- Màu thương hiệu là hổ phách đậm `#B45309`. Cấm gradient ở mọi nơi; cấm
  diện mạo "template AI" (tím-xanh, thẻ lồng thẻ).
- Font: Be Vietnam Pro cho nội dung (bắt buộc đủ dấu tiếng Việt) và Outfit
  cho số tiền/tiêu đề.
- Giọng văn: tiếng Việt trực tiếp, thân thiện, không thuật ngữ; số tiền
  luôn hiển thị kiểu Việt Nam (`150.000 ₫`).

## Evidence on Hand

- `BRAND.md` — quy tắc nhận diện và artwork chính thức.
- `lib/*.spec.ts` — 34 unit/property test chứng minh thuật toán chia và
  quyết toán đúng; là bằng chứng tính đúng đắn duy nhất được phép trích.
- Không có testimonial, số liệu người dùng hay benchmark nào — không được
  bịa thêm bất kỳ tuyên bố nào dạng này trong giao diện hay tài liệu.

## Product Principles

1. **Một việc, làm đến nơi.** App chỉ chia tiền nhóm; mọi màn hình đều
   phục vụ việc ghi khoản chi và chốt quyết toán.
2. **Nhanh hơn bảng tính.** Từ lúc mở app đến khoản chi đầu tiên không quá
   vài chạm; mặc định (chia đều cho cả nhóm) phải đúng trong đa số trường
   hợp để người dùng ít phải sửa nhất.
3. **Tiền là chuyện nghiêm túc.** Mọi con số phải khớp tuyệt đối đến từng
   đồng, đọc được ngay, và kiểm chứng được bằng test — giao diện không bao
   giờ được làm mờ hay làm tròn con số vì thẩm mỹ.
4. **Riêng tư mặc định.** Dữ liệu ở trên máy người dùng; chia sẻ là hành
   động chủ động qua link hoặc copy text, luôn nói rõ người nhận sẽ thấy
   những gì.
5. **Đáng tin như một fintech.** Chỉn chu, nhất quán, không lỗi vặt — cảm
   giác như sản phẩm của một ngân hàng số nghiêm túc, dù không có máy chủ.

## Accessibility & Inclusion

- Tương phản chữ chính đạt WCAG AA; không dùng chữ xám trên nền màu.
- Mọi nút/chạm có vùng bấm tối thiểu 44×44px (bối cảnh dùng một tay, ngoài
  quán ăn, ánh sáng gắt).
- Trạng thái focus phải nhìn thấy rõ cho người dùng bàn phím.
- Tiếng Việt có dấu đầy đủ ở mọi nhãn; tên chủ tài khoản ngân hàng là nơi
  duy nhất viết hoa không dấu (yêu cầu của hệ thống ngân hàng).
