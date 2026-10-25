// rules-g2.ts — G2 «Mâm Cơm Xoay» (SPEC §7): RNG chốt ô tại thời điểm quay,
// góc nghỉ bắt buộc trong 50% giữa của ô, thời lượng 8–12 s. Không hoà theo cấu trúc.

import { computeLogHash, mulberry32 } from './rng';
import { ALGO_ID } from './types';
import type { MatchLog, MatchParams } from './types';

export function runG2(seedFinal: number, params: MatchParams): MatchLog {
  const n = params.players.length;
  const rand = mulberry32(seedFinal >>> 0);

  const cellIndex = Math.floor(rand() * n);
  const cellAngleDeg = 360 / n;
  // Phân đoạn [0,25 ; 0,75] của ô: đầu ô + góc ô × (0,25 + rand × 0,5).
  const finalAngleDeg = cellIndex * cellAngleDeg + cellAngleDeg * (0.25 + rand() * 0.5);
  const spinSeconds = 8 + rand() * 4;

  const events: MatchLog['events'] = [{ type: 'spin', cellIndex, finalAngleDeg, spinSeconds }];
  const result: MatchLog['result'] = { kind: 'single', payerId: params.players[cellIndex].id };
  const logHash = computeLogHash(params, seedFinal >>> 0, events, result);

  return {
    formatVersion: 1,
    algo: ALGO_ID,
    params,
    seedFinal: seedFinal >>> 0,
    events,
    result,
    logHash,
  };
}
