// play-duration.ts — SÀN THỜI LƯỢNG TRÌNH DIỄN của màn chơi
// (REDESIGN Pha 2, SPEC §C2/P-10): kết quả KHÔNG được công bố trước
// khi pha diễn tối thiểu của trò hoàn tất — cổng vào → diễn giảm tốc
// thật → 1 nhịp dừng trước công bố. Bất biến nằm ở máy trạng thái màn
// chơi (PlayScreen): onFinished từ scene chỉ được chấp nhận sau sàn;
// scene báo sớm hơn thì HOÃN công bố tới khi đủ sàn, không huỷ ván.
//
// Căn cứ số (hằng số thật trong engine/scene, đo lại 2026-10-26):
// - G2 «Mâm cơm xoay»: engine chốt spinSeconds = 8 + rand×4 giây
//   (game/engine/rules-g2.ts) → thời lượng danh định toàn pha =
//   0,35 s nghỉ trước quay (scenes-g2.ts delayedCall 350) + 8–12 s
//   quay + 1,2 s giữ khung dừng + 0,65 s highlight ≈ 10,2–14,0 s.
//   SÀN = 8.000 ms = đúng thời lượng quay tối thiểu — thấp hơn danh
//   định tối thiểu ~2,2 s (khoảng an toàn) nhưng chặn đứng mọi
//   «vừa vào đã xong» (scene báo finished ngay khi log hỏng ở ~0 s).
// - G1 «Đấu trường tự động»: tickSeconds = 0,5 s/tick
//   (game/engine/events-g1.ts G1_PARAMS), ván chính tối thiểu theo
//   thiết kế mainTicks2p = 40 tick cho nhóm nhỏ nhất → 20 s; nhóm ≥3
//   đo trung vị 57–67 tick ≈ 28,5–33,5 s, cộng 0,4 s nghỉ đầu +
//   ~1 s giữ khung kết (scenes-g1.ts) → danh định ≈ 28,5–40 s như
//   SPEC. SÀN = 20.000 ms — thấp hơn danh định ≥8,5 s, vẫn ≫ 0.

import type { GameKind } from './engine/types';

/** Sàn trình diễn tối thiểu của G2 (ms) — bằng thời lượng quay tối thiểu 8 s của engine. */
export const G2_MIN_PRESENTATION_MS = 8_000;

/** Sàn trình diễn tối thiểu của G1 (ms) — 40 tick × 0,5 s/tick của pha chính tối thiểu. */
export const G1_MIN_PRESENTATION_MS = 20_000;

export function minPresentationMs(game: GameKind): number {
  return game === 'g2' ? G2_MIN_PRESENTATION_MS : G1_MIN_PRESENTATION_MS;
}

export interface PresentationGate {
  /** Đã qua sàn — chấp nhận công bố kết quả ngay. */
  ready: boolean;
  /** Thời gian còn phải hoãn (ms) nếu chưa đủ sàn; 0 khi ready. */
  waitMs: number;
  /** Sàn áp dụng cho trò này (ms). */
  floorMs: number;
}

/**
 * Cổng sàn thời lượng THUẦN: cho mốc bắt đầu pha diễn (startedAtMs)
 * và thời điểm scene báo finished (nowMs), quyết định công bố ngay
 * hay hoãn bao lâu. Mốc âm/lệch (now < start) coi như chưa qua chút
 * nào — hoãn đủ cả sàn.
 */
export function presentationGate(
  game: GameKind,
  startedAtMs: number,
  nowMs: number,
): PresentationGate {
  const floorMs = minPresentationMs(game);
  const elapsed = Math.max(0, nowMs - startedAtMs);
  const waitMs = Math.max(0, floorMs - elapsed);
  return { ready: waitMs === 0, waitMs, floorMs };
}
