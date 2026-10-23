/**
 * W2-DEEP — test sâu độc lập cho lib/ của Chia Tiền (TEAM TEST, worker W2).
 *
 * Khác các đợt property trước (seeds 20261023 / 987654321 / 424242 / 777,
 * ~2.000 case, và LCG 1234 trong settle.spec.ts), đợt này dùng SEED MỚI:
 *   SEED_SETTLE = 1959364781   SEED_SPLIT = 135792468
 *   SEED_FUZZ   = 246813579    SEED_VIETQR = 1122334455
 * và quy mô lớn hơn hẳn: 10.000 case quyết toán + 2.000 phiên chia tiền
 * + 2.000 fuzz share-link + 500 chuỗi rác + 1.000 fuzz VietQR.
 *
 * Phân nhóm:
 *   W2-A  property quyết toán/chia tiền — bất biến phải LUÔN đúng.
 *   W2-B  fuzz bộ giải mã share-link + sanitize (đường tấn công chính).
 *   W2-C  ma trận hỏng localStorage qua loadSessions.
 *   W2-D  FINDINGS — mỗi test mã hoá bất biến ĐÚNG và đang FAIL tại thời
 *         điểm viết (bằng chứng tái hiện tối thiểu, có mã finding W2-F*).
 *   W2-E  fuzz VietQR payload builder (DATA-08).
 *
 * Chạy lại:  TMPDIR=~/workspace/mini-apps/tmp npx -y pnpm@10.32.1 vitest run lib/w2-deep.spec.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { sanitizeSession, sanitizeSessionDetailed } from './sanitize';
import { computeBalances, computeShares, sumBalances } from './split';
import { buildSettlementText, simplifyDebts } from './settle';
import { decodeSessionShare, decodeSessionShareWithReport, encodeSessionShare } from './share';
import { loadSessions } from './storage';
import { buildVietQrPayload, crc16Ccitt, BANKS } from './vietqr';
import type { Expense, Session } from './types';

const SEED_SETTLE = 1959364781;
const SEED_SPLIT = 135792468;
const SEED_FUZZ = 246813579;
const SEED_VIETQR = 1122334455;

/** mulberry32 — PRNG tất định, seed ghi rõ ở đầu file. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function applyTransfers(
  balances: Record<string, number>,
  transfers: ReturnType<typeof simplifyDebts>,
): Record<string, number> {
  const out = { ...balances };
  for (const t of transfers) {
    out[t.fromId] += t.amount;
    out[t.toId] -= t.amount;
  }
  return out;
}

/** Tổng BigInt chính xác tuyệt đối của một record tiền (chỉ gọi khi mọi giá trị là số nguyên hữu hạn). */
function bigSum(rec: Record<string, number>): bigint {
  return Object.values(rec).reduce((acc, v) => acc + BigInt(v), BigInt(0));
}

function member(id: string, name = id.toUpperCase()): Session['members'][number] {
  return { id, name };
}
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
    createdAt: 1,
    ...partial,
  };
}
function session(partial: Partial<Session>): Session {
  return {
    id: 's1',
    title: 'Phiên test',
    members: [member('a', 'An'), member('b', 'Bình')],
    expenses: [],
    createdAt: 1,
    updatedAt: 2,
    ...partial,
  };
}

/* ------------------------------------------------------------------ */
/* W2-A — property quyết toán + chia tiền                              */
/* ------------------------------------------------------------------ */

