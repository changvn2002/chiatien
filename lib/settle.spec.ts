import { describe, expect, it } from 'vitest';
import { buildSettlementText, simplifyDebts } from './settle';
import type { Session } from './types';

/** Áp danh sách quyết toán vào số dư — mọi số dư phải về đúng 0. */
function applyTransfers(
  balances: Record<string, number>,
  transfers: ReturnType<typeof simplifyDebts>,
): Record<string, number> {
  const out = { ...balances };
  for (const t of transfers) {
    out[t.fromId] += t.amount; // con nợ trả đi -> số dư (âm) tiến về 0
    out[t.toId] -= t.amount; // chủ nợ nhận lại -> số dư (dương) tiến về 0
  }
  return out;
}

/** LCG có seed cố định — property test chạy lại được y hệt mỗi lần. */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('simplifyDebts — case cụ thể', () => {
  it('không có nợ -> không giao dịch', () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
    expect(simplifyDebts({})).toEqual([]);
  });

  it('hai người: một giao dịch duy nhất', () => {
    expect(simplifyDebts({ a: 50_000, b: -50_000 })).toEqual([
      { fromId: 'b', toId: 'a', amount: 50_000 },
    ]);
  });

  it('một người trả cho cả nhóm: n-1 giao dịch', () => {
    const t = simplifyDebts({ a: 200_000, b: -100_000, c: -100_000 });
    expect(t).toHaveLength(2);
    expect(t).toContainEqual({ fromId: 'b', toId: 'a', amount: 100_000 });
    expect(t).toContainEqual({ fromId: 'c', toId: 'a', amount: 100_000 });
  });

  it('nợ chồng chéo được rút gọn: A nợ B, B nợ C -> chỉ còn A trả C phần chênh', () => {
    // Số dư ròng: a=-100, b=0 (nhận 100 trả 100), c=+100
    const t = simplifyDebts({ a: -100_000, b: 0, c: 100_000 });
    expect(t).toEqual([{ fromId: 'a', toId: 'c', amount: 100_000 }]);
  });

  it('ghép chủ nợ lớn nhất với con nợ lớn nhất trước', () => {
    const t = simplifyDebts({ a: 300_000, b: 100_000, c: -250_000, d: -150_000 });
    expect(t[0]).toEqual({ fromId: 'c', toId: 'a', amount: 250_000 });
    const after = applyTransfers({ a: 300_000, b: 100_000, c: -250_000, d: -150_000 }, t);
    expect(after).toEqual({ a: 0, b: 0, c: 0, d: 0 });
    expect(t.length).toBeLessThanOrEqual(3);
  });
});

describe('simplifyDebts — property checks', () => {
  it('200 bộ số dư ngẫu nhiên (seed cố định): quyết toán xong mọi số dư = 0, số giao dịch ≤ n−1, mọi giao dịch nguyên đồng > 0', () => {
    for (let trial = 0; trial < 200; trial++) {
      const rng = makeRng(1234 + trial);
      const n = 2 + Math.floor(rng() * 9); // 2..10 người
      const ids = Array.from({ length: n }, (_, i) => `m${i}`);
      // Sinh số dư ngẫu nhiên rồi ép tổng = 0 bằng cách dồn phần dư vào người cuối.
      const balances: Record<string, number> = {};
      let sum = 0;
      for (let i = 0; i < n - 1; i++) {
        const v = Math.floor(rng() * 2_000_001) - 1_000_000;
        balances[ids[i]] = v;
        sum += v;
      }
      balances[ids[n - 1]] = -sum;

      const inputSum = Object.values(balances).reduce((x, y) => x + y, 0);
      expect(inputSum).toBe(0);

      const transfers = simplifyDebts(balances);
      const nonzero = Object.values(balances).filter((v) => v !== 0).length;
      if (nonzero === 0) {
        expect(transfers).toEqual([]);
        continue;
      }
      expect(transfers.length).toBeLessThanOrEqual(nonzero - 1);
      for (const t of transfers) {
        expect(t.amount).toBeGreaterThan(0);
        expect(Number.isInteger(t.amount)).toBe(true);
        expect(t.fromId).not.toBe(t.toId);
        // Không ai trả quá phần nợ của mình / nhận quá phần có của mình.
        expect(balances[t.fromId]).toBeLessThan(0);
        expect(balances[t.toId]).toBeGreaterThan(0);
      }
      const after = applyTransfers(balances, transfers);
      for (const id of ids) expect(after[id]).toBe(0);
    }
  });

  it('kết quả xác định: cùng input -> cùng output', () => {
    const balances = { x: 123_456, y: -23_456, z: -100_000, w: 0 };
    expect(simplifyDebts(balances)).toEqual(simplifyDebts(balances));
  });
});

describe('buildSettlementText — trung thực khi số dư lệch (QA F1)', () => {
  const session: Session = {
    id: 's1',
    title: 'Chuyến đi',
    members: [
      { id: 'a', name: 'An' },
      { id: 'b', name: 'Bình' },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'Khoản chi',
        amount: 100_000,
        payerId: 'a',
        participantIds: ['a', 'b'],
        mode: 'custom',
        custom: { a: 10_000, b: 90_000 },
        weights: {},
        createdAt: 0,
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  };

  it('số dư cân bằng -> KHÔNG có dòng cảnh báo', () => {
    const balances = { a: 90_000, b: -90_000 };
    const text = buildSettlementText(session, balances, simplifyDebts(balances));
    expect(text).not.toContain('CẢNH BÁO');
  });

  it('số dư lệch +40.000 (ca QA gốc) -> bản text CÓ cảnh báo nêu đúng số tiền lệch', () => {
    const balances = { a: 90_000, b: -50_000 };
    const text = buildSettlementText(session, balances, simplifyDebts(balances));
    expect(text).toContain('CẢNH BÁO: số dư chưa cân bằng');
    expect(text).toContain('40.000');
  });
});
