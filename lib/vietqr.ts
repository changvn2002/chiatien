import type { BankInfo, Member } from './types';

/**
 * VietQR — dựng payload EMVCo/VietQR ĐỘNG 100% client-side (DATA-08):
 * chuỗi payload được sinh tại máy người dùng và worker UI vẽ QR từ chính
 * chuỗi này (thư viện qrcode) — BIN, số tài khoản, tên chủ tài khoản và
 * số tiền KHÔNG rời khỏi thiết bị. Thiết kế cũ (ảnh img.vietqr.io nhúng
 * BIN + số tài khoản + tên + số tiền trong URL ảnh) đã bị XOÁ hẳn.
 *
 * Cấu trúc payload (NAPAS/EMVCo):
 *   00 (Payload Format Indicator) = "01"
 *   01 (Point of Initiation)      = "12" (động — có số tiền)
 *   38 (Merchant Account — VietQR):
 *      00 = "A000000727" (GUID NAPAS)
 *      01 = beneficiary: 00 = BIN (6 số), 01 = số tài khoản
 *      02 = "QRIBFTTA" (mã dịch vụ chuyển khoản tới tài khoản)
 *   53 (Currency) = "704" (VND)
 *   54 (Amount)   = số tiền nguyên đồng
 *   58 (Country)  = "VN"
 *   62 (Additional Data): 08 = nội dung chuyển khoản (addInfo)
 *   63 (CRC)      = CRC16-CCITT của toàn bộ phần trước, 4 ký tự hex
 *
 * Mã dịch vụ "QRIBFTTA" và toàn bộ thứ tự/định dạng field được KIỂM CHỨNG
 * bằng payload THẬT do img.vietqr.io sinh (giải mã QR mẫu ngày
 * 2026-10-23, golden vector trong lib/vietqr.spec.ts) — bản đặc tả ban
 * đầu ghi "QRIBFTTC" nhưng payload thật dùng "QRIBFTTA", builder theo
 * payload thật.
 */

export interface Bank {
  bin: string;
  name: string;
  shortName: string;
}

