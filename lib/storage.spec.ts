import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyBankBook,
  BANK_BOOK_KEY,
  extractBankBook,
  loadBankBook,
  loadSessions,
  saveBankBook,
  saveSessions,
  serializeSessions,
  stripSessionBanks,
} from './storage';
import { computeBalances, sumBalances } from './split';
import type { Session } from './types';

const STORAGE_KEY = 'chiatien:sessions:v1';

/** Dựng window.localStorage giả trong môi trường node của vitest. Trả về store để test đọc/ghi thô. */
function stubStorage(stored: string | null) {
  const store = new Map<string, string>();
  if (stored !== null) store.set(STORAGE_KEY, stored);
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function storedSession(expenses: Session['expenses'], members: Session['members']): string {
  const session: Session = {
    id: 's1',
    title: 'Dữ liệu trong máy',
    members,
    expenses,
    createdAt: 1,
    updatedAt: 2,
  };
  return JSON.stringify({ sessions: [session] });
}

const twoMembers: Session['members'] = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
];

describe('loadSessions — cùng lớp làm sạch nghiêm ngặt với share link (QA F1)', () => {
  it('ca QA gốc trong localStorage: khoản 100.000 custom {10.000, 50.000} -> khoản bị loại khi nạp, tổng số dư = 0', () => {
    stubStorage(
      storedSession(
        [
          {
            id: 'e1',
            title: 'Khoản lệch',
            amount: 100_000,
            payerId: 'a',
            participantIds: ['a', 'b'],
            mode: 'custom',
            custom: { a: 10_000, b: 50_000 },
            weights: {},
            createdAt: 1,
          },
        ],
        twoMembers,
      ),
    );
    const sessions = loadSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].expenses).toEqual([]);
    expect(sessions[0].members).toHaveLength(2);
    expect(sumBalances(computeBalances(sessions[0]))).toBe(0);
  });

  it('custom có số âm trong máy {-5.000, 105.000} -> khoản bị loại khi nạp', () => {
    stubStorage(
      storedSession(
        [
          {
            id: 'e1',
            title: 'Khoản âm',
            amount: 100_000,
            payerId: 'a',
            participantIds: ['a', 'b'],
            mode: 'custom',
            custom: { a: -5_000, b: 105_000 },
            weights: {},
            createdAt: 1,
          },
        ],
        twoMembers,
      ),
    );
    expect(loadSessions()[0].expenses).toEqual([]);
  });

  it('phiên mới tạo CHƯA có thành viên vẫn sống sót qua lần nạp lại (không bị lớp làm sạch xoá)', () => {
    stubStorage(storedSession([], []));
    const sessions = loadSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].members).toEqual([]);
  });

  it('dữ liệu hợp lệ trong máy -> nạp nguyên vẹn', () => {
    stubStorage(
      storedSession(
        [
          {
            id: 'e1',
            title: 'Ăn trưa',
            amount: 300_000,
            payerId: 'a',
            participantIds: ['a', 'b'],
            mode: 'equal',
            custom: {},
            weights: {},
            createdAt: 1,
          },
        ],
        twoMembers,
      ),
    );
    const sessions = loadSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].expenses).toHaveLength(1);
    expect(sessions[0].expenses[0].amount).toBe(300_000);
  });

  it('chuỗi lưu trữ hỏng hẳn -> danh sách rỗng, không throw', () => {
    stubStorage('khong-phai-json{{{');
    expect(loadSessions()).toEqual([]);
  });

  it('chưa từng lưu gì -> danh sách rỗng', () => {
    stubStorage(null);
    expect(loadSessions()).toEqual([]);
  });
});

