// g1-set-atlas.ts — Logic THUẦN của tầng atlas THEO BỘ cho G1
// (đợt FIX-V3, lane INT — nối asset của lane A3 + contract của lane F
// vào scene của lane B).
//
// Tách khỏi scenes-g1.ts để kiểm chứng bằng vitest trong môi trường
// node (Phaser runtime không import được ở node). File này KHÔNG
// import Phaser: chỉ làm toán/chuỗi trên contract PlayerView tối thiểu.
//
// Hợp đồng dữ liệu (REBUILD-C2-A3-SETS §3):
// - Bộ nằm ở public/game/atlas/sets/<setId>/<modelKey>.webp + .json,
//   kèm anchors.json của bộ (neo đầu per-frame, toạ độ chuẩn hoá
//   0..1 trong ô frame).
// - Một ván CHỈ nạp các nhân vật phân biệt thực sự có mặt trong ván
//   (tải lười đúng nghĩa): không nạp cả bộ, không nạp atlas cũ theo
//   mặc định — atlas cũ g1-* CHỈ là fallback khi atlas bộ lỗi.
// - Số frame mỗi hành động GIỐNG nhau cả 3 bộ: idle 3, run 4,
//   punchA 5, punchB 4, kick 5, hitA 3, hitB 3, dodge 3, fall 4,
//   victory 3 (bảng A3 §3.2).

/** Thứ tự hành động trong sheet của các bộ A3 (hàng 0..9). */
export const G1_SET_ACTIONS = [
  'idle',
  'run',
  'punchA',
  'punchB',
  'kick',
  'hitA',
  'hitB',
  'dodge',
  'fall',
  'victory',
] as const;
export type G1SetAction = (typeof G1_SET_ACTIONS)[number];

/** Số frame THẬT mỗi hành động của các bộ A3 (A3 §3.2 — đo từ JSON atlas đã ship). */
export const G1_SET_ACTION_FRAME_COUNTS: Readonly<Record<G1SetAction, number>> = {
  idle: 3,
  run: 4,
  punchA: 5,
  punchB: 4,
  kick: 5,
  hitA: 3,
  hitB: 3,
  dodge: 3,
  fall: 4,
  victory: 3,
};

/** Số frame của atlas cũ g1-* (mọi hành động 4 frame, CHƯA có run). */
export const G1_LEGACY_ACTION_FRAME_COUNTS: Readonly<Record<string, number>> = {
  idle: 4,
  punchA: 4,
  punchB: 4,
  kick: 4,
  hitA: 4,
  hitB: 4,
  dodge: 4,
  fall: 4,
  victory: 4,
};

/**
 * Thời lượng 1 lần chạy của một hành động (ms ở timeScale 1) theo số
 * frame THẬT của (atlas, hành động) đang chạy — thay hằng ACTION_FRAMES=4
 * cũ: punchA/kick 5 frame @12fps = 417ms (không còn 333ms), idle 3, v.v.
 * frameCount không rõ (0/âm) → rơi về 4 như nhịp cũ.
 */
export function actionDurationForFrames(frameCount: number, frameRate: number): number {
  const frames = frameCount > 0 ? frameCount : 4;
  return (frames / frameRate) * 1000;
}

/* ------------------------------------------------------------------ */
/* Kế hoạch nạp lười theo ván                                          */
/* ------------------------------------------------------------------ */

/** Bộ mặc định khi PlayerView thiếu setId (contract lane F: khôi phục → adventurers). */
export const G1_DEFAULT_SET_ID = 'adventurers';

/**
 * 12 characterKey của bộ adventurers theo thứ tự A3 §3.3 — dùng gán
 * phân biệt cho người chơi thiếu characterKey (không bịa key lạ).
 */
export const G1_ADVENTURERS_CHARACTER_KEYS: readonly string[] = [
  'knight',
  'barbarian',
  'mage',
  'rogue',
  'roguehooded',
  'knight-red',
  'barbarian-ice',
  'mage-purple',
  'rogue-orange',
  'hooded-teal',
  'knight-night',
  'mage-leaf',
];

/** 5 model của atlas cũ g1-* — CHỈ dùng ở đường fallback. */
export const G1_LEGACY_MODEL_KEYS: readonly string[] = [
  'knight',
  'barbarian',
  'mage',
  'rogue',
  'roguehooded',
];

/** Ánh xạ characterKey → model atlas cũ tương ứng (khi có) cho đường fallback. */
const LEGACY_MODEL_BY_CHARACTER_KEY: Readonly<Record<string, string>> = {
  knight: 'knight',
  barbarian: 'barbarian',
  mage: 'mage',
  rogue: 'rogue',
  roguehooded: 'roguehooded',
  'rogue-hooded': 'roguehooded',
};

