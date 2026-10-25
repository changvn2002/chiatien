// state.ts — Kiểu dữ liệu của luồng màn hình M1–M8 (tầng React, không bền
// trừ phần đã chốt vào store.ts). Payload QR chỉ sống ở đây, trong bộ nhớ.

import type { GameKind, PlayerRef } from './engine/types';
import type { ParsedShopQr } from './qr/emv';
import type { QrSourceId } from './copy';
import type { GameRecord } from './store';

export type ScreenId =
  'setup' | 'm1' | 'm2' | 'm3' | 'm3b' | 'm4' | 'm5' | 'm6' | 'm7' | 'm8' | 'rules';

/** Kết quả bước QR (M1 nhập → M2 xác nhận) trước khi khoá vào ván. */
export interface QrDraft {
  /** Payload gốc — CHỈ ở bộ nhớ, không bao giờ ghi xuống store (ARCH §8). */
  payload: string | null;
  /** Ảnh QR đã chụp/chọn dạng data URL — chỉ ở bộ nhớ, để hiện lại ở M7 khi còn phiên. */
  imageDataUrl: string | null;
  /** Đã giải mã EMV được hay chưa (false = nhánh 2c). */
  parsed: ParsedShopQr | null;
  parseFailed: boolean;
  providerId: string | null;
  confirmerId: string | null;
  source: QrSourceId | null;
  confirmedAt: number | null;
}

export const EMPTY_QR_DRAFT: QrDraft = {
  payload: null,
  imageDataUrl: null,
  parsed: null,
  parseFailed: false,
  providerId: null,
  confirmerId: null,
  source: null,
  confirmedAt: null,
};

/** Toàn bộ bản nháp của một lượt vào game mode (chưa chốt thành ván). */
export interface GameDraft {
  totalVnd: number;
  qr: QrDraft;
  selectedPlayerIds: string[];
  game: GameKind | null;
  /**
   * Bộ nhân vật cả bàn đã chọn cho ván này (FIX-V3 N2b) — TẦNG TRÌNH
   * DIỄN THUẦN: chỉ sống trong draft này, tra cứu tại lúc hiển thị.
   * TUYỆT ĐỐI không đưa vào MatchParams / paramsHash / seed / bản ghi
   * ván (store.ts) / share payload. null = chưa vào bước chọn (màn
   * M3B sẽ chốt bộ đầu tiên / bộ dự phòng).
   */
  characterSetId: string | null;
  /** Gán nhân vật theo player id → characterKey của bộ đã chọn — cùng kỷ luật trình diễn thuần như trên. */
  characterAssignments: Record<string, string>;
  /** Đang ở luồng «Chơi lại» thay thế bản ghi này (SPEC §M7) — null nếu ván thường. */
  replayOf: GameRecord | null;
}

export const EMPTY_DRAFT: GameDraft = {
  totalVnd: 0,
  qr: EMPTY_QR_DRAFT,
  selectedPlayerIds: [],
  game: null,
  characterSetId: null,
  characterAssignments: {},
  replayOf: null,
};

/**
 * Người chơi ở dạng hiển thị cho stage — dùng ĐÚNG type PlayerView của hợp
 * đồng bridge với lane P-STAGE (game/phaser/bridge.ts): diceBearSeed là
 * seed tất định từ danh tính ổn định của thành viên (ở app này = member id).
 */
import type { PlayerView } from './phaser/bridge';
export type { PlayerView } from './phaser/bridge';

export function toPlayerRefs(players: PlayerView[]): PlayerRef[] {
  return players.map((p) => ({ id: p.id, name: p.name }));
}
