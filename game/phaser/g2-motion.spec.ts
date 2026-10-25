// g2-motion.spec.ts — Bằng chứng máy cho đường cong G2 (SPEC §7.4):
// sau tăng tốc vận tốc góc giảm ĐƠN ĐIỆU, góc đơn điệu tăng (không
// overshoot), và điểm dừng khớp ĐÚNG finalAngleDeg của log (< 0,5°).

import { describe, expect, it } from 'vitest';
import {
  G2_RAMP_RATIO,
  g2AngleDegAt,
  g2AngleFraction,
  g2AngularVelocityDegPerSec,
  g2TrayCellIndexAtPointer,
  g2TrayRotationDegAt,
  g2VelocityShape,
  planG2Spin,
} from './g2-motion';
import { g2CellIndexAtAngle } from './g2-food';

const SAMPLES = 4000;

describe('G2 motion — hình vận tốc', () => {
  it('tăng tốc trong giai đoạn ramp: vận tốc tăng đơn điệu từ 0 tới đỉnh', () => {
    let prev = -Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i / SAMPLES) * G2_RAMP_RATIO;
      const v = g2VelocityShape(t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
    expect(g2VelocityShape(0)).toBeCloseTo(0, 12);
    expect(g2VelocityShape(G2_RAMP_RATIO)).toBeCloseTo(1, 12);
  });

  it('sau ramp: vận tốc GIẢM ĐƠN ĐIỆU nghiêm ngặt cho tới 0, không bao giờ tăng lại', () => {
    let prev = Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      const t = G2_RAMP_RATIO + (i / SAMPLES) * (1 - G2_RAMP_RATIO);
      const v = g2VelocityShape(t);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      if (i > 0 && t < 1) {
        expect(v).toBeLessThan(prev + 1e-9);
      }
      prev = v;
    }
    expect(g2VelocityShape(1)).toBeCloseTo(0, 12);
  });

  it('vận tốc góc thực (độ/giây) cũng giảm đơn điệu sau đỉnh tăng tốc', () => {
    const plan = planG2Spin(137.5, 10);
    const durationSec = plan.durationMs / 1000;
    let prev = Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      const t = G2_RAMP_RATIO + (i / SAMPLES) * (1 - G2_RAMP_RATIO);
      const v = g2AngularVelocityDegPerSec(t, plan.totalAngleDeg, durationSec);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });
});

describe('G2 motion — góc quay', () => {
  it('phân số góc đơn điệu không giảm trên toàn vòng (không overshoot, không quay lui)', () => {
    let prev = -Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const f = g2AngleFraction(t);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = f;
    }
    expect(g2AngleFraction(0)).toBe(0);
    expect(g2AngleFraction(1)).toBeCloseTo(1, 12);
  });

  it('dừng ĐÚNG finalAngleDeg của log (sai số < 0,5°) với mọi góc đích mẫu', () => {
    const finals = [0.5, 45, 137.5, 180, 359.9];
    for (const finalAngleDeg of finals) {
      const plan = planG2Spin(finalAngleDeg, 9);
      const endAngle = g2AngleDegAt(1, plan.totalAngleDeg);
      const rest = ((endAngle % 360) + 360) % 360;
      const expected = ((finalAngleDeg % 360) + 360) % 360;
      const diff = Math.abs(rest - expected);
      expect(Math.min(diff, 360 - diff)).toBeLessThan(0.5);
    }
  });

  it('kế hoạch quay: thời lượng đúng spinSeconds, số vòng chỉ phụ thuộc thời lượng', () => {
    for (const seconds of [8, 9.5, 12]) {
      const a = planG2Spin(10, seconds);
      const b = planG2Spin(300, seconds);
      expect(a.durationMs).toBe(Math.round(seconds * 1000));
      // Mù trước ô/người: đổi góc đích không đổi số vòng nguyên.
      expect(a.fullTurns).toBe(b.fullTurns);
      expect(a.totalAngleDeg - b.totalAngleDeg).toBeCloseTo(10 - 300, 9);
    }
  });
});

