// M2 — Xác nhận QR quán (SPEC §M2, giao thức R2-3).
// Ba nhánh: 2a có tên chủ TK / 2b không tên / 2c không giải mã được.
// Tách vai trò bắt buộc: người xác nhận ≠ người cung cấp. Nguồn xác nhận
// mạnh → yếu; nguồn yếu nhất (lời cam đoan của người cung cấp) một mình
// KHÔNG đủ. Dòng trách nhiệm QR nguyên văn hiện ở màn này và lặp lại ở M7.

'use client';

export function bankDisplayOf(
  parsed: { bankName: string | null; bankShortName: string | null; bin: string } | null,
): string | null {
  if (!parsed) return null;
  // BIN không có trong bảng tra -> hiển thị mã BIN nguyên văn, cấm đoán tên ngân hàng (SPEC §M2).
  return parsed.bankName
    ? `${parsed.bankName} (${parsed.bankShortName ?? parsed.bin})`
    : `Mã ngân hàng (BIN): ${parsed.bin}`;
}
