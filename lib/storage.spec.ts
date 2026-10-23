import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSessions } from './storage';
import { computeBalances, sumBalances } from './split';
import type { Session } from './types';

const STORAGE_KEY = 'chiatien:sessions:v1';

/** Dựng window.localStorage giả trong môi trường node của vitest. */
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