describe('sổ ngân hàng per-device (DATA-04)', () => {
  const ACCOUNT = '999888777666';
  const sessionWithBank: Session = {
    id: 's-bank',
    title: 'Chuyến đi',
    members: [
      {
        id: 'a',
        name: 'An',
        bank: {
          bin: '970436',
          bankName: 'Vietcombank',
          accountNumber: ACCOUNT,
          accountName: 'NGUYEN VAN AN',
        },
      },
      { id: 'b', name: 'Bình' },
    ],
    expenses: [],
    createdAt: 1,
    updatedAt: 2,
  };

  it('BANK_BOOK_KEY đúng khoá contract', () => {
    expect(BANK_BOOK_KEY).toBe('chiatien:bank-book:v1');
  });

  it('serializeSessions: blob KHÔNG chứa số tài khoản / key bank', () => {
    const blob = serializeSessions([sessionWithBank]);
    expect(blob).not.toContain(ACCOUNT);
    expect(blob).not.toContain('"bank"');
    const parsed = JSON.parse(blob) as { sessions: Session[] };
    expect(parsed.sessions[0].members[0]).toEqual({ id: 'a', name: 'An' });
  });

  it('saveSessions -> blob thô trong localStorage KHÔNG chứa số tài khoản; sổ ngân hàng thì có', () => {
    const store = stubStorage(null);
    saveSessions([sessionWithBank]);
    expect(store.get(STORAGE_KEY)).not.toContain(ACCOUNT);
    expect(store.get(BANK_BOOK_KEY)).toContain(ACCOUNT);
    expect(loadBankBook()).toEqual({
      's-bank': { a: sessionWithBank.members[0].bank },
    });
  });

  it('saveSessions rồi loadSessions: bank được gắn lại từ sổ, đúng người đúng phiên', () => {
    stubStorage(null);
    saveSessions([sessionWithBank]);
    const loaded = loadSessions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].members[0].bank).toEqual(sessionWithBank.members[0].bank);
    expect(loaded[0].members[1].bank).toBeUndefined();
  });

  it('migration: blob legacy chứa bank -> sau loadSessions, blob đã sạch + sổ có entry + sessions vẫn đủ bank', () => {
    const store = stubStorage(JSON.stringify({ sessions: [sessionWithBank] }));
    const loaded = loadSessions();
    expect(loaded[0].members[0].bank).toEqual(sessionWithBank.members[0].bank);
    // Blob đã được ghi lại ở dạng cắt bank.
    expect(store.get(STORAGE_KEY)).not.toContain(ACCOUNT);
    // Sổ ngân hàng nhận entry từ migration.
    expect(loadBankBook()['s-bank']?.a.accountNumber).toBe(ACCOUNT);
    // Nạp lần hai (blob đã sạch) vẫn gắn được bank từ sổ.
    expect(loadSessions()[0].members[0].bank?.accountNumber).toBe(ACCOUNT);
  });

  it('saveSessions với member đã GỠ bank -> entry trong sổ bị xoá, phiên khác giữ nguyên', () => {
    const store = stubStorage(null);
    const other: Session = {
      ...sessionWithBank,
      id: 's-other',
      title: 'Phiên khác',
    };
    saveSessions([sessionWithBank, other]);
    expect(loadBankBook()['s-bank']?.a).toBeDefined();
    const stripped: Session = {
      ...sessionWithBank,
      members: sessionWithBank.members.map((m) => ({ id: m.id, name: m.name })),
    };
    saveSessions([stripped]);
    const book = loadBankBook();
    expect(book['s-bank']?.a).toBeUndefined();
    expect(book['s-other']?.a.accountNumber).toBe(ACCOUNT);
    expect(store.get(BANK_BOOK_KEY)).toContain(ACCOUNT); // của s-other
  });

  it('loadBankBook: dữ liệu hỏng -> {}; saveBankBook/loadBankBook khứ hồi nguyên vẹn', () => {
    const store = stubStorage(null);
    store.set(BANK_BOOK_KEY, 'hong{{{');
    expect(loadBankBook()).toEqual({});
    const book = { s1: { m1: sessionWithBank.members[0].bank! } };
    saveBankBook(book);
    expect(loadBankBook()).toEqual(book);
  });

  it('extractBankBook / applyBankBook / stripSessionBanks: bản sao độc lập, không mutate input', () => {
    const book = extractBankBook([sessionWithBank]);
    expect(book).toEqual({ 's-bank': { a: sessionWithBank.members[0].bank } });

    const stripped = stripSessionBanks(sessionWithBank);
    expect(stripped.members[0].bank).toBeUndefined();
    expect(sessionWithBank.members[0].bank).toBeDefined(); // input nguyên vẹn

    const reapplied = applyBankBook([stripped], book);
    expect(reapplied[0].members[0].bank).toEqual(sessionWithBank.members[0].bank);
    expect(reapplied[0]).not.toBe(stripped);
  });

  it('sổ ngân hàng chống __proto__: sessionId "__proto__" là thuộc tính riêng, không nhiễm Object.prototype', () => {
    const evil: Session = { ...sessionWithBank, id: '__proto__' };
    const book = extractBankBook([evil]);
    expect(Object.prototype.hasOwnProperty.call(book, '__proto__')).toBe(true);
    expect(book['__proto__']?.a.accountNumber).toBe(ACCOUNT);
    expect(({} as Record<string, unknown>).a).toBeUndefined();
  });
});
