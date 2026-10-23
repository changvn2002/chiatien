import { describe, expect, it } from 'vitest';
import { computeBalances, computeShares, sumBalances, validateExpenseDraft } from './split';
import type { Expense, Session } from './types';

function expense(partial: Partial<Expense>): Expense {
  return {
    id: 'e1',
    title: 'Khoản chi',
    amount: 100_000,
    payerId: 'a',
    participantIds: ['a', 'b'],
    mode: 'equal',
    custom: {},
    weights: {},
    createdAt: 0,
    ...partial,
  };
}

describe('computeShares — equal', () => {
  it('chia hết: 100.000 cho 2 người = 50.000 mỗi người', () => {
    const s = computeShares(expense({ amount: 100_000, participantIds: ['a', 'b'] }));
    expect(s).toEqual({ a: 50_000, b: 50_000 });
  });

  it('chia dư lẻ: 100.000 cho 3 người — tổng vẫn đúng 100.000, lẻ cộng cho người đầu', () => {
    const s = computeShares(expense({ amount: 100_000, participantIds: ['a', 'b', 'c'] }));
    expect(s.a + s.b + s.c).toBe(100_000);
    expect(s).toEqual({ a: 33_334, b: 33_333, c: 33_333 });
  });

  it('số tiền nhỏ hơn số người: 2đ cho 3 người', () => {
    const s = computeShares(expense({ amount: 2, participantIds: ['a', 'b', 'c'] }));
    expect(s.a + s.b + s.c).toBe(2);
    expect(s).toEqual({ a: 1, b: 1, c: 0 });
  });
});

describe('computeShares — custom', () => {
  it('lấy đúng số tuỳ chỉnh từng người', () => {
    const s = computeShares(
      expense({
        amount: 200_000,
        participantIds: ['a', 'b', 'c'],
        mode: 'custom',
        custom: { a: 120_000, b: 80_000, c: 0 },
      }),
    );
    expect(s).toEqual({ a: 120_000, b: 80_000, c: 0 });
  });
});

describe('computeShares — shares (trọng số)', () => {
  it('tỉ lệ 1:1:2 trên 100.000', () => {
    const s = computeShares(
      expense({
        amount: 100_000,
        participantIds: ['a', 'b', 'c'],
        mode: 'shares',
        weights: { a: 1, b: 1, c: 2 },
      }),
    );
    expect(s).toEqual({ a: 25_000, b: 25_000, c: 50_000 });
  });

  it('trọng số bằng nhau + dư lẻ: phương pháp phần dư lớn nhất, tổng bảo toàn', () => {
    const s = computeShares(
      expense({
        amount: 100_000,
        participantIds: ['a', 'b', 'c'],
        mode: 'shares',
        weights: { a: 1, b: 1, c: 1 },
      }),
    );
    expect(s.a + s.b + s.c).toBe(100_000);
    expect(s).toEqual({ a: 33_334, b: 33_333, c: 33_333 });
  });

  it('phần thập phân lớn hơn được ưu tiên nhận phần lẻ', () => {
    // 10đ theo tỉ lệ 1:2 -> raw 3.333 / 6.667 -> sàn 3/6, lẻ 1đ cho b (frac .667)
    const s = computeShares(
      expense({ amount: 10, participantIds: ['a', 'b'], mode: 'shares', weights: { a: 1, b: 2 } }),
    );
    expect(s).toEqual({ a: 3, b: 7 });
  });
});

describe('computeBalances', () => {
  const session: Session = {
    id: 's1',
    title: 'Test',
    members: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ],
    expenses: [],
    createdAt: 0,
    updatedAt: 0,
  };

  it('một người trả cho tất cả: người trả dư đúng phần của 2 người còn lại', () => {
    const s: Session = {
      ...session,
      expenses: [expense({ amount: 300_000, payerId: 'a', participantIds: ['a', 'b', 'c'] })],
    };
    const balances = computeBalances(s);
    expect(balances).toEqual({ a: 200_000, b: -100_000, c: -100_000 });
    expect(Object.values(balances).reduce((x, y) => x + y, 0)).toBe(0);
  });

  it('subset participants: người ngoài khoản chi không bị trừ', () => {
    const s: Session = {
      ...session,
      expenses: [expense({ amount: 90_000, payerId: 'b', participantIds: ['a', 'b'] })],
    };
    const balances = computeBalances(s);
    expect(balances).toEqual({ a: -45_000, b: 45_000, c: 0 });
  });

  it('nhiều khoản chi chồng nhau vẫn cân bằng tổng 0', () => {
    const s: Session = {
      ...session,
      expenses: [
        expense({ id: 'e1', amount: 100_001, payerId: 'a', participantIds: ['a', 'b', 'c'] }),
        expense({
          id: 'e2',
          amount: 77_777,
          payerId: 'c',
          participantIds: ['b', 'c'],
          mode: 'shares',
          weights: { b: 2, c: 1 },
        }),
        expense({
          id: 'e3',
          amount: 50_000,
          payerId: 'b',
          participantIds: ['a', 'b', 'c'],
          mode: 'custom',
          custom: { a: 10_000, b: 15_000, c: 25_000 },
        }),
      ],
    };
    const balances = computeBalances(s);
    expect(Object.values(balances).reduce((x, y) => x + y, 0)).toBe(0);
    for (const v of Object.values(balances)) expect(Number.isInteger(v)).toBe(true);
  });
});

