// store.ts — Lưu bền của game module (ARCHITECTURE §8).
// Khóa localStorage RIÊNG của game: `chiatien-game-v1`. Nội dung CHỈ gồm dữ
// liệu vận hành của ván: mã ván, C1, dữ liệu suy ra seed cần cho khôi phục
// (seed_device + số chung + seedFinal), paramsHash, hash của QR payload,
// định danh/phiên bản thuật toán, event log + hash, kết quả, trạng thái
// nhật ký, thời điểm. TUYỆT ĐỐI KHÔNG chứa: payload QR thô, ảnh QR, số tài
// khoản, tên chủ tài khoản hay dữ kiện ngân hàng — QR chỉ sống ở bộ nhớ
// trong phiên game đang mở; muốn hiện lại QR sau khi app đã đóng phải nhập
// lại và đối chiếu hash (xem M7).

import type { MatchLog } from './engine/types';
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
