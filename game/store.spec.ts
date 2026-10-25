// store.spec.ts — Test draft THIẾT LẬP bền của game mode (TEAM 2F W2):
// sửa lỗi «nhập người rồi mà vô lại bắt nhập nữa» — draft thiết lập
// (người đã chọn / tổng / trò / nhân vật / bước wizard) phải sống qua
// thoát overlay + reload, chỉ chứa các trường an toàn (KHÔNG QR/ngân
// hàng), thuộc đúng một phiên (sessionKey), lọc được id lạ khi khôi
// phục, và bị dọn khi ván bắt đầu. Storage giả lập trong bộ nhớ.

import { describe, expect, it } from 'vitest';
import {
  GAME_DRAFT_KEY,
  clearGameDraft,
  filterRestoredPlayerIds,
  loadGameDraft,
  parseGameDraft,
  saveGameDraft,
} from './store';
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

const DRAFT: PersistedGameDraft = {
  sessionKey: 'key-phien-a',
  totalVnd: 450000,
  selectedPlayerIds: ['m1', 'm3'],
  game: 'g1',
  characterSetId: 'set-x',
  characterAssignments: { m1: 'char-a', m3: 'char-c' },
  step: 2,
  savedAt: 1234567890,
};

describe('draft thiết lập bền — vòng đời trên máy', () => {
  it('lưu dưới đúng khoá riêng chiatien-game-draft-v1 và đọc lại nguyên vẹn', () => {
    const s = fakeStorage();
    saveGameDraft(DRAFT, s);
    expect([...s.data.keys()]).toEqual([GAME_DRAFT_KEY]);
    expect(GAME_DRAFT_KEY).toBe('chiatien-game-draft-v1');
    expect(loadGameDraft(s)).toEqual(DRAFT);
  });

  it('chưa từng lưu -> load trả null (khởi tạo mặc định như trước)', () => {
    expect(loadGameDraft(fakeStorage())).toBeNull();
  });

  it('schema ĐÓNG: trường lạ (kể cả qr/payload/số tài khoản) không xuống được storage', () => {
    const s = fakeStorage();
    const dirty = {
      ...DRAFT,
      qr: { payload: '00020101021238...', parsed: { accountNumber: '0123456789' } },
      chung: '777',
      replayOf: { code: '#ABC' },
    } as unknown as PersistedGameDraft;
    saveGameDraft(dirty, s);
    const raw = s.data.get(GAME_DRAFT_KEY) ?? '';
    expect(raw).not.toContain('payload');
    expect(raw).not.toContain('accountNumber');
    expect(raw).not.toContain('0123456789');
    expect(raw).not.toContain('chung');
    expect(raw).not.toContain('replayOf');
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(
      [
        'characterAssignments',
        'characterSetId',
        'game',
        'savedAt',
        'selectedPlayerIds',
        'sessionKey',
        'step',
        'totalVnd',
      ].sort(),
    );
  });

  it('dọn draft: load trả null sau clear, khoá khác trên máy không bị đụng', () => {
    const s = fakeStorage();
    s.setItem('chiatien-game-v1', '{"records":[],"abandonedCommitments":0}');
    saveGameDraft(DRAFT, s);
    clearGameDraft(s);
    expect(loadGameDraft(s)).toBeNull();
    expect(s.data.get('chiatien-game-v1')).toBe('{"records":[],"abandonedCommitments":0}');
  });

  it('draft mang sessionKey của đúng phiên sở hữu — phiên khác đọc được nhưng không khớp vân tay', () => {
    const s = fakeStorage();
    saveGameDraft(DRAFT, s);
    const loaded = loadGameDraft(s);
    expect(loaded?.sessionKey).toBe('key-phien-a');
    expect(loaded?.sessionKey).not.toBe('key-phien-b');
  });
});

describe('parseGameDraft — dữ liệu hỏng / sai dạng -> null, không ném lỗi', () => {
  it('không phải JSON', () => {
    expect(parseGameDraft('khong-phai-json')).toBeNull();
    expect(parseGameDraft(null)).toBeNull();
    expect(parseGameDraft('')).toBeNull();
  });

  it('thiếu sessionKey hoặc sessionKey rỗng', () => {
    expect(parseGameDraft(JSON.stringify({ ...DRAFT, sessionKey: '' }))).toBeNull();
    const rest: Record<string, unknown> = { ...DRAFT };
    delete rest.sessionKey;
    expect(parseGameDraft(JSON.stringify(rest))).toBeNull();
  });

  it('bước wizard ngoài 1..3', () => {
    expect(parseGameDraft(JSON.stringify({ ...DRAFT, step: 9 }))).toBeNull();
    expect(parseGameDraft(JSON.stringify({ ...DRAFT, step: 0 }))).toBeNull();
  });

  it('selectedPlayerIds chứa phần tử không phải chuỗi', () => {
    expect(parseGameDraft(JSON.stringify({ ...DRAFT, selectedPlayerIds: ['m1', 42] }))).toBeNull();
  });

  it('game không thuộc g1/g2/null, totalVnd không phải số, gán nhân vật có giá trị không phải chuỗi', () => {
    expect(parseGameDraft(JSON.stringify({ ...DRAFT, game: 'g3' }))).toBeNull();
    expect(parseGameDraft(JSON.stringify({ ...DRAFT, totalVnd: '450000' }))).toBeNull();
    expect(
      parseGameDraft(JSON.stringify({ ...DRAFT, characterAssignments: { m1: 7 } })),
    ).toBeNull();
  });

  it('bản hợp lệ qua được nguyên vẹn (kể cả game null = chưa chọn trò)', () => {
    expect(parseGameDraft(JSON.stringify(DRAFT))).toEqual(DRAFT);
    expect(parseGameDraft(JSON.stringify({ ...DRAFT, game: null }))).toEqual({
      ...DRAFT,
      game: null,
    });
  });
});

describe('filterRestoredPlayerIds — lọc lựa chọn đã lưu theo roster hiện tại', () => {
  const MEMBERS = ['m1', 'm2', 'm3', 'm4'];

  it('giữ đúng tập con người dùng đã chọn, đúng thứ tự đã lưu (kịch bản W1: bỏ Dũng -> còn An, Bình, Chi)', () => {
    expect(filterRestoredPlayerIds(['m1', 'm2', 'm3'], MEMBERS)).toEqual(['m1', 'm2', 'm3']);
    expect(filterRestoredPlayerIds(['m3', 'm1'], MEMBERS)).toEqual(['m3', 'm1']);
  });

  it('id không còn trong phiên (thành viên đã bị xoá) bị bỏ, phần còn lại giữ nguyên', () => {
    expect(filterRestoredPlayerIds(['m1', 'mX', 'm3'], MEMBERS)).toEqual(['m1', 'm3']);
  });

  it('lọc xong rỗng -> quay về mặc định cả bàn', () => {
    expect(filterRestoredPlayerIds(['mX', 'mY'], MEMBERS)).toEqual(MEMBERS);
  });

  it('bản lưu vốn rỗng -> cả bàn (như khởi tạo lần đầu)', () => {
    expect(filterRestoredPlayerIds([], MEMBERS)).toEqual(MEMBERS);
  });
});