describe('W2-A1 simplifyDebts — 10.000 case số dư ngẫu nhiên (seed 1959364781)', () => {
  it('mọi bất biến quyết toán giữ ở mọi case: về 0 tuyệt đối, ≤ n−1 giao dịch, nguyên > 0, không tự trả mình', () => {
    const rng = mulberry32(SEED_SETTLE);
    let cases = 0;
    let totalTransfers = 0;
    for (let trial = 0; trial < 10_000; trial++) {
      // Phân phối n đa dạng: ép tỉ lệ n=1, n=2, nhiều số dư 0, số cực lớn.
      const pick = rng();
      const n = pick < 0.05 ? 1 : pick < 0.2 ? 2 : 2 + Math.floor(rng() * 11); // 2..12
      const ids = Array.from({ length: n }, (_, i) => `m${i}`);
      const balances: Record<string, number> = {};
      let sum = 0;
      for (let i = 0; i < n - 1; i++) {
        const r = rng();
        let v: number;
        if (r < 0.25)
          v = 0; // nhiều người dư 0
        else if (r < 0.55)
          v = Math.floor(rng() * 2_000_001) - 1_000_000; // ±1tr
        else if (r < 0.85)
          v = Math.floor(rng() * 2e9) - 1e9; // ±1 tỉ
        else v = Math.floor(rng() * 2e15) - 1e15; // ±10^15 — vẫn < 2^53, nguyên chính xác
        balances[ids[i]] = v;
        sum += v;
      }
      balances[ids[n - 1]] = -sum; // ép tổng = 0 (hợp đồng đầu vào của thuật toán)
      cases++;

      expect(bigSum(balances)).toBe(BigInt(0));
      const transfers = simplifyDebts(balances);
      totalTransfers += transfers.length;
      const nonzero = Object.values(balances).filter((v) => v !== 0).length;
      if (nonzero === 0) {
        expect(transfers).toEqual([]);
        continue;
      }
      expect(transfers.length).toBeLessThanOrEqual(nonzero - 1);
      let transferred = BigInt(0);
      for (const t of transfers) {
        expect(Number.isInteger(t.amount)).toBe(true);
        expect(t.amount).toBeGreaterThan(0);
        expect(t.fromId).not.toBe(t.toId);
        expect(balances[t.fromId]).toBeLessThan(0);
        expect(balances[t.toId]).toBeGreaterThan(0);
        transferred += BigInt(t.amount);
      }
      // Tổng chuyển đi phải bằng tổng dư có (không tạo/huỷ tiền).
      const positive = Object.values(balances)
        .filter((v) => v > 0)
        .reduce((acc, v) => acc + BigInt(v), BigInt(0));
      expect(transferred).toBe(positive);
      const after = applyTransfers(balances, transfers);
      for (const id of ids) expect(after[id]).toBe(0);
      // Xác định: chạy lại cho cùng một kết quả (lấy mẫu mỗi 500 case cho nhanh).
      if (trial % 500 === 0) expect(simplifyDebts(balances)).toEqual(transfers);
    }
    expect(cases).toBe(10_000);
    console.log(`[W2-A1] cases=${cases} totalTransfers=${totalTransfers} seed=${SEED_SETTLE}`);
  }, 120_000);

  it('case biên tất định: n=1 dư 0; n=2 cực lớn ±(2^53−1); tất cả dư 0; một chủ nợ — nhiều con nợ ở 10^15', () => {
    expect(simplifyDebts({ solo: 0 })).toEqual([]);
    const MAX = Number.MAX_SAFE_INTEGER; // 9007199254740991
    expect(simplifyDebts({ a: MAX, b: -MAX })).toEqual([{ fromId: 'b', toId: 'a', amount: MAX }]);
    expect(simplifyDebts({ a: 0, b: 0, c: 0, d: 0, e: 0 })).toEqual([]);
    const big: Record<string, number> = {
      rich: 4 * 1e15,
      d1: -1e15,
      d2: -1e15,
      d3: -1e15,
      d4: -1e15,
      z: 0,
    };
    const t = simplifyDebts(big);
    expect(t).toHaveLength(4);
    const after = applyTransfers(big, t);
    for (const v of Object.values(after)) expect(v).toBe(0);
    // Chuỗi nợ vòng: a nợ b, b nợ c, c nợ a cùng số tiền -> ròng 0 hết.
    expect(simplifyDebts({ a: 0, b: 0, c: 0 })).toEqual([]);
  });
});

describe('W2-A2 computeShares/computeBalances — 2.000 phiên ngẫu nhiên hợp lệ (seed 135792468)', () => {
  it('từng khoản: tổng phần chia = amount (BigInt tuyệt đối); cả phiên: tổng số dư = 0, mọi số nguyên', () => {
    const rng = mulberry32(SEED_SPLIT);
    let cases = 0;
    let expenseCount = 0;
    for (let trial = 0; trial < 2_000; trial++) {
      const nMembers = 1 + Math.floor(rng() * 10); // 1..10 (gồm n=1)
      const ids = Array.from({ length: nMembers }, (_, i) => `p${i}`);
      const members = ids.map((id) => member(id));
      const nExpenses = Math.floor(rng() * 6); // 0..5 khoản
      const expenses: Expense[] = [];
      for (let k = 0; k < nExpenses; k++) {
        const amount =
          rng() < 0.3
            ? 1 + Math.floor(rng() * 1_000) // số nhỏ, dễ lệch lẻ
            : 1 + Math.floor(rng() * 1e15); // tới 10^15
        // Tập người tham gia ngẫu nhiên không rỗng, không trùng.
        const shuffled = [...ids].sort(() => rng() - 0.5);
        const participants = shuffled.slice(0, 1 + Math.floor(rng() * nMembers));
        const mode = (['equal', 'custom', 'shares'] as const)[Math.floor(rng() * 3)];
        const custom: Record<string, number> = {};
        const weights: Record<string, number> = {};
        if (mode === 'custom') {
          // Cắt amount thành các phần nguyên tổng đúng bằng amount.
          let rest = amount;
          participants.forEach((id, idx) => {
            if (idx === participants.length - 1) custom[id] = rest;
            else {
              const part = Math.floor(rng() * (rest + 1));
              custom[id] = part;
              rest -= part;
            }
          });
        }
        if (mode === 'shares') {
          for (const id of participants) {
            weights[id] =
              rng() < 0.5 ? 1 + Math.floor(rng() * 10) : Math.round((0.1 + rng() * 5) * 10) / 10;
          }
        }
        expenses.push(
          expense({
            id: `e${k}`,
            amount,
            payerId: ids[Math.floor(rng() * nMembers)],
            participantIds: participants,
            mode,
            custom,
            weights,
          }),
        );
        expenseCount++;
      }
      const s = session({ members, expenses });
      for (const e of expenses) {
        const shares = computeShares(e);
        for (const v of Object.values(shares)) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
        expect(bigSum(shares)).toBe(BigInt(e.amount));
      }
      const balances = computeBalances(s);
      expect(bigSum(balances)).toBe(BigInt(0));
      expect(sumBalances(balances)).toBe(0);
      const after = applyTransfers(balances, simplifyDebts(balances));
      for (const v of Object.values(after)) expect(v).toBe(0);
      cases++;
    }
    expect(cases).toBe(2_000);
    console.log(`[W2-A2] sessions=${cases} expenses=${expenseCount} seed=${SEED_SPLIT}`);
  }, 120_000);
});

