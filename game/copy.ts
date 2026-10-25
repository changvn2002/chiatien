// copy.ts — Các câu chữ CHỐT CỨNG của SPEC, giữ một nguồn duy nhất để mọi
// màn dùng nguyên văn, tránh lệch chữ giữa M2/M5/M7.
//
// RÀ SOÁT TỪ VỰNG: toàn bộ copy trong game/ phải qua danh sách cấm của
// SPEC §2 (từ vựng cờ bạc + các câu bị cấm về công bằng/xác minh QR) —
// danh sách nguyên văn nằm ở SPEC §2, hồ sơ này không chép lại các từ đó.
// Mọi màn phải dùng các hằng số ở đây cho những câu bắt buộc nguyên văn.

/** Dòng trách nhiệm QR — nguyên văn SPEC §M2 (R2-3.5), hiện ở M2 và lặp lại ở M7. */
export const QR_RESPONSIBILITY_LINE =
  'App chỉ đọc và hiển thị thông tin chứa trong mã QR do nhóm cung cấp; app không xác minh tài khoản này thuộc về quán và không thực hiện việc chuyển tiền. Nhóm tự đối chiếu tên người nhận với QR tại quầy hoặc hoá đơn trước khi chơi, và người trả tiền kiểm tra lại tên người nhận trong app ngân hàng của mình trước khi xác nhận chuyển.';

/**
 * Miễn trừ QR RÚT GỌN 1 dòng (FIX-UX-GAME, mục 3 của đợt sửa sau chơi thử
 * live 2026-10-25): màn kết quả + màn thiết lập chỉ hiện câu này thay cho
 * đoạn dài QR_RESPONSIBILITY_LINE — ý giữ nguyên (app không xác minh chủ
 * tài khoản, không chuyển tiền thay; nhóm tự đối chiếu tên trước khi
 * chuyển), chữ rút còn một dòng đọc lướt.
 */
export const QR_RESPONSIBILITY_SHORT =
  'App chỉ hiển thị thông tin trong QR nhóm cung cấp và không chuyển tiền thay — hãy đối chiếu tên người nhận với quán trước khi chuyển.';

/** Câu trung thực bắt buộc về RNG — nguyên văn SPEC §2 (R2-1.6), đặt ở màn luật chơi/luật hoà. */
export const RNG_HONESTY_LINE =
  'Mã ván và seed được công khai để cả nhóm nhận diện ván, xem lại đúng ván đó, và kiểm tra kết quả khớp với seed đã cam kết trước khi ván chạy. Game chạy trên máy của một thành viên và dựa trên sự cùng chứng kiến của cả nhóm — app không chứng minh được seed không bị chọn trước, nên ván chỉ nên dùng khi cả nhóm tin nhau và cùng có mặt từ lúc bắt đầu.';

/** Cảnh báo thường trực của nhánh 2b (QR không có tên) — SPEC §M2, lặp lại ở M7. */
export const QR_NO_NAME_WARNING =
  'QR này không cho biết tên người nhận trong app. Khi quét bằng app ngân hàng, hãy đối chiếu tên người nhận hiện trong app ngân hàng với quán trước khi chuyển.';

/** Câu nhắc đối chiếu cuối cạnh QR ở M7 — ý nguyên văn SPEC §M7 (R2-3 Bước 4). */
export const QR_FINAL_CHECK_LINE =
  'Trước khi chuyển tiền, hãy dừng lại và kiểm tra: nếu tên người nhận hiện trong app ngân hàng khác với tên đã xác nhận ở bước đối chiếu QR, hãy dừng lại và kiểm tra với quán trước.';

/** Nhãn lối thoát dùng ở MỌI màn — đúng nguyên cụm (luật chung cuối §4). */
export const SPLIT_EVEN_LABEL = 'Chia đều cho lành';

/** Nguồn xác nhận QR theo thứ tự mạnh → yếu (SPEC §M2). Nguồn cuối một mình KHÔNG đủ. */
export const QR_SOURCES = [
  { id: 'counter', label: 'QR in tại quầy / thu ngân của quán', strong: true },
  { id: 'bill', label: 'QR in trên hoá đơn hoặc menu của quán', strong: true },
  { id: 'staff', label: 'Lời xác nhận của nhân viên quán', strong: true },
  { id: 'provider-word', label: 'Lời cam đoan của người cung cấp QR', strong: false },
] as const;

export type QrSourceId = (typeof QR_SOURCES)[number]['id'];