/**
 * Model atlas cũ cho đường fallback của một người: nhân vật có bản
 * tương ứng cũ thì dùng đúng bản đó; nhân vật chỉ có ở bộ mới
 * (biến thể / skeletons / blocky) → xoay vòng 5 model cũ theo chỉ số
 * người chơi (đúng cơ chế modelFor cũ) — luôn có model, không vô hình.
 */
export function legacyFallbackModelKey(characterKey: string | undefined, playerIndex: number): string {
  const mapped = characterKey ? LEGACY_MODEL_BY_CHARACTER_KEY[characterKey] : undefined;
  if (mapped) return mapped;
  const i = ((playerIndex % G1_LEGACY_MODEL_KEYS.length) + G1_LEGACY_MODEL_KEYS.length) % G1_LEGACY_MODEL_KEYS.length;
  return G1_LEGACY_MODEL_KEYS[i];
}

/** Texture key của atlas bộ — scope theo setId+characterKey để anim/texture không đụng nhau giữa các bộ/ván. */
export function setAtlasKey(setId: string, characterKey: string): string {
  return `set-${setId}-${characterKey}`;
}

/** Texture key của atlas cũ (đường fallback). */
export function legacyAtlasKey(modelKey: string): string {
  return `g1-${modelKey}`;
}

export interface G1PlayerAtlasInput {
  setId?: string;
  characterKey?: string;
}

export interface G1SetAtlasRef {
  setId: string;
  characterKey: string;
  atlasKey: string;
  imageUrl: string;
  jsonUrl: string;
}

/** Nhân vật hiệu lực của một người chơi: thiếu setId → bộ mặc định; thiếu characterKey → gán phân biệt theo chỉ số. */
export function effectiveCharacterOf(
  player: G1PlayerAtlasInput,
  playerIndex: number,
): { setId: string; characterKey: string } {
  const setId = player.setId && player.setId.length > 0 ? player.setId : G1_DEFAULT_SET_ID;
  let characterKey =
    player.characterKey && player.characterKey.length > 0 ? player.characterKey : undefined;
  if (!characterKey) {
    // Chỉ bộ mặc định mới có danh sách key chốt sẵn ở đây; bộ khác mà
    // thiếu key thì dùng key đầu tiên của bộ mặc định làm mỏ neo an
    // toàn — scene sẽ rơi về fallback atlas cũ nếu atlas này lỗi.
    characterKey =
      setId === G1_DEFAULT_SET_ID
        ? G1_ADVENTURERS_CHARACTER_KEYS[playerIndex % G1_ADVENTURERS_CHARACTER_KEYS.length]
        : G1_ADVENTURERS_CHARACTER_KEYS[0];
  }
  return { setId, characterKey };
}

export interface G1MatchLoadPlan {
  /** Các atlas bộ PHÂN BIỆT thực sự có mặt trong ván (thứ tự gặp đầu tiên) — preload chỉ nạp đúng danh sách này. */
  refs: G1SetAtlasRef[];
  /** URL anchors.json của từng bộ phân biệt có mặt trong ván. */
  anchorsUrls: string[];
  /** Gán hiệu lực theo đúng thứ tự người chơi đầu vào. */
  assignments: Array<{ setId: string; characterKey: string; atlasKey: string }>;
}

/** Dựng kế hoạch nạp cho một ván từ PlayerView[] — thuần, có test. */
export function planMatchLoad(players: readonly G1PlayerAtlasInput[]): G1MatchLoadPlan {
  const refs: G1SetAtlasRef[] = [];
  const seen = new Set<string>();
  const anchorsUrls: string[] = [];
  const seenSets = new Set<string>();
  const assignments = players.map((player, i) => {
    const eff = effectiveCharacterOf(player, i);
    const atlasKey = setAtlasKey(eff.setId, eff.characterKey);
    if (!seen.has(atlasKey)) {
      seen.add(atlasKey);
      refs.push({
        setId: eff.setId,
        characterKey: eff.characterKey,
        atlasKey,
        imageUrl: `/game/atlas/sets/${eff.setId}/${eff.characterKey}.webp`,
        jsonUrl: `/game/atlas/sets/${eff.setId}/${eff.characterKey}.json`,
      });
    }
    if (!seenSets.has(eff.setId)) {
      seenSets.add(eff.setId);
      anchorsUrls.push(`/game/atlas/sets/${eff.setId}/anchors.json`);
    }
    return { ...eff, atlasKey };
  });
  return { refs, anchorsUrls, assignments };
}

