// events-g1.ts — G1 «Đấu Trường» (SPEC §8): bộ máy sự kiện xác định theo tick.
// Nguồn sự thật của ván là chuỗi sự kiện; lớp diễn (Phaser) không bao giờ quyết kết quả.
// Máy trạng thái hoà/đột tử theo SPEC §8.5 + hợp đồng PROTO-STATE:
//   main → (hết giờ, ≥2 đứng) sudden → (chưa phân định) đúng MỘT sub → co-payers nếu vẫn hoà.

import { computeLogHash, mulberry32 } from './rng';
import { ALGO_ID } from './types';
import type {
  AttackEvent,
  GameEvent,
  Highlight,
  MatchLog,
  MatchParams,
  MatchResult,
  PhaseKind,
  PlayerRef,
} from './types';

export interface G1ParamsShape {
  hp: number;
  damMin: number;
  damMax: number;
  daMin: number;
  daMax: number;
  /** Xác suất target né đòn. */
  dodgeProb: number;
  /** Xác suất đòn trượt. */
  missProb: number;
  /** Xác suất chí mạng khi đòn trúng. */
  critProb: number;
  critMult: number;
  tickSeconds: number;
  mainTicks: number;
  mainTicks2p: number;
  suddenTicks: number;
  subTicks: number;
}

/**
 * Tham số cân bằng công khai — không phải hằng số giấu.
 * CHỐT LẠI bởi coordinator sau sweep đo thật 2026-10-25 (bản đầu HP 100 /
 * đấm 9–14 / đá 12–18 cho ván trung vị chỉ 8–14 tick = 4–7 giây, lệch xa
 * mục tiêu SPEC §8.3): profile chính (nhóm ≥ 3) đo trên 1.000 seed/cỡ
 * nhóm cho trung vị 57–67 tick = 28,5–33,5 giây, cùng-đãi 3,7–5,0%.
 * Script sweep: chiatien-game-v2/proto-measure/sweep-g1*.mjs.
 */
export const G1_PARAMS: G1ParamsShape = {
  hp: 350,
  damMin: 5,
  damMax: 8,
  daMin: 6,
  daMax: 10,
  dodgeProb: 0.12,
  missProb: 0.1,
  critProb: 0.12,
  critMult: 1.8,
  tickSeconds: 0.5,
  mainTicks: 80,
  mainTicks2p: 40,
  suddenTicks: 20,
  subTicks: 20,
};

/** Overrides chỉ để test ép nhánh (hoà/đột tử) — bản chạy thật dùng G1_PARAMS nguyên. */
export type G1Overrides = Partial<G1ParamsShape>;

/**
 * Profile riêng cho ván 2 người (SPEC §8.3: ván 2 người rút xuống ~20 giây,
 * trần ván chính 40 tick qua mainTicks2p). Với profile chính, ván 2 người
 * trung vị vượt trần 40 tick → đa số ván rơi vào đột tử và tỉ lệ cùng-đãi
 * phình lên 22–39% (sweep 2026-10-25). Profile này đo trên 1.000 seed cho
 * trung vị 32 tick = 16 giây, cùng-đãi 5,6%, đột tử 0,2%.
 */
export const G1_PARAMS_2P: Partial<G1ParamsShape> = {
  hp: 100,
  damMin: 2,
  damMax: 4,
  daMin: 3,
  daMax: 5,
};

