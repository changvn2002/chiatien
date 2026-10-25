// store.ts — Lưu bền của game module (ARCHITECTURE §8).
// Khóa localStorage RIÊNG của game: `chiatien-game-v1`. Nội dung CHỈ gồm dữ
// liệu vận hành của ván: mã ván, C1, dữ liệu suy ra seed cần cho khôi phục
// (seed_device + số chung + seedFinal), paramsHash, hash của QR payload,
// định danh/phiên bản thuật toán, event log + hash, kết quả, trạng thái
// nhật ký, thời điểm. TUYỆT ĐỐI KHÔNG chứa: payload QR thô, ảnh QR, số tài
// khoản, tên chủ tài khoản hay dữ kiện ngân hàng — QR chỉ sống ở bộ nhớ
// trong phiên game đang mở; muốn hiện lại QR sau khi app đã đóng phải nhập
// lại và đối chiếu hash (xem M7).

import type { GameKind, MatchLog } from './engine/types';
import type { QrSourceId } from './copy';

/** Bốn trạng thái chốt tên trong nhật ký phiên (SPEC §M7) + trạng thái đang dở. */
export type MatchStatus =
  | 'dang-do' // đã cam kết + đã chốt log, chưa kết thúc (đang chơi / chờ xem kết quả)
  | 'hoan-tat'
  | 'da-huy-cong-khai'
  | 'da-thay-the'
  | 'da-bo-chia-deu';

/** Thông tin xác nhận QR được phép lưu (không có dữ kiện ngân hàng thô). */
export interface QrConfirmMeta {
  /** Nhánh M2: 2a = có tên, 2b = không tên, 2c = không giải mã được. */
  branch: '2a' | '2b' | '2c';
  providerId: string | null;
  confirmerId: string | null;
  confirmerName: string | null;
  source: QrSourceId | null;
  confirmedAt: number | null;
  /** Tên hiển thị ngân hàng đã xác nhận (hoặc mã BIN nguyên văn) — để lặp lại ở M5/M7. */
  bankDisplay: string | null;
  /** STK đã che giữa — dạng hiển thị, không phải số tài khoản thô đầy đủ. */
  maskedAccount: string | null;
  /** Tên chủ TK nguyên văn như trong QR (chỉ khi nhánh 2a) — hiển thị đối chiếu, không phải khoá tra cứu. */
  accountName: string | null;
  /** Có cảnh báo trùng tên thành viên ở M2 hay không (để hiện nhật ký xác nhận ở M7). */
  nameMatchedMember: boolean;
}

export interface GameRecord {
  code: string;
  c1: string;
  seedDevice: number;
  /** Số chung do thành viên khác nhập (chuỗi số, giữ nguyên như đã nhập). */
  chung: string;
  seedFinal: number;
  paramsHash: string;
  /** fnv1a64 của payload QR đã khoá vào ván; null khi nhánh 2c/không có QR. */
  qrHash: string | null;
  algo: string;
  log: MatchLog;
  status: MatchStatus;
  /** Giai đoạn hiển thị khi khôi phục: đang diễn lại hay đã tới kết quả. */
  phase: 'playing' | 'result';
  createdAt: number;
  finishedAt: number | null;
  /** Bậc giảm tải lớp diễn đã áp (ARCH §6) — chỉ ghi nhận, không đổi kết quả. */
  degradeLevel: number;
  /** Mã ván thay thế ván này (khi status = 'da-thay-the'). */
  replacedBy: string | null;
  qr: QrConfirmMeta;
}

export interface GameStoreData {
  records: GameRecord[];
  /** Số cam kết C1 đã hiển thị rồi bị bỏ (SPEC §5/§M6) — hiện ở M5 của ván sau. */
  abandonedCommitments: number;
}

const STORAGE_KEY = 'chiatien-game-v1';

const EMPTY: GameStoreData = { records: [], abandonedCommitments: 0 };

export function loadGameStore(): GameStoreData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<GameStoreData>;
    return {
      records: Array.isArray(parsed.records) ? (parsed.records as GameRecord[]) : [],
      abandonedCommitments:
        typeof parsed.abandonedCommitments === 'number' ? parsed.abandonedCommitments : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveGameStore(data: GameStoreData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Hết quota / chế độ riêng tư: game vẫn chạy trong bộ nhớ phiên này;
    // khôi phục sau reload là tính năng suy biến, không chặn ván hiện tại.
  }
}

