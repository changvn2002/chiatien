// zombie-record.spec.ts — Test hồi quy bug «ván ma» (SPEC redesign
// C1.4, AUDIT §1): chuyển thẳng script tái hiện
// chiatien-redesign-full/repro/repro-zombie-record.mjs thành test trong
// bộ game. Chuỗi: ván bắt đầu (dang-do/playing) → diễn xong chỉ patch
// phase 'result' (status vẫn dang-do) → người dùng thoát M7 bằng nút
// «Thoát game» / Back (KHÔNG qua nút «Hoàn tất» — không patch gì) → mở
// lại game mode: KHÔNG được đáp xuống M7 của ván cũ, phải vào setup.
// Bản ghi cũ vẫn nằm trong store để xem nhật ký — chỉ không chiếm
// cổng vào.
//
// Storage được TIÊM vào các hàm store (cùng mẫu GameDraftStorageLike
// của draft thiết lập trong store.spec.ts): môi trường vitest chạy
// module store ở realm riêng, gán globalThis.window từ file test
// không tới được module — tiêm là đường kiểm chứng đáng tin duy nhất.

import { describe, expect, it } from 'vitest';
import { findInProgressRecord, loadGameStore, patchRecord, upsertRecord } from './store';
import type { GameDraftStorageLike, GameRecord } from './store';

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

function makeRecord(code: string, createdAt: number): GameRecord {
  return {
    code,
    c1: 'x',
    seedDevice: 1,
    chung: '123456',
    seedFinal: 42,
    paramsHash: 'h',
    qrHash: null,
    algo: 'g2-v1',
    log: {
      params: {
        players: [
          { id: 'm1', name: 'An' },
          { id: 'm2', name: 'Bình' },
        ],
      },
    },
    status: 'dang-do',
    phase: 'playing',
    createdAt,
    finishedAt: null,
    degradeLevel: 0,
    replacedBy: null,
    qr: {},
  } as unknown as GameRecord;
}

/** Logic chọn màn khởi tạo của GameEntry (entry.tsx) — bản soi để khẳng định màn vào. */
function initialScreenOf(recovered: GameRecord | null): 'setup' | 'm6' | 'm7' {
  return recovered ? (recovered.phase === 'result' ? 'm7' : 'm6') : 'setup';
}

describe('ván ma dang-do + phase result (AUDIT §1, SPEC C1)', () => {
  it('hồi quy chính: chơi xong → thoát M7 không qua «Hoàn tất» → mở lại phải vào setup, không vào M7 cũ', () => {
    const s = fakeStorage();
    const rec = makeRecord('VAN-MA', 1000);
    // 1) handleStart: upsertRecord(dang-do/playing)
    upsertRecord(rec, s);
    expect(findInProgressRecord(s)?.code).toBe('VAN-MA');
    // 2) onFinished ở entry: CHỈ patch phase result, status vẫn dang-do
    patchRecord(rec.code, { phase: 'result' }, s);
    // 3) Thoát M7 bằng «Thoát game»/Back: không patch gì (đó là lỗi cũ)
    // 4) Mở lại game mode
    const recovered = findInProgressRecord(s);
    expect(recovered).toBeNull();
    expect(initialScreenOf(recovered)).toBe('setup');
  });

  it('tự chữa khi nạp: bản ghi ma được coi như đã kết thúc (hoan-tat) nhưng VẪN còn trong store để xem nhật ký', () => {
    const s = fakeStorage();
    const rec = makeRecord('VAN-MA-2', 2000);
    upsertRecord(rec, s);
    patchRecord(rec.code, { phase: 'result' }, s);
    const kept = loadGameStore(s).records.find((r) => r.code === 'VAN-MA-2');
    expect(kept).toBeDefined();
    expect(kept?.phase).toBe('result');
    expect(kept?.status).toBe('hoan-tat');
  });

  it('ván đang chơi thật (dang-do/playing) vẫn khôi phục được vào M6', () => {
    const s = fakeStorage();
    const rec = makeRecord('VAN-DANG-CHOI', 3000);
    upsertRecord(rec, s);
    const recovered = findInProgressRecord(s);
    expect(recovered?.code).toBe('VAN-DANG-CHOI');
    expect(initialScreenOf(recovered)).toBe('m6');
  });

  it('ván ma mới hơn không che ván đang chơi cũ hơn: find chỉ trả ván playing thật', () => {
    const s = fakeStorage();
    const playing = makeRecord('VAN-CHOI', 4000);
    upsertRecord(playing, s);
    const zombie = makeRecord('VAN-MA-MOI', 5000);
    upsertRecord(zombie, s);
    patchRecord(zombie.code, { phase: 'result' }, s);
    expect(findInProgressRecord(s)?.code).toBe('VAN-CHOI');
  });

  it('chơi lại đóng status NGAY (Addendum §3): patch da-thay-the tại thời điểm bấm → storage thô không còn dang-do + result', () => {
    // Tầng kiểm chứng: STORE (cùng tầng các test trên). GameEntry
    // không có harness component trong bộ test này (Phaser/dynamic),
    // nên chuỗi dưới đây soi đúng các lệnh store mà handlePlayAgain
    // nay thực hiện ngay khi bấm: patchRecord(code, da-thay-the) —
    // KHÔNG đợi handleStart của ván mới.
    const s = fakeStorage();
    const rec = makeRecord('VAN-CHOI-LAI', 7000);
    upsertRecord(rec, s);
    patchRecord(rec.code, { phase: 'result' }, s);
    // handlePlayAgain (entry.tsx): đóng ngay khi bấm.
    patchRecord(rec.code, { status: 'da-thay-the' }, s);
    // Storage THÔ (đọc thẳng, không qua heal của loadGameStore):
    const raw = JSON.parse(s.data.get('chiatien-game-v1') ?? '{}') as {
      records: Array<{ code: string; status: string; phase: string }>;
    };
    const keptRaw = raw.records.find((r) => r.code === 'VAN-CHOI-LAI');
    expect(keptRaw?.status).toBe('da-thay-the');
    expect(keptRaw?.phase).toBe('result');
    // Và cổng vào sạch: không khôi phục, không cần heal.
    expect(findInProgressRecord(s)).toBeNull();
    expect(loadGameStore(s).records.find((r) => r.code === 'VAN-CHOI-LAI')?.status).toBe(
      'da-thay-the',
    );
  });

  it('bản ghi đã đóng (hoan-tat) không bao giờ được khôi phục', () => {
    const s = fakeStorage();
    const rec = makeRecord('VAN-XONG', 6000);
    upsertRecord(rec, s);
    patchRecord(rec.code, { phase: 'result' }, s);
    patchRecord(rec.code, { status: 'hoan-tat', finishedAt: 6500 }, s);
    expect(findInProgressRecord(s)).toBeNull();
  });
});
