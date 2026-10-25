// g2-food.spec.ts — Bằng chứng máy cho logic món + ô G2 (FIX-V3 lane C):
// không trùng món kề/đối ở mọi cỡ ván 2–12, cỡ món tôn trọng dây cung
// vòng ở ván 12 ghế, và ánh xạ góc đũa → ô khớp quy ước biên ô của scene.

import { describe, expect, it } from 'vitest';
import {
  ALL_FOOD_FRAMES,
  CENTER_FOOD_FRAME,
  FOOD_MAX_DISPLAY_SIZE,
  FOOD_MIN_GAP_PX,
  FOOD_RING_RADIUS,
  FOOD_SHADOW_ALPHA,
  FOOD_VISUAL_RATIO,
  SEAT_FOOD_FRAMES,
  assignSeatFoodFrames,
  foodDishDisplaySize,
  foodRingChord,
  foodShadowEllipse,
  g2CellIndexAtAngle,
  sharedFoodFrames,
} from './g2-food';

describe('G2 food — gán món cho ghế', () => {
  it('atlas có đúng 8 frame: 7 món ghế + pot-stew ở tâm', () => {
    expect(ALL_FOOD_FRAMES).toHaveLength(8);
    expect(SEAT_FOOD_FRAMES).toHaveLength(7);
    expect(ALL_FOOD_FRAMES).toContain(CENTER_FOOD_FRAME);
    expect(SEAT_FOOD_FRAMES).not.toContain(CENTER_FOOD_FRAME);
  });

  it('ván ≤7 ghế: mọi ghế một món khác nhau, đúng vòng 7 món', () => {
    for (let n = 1; n <= 7; n++) {
      const frames = assignSeatFoodFrames(n);
      expect(frames).toHaveLength(n);
      expect(new Set(frames).size).toBe(n);
      frames.forEach((frame, i) => {
        expect(frame).toBe(SEAT_FOOD_FRAMES[i]);
      });
    }
  });

  it('mọi cỡ ván 2–12: ghế kề nhau (theo vòng) không bao giờ cùng món', () => {
    for (let n = 2; n <= 12; n++) {
      const frames = assignSeatFoodFrames(n);
      for (let i = 0; i < n; i++) {
        expect(frames[i]).not.toBe(frames[(i + 1) % n]);
      }
    }
  });

  it('ván chẵn 4–12: ghế đối diện không bao giờ cùng món', () => {
    for (let n = 4; n <= 12; n += 2) {
      const frames = assignSeatFoodFrames(n);
      for (let i = 0; i < n / 2; i++) {
        expect(frames[i]).not.toBe(frames[i + n / 2]);
      }
    }
  });

  it('ván 8 ghế: ghế cuối (kề vòng với ghế đầu) được sửa khỏi trùng ghế đầu', () => {
    const frames = assignSeatFoodFrames(8);
    // Vòng thuần i%7 sẽ cho ghế 7 = ghế 0 = 'bowl-broth' — bản sửa phải khác.
    expect(frames[7]).not.toBe(frames[0]);
    expect(frames[7]).not.toBe(frames[6]);
    expect(frames[7]).not.toBe(frames[3]); // đối diện của ghế 7 là ghế 3
  });

  it('món tâm: pot-stew + món thứ hai chưa dùng khi ván ≤6 ghế (toàn mâm không trùng)', () => {
    for (let n = 1; n <= 6; n++) {
      const [pot, second] = sharedFoodFrames(n);
      expect(pot).toBe(CENTER_FOOD_FRAME);
      const seatFrames = assignSeatFoodFrames(n);
      expect(seatFrames).not.toContain(second);
      expect(second).not.toBe(pot);
      const allOnTray = [...seatFrames, pot, second];
      expect(new Set(allOnTray).size).toBe(allOnTray.length);
    }
  });

  it('món tâm ván ≥7 ghế: đủ 8 frame trên mâm, món thứ hai rơi về bowl-soup', () => {
    for (let n = 7; n <= 12; n++) {
      const [pot, second] = sharedFoodFrames(n);
      expect(pot).toBe(CENTER_FOOD_FRAME);
      expect(second).toBe('bowl-soup');
    }
  });
});