describe('G2 motion — mô hình MÂM XOAY THẬT (FIX-V4)', () => {
  it('kế hoạch mang góc mâm: tổng = −tổng góc quét, nghỉ = −góc nghỉ của log', () => {
    for (const finalAngleDeg of [0.5, 45, 137.5, 180, 359.9]) {
      const plan = planG2Spin(finalAngleDeg, 10);
      expect(plan.trayTotalRotationDeg).toBe(-plan.totalAngleDeg);
      expect(plan.trayRestRotationDeg).toBe(-plan.restAngleDeg);
    }
  });

  it('góc mâm tại t01 = −góc quét tại cùng t01 trên toàn hồ sơ', () => {
    const plan = planG2Spin(137.5, 10);
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      expect(g2TrayRotationDegAt(t, plan.totalAngleDeg)).toBeCloseTo(
        -g2AngleDegAt(t, plan.totalAngleDeg),
        9,
      );
    }
    expect(g2TrayRotationDegAt(0, plan.totalAngleDeg)).toBeCloseTo(0, 12);
    expect(g2TrayRotationDegAt(1, plan.totalAngleDeg)).toBeCloseTo(plan.trayTotalRotationDeg, 9);
  });

  it('góc mâm đơn điệu không tăng (mâm chỉ xoay một chiều, không overshoot/quay lui)', () => {
    const plan = planG2Spin(200, 9);
    let prev = Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
      const rot = g2TrayRotationDegAt(i / SAMPLES, plan.totalAngleDeg);
      expect(rot).toBeLessThanOrEqual(prev + 1e-9);
      prev = rot;
    }
  });

  it('ô dưới kim từ góc MÂM khớp 100% ô từ góc QUÉT (truy vết 3 kênh giữ nguyên)', () => {
    // Đây là bất biến cốt lõi của mô hình mới: scene tính ô từ góc mâm
    // thật (g2TrayCellIndexAtPointer), và nó phải trùng với quy ước cũ
    // (g2CellIndexAtAngle trên góc quét) ở MỌI thời điểm của vòng quay,
    // cho mọi cỡ ván — nếu lệch, chip/highlight sẽ lệch khỏi ô dưới kim.
    for (const n of [2, 3, 4, 5, 6, 7, 8, 10, 12]) {
      const plan = planG2Spin(137.5, 10);
      for (let i = 0; i <= 720; i++) {
        const t = i / 720;
        const sweepDeg = g2AngleDegAt(t, plan.totalAngleDeg);
        const trayRotDeg = g2TrayRotationDegAt(t, plan.totalAngleDeg);
        expect(g2TrayCellIndexAtPointer(trayRotDeg, n)).toBe(g2CellIndexAtAngle(sweepDeg, n));
      }
    }
  });

  it('khi dừng, ô dưới kim = đúng ô chứa finalAngleDeg của log (ô thắng của engine) ở mọi cỡ ván', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const cell = 360 / n;
      for (let k = 0; k < n; k++) {
        // Engine chốt điểm dừng trong 50% giữa ô thắng (xem test trên).
        for (const frac of [0.3, 0.5, 0.7]) {
          const finalAngleDeg = k * cell + cell * frac;
          const plan = planG2Spin(finalAngleDeg, 10);
          const restRot = g2TrayRotationDegAt(1, plan.totalAngleDeg);
          expect(restRot).toBeCloseTo(plan.trayTotalRotationDeg, 9);
          expect(g2TrayCellIndexAtPointer(restRot, n)).toBe(k);
        }
      }
    }
  });

  it('ô dưới kim tại góc mâm tùy ý: chuẩn hoá vòng/ngược dấu đúng, n không hợp lệ → -1', () => {
    // Mâm chưa xoay → ô 0 dưới kim; mâm xoay −90° (ngược kim 90°) thì ô
    // cục bộ 90° về dưới kim.
    expect(g2TrayCellIndexAtPointer(0, 4)).toBe(0);
    expect(g2TrayCellIndexAtPointer(-90, 4)).toBe(1);
    expect(g2TrayCellIndexAtPointer(-(360 + 90), 4)).toBe(1);
    expect(g2TrayCellIndexAtPointer(90, 4)).toBe(3);
    expect(g2TrayCellIndexAtPointer(-45, 0)).toBe(-1);
  });
});

describe('G2 motion — điểm dừng trong ô', () => {
  it('điểm dừng của engine luôn nằm trong 50% giữa ô — diễn lại giữ nguyên tính chất đó', () => {
    // Mẫu: 6 người → ô 60°; góc đích ở giữa ô (phân đoạn [0,25 ; 0,75]).
    const cellDeg = 60;
    for (const frac of [0.25, 0.5, 0.75]) {
      const finalAngleDeg = 2 * cellDeg + cellDeg * frac;
      const plan = planG2Spin(finalAngleDeg, 10);
      const rest = ((g2AngleDegAt(1, plan.totalAngleDeg) % 360) + 360) % 360;
      const inCell = (rest - 2 * cellDeg) / cellDeg;
      expect(inCell).toBeGreaterThanOrEqual(0.25 - 1e-9);
      expect(inCell).toBeLessThanOrEqual(0.75 + 1e-9);
    }
  });
});
