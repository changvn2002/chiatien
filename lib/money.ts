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
