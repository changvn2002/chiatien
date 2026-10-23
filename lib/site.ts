/**
 * Thông tin site dùng chung cho SEO/PWA: layout (metadata, JSON-LD), robots.ts,
 * sitemap.ts, manifest.ts cùng đọc từ đây để không lệch nhau.
 *
 * NEXT_PUBLIC_SITE_URL — URL gốc của bản production (không có slash cuối).
 * Mặc định là domain Vercel dự kiến của repo này; khi có domain chính thức,
 * chỉ cần đặt biến môi trường lúc deploy, không phải sửa code.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chiatien.vercel.app').replace(
  /\/+$/,
  '',
);

export const SITE_NAME = 'Chia Tiền';

export const SITE_TITLE = 'Chia Tiền — Chia tiền nhóm, tính ai nợ ai, quét VietQR';

export const SITE_DESCRIPTION =
  'Chia tiền nhóm khi đi chơi, ăn nhậu, ở chung: ghi ai đã trả khoản nào, app tính ngay ai nợ ai, rút gọn còn ít lần chuyển nhất và tạo VietQR quét là trả. Không cần cài app, không đăng nhập — mở link là dùng ngay trên trình duyệt.';

/**
 * Câu hỏi thường gặp — nguồn sự thật duy nhất cho cả phần FAQ hiển thị trên
 * trang (app.tsx) và JSON-LD FAQPage (layout.tsx), để hai nơi không lệch nhau.
 * Mọi câu trả lời chỉ mô tả đúng tính năng thật của app.
 */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Chia tiền nhóm thế nào cho công bằng?',
    answer:
      'Ghi lại đầy đủ từng khoản chi — ai đã trả và khoản đó dành cho những ai — rồi để app tính số dư của từng người: tổng đã trả trừ tổng phải chịu. Người dư dương được nhận lại, người dư âm trả thêm, và các khoản nợ chồng chéo tự triệt tiêu nhau. Chia Tiền hỗ trợ ba cách chia cho từng khoản: chia đều, tuỳ chỉnh số tiền từng người, hoặc chia theo phần — chọn cách nào khớp với thực tế của khoản đó là công bằng nhất.',
  },
  {
    question: 'Mỗi người ăn uống khác nhau thì tính tiền thế nào?',
    answer:
      'Có hai cách. Nếu một khoản chỉ liên quan vài người (ví dụ chỉ 3 người uống rượu), bỏ chọn những người còn lại khỏi khoản chi đó. Nếu mọi người cùng ăn nhưng mức khác nhau, dùng kiểu "Tuỳ chỉnh số tiền" và nhập đúng số tiền từng người phải chịu — app bắt tổng phải khớp với số tiền của khoản chi nên không lệch một đồng.',
  },
  {
    question: 'VietQR là gì? Vì sao app tạo được mã QR chuyển tiền?',
    answer:
      'VietQR là chuẩn mã QR chuyển khoản do NAPAS vận hành, dùng chung cho mọi app ngân hàng tại Việt Nam. Khi một thành viên có nhập thông tin tài khoản ngân hàng, mỗi lần chuyển tiền tới người đó trong danh sách quyết toán sẽ kèm một mã VietQR chứa đúng số tiền và nội dung chuyển khoản — mở app ngân hàng, quét mã là chuyển, không phải gõ số tài khoản hay sợ nhầm số tiền.',
  },
  {
    question: 'Có cần cài app hay đăng ký tài khoản để dùng Chia Tiền không?',
    answer:
      'Không cần cả hai. Khác với các app chia tiền phải tải từ App Store hay CH Play rồi đăng ký tài khoản, Chia Tiền chạy ngay trên trình duyệt: mở link là dùng, không cài đặt, không đăng nhập, không thu thập dữ liệu — mọi cuộc chia lưu ngay trên máy của bạn. Cần gửi cho cả nhóm thì bấm "Chia sẻ link": toàn bộ cuộc chia nằm trong chính đường link, ai mở link cũng xem và sửa tiếp được trên máy của họ, cũng không phải cài gì thêm.',
  },
  {
    question: 'Nhóm đông người thì phải chuyển tiền bao nhiêu lần?',
    answer:
      'Rất ít. Thay vì từng cặp một trả qua trả lại, app ghép người đang nợ nhiều nhất với người cần được nhận nhiều nhất, nên một nhóm n người chỉ cần tối đa n−1 lần chuyển là hết nợ. Ví dụ nhóm 6 người đi du lịch thường chỉ còn khoảng 3–5 lần chuyển thay vì hàng chục lần nếu tự tính tay.',
  },
  {
    question: 'Chia Tiền có miễn phí không?',
    answer:
      'Miễn phí hoàn toàn, không tài khoản, không quảng cáo chen ngang lúc chốt tiền. Mở trang là dùng ngay cho chuyến đi, bữa nhậu hay tiền trọ của nhóm bạn.',
  },
];