export function upsertRecord(record: GameRecord): GameStoreData {
  const data = loadGameStore();
  const idx = data.records.findIndex((r) => r.code === record.code);
  if (idx >= 0) data.records[idx] = record;
  else data.records.push(record);
  saveGameStore(data);
  return data;
}

export function patchRecord(code: string, patch: Partial<GameRecord>): GameStoreData {
  const data = loadGameStore();
  const idx = data.records.findIndex((r) => r.code === code);
  if (idx >= 0) data.records[idx] = { ...data.records[idx], ...patch };
  saveGameStore(data);
  return data;
}

/** Ván đang dở gần nhất (đã cam kết, chưa kết thúc) — để khôi phục đúng ván, không sinh ván mới. */
export function findInProgressRecord(): GameRecord | null {
  const data = loadGameStore();
  for (let i = data.records.length - 1; i >= 0; i--) {
    if (data.records[i].status === 'dang-do') return data.records[i];
  }
  return null;
}

export function countAbandonedCommitments(): number {
  return loadGameStore().abandonedCommitments;
}

export function incrementAbandonedCommitments(): void {
  const data = loadGameStore();
  data.abandonedCommitments += 1;
  saveGameStore(data);
}

/* ------------------------------------------------------------------ */
/* Draft THIẾT LẬP bền (TEAM 2F W2 — sửa lỗi «nhập người rồi mà vô lại  */
/* bắt nhập nữa»): trước đây GameDraft chỉ sống ở bộ nhớ của GameEntry */
/* (game/state.ts) — thoát overlay / reload / đóng tab là unmount và   */
/* mất sạch lựa chọn người chơi, tổng sửa tay, gán nhân vật + vị trí   */
/* bước wizard. Nay draft thiết lập được ghi xuống máy MỖI KHI ĐỔI     */
/* trong giai đoạn thiết lập và khôi phục khi GameEntry mount lại.     */
/*                                                                     */
/* KỶ LUẬT AN TOÀN (giữ nguyên §8 + DATA-04):                          */
/* - Khoá RIÊNG `chiatien-game-draft-v1`, tách khỏi kho ván            */
/*   `chiatien-game-v1` — draft không lẫn vào bản ghi ván đã chốt.     */
/* - CHỈ lưu các trường thiết lập an toàn: lựa chọn người chơi, tổng,  */
/*   trò, bộ/gán nhân vật (trình diễn thuần), bước wizard. TUYỆT ĐỐI   */
/*   KHÔNG lưu draft.qr (payload/ảnh QR/số tài khoản/tên chủ TK chỉ    */
/*   sống ở bộ nhớ), KHÔNG lưu số chung / xác nhận đồng thuận (trường  */
/*   đồng thuận trực tiếp — nhập lại tại bước 3), KHÔNG lưu replayOf.  */
/* - Thuần dữ liệu TRÊN MÁY (localStorage): không vào share payload,   */
/*   không rời thiết bị.                                               */
/* - Draft mang `sessionKey` = vân tay phiên (tiêu đề + danh sách id   */
/*   thành viên, băm tại entry.tsx) — draft của phiên khác KHÔNG được  */
/*   áp lên phiên này; khi phiên đổi roster, vân tay đổi và draft cũ   */
/*   tự vô hiệu (lựa chọn còn được lọc theo id hiện tại lúc khôi phục).*/
/* - Chỉ MỘT slot draft (lượt thiết lập gần nhất đang dở) — đúng nhu   */
/*   cầu «vào lại phiên đang làm dở thì tiếp tục đúng chỗ đó».         */
/* - Dọn draft khi ván THỰC SỰ bắt đầu (điểm upsertRecord ở            */
/*   entry.tsx handleStart): draft đã tiêu thụ không được dính sang    */
/*   lần chơi sau. Các đường THOÁT (Thoát game / Chia đều / Back) GIỮ  */
/*   draft — đó chính là hành vi người dùng mong đợi theo phản hồi.    */
/* ------------------------------------------------------------------ */

/** Khoá localStorage riêng của draft thiết lập — KHÔNG dùng chung khoá với kho ván. */
export const GAME_DRAFT_KEY = 'chiatien-game-draft-v1';

/** Các bước của wizard thiết lập (FLOW-3STEP) được phép khôi phục. */
export type SetupStep = 1 | 2 | 3;

/** Hình dạng draft thiết lập được phép ghi xuống máy — danh sách trường đóng, không trường nào khác được ghi. */
export interface PersistedGameDraft {
  /** Vân tay phiên sở hữu draft (băm tiêu đề + id thành viên tại entry.tsx). */
  sessionKey: string;
  totalVnd: number;
  selectedPlayerIds: string[];
  game: GameKind | null;
  characterSetId: string | null;
  characterAssignments: Record<string, string>;
  step: SetupStep;
  savedAt: number;
}