/* ------------------------------------------------------------------ */
/* anchors.json: neo đầu per-frame (A3 §3.4)                            */
/* ------------------------------------------------------------------ */

export interface G1HeadAnchor {
  x: number;
  y: number;
}

/** anchors đã parse: characters[modelKey][action] = mảng neo theo idx frame. */
export interface G1SetAnchors {
  setId: string;
  cell: number;
  characters: Readonly<Record<string, Readonly<Partial<Record<string, readonly G1HeadAnchor[]>>>>>;
}

/** Parse anchors.json thô — sai dạng → null (scene rơi về neo ước lượng cũ, không crash). */
export function parseSetAnchors(raw: unknown): G1SetAnchors | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  if (typeof root.setId !== 'string' || !root.characters || typeof root.characters !== 'object') {
    return null;
  }
  const characters: Record<string, Partial<Record<string, G1HeadAnchor[]>>> = {};
  for (const [modelKey, actionsRaw] of Object.entries(root.characters as Record<string, unknown>)) {
    if (!actionsRaw || typeof actionsRaw !== 'object') return null;
    const actions: Partial<Record<string, G1HeadAnchor[]>> = {};
    for (const [action, framesRaw] of Object.entries(actionsRaw as Record<string, unknown>)) {
      if (!Array.isArray(framesRaw) || framesRaw.length === 0) return null;
      const frames: G1HeadAnchor[] = [];
      for (const f of framesRaw) {
        if (!f || typeof f !== 'object') return null;
        const pt = f as Record<string, unknown>;
        if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return null;
        if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;
        frames.push({ x: pt.x, y: pt.y });
      }
      actions[action] = frames;
    }
    characters[modelKey] = actions;
  }
  return {
    setId: root.setId,
    cell:
      typeof root.cell === 'number' && Number.isFinite(root.cell) && root.cell > 0 ? root.cell : 96,
    characters,
  };
}

/**
 * Neo đầu của đúng (nhân vật, hành động, frame) đang hiển thị; frame
 * vượt mảng → kẹp về frame cuối của hành động; thiếu dữ liệu → undefined
 * (phía gọi rơi về neo ước lượng). 
 */
export function headAnchorFor(
  anchors: G1SetAnchors | null | undefined,
  characterKey: string,
  action: string,
  frameIndex: number,
): G1HeadAnchor | undefined {
  const frames = anchors?.characters[characterKey]?.[action];
  if (!frames || frames.length === 0) return undefined;
  const idx = Math.min(Math.max(0, Math.floor(frameIndex) || 0), frames.length - 1);
  return frames[idx];
}

/**
 * Lệch (px hiển thị) từ NEO SPRITE (giữa-đáy ô, origin 0.5/1) tới điểm
 * neo chuẩn hoá (nx, ny) trong ô frame, đã tính lật ngang: điểm chuẩn
 * hoá gương qua trục giữa ô khi sprite flipX.
 */
export function normPointOffset(
  point: G1HeadAnchor,
  displaySize: number,
  flipX: boolean,
): { x: number; y: number } {
  const nx = flipX ? 1 - point.x : point.x;
  return { x: (nx - 0.5) * displaySize, y: (point.y - 1) * displaySize };
}

/* ------------------------------------------------------------------ */
/* Neo đất đo từ alpha atlas MỚI (lane INT tự đo, 2026-10-25)          */
/* ------------------------------------------------------------------ */

/**
 * Điểm chạm đất + đỉnh đầu của từng nhân vật các bộ MỚI, ĐO TỪ ALPHA
 * của chính atlas đã ship (PIL: alpha bbox + trọng tâm dải đáy 10px
 * của frame idle_0 / fall_3 — cùng phương pháp lane B đo atlas cũ).
 * Toạ độ CHUẨN HOÁ 0..1 trong ô (ô 96 hoặc 128 tuỳ bộ). Nhân vật mới
 * KHÔNG đứng giữa ô (groundX 0,26–0,47 tuỳ nhân vật) nên vòng chân
 * phải qua bảng này — dùng bảng atlas cũ (g1-fx) cho sheet mới sẽ
 * lệch tới ~0,1 ô. Key: `<setId>/<modelKey>`.
 * Blocky: fall_3 của pack Kenney quay về tư thế đứng (bbox đo được
 * trùng idle) — số ghi đúng số đo, không sửa dữ liệu.
 */
export interface G1NormGroundAnchor {
  groundX: number;
  groundY: number;
  fallX: number;
  fallY: number;
  headTopY: number;
}

