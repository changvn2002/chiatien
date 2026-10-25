// index.ts — Bề mặt công khai của outcome engine cho các lane khác import.
export * from './types';
export {
  fnv1a64,
  mulberry32,
  canonicalParams,
  paramsHash,
  createCommitment,
  finalizeSeed,
  matchCode,
  canonicalStringify,
  computeLogHash,
} from './rng';
export { TOTAL_CAP_VND, EXTRA_CAP_VND, effectiveTotalCap, checkCaps } from './caps';
export type { CapsCheck } from './caps';
export { runG2 } from './rules-g2';
export { runG1, G1_PARAMS, G1_PARAMS_2P, g1EffectiveParams, pickHighlights } from './events-g1';
export type { G1ParamsShape, G1Overrides } from './events-g1';
export { verifyReplay } from './verify';
