// tick-map.spec.ts — Kiểm biên + đơn điệu của ánh xạ âm thanh G2 (SPEC §7.5).
import { describe, expect, it } from 'vitest';
import { clamp01, drumRate, drumVolume, tickRate, tickVolume } from './tick-map';

describe('clamp01', () => {
  it('giữ nguyên giá trị trong [0,1], kẹp ngoài khoảng', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(-0.3)).toBe(0);
    expect(clamp01(1.7)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('tickRate / tickVolume — hàm của vận tốc góc v01', () => {
  it('đúng hai biên: v=0 → rate 0,75 / vol 0,12; v=1 → rate 1,30 / vol 0,62', () => {
    expect(tickRate(0)).toBeCloseTo(0.75, 10);
    expect(tickVolume(0)).toBeCloseTo(0.12, 10);
    expect(tickRate(1)).toBeCloseTo(1.3, 10);
    expect(tickVolume(1)).toBeCloseTo(0.62, 10);
  });

  it('đầu vào ngoài [0,1] bị kẹp về đúng biên', () => {
    expect(tickRate(-2)).toBeCloseTo(tickRate(0), 10);
    expect(tickVolume(-2)).toBeCloseTo(tickVolume(0), 10);
    expect(tickRate(5)).toBeCloseTo(tickRate(1), 10);
    expect(tickVolume(5)).toBeCloseTo(tickVolume(1), 10);
  });

  it('đơn điệu tăng nghiêm ngặt theo v01', () => {
    let prevRate = -Infinity;
    let prevVol = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const v = i / 20;
      expect(tickRate(v)).toBeGreaterThan(prevRate);
      expect(tickVolume(v)).toBeGreaterThan(prevVol);
      prevRate = tickRate(v);
      prevVol = tickVolume(v);
    }
  });

  it('điểm giữa v=0,5 nằm đúng giữa dải', () => {
    expect(tickRate(0.5)).toBeCloseTo(1.025, 10);
    expect(tickVolume(0.5)).toBeCloseTo(0.37, 10);
  });
});

describe('drumRate / drumVolume — hàm của (1 − thời gian còn lại r01)', () => {
  it('đúng hai biên: r=1 (mới bắt đầu) → rate 0,90 / vol 0,15; r=0 (sắp dừng) → rate 1,20 / vol 0,65', () => {
    expect(drumRate(1)).toBeCloseTo(0.9, 10);
    expect(drumVolume(1)).toBeCloseTo(0.15, 10);
    expect(drumRate(0)).toBeCloseTo(1.2, 10);
    expect(drumVolume(0)).toBeCloseTo(0.65, 10);
  });

  it('đầu vào ngoài [0,1] bị kẹp về đúng biên', () => {
    expect(drumRate(-1)).toBeCloseTo(drumRate(0), 10);
    expect(drumVolume(-1)).toBeCloseTo(drumVolume(0), 10);
    expect(drumRate(3)).toBeCloseTo(drumRate(1), 10);
    expect(drumVolume(3)).toBeCloseTo(drumVolume(1), 10);
  });

  it('đơn điệu tăng theo (1 − r01): thời gian còn lại càng ít, trống càng căng/lớn', () => {
    let prevRate = -Infinity;
    let prevVol = -Infinity;
    // r01 đi từ 1 → 0 (thời gian còn lại giảm dần).
    for (let i = 0; i <= 20; i++) {
      const r = 1 - i / 20;
      expect(drumRate(r)).toBeGreaterThanOrEqual(prevRate);
      expect(drumVolume(r)).toBeGreaterThanOrEqual(prevVol);
      if (i > 0) {
        expect(drumRate(r)).toBeGreaterThan(prevRate);
        expect(drumVolume(r)).toBeGreaterThan(prevVol);
      }
      prevRate = drumRate(r);
      prevVol = drumVolume(r);
    }
  });
});