export const G1_SET_GROUND_ANCHORS: Readonly<Record<string, G1NormGroundAnchor>> = {
  'adventurers/barbarian': { groundX: 0.337, groundY: 0.833, fallX: 0.489, fallY: 0.875, headTopY: 0.094 },
  'adventurers/barbarian-ice': { groundX: 0.34, groundY: 0.833, fallX: 0.551, fallY: 0.875, headTopY: 0.177 },
  'adventurers/hooded-teal': { groundX: 0.399, groundY: 0.802, fallX: 0.477, fallY: 0.865, headTopY: 0.125 },
  'adventurers/knight': { groundX: 0.263, groundY: 0.844, fallX: 0.511, fallY: 0.875, headTopY: 0.104 },
  'adventurers/knight-night': { groundX: 0.271, groundY: 0.844, fallX: 0.443, fallY: 0.865, headTopY: 0.104 },
  'adventurers/knight-red': { groundX: 0.263, groundY: 0.844, fallX: 0.538, fallY: 0.875, headTopY: 0.146 },
  'adventurers/mage': { groundX: 0.429, groundY: 0.833, fallX: 0.385, fallY: 0.917, headTopY: 0.177 },
  'adventurers/mage-leaf': { groundX: 0.431, groundY: 0.833, fallX: 0.359, fallY: 0.917, headTopY: 0.177 },
  'adventurers/mage-purple': { groundX: 0.457, groundY: 0.833, fallX: 0.516, fallY: 0.844, headTopY: 0.302 },
  'adventurers/rogue': { groundX: 0.381, groundY: 0.802, fallX: 0.557, fallY: 0.885, headTopY: 0.125 },
  'adventurers/rogue-orange': { groundX: 0.388, groundY: 0.802, fallX: 0.463, fallY: 0.875, headTopY: 0.125 },
  'adventurers/roguehooded': { groundX: 0.392, groundY: 0.802, fallX: 0.557, fallY: 0.875, headTopY: 0.125 },
  'skeletons/skel-mage': { groundX: 0.425, groundY: 0.833, fallX: 0.346, fallY: 0.927, headTopY: 0.104 },
  'skeletons/skel-mage-gold': { groundX: 0.452, groundY: 0.833, fallX: 0.476, fallY: 0.854, headTopY: 0.24 },
  'skeletons/skel-mage-violet': { groundX: 0.425, groundY: 0.833, fallX: 0.346, fallY: 0.927, headTopY: 0.104 },
  'skeletons/skel-minion': { groundX: 0.468, groundY: 0.844, fallX: 0.451, fallY: 0.875, headTopY: 0.104 },
  'skeletons/skel-minion-ember': { groundX: 0.468, groundY: 0.844, fallX: 0.451, fallY: 0.875, headTopY: 0.104 },
  'skeletons/skel-minion-rose': { groundX: 0.47, groundY: 0.844, fallX: 0.449, fallY: 0.875, headTopY: 0.104 },
  'skeletons/skel-rogue': { groundX: 0.459, groundY: 0.844, fallX: 0.51, fallY: 0.875, headTopY: 0.104 },
  'skeletons/skel-rogue-frost': { groundX: 0.464, groundY: 0.844, fallX: 0.543, fallY: 0.875, headTopY: 0.156 },
  'skeletons/skel-rogue-mint': { groundX: 0.469, groundY: 0.844, fallX: 0.428, fallY: 0.865, headTopY: 0.104 },
  'skeletons/skel-warrior': { groundX: 0.463, groundY: 0.833, fallX: 0.385, fallY: 0.875, headTopY: 0.135 },
  'skeletons/skel-warrior-ash': { groundX: 0.472, groundY: 0.833, fallX: 0.479, fallY: 0.865, headTopY: 0.229 },
  'skeletons/skel-warrior-ghost': { groundX: 0.463, groundY: 0.833, fallX: 0.385, fallY: 0.875, headTopY: 0.135 },
  'blocky/blocky-a': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-b': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-c': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-d': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-e': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-f': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-g': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-h': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-i': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-j': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-k': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
  'blocky/blocky-l': { groundX: 0.45, groundY: 0.844, fallX: 0.45, fallY: 0.844, headTopY: 0.086 },
};

/** Neo đất chuẩn hoá của một nhân vật bộ mới; undefined nếu không có trong bảng đo. */
export function setGroundAnchorOf(setId: string, characterKey: string): G1NormGroundAnchor | undefined {
  return G1_SET_GROUND_ANCHORS[`${setId}/${characterKey}`];
}