/** Ngân hàng thương mại phổ biến tại Việt Nam, mã BIN theo chuẩn NAPAS. */
export const BANKS: Bank[] = [
  { bin: '970436', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', shortName: 'Vietcombank' },
  { bin: '970415', name: 'Ngân hàng TMCP Công thương Việt Nam', shortName: 'VietinBank' },
  { bin: '970418', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV' },
  { bin: '970405', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn', shortName: 'Agribank' },
  { bin: '970407', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', shortName: 'Techcombank' },
  { bin: '970422', name: 'Ngân hàng TMCP Quân đội', shortName: 'MB Bank' },
  { bin: '970416', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB' },
  { bin: '970432', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank' },
  { bin: '970423', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank' },
  { bin: '970403', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank' },
  { bin: '970437', name: 'Ngân hàng TMCP Phát triển TP.HCM', shortName: 'HDBank' },
  { bin: '970443', name: 'Ngân hàng TMCP Sài Gòn – Hà Nội', shortName: 'SHB' },
  { bin: '970441', name: 'Ngân hàng TMCP Quốc tế Việt Nam', shortName: 'VIB' },
  { bin: '970440', name: 'Ngân hàng TMCP Đông Nam Á', shortName: 'SeABank' },
  { bin: '970448', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB' },
  { bin: '970426', name: 'Ngân hàng TMCP Hàng hải Việt Nam', shortName: 'MSB' },
  { bin: '970431', name: 'Ngân hàng TMCP Xuất nhập khẩu Việt Nam', shortName: 'Eximbank' },
  { bin: '970428', name: 'Ngân hàng TMCP Nam Á', shortName: 'Nam A Bank' },
  { bin: '970409', name: 'Ngân hàng TMCP Bắc Á', shortName: 'Bac A Bank' },
  { bin: '970412', name: 'Ngân hàng TMCP Đại chúng Việt Nam', shortName: 'PVcomBank' },
  { bin: '970449', name: 'Ngân hàng TMCP Bưu điện Liên Việt', shortName: 'LPBank' },
  { bin: '970425', name: 'Ngân hàng TMCP An Bình', shortName: 'ABBANK' },
  { bin: '970452', name: 'Ngân hàng TMCP Kiên Long', shortName: 'Kienlongbank' },
  { bin: '970427', name: 'Ngân hàng TMCP Việt Á', shortName: 'VietABank' },
  { bin: '970433', name: 'Ngân hàng TMCP Việt Nam Thương Tín', shortName: 'VietBank' },
  { bin: '970400', name: 'Ngân hàng TMCP Sài Gòn Công Thương', shortName: 'Saigonbank' },
  { bin: '970438', name: 'Ngân hàng TMCP Bảo Việt', shortName: 'BaoViet Bank' },
  { bin: '970414', name: 'Ngân hàng TM TNHH MTV Đại Dương', shortName: 'OceanBank' },
  { bin: '970408', name: 'Ngân hàng TM TNHH MTV Dầu khí Toàn cầu', shortName: 'GPBank' },
  { bin: '970430', name: 'Ngân hàng TMCP Xăng dầu Petrolimex', shortName: 'PGBank' },
  { bin: '970419', name: 'Ngân hàng TMCP Quốc Dân', shortName: 'NCB' },
  { bin: '970406', name: 'Ngân hàng TMCP Đông Á', shortName: 'DongA Bank' },
  { bin: '970424', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', shortName: 'Shinhan Bank' },
  { bin: '970457', name: 'Ngân hàng TNHH MTV Woori Việt Nam', shortName: 'Woori Bank' },
  { bin: '970429', name: 'Ngân hàng TMCP Sài Gòn', shortName: 'SCB' },
];

export function findBank(bin: string): Bank | undefined {
  return BANKS.find((b) => b.bin === bin);
}

/** Thành viên có đủ thông tin ngân hàng để sinh VietQR hay chưa. */
export function hasBank(member: Member): member is Member & { bank: BankInfo } {
  return Boolean(
    member.bank &&
    member.bank.bin.trim() &&
    member.bank.accountName.trim() &&
    // M-3 (Panel #02): "có VietQR" chỉ được khẳng định khi số tài khoản
    // qua được validation định dạng — số rác từng lưu ở bản cũ (trước khi
    // có validation) không còn làm UI nói dối nữa.
    isValidAccountNumber(member.bank.accountNumber),
  );
}

/* ------------------------------------------------------------------ */
/* Validation số tài khoản (M-3, Panel chiatien #02)                   */
/*                                                                     */
/* Bằng chứng định dạng đã kiểm chứng từ chính các ngân hàng trong     */
/* danh sách BANKS ở trên (đọc 2026-10-23):                            */
/* - ACB: số tài khoản là dãy số dài 9–14 ký tự số tuỳ ngân hàng.       */
/* - VPBank: số tài khoản 9–15 ký tự; ví dụ theo ngân hàng: VPBank     */
/*   8–9 chữ số, Vietcombank 13, Agribank 13, Techcombank 14, BIDV     */
/*   14, VietinBank 12 KÝ TỰ CHỮ VÀ SỐ (chứng minh không thể bắt       */
/*   digits-only tuyệt đối).                                           */
/* Suy ra rule dùng chung an toàn cho cả 35 ngân hàng trong danh sách: */
/* bỏ khoảng trắng/chấm/gạch nối -> 8–19 ký tự chữ-số, chứa ít nhất    */
/* một chữ số. "abc" (3 ký tự) và "12" (2 ký tự) — hai ca Panel bắt     */
/* được — đều bị loại; tài khoản thật ngắn nhất đã có tài liệu (8 ký   */
/* tự của VPBank) vẫn qua.                                             */
/* ------------------------------------------------------------------ */

export const ACCOUNT_NUMBER_MIN_LENGTH = 8;
export const ACCOUNT_NUMBER_MAX_LENGTH = 19;

/** Chuẩn hoá số tài khoản để kiểm tra/lưu: bỏ khoảng trắng, chấm, gạch nối. */
export function normalizeAccountNumber(value: string): string {
  return value.replace(/[\s.\-]/g, '');
}

/**
 * Lỗi định dạng số tài khoản, dạng câu tiếng Việt hiển thị thẳng cho
 * người dùng; null = hợp lệ. Một nguồn sự thật duy nhất cho cả form
 * (member-editor), lớp sanitize và hasBank.
 */
export function accountNumberError(value: string): string | null {
  const normalized = normalizeAccountNumber(value.trim());
  if (!normalized) return 'Chưa nhập số tài khoản.';
  if (!/^[0-9A-Za-z]+$/.test(normalized)) {
    return 'Số tài khoản chỉ gồm chữ số và chữ cái — không chứa ký tự đặc biệt.';
  }
  if (normalized.length < ACCOUNT_NUMBER_MIN_LENGTH) {
    return `Số tài khoản quá ngắn (${normalized.length} ký tự) — tài khoản ngân hàng tại Việt Nam có từ ${ACCOUNT_NUMBER_MIN_LENGTH} đến ${ACCOUNT_NUMBER_MAX_LENGTH} ký tự. Hãy kiểm tra lại số tài khoản.`;
  }
  if (normalized.length > ACCOUNT_NUMBER_MAX_LENGTH) {
    return `Số tài khoản quá dài (${normalized.length} ký tự) — tài khoản ngân hàng tại Việt Nam có từ ${ACCOUNT_NUMBER_MIN_LENGTH} đến ${ACCOUNT_NUMBER_MAX_LENGTH} ký tự. Hãy kiểm tra lại số tài khoản.`;
  }
  if (!/[0-9]/.test(normalized)) {
    return 'Số tài khoản phải chứa ít nhất một chữ số.';
  }
  return null;
}

/** Số tài khoản có đúng định dạng để dựng VietQR hay không (M-3). */
export function isValidAccountNumber(value: string): boolean {
  return accountNumberError(value) === null;
}

/**
 * CRC16-CCITT (đa thức 0x1021, khởi tạo 0xFFFF, không xor-out) — checksum
 * chốt cuối payload EMVCo. Trả 4 ký tự hex viết hoa, zero-pad.
 */
export function crc16Ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Một field TLV: id 2 ký tự + độ dài 2 chữ số thập phân zero-pad + value. */
function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

/** Cắt ở tối đa `max` ký tự mà không xé đôi surrogate pair (như lib/sanitize.ts). */
function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut;
}

/** Độ dài tối đa của nội dung chuyển khoản (addInfo) trong payload VietQR. */
export const MAX_ADD_INFO_LENGTH = 50;

/**
 * Dựng chuỗi payload VietQR động cho một lần chuyển khoản.
 *
 * @throws RangeError nếu amount không phải số nguyên dương hữu hạn —
 *   payload không số tiền/số tiền rác không bao giờ được sinh lặng lẽ.
 * addInfo được trim và cắt ở MAX_ADD_INFO_LENGTH ký tự; rỗng -> bỏ tag 62.
 * accountName KHÔNG nằm trong payload (chuẩn VietQR động không mang tên
 * chủ tài khoản — app ngân hàng tự hiển thị khi quét).
 */
export function buildVietQrPayload(bank: BankInfo, amount: number, addInfo: string): string {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new RangeError(
      `buildVietQrPayload: amount phải là số nguyên dương hữu hạn, nhận được ${amount}`,
    );
  }
  const bin = bank.bin.trim();
  const accountNumber = bank.accountNumber.trim();
  const beneficiary = tlv('00', bin) + tlv('01', accountNumber);
  const merchantAccount = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');
  const info = truncateText(addInfo.trim(), MAX_ADD_INFO_LENGTH);

  let payload =
    '000201' +
    '010212' +
    tlv('38', merchantAccount) +
    '5303704' +
    tlv('54', String(amount)) +
    '5802VN';
  if (info) payload += tlv('62', tlv('08', info));
  payload += '6304';
  return payload + crc16Ccitt(payload);
}
