// verify.ts — verifyReplay: chạy lại engine từ seedFinal + params (tham số mặc định),
// so logHash + result + toàn bộ events. Log tạo bằng overrides (chỉ dùng trong test ép nhánh)
// KHÔNG thuộc phạm vi verify này.

import { runG1 } from './events-g1';
import { canonicalStringify, computeLogHash } from './rng';
import { runG2 } from './rules-g2';
import type { MatchLog } from './types';

export function verifyReplay(log: MatchLog): boolean {
  try {
    if (log.formatVersion !== 1) return false;
    // (1) Tính toàn vẹn nội bộ: hash tính lại từ chính nội dung log phải khớp logHash đã lưu.
    const recomputed = computeLogHash(log.params, log.seedFinal, log.events, log.result);
    if (recomputed !== log.logHash) return false;
    // (2) Tái lập xác định từ seedFinal + params.
    const replay =
      log.params.game === 'g2'
        ? runG2(log.seedFinal, log.params)
        : runG1(log.seedFinal, log.params);
    if (replay.logHash !== log.logHash) return false;
    if (canonicalStringify(replay.result) !== canonicalStringify(log.result)) return false;
    if (canonicalStringify(replay.events) !== canonicalStringify(log.events)) return false;
    return true;
  } catch {
    return false;
  }
}
