// bridge.ts — Cầu nối React ↔ Phaser cho game mode «Ai Đãi» (ARCHITECTURE §1.1).
//
// HỢP ĐỒNG ĐÃ CHỐT (coordinator đối chiếu với lane P-CORE):
// - File này KHÔNG import tĩnh `phaser`. Lý do: bridge được các màn React của
//   game module import (để lấy PlayerView + EventBus + tên sự kiện); nếu
//   bridge kéo phaser tĩnh thì phaser lọt vào chunk của màn hình và phá bất
//   biến lazy-chunk (phaser CHỈ được nạp bằng dynamic import trong
//   stage.tsx — kiểm chứng ở PROTO-D-PHASER.md). Vì vậy EventBus ở đây là
//   một emitter tối thiểu có API TƯƠNG THÍCH với Phaser.Events.EventEmitter
//   (on / once / off / emit / removeAllListeners — chính Phaser cũng xây
//   emitter của nó trên cùng ngữ nghĩa này). Scene và React dùng chung đúng
//   một singleton `EventBus` export từ file này.
// - Cơ chế speed/muted (chọn MỘT, chốt): React truyền bằng PROPS vào
//   GameStage; stage.tsx là nơi duy nhất dịch props → sự kiện bus
//   'stage:set-speed' / 'stage:set-muted' cho scene đang chạy, đồng thời
//   truyền giá trị khởi tạo qua SceneBootData khi start scene. Scene không
//   bao giờ đọc React props trực tiếp.
// - Kết quả ván LUÔN lấy từ MatchLog (tầng engine, lane A). Lớp phaser chỉ
//   diễn; bridge không chứa bất kỳ logic quyết kết quả nào.

import type { MatchLog } from '../engine/types';
import type { FpsDegradeTracker } from './degrade';

/** Kích thước logic của sân khấu (Scale.FIT co vào container của React). */
export const STAGE_WIDTH = 900;
export const STAGE_HEIGHT = 900;

/** Tốc độ diễn: 1×, 2×, hoặc 'fast' (đánh nhanh — rút gọn tới kết quả, log không đổi). */
export type StageSpeed = 0.5 | 1 | 2 | 'fast';

/**
 * Người chơi ở phía trình diễn. P-CORE dựng mảng này từ phiên + kết quả gán
 * màu của game module và truyền vào GameStage.
 * - `colorHex`: màu áo của người chơi, dạng '#RRGGBB'.
 * - `diceBearSeed`: seed tất định cho avatar DiceBear `initials` (theo kỷ
 *   luật của app: seed từ danh tính ổn định của thành viên, sinh tại client,
 *   không qua HTTP API).
 */
export interface PlayerView {
  id: string;
  name: string;
  colorHex: string;
  diceBearSeed: string;
  /**
   * VIEW-ONLY (FIX-V3 N2b, lane F): bộ nhân vật của ván (setId) và
   * nhân vật đã gán cho người này (characterKey) — do entry tra từ
   * draft tại lúc dựng PlayerView. Tầng trình diễn thuần: các trường
   * này KHÔNG vào MatchParams / paramsHash / seed / bản ghi ván.
   */
  setId?: string;
  characterKey?: string;
  /**
   * VIEW-ONLY (FIX-V3 N3, lane F): data URL ảnh avatar đã cắt vuông
   * trên máy, tra từ kho ảnh riêng `ct-game-avatars-v1`
   * (game/assets/avatar-store.ts) theo member id TẠI LÚC bắt đầu ván
   * / phát lại. CHỈ truyền lúc chạy — KHÔNG ghi vào log / bản ghi /
   * payload chia sẻ (DATA-04).
   */
  photoDataUrl?: string;
}

/**
 * Interface âm thanh TỐI THIỂU của lớp diễn — định nghĩa tại đây vì tại thời
 * điểm lane P-STAGE viết code, wrapper của P-CORE tại game/audio/sound.ts
 * CHƯA tồn tại. P-CORE truyền một object khớp interface này qua prop `sound`
 * của GameStage; scene chỉ gọi các hàm này, không tự cài howler, không tự
 * viết hệ audio thứ hai. Mọi hàm đều tuỳ chọn: thiếu hàm nào scene bỏ qua
 * hiệu ứng âm thanh đó (không lỗi).
 *
 * Kỷ luật âm thanh G2 (SPEC §7.5): `tick` và `drum` CHỈ nhận tham số là hàm
 * của vận tốc góc / thời gian còn lại — cấm phân biệt ô của ai.
 */
