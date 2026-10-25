// rng.ts — PRNG mulberry32 + hash FNV-1a 64-bit (BigInt) + cam kết C1 hai giai đoạn.
// Mọi phép toán đều là phép nguyên xác định; engine không dùng Math.random/Date.now.

import type { GameEvent, MatchParams, MatchResult } from './types';
import { ALGO_ID } from './types';

// BigInt qua constructor (không dùng literal `…n`) để qua tsc với target ES2017 của repo.
const FNV_OFFSET = BigInt('0xcbf29ce484222325');
const FNV_PRIME = BigInt('0x100000001b3');
const MASK64 = BigInt('0xffffffffffffffff');
const MASK32 = BigInt(0xffffffff);

const encoder = new TextEncoder();

/** FNV-1a 64-bit trên bytes UTF-8 của chuỗi đầu vào → hex 16 ký tự (lowercase, zero-padded). */
export function fnv1a64(input: string): string {
  let hash = FNV_OFFSET;
  const bytes = encoder.encode(input);
  for (let i = 0; i < bytes.length; i++) {
    hash ^= BigInt(bytes[i]);
    hash = (hash * FNV_PRIME) & MASK64;
  }
  return hash.toString(16).padStart(16, '0');
}

/** mulberry32: PRNG uint32 → [0,1), chỉ dùng Math.imul / phép nguyên. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chuỗi canonical của params — thứ tự người chơi được giữ nguyên (một phần của ván đã khoá). */
export function canonicalParams(params: MatchParams): string {
  return JSON.stringify({
    game: params.game,
    players: params.players.map((p) => [p.id, p.name]),
    totalVnd: params.totalVnd,
  });
}

export function paramsHash(params: MatchParams): string {
  return fnv1a64(canonicalParams(params));
}

/**
 * Giai đoạn 1 của cam kết (SPEC §5.2): C1 = fnv1a64(seedDevice ‖ paramsHash).
 * C1 tính được và hiển thị TRƯỚC khi số chung được tiết lộ — không phụ thuộc số chung.
 */
export function createCommitment(
  seedDevice: number,
  params: MatchParams,
): { c1: string; paramsHash: string } {
  const ph = paramsHash(params);
  const c1 = fnv1a64(`${seedDevice >>> 0}|${ph}`);
  return { c1, paramsHash: ph };
}

/**
 * Giai đoạn 2: seedFinal (uint32) = 32 bit thấp của
 * fnv1a64(seedDevice ‖ số chung ‖ paramsHash).
 * `chung` là số chung do thành viên khác nhập (chuỗi số nguyên, giữ nguyên như đã nhập).
 */
export function finalizeSeed(seedDevice: number, chung: string, pHash: string): number {
  const h = fnv1a64(`${seedDevice >>> 0}|${chung}|${pHash}`);
  return Number(BigInt(`0x${h}`) & MASK32) >>> 0;
}

/** Mã ván: '#' + 6 hex đầu viết hoa của fnv1a64(seedFinal). Mã định danh, KHÔNG phải commitment. */
export function matchCode(seedFinal: number): string {
  const h = fnv1a64(String(seedFinal >>> 0));
  return `#${h.slice(0, 6).toUpperCase()}`;
}

/** JSON canonical: khoá object được sắp xếp đệ quy để hash ổn định bất kể thứ tự khai báo. */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(',')}}`;
}

/** logHash trên toàn bộ nội dung ván (trừ chính logHash). */
export function computeLogHash(
  params: MatchParams,
  seedFinal: number,
  events: GameEvent[],
  result: MatchResult,
): string {
  return fnv1a64(
    canonicalStringify({
      formatVersion: 1,
      algo: ALGO_ID,
      params,
      seedFinal,
      events,
      result,
    }),
  );
}