describe('validateExpenseDraft', () => {
  const members = ['a', 'b'];
  const ok = {
    title: 'Ăn trưa',
    amount: 100_000,
    payerId: 'a',
    participantIds: ['a', 'b'],
    mode: 'equal' as const,
    custom: {},
    weights: {},
  };

  it('draft hợp lệ -> không lỗi', () => {
    expect(validateExpenseDraft(ok, members)).toEqual([]);
  });

  it('số tiền = 0 -> lỗi', () => {
    expect(validateExpenseDraft({ ...ok, amount: 0 }, members).length).toBeGreaterThan(0);
  });

  it('không có người tham gia -> lỗi', () => {
    expect(validateExpenseDraft({ ...ok, participantIds: [] }, members).length).toBeGreaterThan(0);
  });

  it('custom: tổng không khớp số tiền -> lỗi nêu rõ', () => {
    const errors = validateExpenseDraft(
      { ...ok, mode: 'custom', custom: { a: 40_000, b: 40_000 } },
      members,
    );
    expect(errors.some((e) => e.includes('chưa bằng'))).toBe(true);
  });

  it('custom: tổng khớp -> không lỗi', () => {
    expect(
      validateExpenseDraft({ ...ok, mode: 'custom', custom: { a: 40_000, b: 60_000 } }, members),
    ).toEqual([]);
  });

  it('shares: trọng số = 0 -> lỗi', () => {
    expect(
      validateExpenseDraft({ ...ok, mode: 'shares', weights: { a: 1, b: 0 } }, members).length,
    ).toBeGreaterThan(0);
  });
});

describe('sumBalances — chốt chặn toàn vẹn quyết toán (QA F1)', () => {
  it('dữ liệu hợp lệ: tổng số dư = 0', () => {
    const s: Session = {
      id: 's1',
      title: 'T',
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      expenses: [
        expense({
          amount: 100_000,
          mode: 'custom',
          custom: { a: 10_000, b: 90_000 },
        }),
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    expect(sumBalances(computeBalances(s))).toBe(0);
  });

  it('dữ liệu HỎNG lọt thẳng vào tính toán (ca QA: custom 10.000+50.000 trên khoản 100.000) -> tổng số dư +40.000, UI có căn cứ để cảnh báo', () => {
    // Đây là tình huống F1 gốc: nếu một khoản lệch như thế này tới được tầng
    // tính (bỏ qua sanitize), sumBalances phải lộ ra +40.000 để UI cảnh báo
    // thay vì trình bày quyết toán lệch trong im lặng.
    const corrupt: Session = {
      id: 's2',
      title: 'T',
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      expenses: [
        expense({
          amount: 100_000,
          mode: 'custom',
          custom: { a: 10_000, b: 50_000 },
        }),
      ],
      createdAt: 0,
      updatedAt: 0,
    };
    expect(sumBalances(computeBalances(corrupt))).toBe(40_000);
  });
});

describe('trần nhập liệu UI cho số tiền (M-4, Panel #02)', () => {
  const members = ['a', 'b'];
  const ok = {
    title: 'Ăn trưa',
    amount: 100_000,
    payerId: 'a',
    participantIds: ['a', 'b'],
    mode: 'equal' as const,
    custom: {},
    weights: {},
  };

  it('ca Panel: 999.999.999.999.999 ₫ bị chặn ở validate với thông điệp nêu trần', () => {
    const errors = validateExpenseDraft({ ...ok, amount: 999_999_999_999_999 }, members);
    expect(errors.some((e) => e.includes('vượt quá giới hạn'))).toBe(true);
  });

  it('biên: đúng trần 999.999.999.999 ₫ qua; trần + 1 bị chặn', () => {
    expect(validateExpenseDraft({ ...ok, amount: 999_999_999_999 }, members)).toEqual([]);
    const errors = validateExpenseDraft({ ...ok, amount: 1_000_000_000_000 }, members);
    expect(errors.some((e) => e.includes('vượt quá giới hạn'))).toBe(true);
  });

  it('custom: một phần tuỳ chỉnh vượt trần cũng bị chặn', () => {
    const errors = validateExpenseDraft(
      { ...ok, mode: 'custom', amount: 100_000, custom: { a: 1_000_000_000_000, b: 0 } },
      members,
    );
    expect(errors.some((e) => e.includes('không vượt quá'))).toBe(true);
  });
});
