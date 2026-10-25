// emv.ts — Giải mã payload EMVCo/VietQR ở tầng game (SPEC §M2).
//
// LƯU Ý HỒ SƠ (lệch so với brief): lib/vietqr.ts của app CHỈ có hàm DỰNG
// payload (buildVietQrPayload) + bảng BANKS/findBank + crc16Ccitt — KHÔNG
// có hàm parse (không tồn tại parseVietQr trong lib ở mốc v1.9.1, đã rà
// toàn lib/). Vì bất biến cấm sửa lib/, parser TLV đọc payload nằm ở đây,
// trong game/, và chỉ DÙNG các hàm thuần có sẵn của lib qua adapter
// (findBankByBin tra tên ngân hàng theo BIN, crc16 kiểm tra CRC).
//
// Payload QR của quán GIỮ NGUYÊN như quán cấp: module này chỉ đọc để hiển
// thị đối chiếu — không sửa, không dựng lại, không nhúng số tiền (SPEC §M2).

import { crc16, findBankByBin } from '../adapter';

export interface ParsedShopQr {
  /** Payload gốc nguyên văn (chỉ sống trong bộ nhớ phiên game — ARCH §8). */
  raw: string;
  /** Mã BIN 6 số của ngân hàng nhận. */
  bin: string;
  /** Tên ngân hàng tra từ bảng BANKS của lib; null khi BIN không có trong bảng (hiển thị mã BIN nguyên văn, cấm đoán). */
  bankName: string | null;
  /** Tên ngắn ngân hàng (vd Vietcombank); null khi không tra được. */
  bankShortName: string | null;
  /** Số tài khoản nhận nguyên văn trong payload. */
  accountNumber: string;
  /** STK che giữa, giữ đầu + đuôi đủ để đối chiếu (vd "12••••7890"). */
  maskedAccount: string;
  /**
   * Tên chủ tài khoản NẾU payload mang theo (tag 59 EMVCo / trường tên
   * trong một số biến thể VietQR). Chuẩn VietQR chuyển khoản thường KHÔNG
   * mang tên (xem ghi chú trong lib/vietqr.ts) → null là nhánh 2b thường gặp.
   */
  accountName: string | null;
  /** Số tiền nhúng sẵn trong QR (tag 54) — có ở QR động; null ở QR tĩnh. */
  amountVnd: number | null;
  /** true khi Point of Initiation (tag 01) = "12" (QR động). */
  isDynamic: boolean;
}

export type QrParseResult =
  | { ok: true; parsed: ParsedShopQr }
  | { ok: false; reason: string };

/** Đọc các trường TLV liên tiếp; null khi cấu trúc không hợp lệ (độ dài rác/chữ ở trường độ dài…). */
function readTlvFields(input: string): Map<string, string> | null {
  const fields = new Map<string, string>();
  let i = 0;
  while (i + 4 <= input.length) {
    const id = input.slice(i, i + 2);
    const lenText = input.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenText)) return null;
    const len = Number.parseInt(lenText, 10);
    const value = input.slice(i + 4, i + 4 + len);
    if (value.length !== len) return null;
    if (!fields.has(id)) fields.set(id, value);
    i += 4 + len;
  }
  if (i !== input.length) return null;
  return fields;
}

/** Che giữa số tài khoản: giữ 2 ký tự đầu + 4 ký tự đuôi; tài khoản ngắn thì giữ đuôi 4. */
export function maskAccountNumber(accountNumber: string): string {
  const v = accountNumber.trim();
  if (v.length <= 6) return v.length <= 4 ? v : `${v.slice(0, 2)}••••`;
  return `${v.slice(0, 2)}••••${v.slice(-4)}`;
}

/**
 * Parse một chuỗi payload QR. Trả ok=false (nhánh 2c) khi: không phải
 * EMVCo (thiếu tag 00 = "01"), CRC sai, thiếu merchant account VietQR
 * (tag 38 / GUID NAPAS), hoặc thiếu BIN/số tài khoản.
 */
export function parseShopQrPayload(rawInput: string): QrParseResult {
  const raw = rawInput.trim();
  if (!raw) return { ok: false, reason: 'Nội dung QR trống.' };
  if (raw.length < 12) return { ok: false, reason: 'Nội dung quá ngắn, không phải mã EMV.' };

  // CRC (tag 63, 4 ký tự cuối) — kiểm bằng crc16Ccitt của lib.
  const crcGiven = raw.slice(-4).toUpperCase();
  const crcBody = raw.slice(0, -4);
  if (!/^[0-9A-F]{4}$/.test(crcGiven) || crc16(crcBody) !== crcGiven) {
    return { ok: false, reason: 'Mã kiểm tra (CRC) của QR không khớp — QR có thể bị mờ, cắt góc hoặc không chuẩn EMV.' };
  }

  const top = readTlvFields(raw);
  if (!top) return { ok: false, reason: 'Cấu trúc QR không đọc được theo chuẩn EMV.' };
  if (top.get('00') !== '01') return { ok: false, reason: 'Đây không phải mã EMV (thiếu dấu định dạng chuẩn).' };

  const merchant = top.get('38');
  if (!merchant) return { ok: false, reason: 'QR không chứa tài khoản VietQR (thiếu trường 38).' };
  const merchantFields = readTlvFields(merchant);
  if (!merchantFields || merchantFields.get('00') !== 'A000000727') {
    return { ok: false, reason: 'QR không thuộc hệ VietQR/NAPAS.' };
  }
  const beneficiaryRaw = merchantFields.get('01');
  if (!beneficiaryRaw) return { ok: false, reason: 'QR thiếu thông tin tài khoản nhận.' };
  const beneficiary = readTlvFields(beneficiaryRaw);
  const bin = beneficiary?.get('00') ?? '';
  const accountNumber = beneficiary?.get('01') ?? '';
  if (!/^\d{6}$/.test(bin) || !accountNumber) {
    return { ok: false, reason: 'QR thiếu mã ngân hàng (BIN) hoặc số tài khoản nhận.' };
  }

  const bank = findBankByBin(bin);
  const amountText = top.get('54');
  const amountVnd =
    amountText && /^\d+$/.test(amountText) ? Number.parseInt(amountText, 10) : null;
  // Tên chủ TK: EMVCo tag 59 (merchant name) khi payload có mang; chuẩn
  // VietQR chuyển khoản thường không mang tên → null (nhánh 2b).
  const nameText = (top.get('59') ?? '').trim();

  return {
    ok: true,
    parsed: {
      raw,
      bin,
      bankName: bank?.name ?? null,
      bankShortName: bank?.shortName ?? null,
      accountNumber,
      maskedAccount: maskAccountNumber(accountNumber),
      accountName: nameText ? nameText : null,
      amountVnd,
      isDynamic: top.get('01') === '12',
    },
  };
}
