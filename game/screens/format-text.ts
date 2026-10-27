/**
 * Format các dãy số dài trong MỘT chuỗi văn bản thành dạng phân nghìn
 * kiểu vi-VN (1260000 → «1.260.000»). Dùng cho các chuỗi do engine sinh
 * (vd `caps.violations` — engine là nguồn sự thật, KHÔNG sửa chuỗi ở
 * engine; chỉ format tại điểm hiển thị). Chỉ đụng dãy từ 4 chữ số trở
 * lên; số ngắn (< 1000), chữ và dấu câu giữ nguyên.
 */
export function formatAmountsInText(text: string): string {
  return text.replace(/\d{4,}/g, (run) => run.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
}

/**
 * Dịch chuỗi vi phạm trần của engine (game/engine/caps.ts) sang tiếng
 * người tại TẦNG HIỂN THỊ (Addendum §6) — engine giữ nguyên chuỗi
 * gốc. Số giữ đúng định dạng của chuỗi gốc (điểm render format tiếp
 * bằng formatAmountsInText). Chuỗi không khớp mẫu nào → trả nguyên
 * văn.
 */
export function humanizeCapViolation(text: string): string {
  const eff = text.match(
    /^Vượt trần tổng hiệu dụng cho nhóm (\d+) người: tổng hoá đơn ([\d.]+) ₫ > ([\d.]+) ₫\.$/,
  );
  if (eff) {
    return `Hoá đơn đang là ${eff[2]} ₫ — nhóm ${eff[1]} người chỉ chơi được tới ${eff[3]} ₫. Giảm tổng hoá đơn để chơi.`;
  }
  const total = text.match(/^Vượt trần tổng: tổng hoá đơn ([\d.]+) ₫ > trần tổng ([\d.]+) ₫\.$/);
  if (total) {
    return `Hoá đơn đang là ${total[1]} ₫, cao hơn mức tối đa của game là ${total[2]} ₫.`;
  }
  const extra = text.match(
    /^Vượt trần gánh-thêm: người được chọn sẽ gánh thêm tối đa ([\d.]+) ₫ > trần gánh-thêm ([\d.]+) ₫\.$/,
  );
  if (extra) {
    return `Người đãi có thể phải gánh thêm tới ${extra[1]} ₫, quá mức cho phép ${extra[2]} ₫.`;
  }
  return text;
}
