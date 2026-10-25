// engine.spec.ts — Suite riêng của outcome engine (chạy bằng game/vitest.config.ts).
import { describe, expect, it } from 'vitest';

import { checkCaps, effectiveTotalCap, EXTRA_CAP_VND, TOTAL_CAP_VND } from './caps';
import { G1_PARAMS, G1_PARAMS_2P, g1EffectiveParams, pickHighlights, runG1 } from './events-g1';
import { createCommitment, finalizeSeed, fnv1a64, matchCode, mulberry32, paramsHash } from './rng';
import { runG2 } from './rules-g2';
import type { MatchParams, PlayerRef } from './types';
import { verifyReplay } from './verify';

function players(n: number): PlayerRef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Người ${i + 1}` }));
}
function params(game: 'g1' | 'g2', n: number, totalVnd = 400_000): MatchParams {
  return { game, players: players(n), totalVnd };
}
function phasesOf(log: ReturnType<typeof runG1>): string[] {
  return log.events.filter((e) => e.type === 'phase').map((e) => (e as { phase: string }).phase);
}

describe('(0) rng primitives', () => {
  it('mulberry32 xác định và nằm trong [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('fnv1a64 cho hex 16 ký tự, ổn định, khác input khác hash', () => {
    expect(fnv1a64('ai-dai')).toMatch(/^[0-9a-f]{16}$/);
    expect(fnv1a64('ai-dai')).toBe(fnv1a64('ai-dai'));
    expect(fnv1a64('ai-dai')).not.toBe(fnv1a64('ai-dai-2'));
  });
  it('matchCode dạng #XXXXXX viết hoa', () => {
    expect(matchCode(123456)).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('(1) xác định: cùng seed+params → logHash giống hệt', () => {
  for (const n of [2, 4, 12]) {
    it(`G1 n=${n}`, () => {
      const p = params('g1', n);
      const a = runG1(987654321, p);
      const b = runG1(987654321, p);
      expect(a.logHash).toBe(b.logHash);
      expect(a.events).toEqual(b.events);
      expect(a.result).toEqual(b.result);
    });
    it(`G2 n=${n}`, () => {
      const p = params('g2', n);
      const a = runG2(987654321, p);
      const b = runG2(987654321, p);
      expect(a.logHash).toBe(b.logHash);
      expect(a.result).toEqual(b.result);
    });
  }
  it('seed khác → logHash khác (G1 và G2)', () => {
    expect(runG1(1, params('g1', 4)).logHash).not.toBe(runG1(2, params('g1', 4)).logHash);
    expect(runG2(1, params('g2', 4)).logHash).not.toBe(runG2(2, params('g2', 4)).logHash);
  });
  it('thứ tự người chơi là một phần của ván: hoán vị → paramsHash khác', () => {
    const p1 = params('g1', 3);
    const p2: MatchParams = { ...p1, players: [p1.players[1], p1.players[0], p1.players[2]] };
    expect(paramsHash(p1)).not.toBe(paramsHash(p2));
  });
});

describe('(2) phân phối', () => {
  it('G1: 4000 seed liên tiếp, n=4 → mỗi người là payer trong 25% ± 4 điểm %', () => {
    const p = params('g1', 4);
    const counts = new Map<string, number>();
    const N = 4000;
    for (let seed = 0; seed < N; seed++) {
      const log = runG1(seed, p);
      const ids = log.result.kind === 'single' ? [log.result.payerId] : log.result.payerIds;
      // Co-payers: mỗi người trong tập nhận 1/k «suất đãi» để tổng xác suất vẫn = 1.
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1 / ids.length);
    }
    for (const pl of p.players) {
      const share = (counts.get(pl.id) ?? 0) / N;
      expect(share).toBeGreaterThan(0.21);
      expect(share).toBeLessThan(0.29);
    }
  }, 120_000);

  it('G2: 4000 seed, n=5 → mỗi ô 20% ± 4 điểm %', () => {
    const p = params('g2', 5);
    const counts = [0, 0, 0, 0, 0];
    const N = 4000;
    for (let seed = 0; seed < N; seed++) {
      const log = runG2(seed, p);
      const spin = log.events[0] as { cellIndex: number };
      counts[spin.cellIndex]++;
    }
    for (const c of counts) {
      expect(c / N).toBeGreaterThan(0.16);
      expect(c / N).toBeLessThan(0.24);
    }
  }, 120_000);
});

describe('(3) luật hoà/đột tử G1 — ép nhánh bằng overrides', () => {
  it('nhánh điểm hoà A: tất cả ngã cùng tick về 0 đứng → có ván phụ (sub), không có sudden', () => {
    // HP=5, sát thương ép 9–10 và cấm miss/dodge: mọi đòn đều trúng và đều
    // hạ gục, tick đầu tiên mọi người cùng ngã. (Sát thương phải ép tường
    // minh vì ván 2 người dùng profile riêng có sát thương thấp hơn HP=5.)
    const log = runG1(7, params('g1', 2), {
      hp: 5,
      damMin: 9,
      damMax: 10,
      daMin: 9,
      daMax: 10,
      missProb: 0,
      dodgeProb: 0,
      critProb: 0,
    });
    const fallsTick0 = log.events.filter((e) => e.type === 'fall' && e.tick === 0);
    expect(fallsTick0).toHaveLength(2);
    expect(phasesOf(log)).toEqual(['main', 'sub']);
    expect(log.result.kind === 'single' || log.result.kind === 'co-payers').toBe(true);
  });

  it('nhánh đột tử sau hết giờ: main hết giờ còn ≥2 đứng → sudden xuất hiện', () => {
    // HP khổng lồ + mainTicks=2: không ai ngã trong main → buộc vào sudden.
    const log = runG1(11, params('g1', 4), {
      hp: 1_000_000,
      mainTicks: 2,
      missProb: 0,
      dodgeProb: 0,
      critProb: 0,
    });
    expect(phasesOf(log)).toContain('sudden');
    expect(phasesOf(log)[0]).toBe('main');
    // Sudden phân định được (mặc định): hoặc single, hoặc qua đúng một sub.
    expect(phasesOf(log).filter((x) => x === 'sub').length).toBeLessThanOrEqual(1);
    expect(phasesOf(log).filter((x) => x === 'sudden').length).toBe(1);
  });

  it('nhánh cùng-đãi sau ván phụ: mọi đòn đều trượt → sudden + sub hết giờ → co-payers toàn bộ', () => {
    const log = runG1(13, params('g1', 3), { missProb: 1, dodgeProb: 0 });
    expect(phasesOf(log)).toEqual(['main', 'sudden', 'sub']);
    expect(log.result).toEqual({ kind: 'co-payers', payerIds: ['p1', 'p2', 'p3'] });
  });

  it('ván thường: kết thúc trong main, chỉ 1 phase, single payer', () => {
    // Tìm một seed kết thúc gọn trong main bằng tham số mặc định.
    let found = false;
    for (let seed = 0; seed < 200 && !found; seed++) {
      const log = runG1(seed, params('g1', 4));
      if (phasesOf(log).length === 1 && log.result.kind === 'single') found = true;
    }
    expect(found).toBe(true);
  });

  it('không bao giờ có quá một ván phụ / một đột tử trong mọi log mẫu', () => {
    for (let seed = 0; seed < 300; seed++) {
      const ph = phasesOf(runG1(seed, params('g1', 5)));
      expect(ph.filter((x) => x === 'sub').length).toBeLessThanOrEqual(1);
      expect(ph.filter((x) => x === 'sudden').length).toBeLessThanOrEqual(1);
    }
  });
});

describe('(4) G2 hình học điểm dừng', () => {
  it('2000 seed × n∈{2,3,7,12}: góc nghỉ luôn trong [0,25;0,75] của ô, spinSeconds ∈ [8,12]', () => {
    for (const n of [2, 3, 7, 12]) {
      const p = params('g2', n);
      const cell = 360 / n;
      for (let seed = 0; seed < 2000; seed++) {
        const log = runG2(seed, p);
        const spin = log.events[0] as {
          cellIndex: number;
          finalAngleDeg: number;
          spinSeconds: number;
        };
        const frac = (spin.finalAngleDeg - spin.cellIndex * cell) / cell;
        expect(frac).toBeGreaterThanOrEqual(0.25 - 1e-9);
        expect(frac).toBeLessThanOrEqual(0.75 + 1e-9);
        expect(spin.spinSeconds).toBeGreaterThanOrEqual(8);
        expect(spin.spinSeconds).toBeLessThanOrEqual(12);
        expect(spin.cellIndex).toBeGreaterThanOrEqual(0);
        expect(spin.cellIndex).toBeLessThan(n);
      }
    }
  }, 180_000);
});

describe('(5) caps — trần kép SPEC §3.3', () => {
  it('bảng hệ quả trần tổng hiệu dụng', () => {
    expect(effectiveTotalCap(2)).toBe(1_000_000);
    expect(effectiveTotalCap(3)).toBe(750_000);
    expect(effectiveTotalCap(4)).toBe(666_667);
    expect(effectiveTotalCap(12)).toBe(545_455);
    expect(TOTAL_CAP_VND).toBe(2_000_000);
    expect(EXTRA_CAP_VND).toBe(500_000);
  });

  it('ván hợp lệ: ok=true, maxExtra = total − min(shares)', () => {
    const r = checkCaps(600_000, [150_000, 150_000, 150_000, 150_000]);
    expect(r.ok).toBe(true);
    expect(r.maxExtra).toBe(450_000);
    expect(r.violations).toEqual([]);
  });

  it('vượt gánh-thêm nhưng chưa vượt trần tổng danh nghĩa vẫn bị chặn', () => {
    // n=2, total=900.000 < 2.000.000 nhưng gánh-thêm = 900.000 − 450.000 = 450.000... dùng total 1.100.000:
    // vẫn dưới trần tổng 2.000.000, nhưng vượt trần hiệu dụng 1.000.000 và gánh-thêm 550.000 > 500.000.
    const r = checkCaps(1_100_000, [550_000, 550_000]);
    expect(r.ok).toBe(false);
    expect(r.maxExtra).toBe(550_000);
    expect(r.violations.join(' ')).toContain('550000');
    expect(r.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('trường hợp chỉ vi phạm gánh-thêm do chia lẻ (min share nhỏ) dù tổng dưới trần hiệu dụng', () => {
    // n=4, total=650.000 < 666.667 (dưới trần hiệu dụng) nhưng min share=100.000 → maxExtra=550.000 > 500.000.
    const r = checkCaps(650_000, [100_000, 180_000, 180_000, 190_000]);
    expect(r.ok).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]).toContain('gánh-thêm');
    expect(r.violations[0]).toContain('550000');
  });

  it('vượt trần tổng danh nghĩa 2.000.000 bị chặn kèm con số', () => {
    const r = checkCaps(2_500_000, [625_000, 625_000, 625_000, 625_000]);
    expect(r.ok).toBe(false);
    expect(r.violations.join(' ')).toContain('2500000');
  });
});

describe('(6) verifyReplay', () => {
  it('log thật G1 và G2 → true', () => {
    expect(verifyReplay(runG1(424242, params('g1', 4)))).toBe(true);
    expect(verifyReplay(runG2(424242, params('g2', 6)))).toBe(true);
  });
  it('sửa 1 event → false', () => {
    const log = runG1(99, params('g1', 4));
    const tampered = {
      ...log,
      events: log.events.map((e, i) =>
        i === 1 && e.type === 'attack' ? { ...e, damage: e.damage + 1 } : e,
      ),
    };
    expect(verifyReplay(tampered as typeof log)).toBe(false);
  });
  it('sửa result → false', () => {
    const log = runG2(99, params('g2', 4));
    const other = log.params.players.find(
      (pl) => pl.id !== (log.result as { payerId: string }).payerId,
    )!;
    const tampered = { ...log, result: { kind: 'single' as const, payerId: other.id } };
    expect(verifyReplay(tampered)).toBe(false);
  });
});

describe('(7) C1 hai giai đoạn', () => {
  it('commitment không đổi khi biết số chung; C1 không phụ thuộc số chung', () => {
    const p = params('g1', 4);
    const before = createCommitment(123456789, p);
    // Số chung chỉ xuất hiện SAU C1 — C1 tính lại vẫn nguyên, paramsHash không đổi.
    const after = createCommitment(123456789, p);
    expect(after.c1).toBe(before.c1);
    expect(after.paramsHash).toBe(paramsHash(p));
  });
  it('seedFinal đổi khi số chung đổi, giữ nguyên khi mọi thứ giữ nguyên', () => {
    const p = params('g1', 4);
    const { paramsHash: ph } = createCommitment(123456789, p);
    const s1 = finalizeSeed(123456789, '483920', ph);
    const s2 = finalizeSeed(123456789, '483921', ph);
    const s1again = finalizeSeed(123456789, '483920', ph);
    expect(s1).not.toBe(s2);
    expect(s1again).toBe(s1);
    expect(s1).toBeGreaterThanOrEqual(0);
    expect(s1).toBeLessThanOrEqual(0xffffffff);
  });
  it('seed_device khác → C1 khác', () => {
    const p = params('g2', 3);
    expect(createCommitment(1, p).c1).not.toBe(createCommitment(2, p).c1);
  });
});

describe('pickHighlights', () => {
  it('trả tối đa 3 khoảnh khắc có cấu trúc từ log thật', () => {
    let checked = 0;
    for (let seed = 0; seed < 50; seed++) {
      const log = runG1(seed, params('g1', 6));
      const h = pickHighlights(log.events);
      expect(h.length).toBeLessThanOrEqual(3);
      if (h.length > 0) {
        checked++;
        expect(h[0].kind).toBe('first-fall');
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('G1_PARAMS công khai đúng hợp đồng PROTO-STATE', () => {
  it('khớp các hằng số đã chốt', () => {
    // Profile chính (nhóm ≥ 3) — coordinator chốt lại 2026-10-25 sau sweep
    // đo thật (xem events-g1.ts): trung vị 57–67 tick = 28,5–33,5 giây.
    expect(G1_PARAMS.hp).toBe(350);
    expect(G1_PARAMS.damMin).toBe(5);
    expect(G1_PARAMS.damMax).toBe(8);
    expect(G1_PARAMS.daMin).toBe(6);
    expect(G1_PARAMS.daMax).toBe(10);
    expect(G1_PARAMS.dodgeProb).toBe(0.12);
    expect(G1_PARAMS.missProb).toBe(0.1);
    expect(G1_PARAMS.critProb).toBe(0.12);
    expect(G1_PARAMS.critMult).toBe(1.8);
    expect(G1_PARAMS.tickSeconds).toBe(0.5);
    expect(G1_PARAMS.mainTicks).toBe(80);
    expect(G1_PARAMS.mainTicks2p).toBe(40);
    expect(G1_PARAMS.suddenTicks).toBe(20);
    expect(G1_PARAMS.subTicks).toBe(20);
  });

  it('profile 2 người tách riêng, g1EffectiveParams chọn đúng theo cỡ nhóm', () => {
    expect(G1_PARAMS_2P.hp).toBe(100);
    expect(G1_PARAMS_2P.damMin).toBe(2);
    expect(G1_PARAMS_2P.damMax).toBe(4);
    expect(G1_PARAMS_2P.daMin).toBe(3);
    expect(G1_PARAMS_2P.daMax).toBe(5);
    expect(g1EffectiveParams(2).hp).toBe(100);
    expect(g1EffectiveParams(3).hp).toBe(350);
    expect(g1EffectiveParams(12).hp).toBe(350);
    // Overrides của test vẫn thắng cả hai profile.
    expect(g1EffectiveParams(2, { hp: 5 }).hp).toBe(5);
  });
});