/* ------------------------------------------------------------------ */
/* W2-B — fuzz share-link / sanitize                                   */
/* ------------------------------------------------------------------ */

const VN_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bình 🌸',
  'Lê Văn Cường',
  'Phạm Thuỳ Dương',
  'Hoàng Anh Tuấn',
  'Đỗ Ngọc Ánh',
  'Vũ Đình Khải',
  'Bùi Thị Mai Hương',
];

function validRawSession(): Record<string, unknown> {
  return {
    id: 's-fuzz',
    title: 'Chuyến đi Đà Lạt',
    members: VN_NAMES.slice(0, 4).map((name, i) => ({ id: `m${i}`, name })),
    expenses: [
      {
        id: 'e0',
        title: 'Phòng',
        amount: 1_800_000,
        payerId: 'm0',
        participantIds: ['m0', 'm1', 'm2', 'm3'],
        mode: 'equal',
        custom: {},
        weights: {},
        createdAt: 11,
      },
      {
        id: 'e1',
        title: 'Ăn tối',
        amount: 450_000,
        payerId: 'm1',
        participantIds: ['m1', 'm2'],
        mode: 'custom',
        custom: { m1: 200_000, m2: 250_000 },
        weights: {},
        createdAt: 12,
      },
      {
        id: 'e2',
        title: 'Xe',
        amount: 900_000,
        payerId: 'm2',
        participantIds: ['m0', 'm2', 'm3'],
        mode: 'shares',
        custom: {},
        weights: { m0: 1, m2: 2, m3: 1 },
        createdAt: 13,
      },
    ],
    createdAt: 1,
    updatedAt: 2,
  };
}

/** Bất biến hậu-sanitize cho phiên được GIỮ: không lệch tiền im lặng, mọi số nguyên hữu hạn. */
function expectKeptSessionSound(s: Session) {
  for (const e of s.expenses) {
    const shares = computeShares(e);
    for (const v of Object.values(shares)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(bigSum(shares)).toBe(BigInt(e.amount));
  }
  const balances = computeBalances(s);
  expect(bigSum(balances)).toBe(BigInt(0));
  for (const m of s.members) expect(m.name.length).toBeLessThanOrEqual(200);
  expect(s.title.length).toBeLessThanOrEqual(200);
}

describe('W2-B1 fuzz có cấu trúc qua đường share-link — 2.000 đột biến (seed 246813579)', () => {
  it('không throw; khoản hỏng bị loại + droppedExpenses đếm đúng; phiên giữ lại không bao giờ lệch tiền', () => {
    const rng = mulberry32(SEED_FUZZ);
    const amountPool: unknown[] = [
      -100_000,
      0,
      0.4,
      1,
      '100000',
      null,
      true,
      100.5,
      999_999_999_999_999,
      50_000,
    ];
    let cases = 0;
    let keptSessions = 0;
    let totalDropped = 0;
    for (let trial = 0; trial < 2_000; trial++) {
      const raw = validRawSession();
      const members = raw.members as Array<Record<string, unknown>>;
      const expenses = raw.expenses as Array<Record<string, unknown>>;
      const nMut = 1 + Math.floor(rng() * 3);
      for (let mIdx = 0; mIdx < nMut; mIdx++) {
        const kind = Math.floor(rng() * 10);
        const e = expenses[Math.floor(rng() * expenses.length)];
        const mem = members[Math.floor(rng() * members.length)];
        switch (kind) {
          case 0:
            e.amount = amountPool[Math.floor(rng() * amountPool.length)];
            break;
          case 1: {
            const c = { ...(e.custom as Record<string, number>) };
            const keys = Object.keys(c);
            if (keys.length)
              c[keys[0]] =
                (c[keys[0]] ?? 0) + (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 5000));
            e.custom = c;
            break;
          }
          case 2:
            e.participantIds = ['m0', 'ghost', 42, null];
            break;
          case 3:
            e.payerId = rng() < 0.5 ? 'ghost' : null;
            break;
          case 4:
            e.mode = rng() < 0.5 ? 'custom' : 'khong-co-mode-nay';
            break;
          case 5:
            mem.name = ['', '   ', 'x'.repeat(500), 'Tên 😀 rất dài '.repeat(30), 123, null][
              Math.floor(rng() * 6)
            ];
            break;
          case 6:
            mem.id = members[0].id;
            break; // trùng id thành viên
          case 7:
            e.id = expenses[0].id;
            break; // trùng id khoản
          case 8: {
            const w = { ...(e.weights as Record<string, number>) };
            for (const k of Object.keys(w))
              w[k] = [-2, 0, 'hai', 1.5][Math.floor(rng() * 4)] as number;
            e.weights = w;
            break;
          }
          case 9:
            e.participantIds = [];
            break;
        }
      }
      const totalExpenses = (raw.expenses as unknown[]).length;
      let report: ReturnType<typeof decodeSessionShareWithReport> | undefined;
      expect(() => {
        report = decodeSessionShareWithReport(
          compressToEncodedURIComponent(JSON.stringify({ v: 1, s: raw })),
        );
      }).not.toThrow();
      cases++;
      if (report!.session) {
        keptSessions++;
        totalDropped += report!.droppedExpenses;
        // Mọi khoản biến mất khỏi phiên giữ lại phải được đếm vào droppedExpenses.
        expect(report!.droppedExpenses).toBe(totalExpenses - report!.session.expenses.length);
        expectKeptSessionSound(report!.session);
      } else {
        expect(report!.droppedExpenses).toBe(0);
      }
    }
    expect(cases).toBe(2_000);
    console.log(
      `[W2-B1] cases=${cases} keptSessions=${keptSessions} totalDropped=${totalDropped} seed=${SEED_FUZZ}`,
    );
  }, 120_000);

  it('500 chuỗi rác (ký tự lz + unicode + emoji + rỗng + rất dài): decode không bao giờ throw, kết quả null hoặc phiên cân bằng', () => {
    const rng = mulberry32(SEED_FUZZ ^ 0x9e3779b9);
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-_$%=&#ăêô😀\n\t ';
    let nulls = 0;
    for (let trial = 0; trial < 500; trial++) {
      const len = trial === 0 ? 0 : trial === 1 ? 10_000 : Math.floor(rng() * 200);
      let code = '';
      for (let i = 0; i < len; i++) code += alphabet[Math.floor(rng() * alphabet.length)];
      let result: Session | null = null;
      expect(() => {
        result = decodeSessionShare(code);
      }).not.toThrow();
      if (result === null) nulls++;
      else expectKeptSessionSound(result);
    }
    console.log(`[W2-B1b] garbage=500 nulls=${nulls}`);
    expect(nulls).toBeGreaterThan(400); // rác gần như luôn bị từ chối; phiên lọt qua (nếu có) đã bị kiểm bất biến ở trên
  });

  it('roundtrip tên tiếng Việt + emoji: 200 phiên ngẫu nhiên giữ nguyên thành viên/khoản', () => {
    const rng = mulberry32(SEED_FUZZ ^ 0x51ab);
    for (let trial = 0; trial < 200; trial++) {
      const pick = () => VN_NAMES[Math.floor(rng() * VN_NAMES.length)];
      const s = session({
        title: `Đi chơi ${pick()} 🎉`,
        members: [member('a', pick()), member('b', pick()), member('c', pick())],
        expenses: [
          expense({
            amount: 1 + Math.floor(rng() * 1e12),
            payerId: 'a',
            participantIds: ['a', 'b', 'c'],
          }),
        ],
      });
      const restored = decodeSessionShare(encodeSessionShare(s));
      expect(restored).not.toBeNull();
      expect(restored!.members).toEqual(s.members);
      expect(restored!.expenses).toEqual(s.expenses);
      expect(restored!.title).toBe(s.title);
    }
  });
});

