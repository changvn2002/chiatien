import { describe, expect, it } from 'vitest';
import { computeBalances, computeShares } from '@/lib/split';
import { simplifyDebts } from '@/lib/settle';
import type { Expense, Member, Session } from '@/lib/types';
import { applyGameResult } from './session-view-helpers';

/**
 * Số học ghi sổ game (Addendum §1 — ngữ nghĩa ĐÃI): người đãi chịu
 * 100%. Dataset chuẩn: 4 người An/Bình/Chi/Dũng, tổng phiên
 * 1.260.000 ₫ (Taxi 160.000 Dũng trả chia đều · Tiền rượu 300.000
 * Bình trả tuỳ chỉnh · Ăn tối 800.000 An trả chia đều), Bình đãi cả
 * bàn 1.260.000 ₫ → quyết toán còn đúng Bình→An 800.000 và
 * Bình→Dũng 160.000.
 */

const members: Member[] = [
  { id: 'an', name: 'An' },
  { id: 'binh', name: 'Bình' },
  { id: 'chi', name: 'Chi' },
  { id: 'dung', name: 'Dũng' },
];
const ALL = members.map((m) => m.id);

function standardExpenses(): Expense[] {
  return [
    {
      id: 'e-taxi',
      title: 'Taxi',
      amount: 160_000,
      payerId: 'dung',
      participantIds: [...ALL],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
    {
      id: 'e-ruou',
      title: 'Tiền rượu',
      amount: 300_000,
      payerId: 'binh',
      participantIds: [...ALL],
      mode: 'custom',
      custom: { an: 100_000, binh: 100_000, chi: 50_000, dung: 50_000 },
      weights: {},
      createdAt: 2,
    },
    {
      id: 'e-an-toi',
      title: 'Ăn tối',
      amount: 800_000,
      payerId: 'an',
      participantIds: [...ALL],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 3,
    },
  ];
}

function transfersOf(expenses: Expense[]) {
  const session = { members, expenses } as Session;
  return simplifyDebts(computeBalances(session));
}

describe('applyGameResult — trường hợp A: tổng game khớp tổng phiên thì biến đổi khoản hiện có', () => {
  it('dataset chuẩn: Bình đãi 1.260.000 → quyết toán đúng 2 lệnh Bình→An 800.000, Bình→Dũng 160.000', () => {
    const before = standardExpenses();
    const next = applyGameResult(
      before,
      members,
      [{ payerId: 'binh', amountVnd: 1_260_000 }],
      'VAN1',
    );
    expect(next).not.toBeNull();
    // Không thêm khoản mới — không cộng trùng tổng hoá đơn.
    expect(next).toHaveLength(3);
    // Giữ nguyên danh tính khoản: id/title/amount/payerId/createdAt.
    for (let i = 0; i < before.length; i++) {
      expect(next![i].id).toBe(before[i].id);
      expect(next![i].title).toBe(before[i].title);
      expect(next![i].amount).toBe(before[i].amount);
      expect(next![i].payerId).toBe(before[i].payerId);
      expect(next![i].createdAt).toBe(before[i].createdAt);
      expect(next![i].mode).toBe('custom');
      expect(next![i].participantIds).toEqual(ALL);
      // Bình chịu toàn bộ từng khoản.
      expect(computeShares(next![i])).toMatchObject({ binh: before[i].amount });
      for (const id of ['an', 'chi', 'dung']) {
        expect(computeShares(next![i])[id] ?? 0).toBe(0);
      }
    }
    expect(transfersOf(next!)).toEqual([
      { fromId: 'binh', toId: 'an', amount: 800_000 },
      { fromId: 'binh', toId: 'dung', amount: 160_000 },
    ]);
  });

  it('idempotent: áp lần 2 với cùng payments → shares từng khoản và quyết toán không đổi', () => {
    const once = applyGameResult(
      standardExpenses(),
      members,
      [{ payerId: 'binh', amountVnd: 1_260_000 }],
      'VAN1',
    )!;
    const twice = applyGameResult(
      once,
      members,
      [{ payerId: 'binh', amountVnd: 1_260_000 }],
      'VAN1',
    )!;
    expect(twice).toHaveLength(3);
    for (let i = 0; i < once.length; i++) {
      expect(computeShares(twice[i])).toEqual(computeShares(once[i]));
      expect(twice[i].custom).toEqual(once[i].custom);
    }
    expect(transfersOf(twice)).toEqual([
      { fromId: 'binh', toId: 'an', amount: 800_000 },
      { fromId: 'binh', toId: 'dung', amount: 160_000 },
    ]);
  });

  it('đồng hạng biến đổi: khoản 400.000, An và Bình mỗi người đãi 200.000 → custom chia 200.000/200.000', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        title: 'Tất cả',
        amount: 400_000,
        payerId: 'an',
        participantIds: [...ALL],
        mode: 'equal',
        custom: {},
        weights: {},
        createdAt: 1,
      },
    ];
    const next = applyGameResult(
      expenses,
      members,
      [
        { payerId: 'an', amountVnd: 200_000 },
        { payerId: 'binh', amountVnd: 200_000 },
      ],
      'VAN2',
    )!;
    expect(next).toHaveLength(1);
    expect(next[0].custom.an).toBe(200_000);
    expect(next[0].custom.binh).toBe(200_000);
    const shares = computeShares(next[0]);
    expect(shares.an).toBe(200_000);
    expect(shares.binh).toBe(200_000);
    expect(shares.chi ?? 0).toBe(0);
    expect(shares.dung ?? 0).toBe(0);
  });
});

