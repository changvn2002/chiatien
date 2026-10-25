// types.ts — Kiểu dữ liệu dùng chung cho outcome engine «Ai Đãi».
// Engine thuần TypeScript, zero-dependency, xác định (deterministic):
// không Math.random / Date.now ở bất cứ đâu trong tầng quyết định.

export interface PlayerRef {
  id: string;
  name: string;
}

export type GameKind = 'g1' | 'g2';

export interface MatchParams {
  game: GameKind;
  /** Người chơi theo đúng thứ tự đã khoá tại màn đồng thuận (thứ tự là một phần của paramsHash). */
  players: PlayerRef[];
  totalVnd: number;
}

export type MatchResult =
  { kind: 'single'; payerId: string } | { kind: 'co-payers'; payerIds: string[] };

export type AttackKind = 'dam' | 'da';
export type AttackOutcome = 'hit' | 'miss' | 'dodge' | 'crit';
export type PhaseKind = 'main' | 'sudden' | 'sub';

export interface AttackEvent {
  type: 'attack';
  tick: number;
  attackerId: string;
  targetId: string;
  attack: AttackKind;
  outcome: AttackOutcome;
  /** Sát thương đã áp (0 khi miss/dodge). */
  damage: number;
  /** HP của target ngay sau đòn này trong tick (ngã chỉ áp dụng cuối tick). */
  targetHpAfter: number;
}

export interface FallEvent {
  type: 'fall';
  tick: number;
  playerId: string;
}

export interface PhaseEvent {
  type: 'phase';
  tick: number;
  phase: PhaseKind;
}

export interface SpinEvent {
  type: 'spin';
  cellIndex: number;
  finalAngleDeg: number;
  spinSeconds: number;
}

export type GameEvent = AttackEvent | FallEvent | PhaseEvent | SpinEvent;

export const ALGO_ID = 'mulberry32-fnv1a64-v1' as const;
export type AlgoId = typeof ALGO_ID;

export interface MatchLog {
  formatVersion: 1;
  algo: AlgoId;
  params: MatchParams;
  seedFinal: number;
  events: GameEvent[];
  result: MatchResult;
  logHash: string;
}

/** Khoảnh khắc quyết định có cấu trúc cho tường thuật M7 (chưa có câu chữ). */
export interface Highlight {
  kind: 'first-fall' | 'decisive-fall' | 'crit' | 'dodge';
  tick: number;
  attackerId?: string;
  targetId?: string;
  playerId?: string;
  damage?: number;
}
