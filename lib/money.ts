/**
 * Định dạng & đọc tiền VND.
 *
 * Hiển thị: Intl.NumberFormat('vi-VN') — nhóm nghìn bằng dấu chấm, hậu tố ₫.
 * Nhập liệu: người dùng gõ số thô ("150000" hoặc "150.000"), app hiển thị lại
 * có phân nhóm ngay trong lúc gõ và lưu giá trị số nguyên đồng.
 */

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const groupFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** 150000 -> "150.000 ₫" */
export function formatVND(amount: number): string {
  return vndFormatter.format(Math.round(amount));
}

/** 150000 -> "150.000" (không kèm ký hiệu tiền tệ, dùng trong ô nhập). */
export function formatGrouped(amount: number): string {
  return groupFormatter.format(Math.round(amount));
}

/**
 * Đọc chuỗi người dùng gõ thành số nguyên đồng.
 * Bỏ mọi ký tự không phải chữ số ("150.000đ" -> 150000). Chuỗi rỗng -> 0.
 */
export function parseVNDInput(text: string): number {
  const digits = text.replace(/\D/g, '');
  if (!digits) return 0;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : 0;
}

/* ------------------------------------------------------------------ */
/* Định dạng rút gọn cho số tiền lớn (REDESIGN-V2, DESIGN-LANGUAGE    */
/* §3.3 — Panel-02 S-1′′): bề mặt hẹp (hàng ledger, hàng lệnh chuyển, */
/* dòng chốt của Settlement Strip) không bao giờ để span tiền thành  */
/* min-content phá lưới. Dạng đầy đủ chỉ dùng khi số có ≤ 12 chữ số;  */
/* từ 13 chữ số trở lên dùng dạng rút gọn có đơn vị dưới đây. Giá trị */
/* ĐẦY ĐỦ luôn tới được trong ≤ 1 thao tác (chi tiết khoản / bản     */
/* copy / QR Sheet luôn in số đầy đủ) — dạng rút gọn KHÔNG bao giờ    */
/* dùng trong bản copy quyết toán, payload QR hay ô nhập đang sửa.   */
/* ------------------------------------------------------------------ */

/** Đơn vị rút gọn, từ lớn xuống nhỏ: giá trị tuyệt đối của đơn vị (đồng). */
// BigInt qua constructor (không dùng literal 10n) vì tsconfig target
// ES2017 — cú pháp literal BigInt đòi target ≥ ES2020.
const pow10 = (n: number): bigint => BigInt(10) ** BigInt(n);

const SHORT_UNITS: readonly { value: bigint; label: string }[] = [
  { value: pow10(15), label: 'triệu tỷ' },
  { value: pow10(12), label: 'nghìn tỷ' },
  { value: pow10(9), label: 'tỷ' },
];

/**
 * Làm tròn mantissa = abs / unit về tối đa 4 chữ số có nghĩa, half-up,
 * bằng số học nguyên BigInt (chính xác ở biên .5, không lệ thuộc float).
 * Trả về { scaled, decimals }: mantissa đã làm tròn = scaled / 10^decimals.
 */
function roundMantissa(abs: bigint, unit: bigint): { scaled: bigint; decimals: number } {
  const intDigits = abs < unit * pow10(1) ? 1 : abs < unit * pow10(2) ? 2 : 3;
  const decimals = 4 - intDigits;
  const scale = pow10(decimals);
  const numerator = abs * scale;
  let quotient = numerator / unit;
  const remainder = numerator % unit;
  if (remainder * BigInt(2) >= unit) quotient += BigInt(1); // half-up
  return { scaled: quotient, decimals };
}

/**
 * Định dạng rút gọn có đơn vị cho số tiền ≥ 13 chữ số; ≤ 12 chữ số trả
 * về formatVND nguyên vẹn (999_999_999_999 -> "999.999.999.999 ₫").
 *
 * Đơn vị là đơn vị LỚN NHẤT trong {triệu tỷ 1e15, nghìn tỷ 1e12, tỷ 1e9}
 * sao cho mantissa ∈ [1, 1000); mantissa tối đa 4 chữ số có nghĩa, làm
 * tròn half-up, phần thập phân phân cách bằng dấu phẩy kiểu Việt, bỏ số
 * 0 thập phân thừa; nếu làm tròn đẩy mantissa ≥ 1000 thì nâng một đơn
 * vị. Số âm: dấu trừ phía trước dạng rút gọn của trị tuyệt đối.
 *
 * Ví dụ: 1_000_000_000_000 -> "1 nghìn tỷ ₫";
 * 999_999_600_000_000 -> "1 triệu tỷ ₫" (mantissa 999,9996 làm tròn
 * lên 1000 → nâng đơn vị).
 */
export function formatVNDShort(amount: number): string {
  const rounded = Math.round(amount);
  const abs = BigInt(Math.abs(rounded));
  if (abs.toString().length <= 12) return formatVND(rounded);

  const sign = rounded < 0 ? '-' : '';
  // Đơn vị lớn nhất mà mantissa ∈ [1, 1000). Số ≥ 13 chữ số luôn khớp
  // nghìn tỷ hoặc triệu tỷ; tỷ giữ trong thang cho đủ luật §3.3.
  let unitIdx = SHORT_UNITS.findIndex((u) => abs >= u.value && abs < u.value * pow10(3));
  if (unitIdx === -1) unitIdx = 0; // ≥ 1 triệu tỷ: dùng đơn vị lớn nhất

  let { scaled, decimals } = roundMantissa(abs, SHORT_UNITS[unitIdx].value);
  // Làm tròn đẩy mantissa ≥ 1000 → nâng một đơn vị rồi làm tròn lại.
  while (scaled >= pow10(3) * pow10(decimals) && unitIdx > 0) {
    unitIdx -= 1;
    ({ scaled, decimals } = roundMantissa(abs, SHORT_UNITS[unitIdx].value));
  }

  const scale = pow10(decimals);
  const intPart = scaled / scale;
  const fracPart = scaled % scale;
  let mantissa = formatGrouped(Number(intPart));
  if (fracPart !== BigInt(0)) {
    const frac = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
    if (frac) mantissa += `,${frac}`;
  }
  // Hậu tố ₫ tách bằng NBSP — khớp đúng formatVND (Intl vi-VN) để hai
  // dạng hiển thị không khác nhau ở ký tự khoảng trắng.
  return `${sign}${mantissa} ${SHORT_UNITS[unitIdx].label}\u00A0₫`;
}

/**
 * Tên rõ cho UI dùng formatVNDShort ở các bề mặt hẹp (hàng ledger,
 * hàng lệnh chuyển, dòng chốt của Settlement Strip) — cùng một hàm,
 * đặt tên theo vị trí dùng để code UI đọc rõ ý. Bề mặt rộng / bản copy
 * / chi tiết luôn dùng formatVND (số đầy đủ).
 */
export const formatVNDDisplay = formatVNDShort;
