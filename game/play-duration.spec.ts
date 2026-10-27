// play-duration.spec.ts — Test cổng sàn thời lượng trình diễn
// (SPEC §C2/P-10): scene báo finished sớm hơn sàn thì màn chơi phải
// HOÃN công bố, không chấp nhận ngay; qua sàn mới công bố.

import { describe, expect, it } from 'vitest';
import {
  G1_MIN_PRESENTATION_MS,
  G2_MIN_PRESENTATION_MS,
  minPresentationMs,
  presentationGate,
} from './play-duration';

describe('sàn thời lượng trình diễn (P-10)', () => {
  it('sàn suy từ hằng số engine/scene: G2 = 8 s (quay tối thiểu), G1 = 20 s (40 tick × 0,5 s)', () => {
    expect(G2_MIN_PRESENTATION_MS).toBe(8_000);
    expect(G1_MIN_PRESENTATION_MS).toBe(20_000);
    expect(minPresentationMs('g2')).toBe(8_000);
    expect(minPresentationMs('g1')).toBe(20_000);
  });

  it('G2: scene báo finished ngay lúc vào (log hỏng ~0 s) bị chặn — hoãn gần đủ sàn', () => {
    const gate = presentationGate('g2', 1_000, 1_050);
    expect(gate.ready).toBe(false);
    expect(gate.waitMs).toBe(7_950);
  });

  it('G2: qua sàn 8 s thì công bố ngay, không hoãn thêm', () => {
    expect(presentationGate('g2', 0, 8_000).ready).toBe(true);
    expect(presentationGate('g2', 0, 10_200).waitMs).toBe(0);
  });

  it('G1: finished ở 5 s bị chặn; ở đúng sàn 20 s được công bố', () => {
    expect(presentationGate('g1', 0, 5_000)).toEqual({
      ready: false,
      waitMs: 15_000,
      floorMs: 20_000,
    });
    expect(presentationGate('g1', 0, 20_000).ready).toBe(true);
    expect(presentationGate('g1', 0, 33_500).ready).toBe(true);
  });

  it('đồng hồ lệch (now < start) coi như chưa diễn — hoãn đủ sàn, không âm', () => {
    const gate = presentationGate('g2', 5_000, 4_000);
    expect(gate.ready).toBe(false);
    expect(gate.waitMs).toBe(G2_MIN_PRESENTATION_MS);
  });
});