export interface GameSound {
  /** Tiếng «tách» khi kim G2 qua biên ô — velocity01 ∈ [0,1] là vận tốc góc chuẩn hoá. */
  tick?: (velocity01: number) => void;
  /** Một nhịp trống dồn G2 — khoá theo thời gian còn lại: remaining01 ∈ [0,1] (1 = mới bắt đầu). */
  drum?: (remaining01: number) => void;
  /** Tiếng dừng dứt khoát khi mâm G2 dừng hẳn. */
  stop?: () => void;
  /** Tiếng «bốp» khi đòn G1 trúng; crit = đòn chí mạng (mạnh hơn). */
  hit?: (crit: boolean) => void;
  /** Tiếng né đòn G1. */
  dodge?: () => void;
  /** Tiếng đòn trượt/hụt G1. */
  miss?: () => void;
  /** Tiếng ngã G1. */
  fall?: () => void;
  /** Tiếng tuyên bố giai đoạn (đột tử / ván phụ) G1. */
  phase?: () => void;
  /** Bật/tắt tiếng — stage.tsx gọi khi prop `muted` đổi. */
  setMuted?: (muted: boolean) => void;
}

/** Props của component GameStage (stage.tsx) — hợp đồng với lane P-CORE. */
export interface StageProps {
  /** Event log đã chốt của ván (tầng engine). Đổi log = huỷ instance cũ, tạo instance mới. */
  log: MatchLog;
  /** Người chơi theo đúng thứ tự của log.params.players. */
  players: PlayerView[];
  speed: StageSpeed;
  muted: boolean;
  /** Wrapper âm thanh của P-CORE (game/audio/sound.ts) — tuỳ chọn. */
  sound?: GameSound;
  /** Gọi đúng một lần khi lớp diễn chạy hết log (React chuyển sang màn kết quả M7). */
  onFinished: () => void;
  /**
   * Chỉ dùng cho G2: data-URL PNG của frame cuối của mâm (vị trí dừng thật +
   * ô highlight), chụp ngay khi scene báo FINISHED và TRƯỚC onFinished.
   * Sống ở bộ nhớ phiên — không lưu bền, không vào localStorage (cùng kỷ
   * luật payload QR).
   */
  onFinalFrame?: (dataUrl: string) => void;
  /** Gọi mỗi lần bậc auto-degrade tăng (0→1, 1→2…) để P-CORE ghi vào bản ghi ván. */
  onDegrade?: (level: number) => void;
}

/** Dữ liệu khởi tạo truyền cho scene khi Phaser start — không qua bus. */
export interface SceneBootData {
  log: MatchLog;
  players: PlayerView[];
  speed: StageSpeed;
  muted: boolean;
  sound?: GameSound;
  /** Tracker FPS dùng chung cho cả ván (stage.tsx sở hữu, scene nạp frame). */
  degrade: FpsDegradeTracker;
}

/* ------------------------------------------------------------------ */
/* Tên sự kiện bus — CHỐT, không đổi tên khi chưa qua coordinator.      */
/* ------------------------------------------------------------------ */

export const STAGE_EVENTS = {
  /** React → stage: đổi tốc độ diễn. Payload: StageSetSpeedPayload. */
  SET_SPEED: 'stage:set-speed',
  /** React → stage: đổi trạng thái tắt tiếng. Payload: StageSetMutedPayload. */
  SET_MUTED: 'stage:set-muted',
  /** Stage → React: lớp diễn đã chạy hết log. Không payload. */
  FINISHED: 'stage:finished',
  /** Stage → React: bậc auto-degrade vừa tăng. Payload: StageDegradedPayload. */
  DEGRADED: 'stage:degraded',
  /** Stage → React (tuỳ chọn): tiến độ diễn 0..1. Payload: StageProgressPayload. */
  PROGRESS: 'stage:progress',
} as const;

export interface StageSetSpeedPayload {
  speed: StageSpeed;
}
export interface StageSetMutedPayload {
  muted: boolean;
}
export interface StageDegradedPayload {
  level: number;
}
export interface StageProgressPayload {
  ratio: number;
}

type Handler = (payload: never) => void;

/**
 * Emitter tối thiểu, API tương thích tập con của Phaser.Events.EventEmitter
 * mà game mode dùng. Đủ cho cả phía React lẫn phía scene (scene nhận cùng
 * singleton này qua module — scene được nạp động trong cùng lazy chunk).
 */
export class StageEventEmitter {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): this {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return this;
  }

  once(event: string, handler: Handler): this {
    const wrap = ((payload: never) => {
      this.off(event, wrap as Handler);
      handler(payload);
    }) as Handler;
    return this.on(event, wrap);
  }

  off(event: string, handler: Handler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, payload?: unknown): boolean {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) return false;
    for (const handler of [...set]) {
      (handler as (p: unknown) => void)(payload);
    }
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) this.handlers.delete(event);
    else this.handlers.clear();
    return this;
  }

  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

/** EventBus dùng chung React ↔ Phaser — singleton duy nhất của game mode. */
export const EventBus = new StageEventEmitter();
