// degrade.spec.ts — Auto-degrade (ARCHITECTURE §6): trung bình trượt 30
// frame, ngưỡng ~45 → bậc 1, ~30 → bậc 2, không nâng bậc lại giữa ván.

import { describe, expect, it } from 'vitest';
import {
  DEGRADE_WINDOW_FRAMES,
  FpsDegradeTracker,
  degradeLevelForFps,
} from './degrade';

function feed(tracker: FpsDegradeTracker, frameMs: number, frames: number): void {
  for (let i = 0; i < frames; i++) tracker.push(frameMs);
}

describe('degradeLevelForFps', () => {
  it('khoanh ngưỡng đúng: ≥45 → 0, [30,45) → 1, <30 → 2', () => {
    expect(degradeLevelForFps(60)).toBe(0);
    expect(degradeLevelForFps(45)).toBe(0);
    expect(degradeLevelForFps(44.9)).toBe(1);
    expect(degradeLevelForFps(30)).toBe(1);
    expect(degradeLevelForFps(29.9)).toBe(2);
    expect(degradeLevelForFps(12)).toBe(2);
  });
});

describe('FpsDegradeTracker', () => {
  it('chưa đủ cửa sổ 30 frame thì chưa kết luận bậc', () => {
    const tracker = new FpsDegradeTracker();
    feed(tracker, 50, DEGRADE_WINDOW_FRAMES - 1); // 20 FPS nhưng chưa đủ mẫu
    expect(tracker.level).toBe(0);
    expect(tracker.averageFps).toBeNull();
  });

  it('60 FPS bền → giữ bậc 0', () => {
    const tracker = new FpsDegradeTracker();
    feed(tracker, 1000 / 60, 120);
    expect(tracker.level).toBe(0);
  });

  it('~40 FPS bền → bậc 1; trượt xuống ~25 FPS → bậc 2', () => {
    const tracker = new FpsDegradeTracker();
    feed(tracker, 25, 60); // 40 FPS
    expect(tracker.level).toBe(1);
    feed(tracker, 40, 60); // 25 FPS
    expect(tracker.level).toBe(2);
  });

  it('KHÔNG nâng bậc trở lại giữa ván dù FPS hồi phục', () => {
    const tracker = new FpsDegradeTracker();
    feed(tracker, 40, 60); // 25 FPS → bậc 2
    expect(tracker.level).toBe(2);
    feed(tracker, 1000 / 60, 120); // hồi 60 FPS
    expect(tracker.level).toBe(2);
  });

  it('một frame khựng đơn lẻ (kẹp 100 ms) không kéo bậc xuống giả tạo', () => {
    const tracker = new FpsDegradeTracker();
    feed(tracker, 1000 / 60, 60);
    tracker.push(900); // khựng 0,9 s — bị kẹp ở 100 ms trong cửa sổ trượt
    expect(tracker.level).toBe(0);
  });
});
