import { describe, expect, it } from 'vitest';
import { formatGrouped, formatVND, parseVNDInput } from './money';

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