describe('applyGameResult — trường hợp B: thêm khoản «Game đãi» do người đãi chịu 100%', () => {
  it('phiên rỗng + Bình đãi 400.000 → đúng 1 khoản mới, Bình chịu toàn bộ, không phát sinh lệnh chuyển', () => {
    const next = applyGameResult([], members, [{ payerId: 'binh', amountVnd: 400_000 }], 'VAN9')!;
    expect(next).toHaveLength(1);
    expect(next[0].title).toBe('Game đãi — ván VAN9');
    expect(next[0].payerId).toBe('binh');
    expect(next[0].amount).toBe(400_000);
    expect(next[0].participantIds).toEqual(ALL);
    const shares = computeShares(next[0]);
    expect(shares.binh).toBe(400_000);
    for (const id of ['an', 'chi', 'dung']) expect(shares[id] ?? 0).toBe(0);
    expect(transfersOf(next)).toEqual([]);
  });

  it('tổng game lệch tổng phiên (600.000 ≠ 1.260.000): khoản gốc giữ nguyên từng trường, khoản mới thêm và người đãi chịu 100%', () => {
    const before = standardExpenses();
    const snapshot = JSON.parse(JSON.stringify(before)) as Expense[];
    const next = applyGameResult(
      before,
      members,
      [{ payerId: 'binh', amountVnd: 600_000 }],
      'VAN3',
    )!;
    expect(next).toHaveLength(4);
    expect(next.slice(0, 3)).toEqual(snapshot);
    const added = next[3];
    expect(added.title).toBe('Game đãi — ván VAN3');
    expect(added.payerId).toBe('binh');
    const shares = computeShares(added);
    expect(shares.binh).toBe(600_000);
    for (const id of ['an', 'chi', 'dung']) expect(shares[id] ?? 0).toBe(0);
  });

  it('đồng hạng ở phiên rỗng: An 200.000 + Bình 200.000 → 2 khoản, mỗi người chịu đúng phần mình', () => {
    const next = applyGameResult(
      [],
      members,
      [
        { payerId: 'an', amountVnd: 200_000 },
        { payerId: 'binh', amountVnd: 200_000 },
      ],
      'VAN4',
    )!;
    expect(next).toHaveLength(2);
    expect(next[0].payerId).toBe('an');
    expect(next[1].payerId).toBe('binh');
    expect(computeShares(next[0]).an).toBe(200_000);
    expect(computeShares(next[1]).binh).toBe(200_000);
    expect(transfersOf(next)).toEqual([]);
  });
});

describe('applyGameResult — payment không hợp lệ', () => {
  it('toàn bộ payment 0 đồng / không phải thành viên → null (không đổi)', () => {
    expect(
      applyGameResult(
        standardExpenses(),
        members,
        [
          { payerId: 'binh', amountVnd: 0 },
          { payerId: 'nguoi-la', amountVnd: 500_000 },
        ],
        'VAN5',
      ),
    ).toBeNull();
    expect(applyGameResult([], members, [], 'VAN5')).toBeNull();
  });
});