describe('G2 food — cỡ món + hình học vòng', () => {
  it('dây cung vòng món ở 12 ghế ≈ 96,28px (2×186×sin(π/12))', () => {
    expect(foodRingChord(12)).toBeCloseTo(96.28, 1);
    expect(FOOD_RING_RADIUS).toBe(186);
  });

  it('mọi cỡ ván: đường kính thị giác + khe hở ≤ dây cung (không chồng)', () => {
    for (let n = 2; n <= 12; n++) {
      const size = foodDishDisplaySize(n);
      expect(size * FOOD_VISUAL_RATIO + FOOD_MIN_GAP_PX).toBeLessThanOrEqual(
        foodRingChord(n) + 1e-9,
      );
    }
  });

  it('cỡ món TO hơn đợt trước (84–88) ở mọi cỡ ván, trần 112', () => {
    for (let n = 2; n <= 12; n++) {
      expect(foodDishDisplaySize(n)).toBeGreaterThan(88);
      expect(foodDishDisplaySize(n)).toBeLessThanOrEqual(FOOD_MAX_DISPLAY_SIZE);
    }
    expect(foodDishDisplaySize(12)).toBe(101);
    expect(foodDishDisplaySize(11)).toBe(110);
    expect(foodDishDisplaySize(10)).toBe(FOOD_MAX_DISPLAY_SIZE);
    expect(foodDishDisplaySize(4)).toBe(FOOD_MAX_DISPLAY_SIZE);
  });

  it('món ở cỡ trần không tràn khỏi mặt mâm (186 + 112/2 = 242 < 252)', () => {
    expect(FOOD_RING_RADIUS + FOOD_MAX_DISPLAY_SIZE / 2).toBeLessThan(252);
  });
});

describe('G2 food — bóng món (FIX-V4)', () => {
  it('alpha bóng nằm trong khoảng chốt 0,16–0,20 và đậm hơn mức cũ 0,14', () => {
    expect(FOOD_SHADOW_ALPHA).toBeGreaterThanOrEqual(0.16);
    expect(FOOD_SHADOW_ALPHA).toBeLessThanOrEqual(0.2);
    expect(FOOD_SHADOW_ALPHA).toBeGreaterThan(0.14);
    expect(foodShadowEllipse(100).alpha).toBe(FOOD_SHADOW_ALPHA);
  });

  it('lệch dọc của bóng nằm trong khoảng chốt +4..+6px ở mọi cỡ món', () => {
    for (const size of [84, 101, 104, 110, 112]) {
      const shadow = foodShadowEllipse(size);
      expect(shadow.offsetY).toBeGreaterThanOrEqual(4);
      expect(shadow.offsetY).toBeLessThanOrEqual(6);
    }
  });

  it('ellipse bóng ôm chân món: rộng hơn chân món thị giác một vệt mỏng, không nuốt món kề ở ván 12', () => {
    for (const n of [2, 6, 12]) {
      const size = foodDishDisplaySize(n);
      const shadow = foodShadowEllipse(size);
      // Chân món thị giác = 0,91 × cỡ hiển thị — bóng phải RỘNG hơn chân
      // (hết sticker) nhưng tổng bề rộng bóng vẫn ≤ dây cung vòng để
      // bóng hai món kề không chồng thành vệt đen liền.
      expect(shadow.width).toBeGreaterThan(size * FOOD_VISUAL_RATIO * 0.9);
      expect(shadow.width).toBeLessThanOrEqual(foodRingChord(n) + 1e-9);
      expect(shadow.height).toBeLessThan(shadow.width);
    }
  });
});

describe('G2 food — ô theo góc đũa', () => {
  it('góc 0 nằm ở ô 0; biên ô chuyển đúng tại bội của cellDeg', () => {
    const n = 4;
    const cell = 360 / n;
    expect(g2CellIndexAtAngle(0, n)).toBe(0);
    expect(g2CellIndexAtAngle(cell - 0.01, n)).toBe(0);
    expect(g2CellIndexAtAngle(cell, n)).toBe(1);
    expect(g2CellIndexAtAngle(359.99, n)).toBe(3);
  });

  it('góc >360 (nhiều vòng quay) và góc âm chuẩn hoá về cùng ô', () => {
    expect(g2CellIndexAtAngle(360 + 45, 4)).toBe(0);
    expect(g2CellIndexAtAngle(3 * 360 + 100, 4)).toBe(1);
    expect(g2CellIndexAtAngle(-10, 4)).toBe(3);
    expect(g2CellIndexAtAngle(3960 + 200, 12)).toBe(g2CellIndexAtAngle(200, 12));
  });

  it('mọi góc đích trong ô k đều ánh xạ về k (khớp ô kết quả của log)', () => {
    for (const n of [2, 3, 4, 5, 7, 12]) {
      const cell = 360 / n;
      for (let k = 0; k < n; k++) {
        expect(g2CellIndexAtAngle(k * cell + cell / 2, n)).toBe(k);
      }
    }
  });

  it('số ghế không hợp lệ → -1', () => {
    expect(g2CellIndexAtAngle(30, 0)).toBe(-1);
  });
});
