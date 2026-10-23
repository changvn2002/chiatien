import { describe, expect, it } from 'vitest';
import { formatGrouped, formatVND, formatVNDDisplay, formatVNDShort, parseVNDInput } from './money';

describe('money', () => {
  it('formatVND nhóm nghìn bằng dấu chấm, kèm ₫', () => {
    expect(formatVND(150_000)).toBe('150.000 ₫');
    expect(formatVND(0)).toBe('0 ₫');
    expect(formatVND(1_234_567_890)).toBe('1.234.567.890 ₫');
  });

  it('formatGrouped không kèm ký hiệu', () => {
    expect(formatGrouped(2_500_000)).toBe('2.500.000');
  });

  it('parseVNDInput bỏ mọi ký tự không phải số', () => {
    expect(parseVNDInput('150.000')).toBe(150_000);
    expect(parseVNDInput('150,000 đ')).toBe(150_000);
    expect(parseVNDInput('')).toBe(0);
    expect(parseVNDInput('abc')).toBe(0);
  });

  it('format/parse khứ hồi', () => {
    expect(parseVNDInput(formatGrouped(987_654_321))).toBe(987_654_321);
  });
});

describe('formatVNDShort — định dạng rút gọn §3.3 (REDESIGN-V2)', () => {
  it('≤ 12 chữ số: giữ formatVND nguyên vẹn', () => {
    expect(formatVNDShort(999_999_999_999)).toBe('999.999.999.999\u00A0₫');
    expect(formatVNDShort(150_000)).toBe('150.000\u00A0₫');
    expect(formatVNDShort(0)).toBe('0\u00A0₫');
  });

  it('13 chữ số, mantissa tròn đơn vị: 1_000_000_000_000 -> "1 nghìn tỷ\u00A0₫"', () => {
    expect(formatVNDShort(1_000_000_000_000)).toBe('1 nghìn tỷ\u00A0₫');
  });

  it('13 chữ số: 1_234_567_890_123 -> "1,235 nghìn tỷ\u00A0₫" (half-up 4 chữ số có nghĩa)', () => {
    // mantissa = 1,234567890123 -> 4 chữ số có nghĩa, chữ số thứ 5 là 5
    // -> làm tròn lên 1,235; phần thập phân dùng dấu phẩy kiểu Việt.
    expect(formatVNDShort(1_234_567_890_123)).toBe('1,235 nghìn tỷ\u00A0₫');
  });

  it('bỏ số 0 thập phân thừa: 1_500_000_000_000 -> "1,5 nghìn tỷ\u00A0₫"', () => {
    expect(formatVNDShort(1_500_000_000_000)).toBe('1,5 nghìn tỷ\u00A0₫');
  });

  it('mantissa 2 chữ số nguyên: 12_345_678_901_234 -> "12,35 nghìn tỷ\u00A0₫"', () => {
    expect(formatVNDShort(12_345_678_901_234)).toBe('12,35 nghìn tỷ\u00A0₫');
  });

  it('làm tròn đẩy mantissa ≥ 1000 -> nâng một đơn vị: 999_999_600_000_000 -> "1 triệu tỷ\u00A0₫"', () => {
    // Kiểm chứng bằng phép tính: mantissa theo nghìn tỷ = 999,9996;
    // làm tròn half-up ở 4 chữ số có nghĩa (tới hàng phần mười) -> 1000,0
    // -> ≥ 1000 nên nâng lên triệu tỷ, mantissa = 1.
    expect(formatVNDShort(999_999_600_000_000)).toBe('1 triệu tỷ\u00A0₫');
  });

  it('ca biên all-9: 999_999_999_999_999 -> "1 triệu tỷ\u00A0₫" theo quy tắc half-up đã ghi', () => {
    // LƯU Ý LỆCH SPEC (đã báo cáo): DESIGN-LANGUAGE §3.3 in ví dụ
    // "999,9 nghìn tỷ\u00A0₫" cho số này — kết quả đó chỉ đạt được nếu CẮT
    // (truncate) mantissa 999,999… ở 4 chữ số có nghĩa. Nhưng chính
    // §3.3 + brief đều ghi quy tắc "làm tròn half-up" và "nếu làm tròn
    // đẩy mantissa lên ≥ 1000 thì nâng một đơn vị": 999,999… half-up
    // -> 1000 -> nâng đơn vị -> "1 triệu tỷ\u00A0₫". Hai yêu cầu không thể
    // cùng đúng với một quy tắc duy nhất (ca 999_999_600_000_000 ở
    // trên chỉ nâng đơn vị được khi làm tròn). Test này khẳng định
    // kết quả suy ra từ QUY TẮC đã ghi, không khẳng định ví dụ in.
    expect(formatVNDShort(999_999_999_999_999)).toBe('1 triệu tỷ\u00A0₫');
  });

  it('số âm: dấu trừ phía trước dạng rút gọn của trị tuyệt đối', () => {
    expect(formatVNDShort(-1_234_567_890_123)).toBe('-1,235 nghìn tỷ\u00A0₫');
    expect(formatVNDShort(-999_999_999_999)).toBe('-999.999.999.999\u00A0₫');
  });

  it('formatVNDDisplay là cùng định dạng rút gọn (tên rõ cho bề mặt hẹp)', () => {
    expect(formatVNDDisplay).toBe(formatVNDShort);
    expect(formatVNDDisplay(1_234_567_890_123)).toBe('1,235 nghìn tỷ\u00A0₫');
  });
});
