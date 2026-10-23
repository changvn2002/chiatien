import type { BankInfo, Member } from './types';

/**
 * VietQR — sinh ảnh QR chuyển khoản qua dịch vụ ảnh chính thức của VietQR:
 *   https://img.vietqr.io/image/{BIN}-{accountNumber}-{template}.png
 *     ?amount={số tiền}&addInfo={nội dung chuyển khoản}&accountName={tên chủ TK}
 * Quét bằng app ngân hàng bất kỳ tại Việt Nam đều đọc được (chuẩn NAPAS 247).
 * Template "compact2" = QR + logo ngân hàng + số tài khoản, gọn để nhúng vào
 * danh sách quyết toán.
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
    member.bank.accountNumber.trim() &&
    member.bank.accountName.trim(),
  );
}

/**
 * URL ảnh VietQR thật cho một lần chuyển khoản.
 * Mọi tham số động đều qua encodeURIComponent — tên/nội dung có dấu tiếng Việt
 * vẫn an toàn.
 */
export function vietQrUrl(bank: BankInfo, amount: number, addInfo: string): string {
  // bin cũng phải trim như accountNumber (W2-F7): bin " 970436 " từng sinh
  // path chứa %20 làm hỏng định dạng URL ảnh VietQR.
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bank.bin.trim())}-${encodeURIComponent(
    bank.accountNumber.trim(),
  )}-compact2.png`;
  const params = new URLSearchParams();
  if (amount > 0) params.set('amount', String(Math.round(amount)));
  if (addInfo.trim()) params.set('addInfo', addInfo.trim());
  if (bank.accountName.trim()) params.set('accountName', bank.accountName.trim());
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
