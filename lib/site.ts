/**
 * Thông tin site dùng chung cho SEO/PWA: layout (metadata, JSON-LD), robots.ts,
 * sitemap.ts, manifest.ts cùng đọc từ đây để không lệch nhau.
 *
 * NEXT_PUBLIC_SITE_URL — URL gốc của bản production (không có slash cuối).
 * Mặc định là domain Vercel dự kiến của repo này; khi có domain chính thức,
 * chỉ cần đặt biến môi trường lúc deploy, không phải sửa code.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chiatien-five.vercel.app'
).replace(/\/+$/, '');

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
      'Ghi lại từng khoản chi: ai đã trả, khoản đó cho những ai. App cộng số tiền mỗi người đã trả và số tiền mỗi người phải chịu, rồi ra số dư của mỗi người. Ai đang dư thì được nhận lại, ai đang thiếu thì trả thêm. Các khoản nợ chồng chéo được trừ qua lại cho nhau, nên cuối cùng chỉ còn vài lần chuyển. Mỗi khoản có ba cách chia — chia đều, nhập đúng số tiền từng người, hoặc chia theo phần — cứ chọn cách khớp với khoản đó.',
  },
  {
    question: 'Mỗi người ăn uống khác nhau thì tính tiền thế nào?',
    answer:
      'Tuỳ khoản mà chọn. Khoản chỉ liên quan tới vài người — như chỉ 3 người uống rượu — thì bỏ chọn những người còn lại khỏi khoản đó. Còn khi mọi người cùng dùng mà mức khác nhau, chọn kiểu "Tuỳ chỉnh số tiền" và nhập đúng phần từng người phải chịu; tổng các phần phải khớp số tiền của khoản nên không lệch đồng nào.',
  },
  {
    question: 'VietQR là gì? Vì sao app tạo được mã QR chuyển tiền?',
    answer:
      'Mã QR chuyển khoản dùng chung cho mọi app ngân hàng ở Việt Nam. Máy bạn đã lưu tài khoản người nhận thì mỗi lệnh chuyển có sẵn mã QR ghi đúng số tiền — mở app ngân hàng, quét là chuyển, khỏi gõ số tài khoản.',
  },
  {
    question: 'Có cần cài app hay đăng ký tài khoản để dùng Chia Tiền không?',
    answer:
      'Không cần. Chia Tiền chạy ngay trên trình duyệt, mở link là dùng. Mọi cuộc chia được lưu ngay trên máy của bạn. Muốn gửi cho cả nhóm thì bấm "Chia sẻ link": link gồm thành viên, khoản chi và kết quả ai nợ ai, ai mở cũng xem và sửa tiếp được trên máy của họ. Thông tin ngân hàng không đi theo link — mã QR của mỗi người chỉ hiện trên máy đã lưu tài khoản của chính họ.',
  },
  {
    question: 'Nhóm đông người thì phải chuyển tiền bao nhiêu lần?',
    answer:
      'Ít hơn bạn nghĩ. Thay vì từng cặp một trả qua trả lại, app ghép người đang nợ nhiều nhất với người cần được nhận nhiều nhất, nên nhóm n người tối đa chỉ cần n−1 lần chuyển là hết nợ. Nhóm 6 người đi chơi thường chỉ còn khoảng 3–5 lần chuyển, thay vì hàng chục lần nếu tự tính tay.',
  },
  {
    question: 'Chia Tiền có miễn phí không?',
    answer:
      'Miễn phí. Không quảng cáo chen ngang lúc chốt tiền — mở trang là dùng ngay cho chuyến đi, bữa nhậu hay tiền trọ của nhóm bạn.',
  },
];