/** Interface tối thiểu của storage — để test thuần không cần trình duyệt (mẫu avatar-store). */
export interface GameDraftStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultDraftStorage(): GameDraftStorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isSetupStep(value: unknown): value is SetupStep {
  return value === 1 || value === 2 || value === 3;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === 'string');
}

/**
 * Giải mã nội dung thô của kho draft → draft đã kiểm kiểu từng trường.
 * Dữ liệu hỏng / sai dạng / thiếu trường bắt buộc → null (coi như không
 * có draft — khởi tạo mặc định như trước), không ném lỗi.
 */
export function parseGameDraft(raw: string | null): PersistedGameDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedGameDraft>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.sessionKey !== 'string' || parsed.sessionKey.length === 0) return null;
    if (typeof parsed.totalVnd !== 'number' || !Number.isFinite(parsed.totalVnd)) return null;
    if (
      !Array.isArray(parsed.selectedPlayerIds) ||
      !parsed.selectedPlayerIds.every((id) => typeof id === 'string')
    ) {
      return null;
    }
    if (parsed.game !== null && parsed.game !== 'g1' && parsed.game !== 'g2') return null;
    if (parsed.characterSetId !== null && typeof parsed.characterSetId !== 'string') return null;
    if (!isStringRecord(parsed.characterAssignments)) return null;
    if (!isSetupStep(parsed.step)) return null;
    return {
      sessionKey: parsed.sessionKey,
      totalVnd: parsed.totalVnd,
      selectedPlayerIds: [...parsed.selectedPlayerIds],
      game: parsed.game,
      characterSetId: parsed.characterSetId,
      characterAssignments: { ...parsed.characterAssignments },
      step: parsed.step,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/** Đọc draft thiết lập đang dở trên máy. Không có / hỏng / không có storage → null. */
export function loadGameDraft(
  storage: GameDraftStorageLike | null = defaultDraftStorage(),
): PersistedGameDraft | null {
  if (!storage) return null;
  try {
    return parseGameDraft(storage.getItem(GAME_DRAFT_KEY));
  } catch {
    return null;
  }
}

/**
 * Ghi draft thiết lập xuống máy. Chỉ ghi ĐÚNG các trường trong schema
 * đóng ở trên (chọn từng trường khi serialize — trường lạ lọt vào object
 * lúc chạy cũng không xuống được storage). Lỗi quota/riêng tư → bỏ qua:
 * game vẫn chạy trong bộ nhớ, khôi phục chỉ là tính năng suy biến.
 */
export function saveGameDraft(
  draft: PersistedGameDraft,
  storage: GameDraftStorageLike | null = defaultDraftStorage(),
): void {
  if (!storage) return;
  try {
    const closed: PersistedGameDraft = {
      sessionKey: draft.sessionKey,
      totalVnd: draft.totalVnd,
      selectedPlayerIds: [...draft.selectedPlayerIds],
      game: draft.game,
      characterSetId: draft.characterSetId,
      characterAssignments: { ...draft.characterAssignments },
      step: draft.step,
      savedAt: draft.savedAt,
    };
    storage.setItem(GAME_DRAFT_KEY, JSON.stringify(closed));
  } catch {
    // Hết quota / chế độ riêng tư — xem ghi chú ở saveGameStore.
  }
}

/** Xoá draft thiết lập trên máy (ván đã bắt đầu — draft đã tiêu thụ). */
export function clearGameDraft(storage: GameDraftStorageLike | null = defaultDraftStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(GAME_DRAFT_KEY);
  } catch {
    // Không có storage khả dụng — không có gì để dọn.
  }
}

/**
 * Lọc lựa chọn người chơi đã lưu theo roster HIỆN TẠI của phiên lúc khôi
 * phục: id không còn trong phiên thì bỏ; lọc xong rỗng (hoặc bản lưu vốn
 * rỗng) → quay về mặc định CẢ BÀN như khởi tạo lần đầu. Thứ tự giữ theo
 * bản đã lưu (đúng thứ tự người dùng đã chốt ở bước 2).
 */
export function filterRestoredPlayerIds(
  savedIds: readonly string[],
  memberIds: readonly string[],
): string[] {
  const memberSet = new Set(memberIds);
  const kept = savedIds.filter((id) => memberSet.has(id));
  return kept.length > 0 ? kept : [...memberIds];
}