describe('W2-B2 ma trận sanitize trực tiếp (kiểu sai / thiếu trường / cực đoan JSON-safe)', () => {
  const twoMembers = [member('a', 'An'), member('b', 'Bình')];

  it('đầu vào không phải object / thiếu cấu trúc -> session null, không throw', () => {
    for (const raw of [
      null,
      undefined,
      42,
      'str',
      true,
      [],
      {},
      { title: 'T' },
      { title: 9, members: [], expenses: [] },
      { title: 'T', members: 'x', expenses: [] },
      { title: 'T', members: [], expenses: {} },
    ]) {
      expect(sanitizeSession(raw)).toBeNull();
    }
  });

  it('amount kiểu sai/cực đoan (string, NaN, Infinity, âm, 0, 0.4) -> khoản bị loại, đếm đúng', () => {
    for (const amount of ['100000', NaN, Infinity, -Infinity, -5, 0, 0.4, null, undefined]) {
      const r = sanitizeSessionDetailed(
        session({ members: twoMembers, expenses: [expense({ amount: amount as number })] }),
      );
      expect(r.session).not.toBeNull();
      expect(r.session!.expenses).toEqual([]);
      expect(r.droppedExpenses).toBe(1);
      expect(bigSum(computeBalances(r.session!))).toBe(BigInt(0));
    }
  });

  it('custom: thiếu/thừa/âm/chuỗi — mọi lệch tổng đều bị loại; khớp chính xác (kể cả có key lạ ngoài participants) thì giữ', () => {
    const badCustoms: Array<Record<string, unknown>> = [
      { a: 10_000, b: 50_000 }, // thiếu 40.000
      { a: 60_000, b: 50_000 }, // thừa
      { a: -5_000, b: 105_000 }, // âm
      { a: '50000', b: 50_000 }, // chuỗi
      { a: 90_000 }, // b không có phần và tổng vẫn thiếu 10.000
      {}, // rỗng
    ];
    for (const custom of badCustoms) {
      const r = sanitizeSessionDetailed(
        session({
          members: twoMembers,
          expenses: [expense({ mode: 'custom', custom: custom as Record<string, number> })],
        }),
      );
      expect(r.session!.expenses).toEqual([]);
      expect(r.droppedExpenses).toBe(1);
    }
    const ok = sanitizeSessionDetailed(
      session({
        members: twoMembers,
        expenses: [expense({ mode: 'custom', custom: { a: 40_000, b: 60_000, ghost: 999_999 } })],
      }),
    );
    expect(ok.session!.expenses).toHaveLength(1);
    expect(ok.droppedExpenses).toBe(0);
    expect(bigSum(computeBalances(ok.session!))).toBe(BigInt(0));
    // Participant vắng mặt trong bảng custom = chịu 0đ; nếu tổng vẫn khớp
    // thì khoản HỢP LỆ và được giữ (a chịu toàn bộ 100.000, b chịu 0).
    const payerAll = sanitizeSessionDetailed(
      session({
        members: twoMembers,
        expenses: [expense({ mode: 'custom', custom: { a: 100_000 } })],
      }),
    );
    expect(payerAll.session!.expenses).toHaveLength(1);
    expect(payerAll.droppedExpenses).toBe(0);
    expect(bigSum(computeBalances(payerAll.session!))).toBe(BigInt(0));
  });

  it('thành viên rác: tên rỗng/chỉ khoảng trắng/không phải chuỗi bị loại; trùng id giữ người đầu; phiên hết thành viên -> null (trừ allowEmptyMembers)', () => {
    const r = sanitizeSession({
      id: 's',
      title: 'T',
      members: [
        { id: 'a', name: 'An' },
        { id: 'a', name: 'An TRÙNG' },
        { id: 'b', name: '   ' },
        { id: 'c', name: 42 },
        null,
        'junk',
      ],
      expenses: [],
    });
    expect(r!.members).toEqual([{ id: 'a', name: 'An' }]);
    expect(
      sanitizeSession({ id: 's', title: 'T', members: [{ id: 'b', name: ' ' }], expenses: [] }),
    ).toBeNull();
    const emptyOk = sanitizeSession(
      { id: 's', title: 'T', members: [], expenses: [] },
      { allowEmptyMembers: true },
    );
    expect(emptyOk).not.toBeNull();
    expect(emptyOk!.members).toEqual([]);
  });

  it('bank từng phần: thiếu accountName -> bank bị bỏ nhưng thành viên còn; đủ trường -> giữ nguyên; title/tên dài -> cắt đúng 200', () => {
    const r = sanitizeSession(
      session({
        members: [
          {
            id: 'a',
            name: 'An',
            bank: { bin: '970436', bankName: 'VCB', accountNumber: '0123' },
          } as unknown as Session['members'][number],
          member('b', 'B'.repeat(500)),
        ],
        expenses: [expense({ title: 'T'.repeat(500) })],
        title: 'S'.repeat(500),
      }),
    );
    expect(r!.members[0].bank).toBeUndefined();
    expect(r!.members[1].name).toHaveLength(200);
    expect(r!.expenses[0].title).toHaveLength(200);
    expect(r!.title).toHaveLength(200);
  });

  it('phiên bản lạ / payload lạ qua decode: v="1", v=3, thiếu s, s=null -> null; v=1 và v=2 hợp lệ', () => {
    // Cập nhật 2026-10-23 (DATA-04): share schema lên v2 — v=2 là bản hiện hành
    // phải decode được, v=1 cũ vẫn nhập được (bank bị cắt ở tầng decode).
    // Bản gốc của test này khẳng định v=2 -> null theo chính sách version cũ.
    const enc = (payload: unknown) => compressToEncodedURIComponent(JSON.stringify(payload));
    expect(decodeSessionShare(enc({ v: 2, s: validRawSession() }))).not.toBeNull();
    expect(decodeSessionShare(enc({ v: 1, s: validRawSession() }))).not.toBeNull();
    expect(decodeSessionShare(enc({ v: 3, s: validRawSession() }))).toBeNull();
    expect(decodeSessionShare(enc({ v: '1', s: validRawSession() }))).toBeNull();
    expect(decodeSessionShare(enc({ v: 1 }))).toBeNull();
    expect(decodeSessionShare(enc({ v: 1, s: null }))).toBeNull();
    expect(decodeSessionShare(enc([1, 2, 3]))).toBeNull();
    expect(decodeSessionShare(enc('just a string'))).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* W2-C — ma trận hỏng localStorage                                    */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'chiatien:sessions:v1';
function stubStorage(stored: string | null) {
  const store = new Map<string, string>();
  if (stored !== null) store.set(STORAGE_KEY, stored);
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('W2-C loadSessions — ma trận hỏng', () => {
  it('JSON hỏng / JSON đúng cú pháp sai schema -> [], không throw', () => {
    const badPayloads = [
      'khong-phai-json{{{',
      '',
      'null',
      '42',
      '"mot chuoi"',
      'true',
      '[]',
      '{}',
      '{"sessions":null}',
      '{"sessions":{}}',
      '{"sessions":"abc"}',
      '{"sessions":[null,42,"x",[],{}]}',
      '{"khac": []}',
    ];
    for (const p of badPayloads) {
      stubStorage(p);
      expect(loadSessions()).toEqual([]);
      vi.unstubAllGlobals();
    }
  });

  it('phiên rỗng không thành viên sống sót (allowEmptyMembers); phiên thiếu title bị lọc; trộn tốt/xấu chỉ giữ tốt', () => {
    const good = session({ id: 'good', expenses: [expense({})] });
    const emptyMembers = session({ id: 'empty', members: [], expenses: [] });
    const noTitle = { id: 'bad', members: [member('a')], expenses: [] };
    stubStorage(JSON.stringify({ sessions: [good, emptyMembers, noTitle, null] }));
    const loaded = loadSessions();
    expect(loaded.map((s) => s.id)).toEqual(['good', 'empty']);
    expect(bigSum(computeBalances(loaded[0]))).toBe(BigInt(0));
  });

  it('dữ liệu phiên bản cũ thiếu trường mới: expense không custom/weights/createdAt/mode, member không bank, session không updatedAt -> nạp được, mặc định an toàn', () => {
    const legacy = {
      id: 'legacy',
      title: 'Phiên cũ',
      members: [
        { id: 'a', name: 'An' },
        { id: 'b', name: 'Bình' },
      ],
      expenses: [
        { id: 'e1', title: 'Ăn trưa', amount: 300_000, payerId: 'a', participantIds: ['a', 'b'] },
      ],
    };
    stubStorage(JSON.stringify({ sessions: [legacy] }));
    const loaded = loadSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].expenses[0].mode).toBe('equal');
    expect(loaded[0].expenses[0].custom).toEqual({});
    expect(loaded[0].expenses[0].weights).toEqual({});
    expect(typeof loaded[0].expenses[0].createdAt).toBe('number');
    expect(computeBalances(loaded[0])).toEqual({ a: 150_000, b: -150_000 });
  });

  it('trùng id thành viên/khoản trong máy: thành viên đầu thắng, khoản trùng bị loại, phiên vẫn cân bằng', () => {
    const dup = session({
      id: 'dup',
      members: [member('a', 'An'), member('a', 'An Hai'), member('b', 'Bình')],
      expenses: [expense({ id: 'e1' }), expense({ id: 'e1', title: 'Bản trùng' })],
    });
    stubStorage(JSON.stringify({ sessions: [dup] }));
    const loaded = loadSessions();
    expect(loaded[0].members.map((m) => m.name)).toEqual(['An', 'Bình']);
    expect(loaded[0].expenses).toHaveLength(1);
    expect(bigSum(computeBalances(loaded[0]))).toBe(BigInt(0));
  });

  it('khoản custom lệch trong máy + amount dạng chuỗi: cả hai bị loại khi nạp, không để lại quyết toán lệch', () => {
    const corrupt = session({
      id: 'corrupt',
      expenses: [
        expense({ id: 'e1', mode: 'custom', custom: { a: 10_000, b: 50_000 } }),
        expense({ id: 'e2', amount: '200000' as unknown as number }),
        expense({ id: 'e3', amount: 90_000 }),
      ],
    });
    stubStorage(JSON.stringify({ sessions: [corrupt] }));
    const loaded = loadSessions();
    expect(loaded[0].expenses.map((e) => e.id)).toEqual(['e3']);
    expect(sumBalances(computeBalances(loaded[0]))).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* W2-D — FINDINGS: các test dưới đây FAIL tại thời điểm viết.          */
/* Mỗi test là tái hiện tối thiểu cho một finding trong báo cáo W2.    */
/* ------------------------------------------------------------------ */

describe('W2-D FINDINGS (đang FAIL — bằng chứng, không phải lỗi của test)', () => {
  it('W2-F1 [HIGH] member id "__proto__" qua sanitize: phần chia + số dư của người đó phải tồn tại và tổng số dư = 0', () => {
    const s = sanitizeSession({
      id: 's-proto',
      title: 'Proto',
      members: [
        { id: '__proto__', name: 'Proto' },
        { id: 'b', name: 'Bình' },
      ],
      expenses: [expense({ payerId: '__proto__', participantIds: ['__proto__', 'b'] })],
    });
    expect(s).not.toBeNull();
    // Bất biến đúng: chia 100.000 cho 2 người -> tổng phần chia vẫn 100.000, tổng số dư 0.
    expect(bigSum(computeShares(s!.expenses[0]))).toBe(BigInt(100_000));
    expect(sumBalances(computeBalances(s!))).toBe(0);
    const balances = computeBalances(s!);
    expect(simplifyDebts(balances)).toEqual([{ fromId: 'b', toId: '__proto__', amount: 50_000 }]);
  });

  it('W2-F2 [MEDIUM] amount 9007199254740994 (2^53+2) chia đều 3 người: tổng phần chia phải bằng đúng amount ở mức nguyên tuyệt đối', () => {
    const amount = 9_007_199_254_740_994;
    const kept = sanitizeSession(
      session({
        members: [member('a'), member('b'), member('c')],
        expenses: [expense({ amount, participantIds: ['a', 'b', 'c'] })],
      }),
    );
    expect(kept!.expenses).toHaveLength(1); // sanitize hiện GIỮ khoản này
    expect(bigSum(computeShares(kept!.expenses[0]))).toBe(BigInt(amount));
  });

  it('W2-F3 [HIGH] shares với trọng số 1e300 (lọt qua sanitize): mọi phần chia phải hữu hạn, nguyên, tổng = amount', () => {
    const kept = sanitizeSession(
      session({
        members: [member('a'), member('b'), member('c')],
        expenses: [
          expense({
            amount: 1_000_000_000_000_000,
            participantIds: ['a', 'b', 'c'],
            mode: 'shares',
            weights: { a: 1e300, b: 1, c: 1 },
          }),
        ],
      }),
    );
    expect(kept!.expenses).toHaveLength(1);
    const shares = computeShares(kept!.expenses[0]);
    for (const v of Object.values(shares)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(bigSum(shares)).toBe(BigInt(1_000_000_000_000_000));
  });

  it('W2-F3b [HIGH] shares với trọng số 1e308 × 3, amount 100: không được sinh NaN', () => {
    const shares = computeShares(
      expense({
        amount: 100,
        participantIds: ['a', 'b', 'c'],
        mode: 'shares',
        weights: { a: 1e308, b: 1e308, c: 1e308 },
      }),
    );
    for (const v of Object.values(shares)) expect(Number.isFinite(v)).toBe(true);
    expect(bigSum(shares)).toBe(BigInt(100));
  });

  it('W2-F4 [LOW] cắt tên/title ở 200 ký tự không được cắt giữa surrogate pair (emoji)', () => {
    const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    const s = sanitizeSession(
      session({
        title: 't'.repeat(199) + '😀',
        members: [member('a', 'a'.repeat(199) + '😀'), member('b', 'Bình')],
        expenses: [expense({ title: 'x'.repeat(199) + '😀' })],
      }),
    );
    expect(s!.title).not.toMatch(loneSurrogate);
    expect(s!.members[0].name).not.toMatch(loneSurrogate);
    expect(s!.expenses[0].title).not.toMatch(loneSurrogate);
  });

  it('W2-F5 [LOW] createdAt NaN/Infinity phải bị thay bằng timestamp hữu hạn khi sanitize', () => {
    const s = sanitizeSession(
      session({
        createdAt: Infinity,
        members: [member('a'), member('b')],
        expenses: [expense({ createdAt: NaN })],
      }),
    );
    expect(Number.isFinite(s!.createdAt)).toBe(true);
    expect(Number.isFinite(s!.expenses[0].createdAt)).toBe(true);
  });

  it('W2-F6 [LOW] loadSessions: hai phiên trùng id trong máy không được cùng tồn tại sau khi nạp', () => {
    const one = session({ id: 'trung-id' });
    stubStorage(JSON.stringify({ sessions: [one, one] }));
    const loaded = loadSessions();
    expect(new Set(loaded.map((s) => s.id)).size).toBe(loaded.length);
  });

  it('W2-F7 [LOW] bank: bin/accountNumber có khoảng trắng hai đầu phải được trim ở sanitize — payload VietQR không chứa khoảng trắng', () => {
    // Cập nhật 2026-10-23 (DATA-08): vietQrUrl (img.vietqr.io) đã bị xoá; QR nay
    // dựng từ payload EMVCo local. Ý định gốc của F7 giữ nguyên: khoảng trắng
    // thừa trong trường bank không bao giờ được lọt vào artifact QR — nay việc
    // trim nằm ở sanitize (mọi đường nạp), payload chỉ chứa dữ liệu đã sạch.
    const r = sanitizeSessionDetailed(
      session({
        members: [
          {
            ...member('a', 'An'),
            bank: {
              bin: ' 970436 ',
              bankName: 'VCB',
              accountNumber: ' 0123456789 ',
              accountName: 'NGUYEN VAN AN',
            },
          },
          member('b', 'Bình'),
        ],
      }),
    );
    const bank = r.session!.members[0].bank!;
    expect(bank.bin).toBe('970436');
    expect(bank.accountNumber).toBe('0123456789');
    const payload = buildVietQrPayload(bank, 50_000, 'Tra tien');
    // Khoảng trắng chỉ được phép nằm trong nội dung chuyển khoản (addInfo) —
    // phần cấu trúc (BIN/số tài khoản) tuyệt đối không chứa khoảng trắng thừa.
    expect(payload.replace('Tra tien', '')).not.toContain(' ');
    expect(payload).toContain('0006970436');
    expect(payload).toContain('01100123456789');
  });

  it('W2-F8 [LOW] computeShares gọi trực tiếp với participantIds trùng: tổng phần chia vẫn phải = amount (hiện sanitize khử trùng nên đường ngoài an toàn — đây là lỗ hổng API trực tiếp)', () => {
    const shares = computeShares(expense({ amount: 100, participantIds: ['a', 'a', 'b'] }));
    expect(Object.values(shares).reduce((x, y) => x + y, 0)).toBe(100);
  });
});

/* ------------------------------------------------------------------ */
/* W2-E — fuzz VietQR                                                  */
/* ------------------------------------------------------------------ */

describe('W2-E buildVietQrPayload — 1.000 case ký tự đặc biệt (seed 1122334455)', () => {
  // Cập nhật 2026-10-23 (DATA-08): vietQrUrl bị xoá, thay bằng bộ dựng payload
  // EMVCo/VietQR local. Fuzz giữ cùng seed + cùng họ dữ liệu cực đoan; bất biến
  // đổi từ "URL parse được + tham số khứ hồi" sang "payload là TLV hợp lệ, CRC
  // khớp, các trường khứ hồi nguyên vẹn qua parse TLV, amount không hợp lệ bị
  // từ chối bằng RangeError thay vì sinh QR sai".
  it('payload luôn là TLV hợp lệ + CRC khớp + trường khứ hồi đúng; amount không hợp lệ -> RangeError', () => {
    const rng = mulberry32(SEED_VIETQR);
    const fragments = [
      'Nguyễn',
      'Văn',
      'A & B',
      '100%',
      'a+b',
      'x=1&y=2',
      '#tag',
      '?hoi',
      'dấu / gạch',
      '😀',
      '"nhay"',
      "'don'",
      '  khoang trang  ',
      'Quyết toán Đà Lạt',
      'a\nb',
      'a\tb',
      '%20',
      '%26',
    ];
    const parseTlv = (s: string) => {
      const out = new Map<string, string>();
      let i = 0;
      while (i < s.length) {
        const tag = s.slice(i, i + 2);
        const len = Number(s.slice(i + 2, i + 4));
        expect(Number.isInteger(len)).toBe(true);
        out.set(tag, s.slice(i + 4, i + 4 + len));
        i += 4 + len;
      }
      expect(i).toBe(s.length); // độ dài khai báo phải khớp tuyệt đối, không dư/thiếu
      return out;
    };
    let cases = 0;
    let thrown = 0;
    for (let trial = 0; trial < 1_000; trial++) {
      const bankDef = BANKS[Math.floor(rng() * BANKS.length)];
      const pickText = () =>
        Array.from(
          { length: 1 + Math.floor(rng() * 3) },
          () => fragments[Math.floor(rng() * fragments.length)],
        ).join(' ');
      // Số tài khoản giữ trong miền dữ liệu đã sanitize (số + hậu tố ngắn) để
      // độ dài TLV 2 chữ số luôn đủ — đúng miền đầu vào thật của builder.
      const accountSuffix = ['X1', 'a b', '007', ''][Math.floor(rng() * 4)];
      const accountNumber = `${Math.floor(rng() * 1e9)}${rng() < 0.3 ? accountSuffix : ''}`;
      const accountName = pickText();
      const addInfo = pickText();
      const amount = rng() < 0.2 ? 0 : Math.floor(rng() * 1e12) + (rng() < 0.3 ? 0.7 : 0);
      const bank = { bin: bankDef.bin, bankName: bankDef.name, accountNumber, accountName };
      cases++;
      if (!(Number.isInteger(amount) && amount > 0)) {
        expect(() => buildVietQrPayload(bank, amount, addInfo)).toThrow(RangeError);
        thrown++;
        continue;
      }
      const payload = buildVietQrPayload(bank, amount, addInfo);
      expect(payload.startsWith('000201010212')).toBe(true);
      expect(payload.slice(-4)).toBe(crc16Ccitt(payload.slice(0, -4)));
      const tlv = parseTlv(payload);
      expect(tlv.get('53')).toBe('704');
      expect(tlv.get('58')).toBe('VN');
      expect(tlv.get('54')).toBe(String(amount));
      const mai = parseTlv(tlv.get('38')!);
      expect(mai.get('00')).toBe('A000000727');
      expect(mai.get('02')).toBe('QRIBFTTA');
      const bene = parseTlv(mai.get('01')!);
      expect(bene.get('00')).toBe(bankDef.bin);
      expect(bene.get('01')).toBe(accountNumber);
      const expectedInfo = addInfo.trim().slice(0, 50);
      if (expectedInfo) {
        const add = parseTlv(tlv.get('62')!);
        expect(add.get('08')).toBe(expectedInfo);
      } else {
        expect(tlv.has('62')).toBe(false);
      }
    }
    expect(cases).toBe(1_000);
    console.log(`[W2-E] cases=${cases} thrown=${thrown} seed=${SEED_VIETQR}`);
  });
});

/* ------------------------------------------------------------------ */
/* W2-F — buildSettlementText với dữ liệu đã sanitize cực đoan         */
/* ------------------------------------------------------------------ */

describe('W2-G buildSettlementText hậu-sanitize', () => {
  it('phiên hợp lệ lớn (50 người, 200 khoản): text không chứa cảnh báo, đủ dòng giao dịch', () => {
    const rng = mulberry32(SEED_SPLIT ^ 0x77aa);
    const ids = Array.from({ length: 50 }, (_, i) => `u${i}`);
    const members = ids.map((id) => member(id, `Người ${id}`));
    const expenses: Expense[] = [];
    for (let k = 0; k < 200; k++) {
      expenses.push(
        expense({
          id: `x${k}`,
          amount: 1 + Math.floor(rng() * 5e9),
          payerId: ids[Math.floor(rng() * 50)],
          participantIds: ids
            .filter(() => rng() < 0.4)
            .concat(ids[k % 50])
            .filter((v, i, a) => a.indexOf(v) === i),
        }),
      );
    }
    const s = session({ members, expenses });
    const balances = computeBalances(s);
    const transfers = simplifyDebts(balances);
    const text = buildSettlementText(s, balances, transfers);
    expect(text).not.toContain('CẢNH BÁO');
    expect(bigSum(balances)).toBe(BigInt(0));
    expect(transfers.length).toBeLessThanOrEqual(49);
  });
});
