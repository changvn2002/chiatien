// draft-map.spec.ts — Draft thiết lập bền dạng BẢN ĐỒ theo sessionKey
// (SPEC redesign C2, mục tồn đọng từ 8668174): nhiều phiên giữ draft
// riêng ĐỒNG THỜI dưới cùng khoá chiatien-game-draft-v1 — ghi draft
// của phiên B không ghi đè phiên A; clear chỉ xoá draft của đúng phiên.
// Schema an toàn giữ nguyên: mỗi draft vẫn đúng 8 trường cũ, QR payload
// / số tài khoản / số chung TUYỆT ĐỐI không xuống storage.
// Tương thích ngược: draft ĐƠN cũ (dạng PersistedGameDraft trần ghi bởi
// bản trước) phải đọc được, hoặc ít nhất bị bỏ an toàn không crash —
// bộ test này chốt lựa chọn ĐỌC ĐƯỢC + được nhập vào bản đồ khi ghi mới.

import { describe, expect, it } from 'vitest';
import { GAME_DRAFT_KEY, clearGameDraft, loadGameDraft, saveGameDraft } from './store';
import type { GameDraftStorageLike, PersistedGameDraft } from './store';

function fakeStorage(): GameDraftStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

const DRAFT_A: PersistedGameDraft = {
  sessionKey: 'key-phien-a',
  totalVnd: 450000,
  selectedPlayerIds: ['m1', 'm3'],
  game: 'g1',
  characterSetId: 'set-x',
  characterAssignments: { m1: 'char-a', m3: 'char-c' },
  step: 2,
  savedAt: 111,
};

const DRAFT_B: PersistedGameDraft = {
  sessionKey: 'key-phien-b',
  totalVnd: 900000,
  selectedPlayerIds: ['m2'],
  game: 'g2',
  characterSetId: null,
  characterAssignments: {},
  step: 1,
  savedAt: 222,
};

const DRAFT_FIELDS = [
  'characterAssignments',
  'characterSetId',
  'game',
  'savedAt',
  'selectedPlayerIds',
  'sessionKey',
  'step',
  'totalVnd',
].sort();

describe('draft bản đồ theo sessionKey — nhiều phiên đồng thời', () => {
  it('ghi draft phiên B không ghi đè draft phiên A; đọc theo phiên trả đúng draft của phiên đó', () => {
    const s = fakeStorage();
    saveGameDraft(DRAFT_A, s);
    saveGameDraft(DRAFT_B, s);
    expect([...s.data.keys()]).toEqual([GAME_DRAFT_KEY]);
    expect(loadGameDraft(s, 'key-phien-a')).toEqual(DRAFT_A);
    expect(loadGameDraft(s, 'key-phien-b')).toEqual(DRAFT_B);
    expect(loadGameDraft(s, 'key-phien-c')).toBeNull();
  });

  it('ghi lại draft của cùng một phiên chỉ thay đúng phiên đó', () => {
    const s = fakeStorage();
    saveGameDraft(DRAFT_A, s);
    saveGameDraft(DRAFT_B, s);
    const a2 = { ...DRAFT_A, totalVnd: 500000, step: 3 as const, savedAt: 333 };
    saveGameDraft(a2, s);
    expect(loadGameDraft(s, 'key-phien-a')).toEqual(a2);
    expect(loadGameDraft(s, 'key-phien-b')).toEqual(DRAFT_B);
  });

  it('clear(sessionKey) chỉ xoá draft của đúng phiên đó, draft phiên khác còn nguyên', () => {
    const s = fakeStorage();
    saveGameDraft(DRAFT_A, s);
    saveGameDraft(DRAFT_B, s);
    clearGameDraft(s, 'key-phien-a');
    expect(loadGameDraft(s, 'key-phien-a')).toBeNull();
    expect(loadGameDraft(s, 'key-phien-b')).toEqual(DRAFT_B);
  });

  it('load không chỉ định phiên (đường cũ) với nhiều draft -> trả draft mới nhất theo savedAt', () => {
    const s = fakeStorage();
    saveGameDraft(DRAFT_A, s);
    saveGameDraft(DRAFT_B, s);
    expect(loadGameDraft(s)?.sessionKey).toBe('key-phien-b');
  });

  it('schema ĐÓNG theo từng draft trong bản đồ: dump storage không chứa QR/số tài khoản/số chung, mỗi draft đúng 8 trường', () => {
    const s = fakeStorage();
    const dirtyA = {
      ...DRAFT_A,
      qr: { payload: '00020101021238...', parsed: { accountNumber: '0123456789' } },
      chung: '777',
      replayOf: { code: '#ABC' },
    } as unknown as PersistedGameDraft;
    saveGameDraft(dirtyA, s);
    saveGameDraft(DRAFT_B, s);
    const raw = s.data.get(GAME_DRAFT_KEY) ?? '';
    expect(raw).not.toContain('payload');
    expect(raw).not.toContain('accountNumber');
    expect(raw).not.toContain('0123456789');
    expect(raw).not.toContain('chung');
    expect(raw).not.toContain('replayOf');
    const map = JSON.parse(raw) as Record<string, unknown>;
    expect(Object.keys(map).sort()).toEqual(['key-phien-a', 'key-phien-b']);
    for (const key of Object.keys(map)) {
      expect(Object.keys(map[key] as Record<string, unknown>).sort()).toEqual(DRAFT_FIELDS);
    }
  });
});

describe('draft bản đồ — tương thích ngược với draft đơn cũ', () => {
  it('draft ĐƠN cũ (dạng trần của bản trước) đọc được theo đúng sessionKey của nó', () => {
    const s = fakeStorage();
    s.setItem(GAME_DRAFT_KEY, JSON.stringify(DRAFT_A));
    expect(loadGameDraft(s, 'key-phien-a')).toEqual(DRAFT_A);
    expect(loadGameDraft(s, 'key-phien-b')).toBeNull();
    expect(loadGameDraft(s)).toEqual(DRAFT_A);
  });

  it('ghi draft mới khi máy đang có draft đơn cũ: draft cũ được nhập vào bản đồ, không mất', () => {
    const s = fakeStorage();
    s.setItem(GAME_DRAFT_KEY, JSON.stringify(DRAFT_A));
    saveGameDraft(DRAFT_B, s);
    expect(loadGameDraft(s, 'key-phien-a')).toEqual(DRAFT_A);
    expect(loadGameDraft(s, 'key-phien-b')).toEqual(DRAFT_B);
  });

  it('clear(sessionKey) trên máy còn draft đơn cũ chỉ bỏ đúng draft đó', () => {
    const s = fakeStorage();
    s.setItem(GAME_DRAFT_KEY, JSON.stringify(DRAFT_A));
    clearGameDraft(s, 'key-phien-a');
    expect(loadGameDraft(s)).toBeNull();
  });

  it('nội dung hỏng / lẫn dạng trong kho draft -> null an toàn, không ném lỗi', () => {
    const s = fakeStorage();
    s.setItem(GAME_DRAFT_KEY, 'khong-phai-json');
    expect(loadGameDraft(s, 'key-phien-a')).toBeNull();
    s.setItem(
      GAME_DRAFT_KEY,
      JSON.stringify({ 'key-phien-a': { hong: true }, 'key-phien-b': DRAFT_B }),
    );
    expect(loadGameDraft(s, 'key-phien-a')).toBeNull();
    expect(loadGameDraft(s, 'key-phien-b')).toEqual(DRAFT_B);
  });
});
