import { describe, expect, it } from 'vitest';
import {
  cloneForImport,
  decodeSessionShare,
  decodeSessionShareWithReport,
  encodeSessionShare,
} from './share';
import { computeBalances, computeShares, sumBalances } from './split';
import type { Expense, Session } from './types';

const session: Session = {
  id: 's-1',
  title: 'Đà Lạt 3N2Đ 🏖',
  members: [
    {
      id: 'm1',
      name: 'Nguyễn Văn An',
      bank: {
        bin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountName: 'NGUYEN VAN AN',
      },
    },
    { id: 'm2', name: 'Bình' },
    { id: 'm3', name: 'Chi' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Tiền phòng',
      amount: 1_800_000,
      payerId: 'm1',
      participantIds: ['m1', 'm2', 'm3'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 111,
    },
    {
      id: 'e2',
      title: 'Ăn tối',
      amount: 450_000,
      payerId: 'm2',
      participantIds: ['m2', 'm3'],
      mode: 'shares',
      custom: {},
      weights: { m2: 2, m3: 1 },
      createdAt: 222,
    },
  ],
  createdAt: 100,
  updatedAt: 200,
};

describe('share link roundtrip', () => {
  it('encode -> decode khôi phục nguyên cuộc chia (kể cả tiếng Việt + emoji + bank)', () => {
    const restored = decodeSessionShare(encodeSessionShare(session));
    expect(restored).not.toBeNull();
    expect(restored?.title).toBe(session.title);
    expect(restored?.members).toEqual(session.members);
    expect(restored?.expenses).toEqual(session.expenses);
  });

  it('chuỗi hỏng -> null, không throw', () => {
    expect(decodeSessionShare('khong-phai-du-lieu')).toBeNull();
    expect(decodeSessionShare('')).toBeNull();
  });

  it('cloneForImport: id mới toàn bộ, quan hệ payer/participant vẫn trỏ đúng người', () => {
    const clone = cloneForImport(session);
    expect(clone.id).not.toBe(session.id);
    const oldIds = new Set(session.members.map((m) => m.id));
    for (const m of clone.members) expect(oldIds.has(m.id)).toBe(false);
    const nameById = new Map(clone.members.map((m) => [m.id, m.name]));
    const lunch = clone.expenses.find((e) => e.title === 'Ăn tối');
    expect(nameById.get(lunch!.payerId)).toBe('Bình');
    expect(lunch?.participantIds.map((id) => nameById.get(id)).sort()).toEqual(['Bình', 'Chi']);
    const weightsByName = Object.fromEntries(
      Object.entries(lunch!.weights).map(([id, w]) => [nameById.get(id), w]),
    );
    expect(weightsByName).toEqual({ Bình: 2, Chi: 1 });
  });
});

describe('sanitize toàn vẹn tiền — dữ liệu bị sửa tay qua link (QA F1)', () => {
  function tamperedSession(expenses: Expense[]): Session {
    return {
      id: 's-x',
      title: 'Link bị sửa tay',
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
        { id: 'c', name: 'Chi' },
      ],
      expenses,
      createdAt: 1,
      updatedAt: 2,
    };
  }

  function tamperedExpense(partial: Partial<Expense>): Expense {
    return {
      id: 'e1',
      title: 'Khoản chi',
      amount: 100_000,
      payerId: 'a',
      participantIds: ['a', 'b'],
      mode: 'custom',
      custom: {},
      weights: {},
      createdAt: 1,
      ...partial,
    };
  }

  it('ca QA gốc: khoản 100.000 custom {10.000, 50.000} (thiếu 40.000) -> khoản bị LOẠI, không còn quyết toán dư im lặng', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(tamperedSession([tamperedExpense({ custom: { a: 10_000, b: 50_000 } })])),
    );
    expect(restored).not.toBeNull();
    expect(restored?.expenses).toEqual([]);
    expect(sumBalances(computeBalances(restored!))).toBe(0);
  });

  it('custom tổng THỪA (60.000 + 50.000 > 100.000) -> bị loại', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(tamperedSession([tamperedExpense({ custom: { a: 60_000, b: 50_000 } })])),
    );
    expect(restored?.expenses).toEqual([]);
  });

  it('custom có số ÂM {-5.000, 105.000} -> phần âm bị loại, tổng lệch -> khoản bị loại', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(tamperedSession([tamperedExpense({ custom: { a: -5_000, b: 105_000 } })])),
    );
    expect(restored?.expenses).toEqual([]);
    expect(sumBalances(computeBalances(restored!))).toBe(0);
  });

  it('custom có số THẬP PHÂN {33.333,5 / 33.333,5 / 33.333} -> làm tròn thành 100.001 ≠ 100.000 -> bị loại', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(
        tamperedSession([
          tamperedExpense({
            participantIds: ['a', 'b', 'c'],
            custom: { a: 33_333.5, b: 33_333.5, c: 33_333 },
          }),
        ]),
      ),
    );
    expect(restored?.expenses).toEqual([]);
  });

  it('custom thập phân nhưng làm tròn khớp đúng tổng {50.000,4 / 49.999,6} -> GIỮ, giá trị ép về nguyên đồng', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(
        tamperedSession([tamperedExpense({ custom: { a: 50_000.4, b: 49_999.6 } })]),
      ),
    );
    expect(restored?.expenses).toHaveLength(1);
    expect(restored?.expenses[0].custom).toEqual({ a: 50_000, b: 50_000 });
    expect(sumBalances(computeBalances(restored!))).toBe(0);
  });

  it('custom hợp lệ (tổng khớp) -> giữ nguyên không đổi', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(
        tamperedSession([
          tamperedExpense({
            participantIds: ['a', 'b', 'c'],
            custom: { a: 10_000, b: 50_000, c: 40_000 },
          }),
        ]),
      ),
    );
    expect(restored?.expenses).toHaveLength(1);
    expect(restored?.expenses[0].custom).toEqual({ a: 10_000, b: 50_000, c: 40_000 });
  });

  it('shares: trọng số âm/0 bị loại khỏi bảng, phần còn lại vẫn bảo toàn tổng', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(
        tamperedSession([
          tamperedExpense({
            amount: 90_000,
            participantIds: ['a', 'b', 'c'],
            mode: 'shares',
            weights: { a: -1, b: 0, c: 2 },
          }),
        ]),
      ),
    );
    expect(restored?.expenses).toHaveLength(1);
    expect(restored?.expenses[0].weights).toEqual({ c: 2 });
    const shares = computeShares(restored!.expenses[0]);
    expect(shares.a + shares.b + shares.c).toBe(90_000);
  });

  it('shares: MỌI trọng số đều không hợp lệ -> bảng rỗng, tầng tính rơi về chia đều, tổng vẫn bảo toàn', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(
        tamperedSession([tamperedExpense({ mode: 'shares', weights: { a: 0, b: -3 } })]),
      ),
    );
    expect(restored?.expenses).toHaveLength(1);
    expect(restored?.expenses[0].weights).toEqual({});
    expect(computeShares(restored!.expenses[0])).toEqual({ a: 50_000, b: 50_000 });
  });

  it('số tiền khoản chi: âm -> loại; 0,4đ (làm tròn về 0) -> loại; 100.000,6 -> giữ với 100.001', () => {
    const restoredNegative = decodeSessionShare(
      encodeSessionShare(tamperedSession([tamperedExpense({ amount: -50_000, mode: 'equal' })])),
    );
    expect(restoredNegative?.expenses).toEqual([]);

    const restoredTiny = decodeSessionShare(
      encodeSessionShare(tamperedSession([tamperedExpense({ amount: 0.4, mode: 'equal' })])),
    );
    expect(restoredTiny?.expenses).toEqual([]);

    const restoredFractional = decodeSessionShare(
      encodeSessionShare(tamperedSession([tamperedExpense({ amount: 100_000.6, mode: 'equal' })])),
    );
    expect(restoredFractional?.expenses).toHaveLength(1);
    expect(restoredFractional?.expenses[0].amount).toBe(100_001);
  });

  it('bảng phụ của khoản equal: giá trị âm bị loại, thập phân dương được làm tròn / giữ làm trọng số', () => {
    const restored = decodeSessionShare(
      encodeSessionShare(
        tamperedSession([
          tamperedExpense({
            mode: 'equal',
            custom: { a: -100, b: 10.5 },
            weights: { a: -2, b: 1.5 },
          }),
        ]),
      ),
    );
    expect(restored?.expenses).toHaveLength(1);
    expect(restored?.expenses[0].custom).toEqual({ b: 11 });
    expect(restored?.expenses[0].weights).toEqual({ b: 1.5 });
  });

  it('báo cáo import: 2 khoản lệch + 1 khoản tốt -> droppedExpenses = 2, chỉ giữ khoản tốt', () => {
    const report = decodeSessionShareWithReport(
      encodeSessionShare(
        tamperedSession([
          tamperedExpense({ id: 'bad1', custom: { a: 10_000, b: 50_000 } }),
          tamperedExpense({ id: 'bad2', custom: { a: -5_000, b: 105_000 } }),
          tamperedExpense({ id: 'good', mode: 'equal' }),
        ]),
      ),
    );
    expect(report.session).not.toBeNull();
    expect(report.droppedExpenses).toBe(2);
    expect(report.session?.expenses.map((e) => e.id)).toEqual(['good']);
  });
});