/** Tham số hiệu dụng của một ván: profile chính, profile 2 người khi đúng 2 người chơi, rồi overrides (chỉ test). */
export function g1EffectiveParams(playerCount: number, overrides?: G1Overrides): G1ParamsShape {
  return { ...G1_PARAMS, ...(playerCount === 2 ? G1_PARAMS_2P : {}), ...(overrides ?? {}) };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

interface PhaseOutcome {
  /** Người còn đứng sau giai đoạn (theo thứ tự params). */
  aliveAfter: PlayerRef[];
  /** Người ngã ở tick cuối cùng của giai đoạn (rỗng nếu hết giờ mà không ai ngã ở tick cuối). */
  lastTickFallen: PlayerRef[];
  /** Tick toàn cục ngay sau giai đoạn. */
  nextTick: number;
}

/**
 * Chạy một giai đoạn theo tick.
 * - suddenRules=false (main): ngã khi HP ≤ 0 (HP tích luỹ trong giai đoạn chính).
 * - suddenRules=true (sudden/sub): bình đẳng tuyệt đối — ngã ở đòn trúng đầu tiên
 *   nhắm vào chính mình trong giai đoạn, bỏ qua HP.
 * Mọi người còn đứng ở đầu tick đều ra đòn trong tick; ngã áp dụng cuối tick.
 */
function runPhase(
  phase: PhaseKind,
  participants: PlayerRef[],
  hp: Map<string, number>,
  startTick: number,
  maxTicks: number,
  suddenRules: boolean,
  p: G1ParamsShape,
  rand: () => number,
  events: GameEvent[],
): PhaseOutcome {
  events.push({ type: 'phase', tick: startTick, phase });
  const alive = new Set(participants.map((pl) => pl.id));
  let lastTickFallen: PlayerRef[] = [];
  let tick = startTick;

  for (let t = 0; t < maxTicks; t++) {
    tick = startTick + t;
    const aliveAtStart = participants.filter((pl) => alive.has(pl.id));
    if (aliveAtStart.length <= 1) break;

    const order = [...aliveAtStart];
    shuffleInPlace(order, rand);
    const hitThisTick = new Set<string>();

    for (const attacker of order) {
      const targets = aliveAtStart.filter((pl) => pl.id !== attacker.id);
      const target = targets[Math.floor(rand() * targets.length)];
      const attack: AttackEvent['attack'] = rand() < 0.5 ? 'dam' : 'da';

      const roll = rand();
      let outcome: AttackEvent['outcome'];
      let damage = 0;
      if (roll < p.missProb) {
        outcome = 'miss';
      } else if (roll < p.missProb + p.dodgeProb) {
        outcome = 'dodge';
      } else {
        const lo = attack === 'dam' ? p.damMin : p.daMin;
        const hi = attack === 'dam' ? p.damMax : p.daMax;
        const base = lo + Math.floor(rand() * (hi - lo + 1));
        if (rand() < p.critProb) {
          outcome = 'crit';
          damage = Math.round(base * p.critMult);
        } else {
          outcome = 'hit';
          damage = base;
        }
      }

      if (suddenRules) {
        if (outcome === 'hit' || outcome === 'crit') hitThisTick.add(target.id);
        // HP bị vô hiệu đối với luật ngã ở sudden/sub: giữ nguyên HP hiển thị khi chưa trúng,
        // đòn trúng đầu tiên đưa target về 0 (ngã áp dụng cuối tick).
        const targetHpAfter = hitThisTick.has(target.id) ? 0 : (hp.get(target.id) ?? p.hp);
        events.push({
          type: 'attack',
          tick,
          attackerId: attacker.id,
          targetId: target.id,
          attack,
          outcome,
          damage,
          targetHpAfter,
        });
      } else {
        const after = Math.max(0, (hp.get(target.id) ?? p.hp) - damage);
        hp.set(target.id, after);
        events.push({
          type: 'attack',
          tick,
          attackerId: attacker.id,
          targetId: target.id,
          attack,
          outcome,
          damage,
          targetHpAfter: after,
        });
      }
    }

    // Áp dụng ngã cuối tick.
    const fallen: PlayerRef[] = [];
    for (const pl of aliveAtStart) {
      const down = suddenRules ? hitThisTick.has(pl.id) : (hp.get(pl.id) ?? p.hp) <= 0;
      if (down) fallen.push(pl);
    }
    if (suddenRules) {
      for (const pl of fallen) hp.set(pl.id, 0);
    }
    for (const pl of fallen) {
      alive.delete(pl.id);
      events.push({ type: 'fall', tick, playerId: pl.id });
    }
    lastTickFallen = fallen;

    if (alive.size <= 1) {
      tick = tick + 1;
      const aliveAfter = participants.filter((pl) => alive.has(pl.id));
      return { aliveAfter, lastTickFallen, nextTick: tick };
    }
  }

  return {
    aliveAfter: participants.filter((pl) => alive.has(pl.id)),
    lastTickFallen,
    nextTick: tick + 1,
  };
}

export function runG1(seedFinal: number, params: MatchParams, overrides?: G1Overrides): MatchLog {
  const players = params.players;
  const p: G1ParamsShape = g1EffectiveParams(players.length, overrides);
  const rand = mulberry32(seedFinal >>> 0);
  const events: GameEvent[] = [];
  const hp = new Map<string, number>(players.map((pl) => [pl.id, p.hp]));

  const mainTicks = players.length === 2 ? p.mainTicks2p : p.mainTicks;
  const main = runPhase('main', players, hp, 0, mainTicks, false, p, rand, events);

  let result: MatchResult;

  if (main.aliveAfter.length === 1) {
    result = { kind: 'single', payerId: main.aliveAfter[0].id };
  } else {
    // Điểm hoà A (0 đứng → tập ngã tick đó) hoặc hết giờ (≥2 đứng → đột tử).
    let tied: PlayerRef[];
    let subStartTick: number;

    if (main.aliveAfter.length === 0) {
      tied = main.lastTickFallen;
      subStartTick = main.nextTick;
      // Hoà A đi thẳng tới ván phụ (không qua đột tử) — SPEC §8.5 mục 3 + 6.
      if (tied.length === 1) {
        result = { kind: 'single', payerId: tied[0].id };
        return finish(params, seedFinal, events, result);
      }
      const sub = runPhase('sub', tied, freshHp(tied, p), subStartTick, p.subTicks, true, p, rand, events);
      result = settleSub(sub);
      return finish(params, seedFinal, events, result);
    }

    // Đột tử.
    const sudden = runPhase(
      'sudden',
      main.aliveAfter,
      hp,
      main.nextTick,
      p.suddenTicks,
      true,
      p,
      rand,
      events,
    );
    if (sudden.aliveAfter.length === 1) {
      result = { kind: 'single', payerId: sudden.aliveAfter[0].id };
      return finish(params, seedFinal, events, result);
    }
    tied = sudden.aliveAfter.length === 0 ? sudden.lastTickFallen : sudden.aliveAfter;
    if (tied.length === 1) {
      result = { kind: 'single', payerId: tied[0].id };
      return finish(params, seedFinal, events, result);
    }
    const sub = runPhase('sub', tied, freshHp(tied, p), sudden.nextTick, p.subTicks, true, p, rand, events);
    result = settleSub(sub);
    return finish(params, seedFinal, events, result);
  }

  return finish(params, seedFinal, events, result);
}

function freshHp(participants: PlayerRef[], p: G1ParamsShape): Map<string, number> {
  return new Map(participants.map((pl) => [pl.id, p.hp]));
}

/** Phân xử sau ván phụ (đúng một lần): 1 đứng → single; 0 đứng → ngã tick cuối cùng đãi; ≥2 đứng → tất cả còn đứng cùng đãi. */
function settleSub(sub: PhaseOutcome): MatchResult {
  if (sub.aliveAfter.length === 1) {
    return { kind: 'single', payerId: sub.aliveAfter[0].id };
  }
  if (sub.aliveAfter.length === 0) {
    return { kind: 'co-payers', payerIds: sub.lastTickFallen.map((pl) => pl.id) };
  }
  return { kind: 'co-payers', payerIds: sub.aliveAfter.map((pl) => pl.id) };
}

function finish(
  params: MatchParams,
  seedFinal: number,
  events: GameEvent[],
  result: MatchResult,
): MatchLog {
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

/**
 * Tối đa 3 khoảnh khắc quyết định có cấu trúc cho tường thuật M7:
 * người ngã đầu tiên, đòn ngã quyết định (fall cuối cùng), đòn chí mạng nặng nhất.
 * (Né đòn chí mạng không tồn tại trong mô hình xác suất: crit chỉ rút sau khi đòn đã trúng,
 * né/trượt rút trước — xem PROTO-A-ENGINE.md.)
 */
export function pickHighlights(events: GameEvent[]): Highlight[] {
  const out: Highlight[] = [];
  const falls = events.filter((e): e is Extract<GameEvent, { type: 'fall' }> => e.type === 'fall');
  const attacks = events.filter(
    (e): e is AttackEvent => e.type === 'attack',
  );

  if (falls.length > 0) {
    out.push({ kind: 'first-fall', tick: falls[0].tick, playerId: falls[0].playerId });
  }
  if (falls.length > 1) {
    const last = falls[falls.length - 1];
    out.push({ kind: 'decisive-fall', tick: last.tick, playerId: last.playerId });
  }
  const crits = attacks.filter((a) => a.outcome === 'crit');
  if (crits.length > 0 && out.length < 3) {
    const best = crits.reduce((a, b) => (b.damage > a.damage ? b : a));
    out.push({
      kind: 'crit',
      tick: best.tick,
      attackerId: best.attackerId,
      targetId: best.targetId,
      damage: best.damage,
    });
  }
  if (out.length < 3) {
    const dodges = attacks.filter((a) => a.outcome === 'dodge');
    if (dodges.length > 0) {
      const d = dodges[0];
      out.push({
        kind: 'dodge',
        tick: d.tick,
        attackerId: d.attackerId,
        targetId: d.targetId,
      });
    }
  }
  return out.slice(0, 3);
}
