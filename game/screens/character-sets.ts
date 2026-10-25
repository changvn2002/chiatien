// character-sets.ts — Contract BỘ NHÂN VẬT của game mode «Ai Đãi»
// (đợt FIX-V3, mục N2/N2b — lane F; parser khớp manifest thật — lane INT).
//
// NGUỒN BỘ: manifest do lane A3 sản xuất tại
// `/game/atlas/sets/SETS-MANIFEST.json`, dạng THẬT trên đĩa:
//   { sets: [{ setId, displayName, theme, cell, dir,
//              characters: [{ modelKey, displayName,
//                             webp: "sets/<setId>/<modelKey>.webp", … }] }] }
// Adapter ở parseSetsManifest ánh xạ sang contract của lane F:
//   name (bộ)        ← displayName
//   characterKey     ← modelKey
//   name (nhân vật)  ← displayName
//   atlasBase        ← "/game/atlas/" + webp bỏ đuôi ".webp"
//                      (ảnh ở `${atlasBase}.webp`, khung ở `${atlasBase}.json`)
//   cell             ← cell của bộ (96 adventurers/skeletons, 128 blocky;
//                      bộ dự phòng atlas cũ = 192) — cỡ ô để crop xem
//                      trước + scene quy đổi neo đúng tỉ lệ.
// (Parser vẫn chấp nhận dạng contract cũ { name, characters[{ characterKey,
// name, atlasBase }] } để tương thích ngược với test/dữ liệu cũ.)
//
// FALLBACK TÍCH HỢP: khi manifest vắng / lỗi mạng / sai dạng, game dùng
// đúng một bộ FALLBACK_SET dưới đây = bộ Adventurers hiện tại
// (g1-knight/barbarian/mage/rogue/roguehooded, atlas 768×1728, ô
// 192×192, frame idle_0 tại (0,0)) — luồng chọn vẫn chạy trọn.
//
// BẤT BIẾN: setId / characterKey là TẦNG TRÌNH DIỄN THUẦN. Chúng chỉ
// sống trong draft của game (state.ts) và trong PlayerView view-only
// (bridge.ts); TUYỆT ĐỐI không vào MatchParams / paramsHash / seed /
// bản ghi ván / share payload (bằng chứng ở handoff lane F).

export interface CharacterDef {
  characterKey: string;
  name: string;
  modelKey: string;
  atlasBase: string;
}

/** Sheet xem trước của một bộ (contract lane A4, FIX-V4): lưới cols × hàng, ô vuông cell px. */
export interface CharacterSetPreview {
  /** Đường dẫn tuyệt đối tới sheet xem trước, vd '/game/atlas/sets/adventurers-preview.webp'. */
  webp: string;
  cell: number;
  cols: number;
}

export interface CharacterSetDef {
  setId: string;
  name: string;
  theme: string;
  /** Cạnh ô atlas của bộ (px nguồn): 96/128 với các bộ A3, 192 với bộ dự phòng atlas cũ. */
  cell: number;
  characters: CharacterDef[];
  /**
   * Sheet xem trước 3/4 của bộ (manifest trường `preview`). Thiếu/sai
   * trường này KHÔNG làm hỏng bộ — màn chọn rơi về crop từ atlas cũ.
   * Bộ dự phòng không có trường này nên luôn crop từ atlas cũ.
   */
  preview?: CharacterSetPreview;
}

export interface SetsManifest {
  sets: CharacterSetDef[];
}

export const SETS_MANIFEST_URL = '/game/atlas/sets/SETS-MANIFEST.json';

/**
 * Bộ dự phòng = Adventurers hiện tại. 5 nhân vật phân biệt; khi số
 * người chơi > số nhân vật, gán mặc định buộc phải lặp lại theo thứ tự
 * (giới hạn của bộ dự phòng — các bộ trong manifest của A3 phải đủ
 * nhân vật phân biệt cho cả ván, xem handoff).
 */
export const FALLBACK_SET: CharacterSetDef = {
  setId: 'adventurers',
  name: 'Nhà thám hiểm',
  theme: 'Hiệp sĩ, chiến binh, pháp sư và thích khách dũng cảm',
  cell: 192,
  characters: [
    {
      characterKey: 'knight',
      name: 'Hiệp sĩ',
      modelKey: 'knight',
      atlasBase: '/game/atlas/g1-knight',
    },
    {
      characterKey: 'barbarian',
      name: 'Chiến binh',
      modelKey: 'barbarian',
      atlasBase: '/game/atlas/g1-barbarian',
    },
    { characterKey: 'mage', name: 'Pháp sư', modelKey: 'mage', atlasBase: '/game/atlas/g1-mage' },
    {
      characterKey: 'rogue',
      name: 'Du hiệp',
      modelKey: 'rogue',
      atlasBase: '/game/atlas/g1-rogue',
    },
    {
      characterKey: 'rogue-hooded',
      name: 'Du hiệp trùm đầu',
      modelKey: 'rogueHooded',
      atlasBase: '/game/atlas/g1-roguehooded',
    },
  ],
};

export const FALLBACK_SETS: readonly CharacterSetDef[] = [FALLBACK_SET];

/** Chuỗi khác rỗng mới tính là có giá trị (manifest không tin được). */
function nonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * Kiểm dạng + ÁNH XẠ manifest thô (không tin dữ liệu mạng) — sai dạng →
 * null để phía gọi dùng fallback. Chấp nhận dạng THẬT của A3
 * (displayName / modelKey / webp / cell) và dạng contract cũ của lane F
 * (name / characterKey / atlasBase) — ánh xạ chi tiết ở đầu file.
 */
export function parseSetsManifest(raw: unknown): SetsManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const sets = (raw as { sets?: unknown }).sets;
  if (!Array.isArray(sets) || sets.length === 0) return null;
  const out: CharacterSetDef[] = [];
  for (const s of sets) {
    if (!s || typeof s !== 'object') return null;
    const set = s as Record<string, unknown>;
    const setName = nonEmptyString(set.displayName) ?? nonEmptyString(set.name);
    if (typeof set.setId !== 'string' || !setName) return null;
    if (!Array.isArray(set.characters) || set.characters.length === 0) return null;
    const characters: CharacterDef[] = [];
    for (const c of set.characters) {
      if (!c || typeof c !== 'object') return null;
      const ch = c as Record<string, unknown>;
      // characterKey ← modelKey (dạng thật) hoặc characterKey (dạng cũ).
      const characterKey = nonEmptyString(ch.modelKey) ?? nonEmptyString(ch.characterKey);
      const charName = nonEmptyString(ch.displayName) ?? nonEmptyString(ch.name);
      // atlasBase ← atlasBase (dạng cũ) hoặc "/game/atlas/" + webp bỏ đuôi.
      const webp = nonEmptyString(ch.webp);
      const atlasBase =
        nonEmptyString(ch.atlasBase) ??
        (webp ? `/game/atlas/${webp.replace(/\.webp$/i, '')}` : null);
      if (!characterKey || !charName || !atlasBase) return null;
      characters.push({
        characterKey,
        name: charName,
        modelKey: nonEmptyString(ch.modelKey) ?? characterKey,
        atlasBase,
      });
    }
    // preview (contract A4): { webp: "sets/<setId>-preview.webp", cell, cols }.
    // Thiếu/sai dạng → bỏ qua trường này (bộ vẫn hợp lệ, màn chọn dùng
    // crop atlas cũ làm dự phòng) — tuyệt đối không vì preview hỏng mà
    // loại cả bộ khỏi danh sách.
    let preview: CharacterSetPreview | undefined;
    const rawPreview = set.preview;
    if (rawPreview && typeof rawPreview === 'object') {
      const pv = rawPreview as Record<string, unknown>;
      const pvWebp = nonEmptyString(pv.webp);
      const pvCell = pv.cell;
      const pvCols = pv.cols;
      if (
        pvWebp &&
        typeof pvCell === 'number' &&
        Number.isFinite(pvCell) &&
        pvCell > 0 &&
        typeof pvCols === 'number' &&
        Number.isFinite(pvCols) &&
        pvCols > 0
      ) {
        preview = {
          webp:
            pvWebp.startsWith('/') || pvWebp.startsWith('http') ? pvWebp : `/game/atlas/${pvWebp}`,
          cell: pvCell,
          cols: Math.floor(pvCols),
        };
      }
    }
    out.push({
      setId: set.setId,
      name: setName,
      theme: typeof set.theme === 'string' ? set.theme : '',
      cell:
        typeof set.cell === 'number' && Number.isFinite(set.cell) && set.cell > 0 ? set.cell : 192,
      characters,
      ...(preview ? { preview } : {}),
    });
  }
  return { sets: out };
}

export interface LoadCharacterSetsResult {
  sets: readonly CharacterSetDef[];
  /** true khi manifest lỗi/vắng/sai dạng và `sets` là bộ dự phòng tích hợp. */
  fromFallback: boolean;
}

/**
 * Tải manifest các bộ, KÈM cờ cho biết có phải đang dùng bộ dự phòng
 * hay không — màn chọn cần cờ này để phân biệt «đang tải» (chưa có kết
 * quả), «tải lỗi → dùng bộ dự phòng» và «tải xong bộ thật».
 */
export async function loadCharacterSetsDetailed(
  fetcher: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }> = (url) =>
    fetch(url),
): Promise<LoadCharacterSetsResult> {
  try {
    const res = await fetcher(SETS_MANIFEST_URL);
    if (!res.ok) return { sets: FALLBACK_SETS, fromFallback: true };
    const parsed = parseSetsManifest(await res.json());
    return parsed
      ? { sets: parsed.sets, fromFallback: false }
      : { sets: FALLBACK_SETS, fromFallback: true };
  } catch {
    return { sets: FALLBACK_SETS, fromFallback: true };
  }
}

/** Tải manifest các bộ; mọi lỗi (404, mạng, sai dạng) → FALLBACK_SETS. */
export async function loadCharacterSets(
  fetcher: (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }> = (url) =>
    fetch(url),
): Promise<readonly CharacterSetDef[]> {
  return (await loadCharacterSetsDetailed(fetcher)).sets;
}

export function setById(
  sets: readonly CharacterSetDef[],
  setId: string | null | undefined,
): CharacterSetDef {
  return sets.find((s) => s.setId === setId) ?? sets[0] ?? FALLBACK_SET;
}

export function characterByKey(
  set: CharacterSetDef,
  characterKey: string | null | undefined,
): CharacterDef | undefined {
  return set.characters.find((c) => c.characterKey === characterKey);
}

/* ------------------------------------------------------------------ */
/* Mẫu gốc + LUẬT CÂN BẰNG MẪU (FIX-V4 Cụm 3 — logic thuần, có test).   */
/* Nhiều nhân vật trong một bộ dùng CHUNG một mẫu gốc, chỉ khác màu /  */
/* phụ kiện (đối chiếu game/tools/build-sets.py + render-set.mjs:      */
/* cùng trường baseModel / base thì cùng mẫu gốc). Nếu nhiều người     */
/* cùng chọn các nhân vật chung một mẫu gốc, trong sân họ trông gần    */
/* như giống hệt nhau → luật cân bằng: số người chọn của các mẫu gốc   */
/* trong bộ được chia đều nhất có thể (chênh nhau tối đa 1).           */
/* Bảng dưới đây chép đúng nhóm thật từ build-sets.py:                 */
/* - adventurers: 5 mẫu gốc (knight / barbarian / mage / rogue /       */
/*   roguehooded) cho 12 nhân vật.                                     */
/* - skeletons: 4 mẫu gốc (skel-mage / skel-minion / skel-rogue /      */
/*   skel-warrior) cho 12 nhân vật.                                    */
/* - blocky: mỗi nhân vật là một mẫu riêng (không nhóm nào > 1).       */
/* Nhân vật không có trong bảng (bộ lạ, bộ dự phòng atlas cũ, bộ test) */
/* được coi là mẫu riêng của chính nó — không bao giờ bị chặn oan.     */
/* ------------------------------------------------------------------ */

const BASE_MODEL_BY_SET: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  adventurers: {
    knight: 'knight',
    'knight-night': 'knight',
    'knight-red': 'knight',
    barbarian: 'barbarian',
    'barbarian-ice': 'barbarian',
    mage: 'mage',
    'mage-leaf': 'mage',
    'mage-purple': 'mage',
    rogue: 'rogue',
    'rogue-orange': 'rogue',
    roguehooded: 'roguehooded',
    'hooded-teal': 'roguehooded',
    // Bộ dự phòng atlas cũ dùng khoá 'rogue-hooded' cho cùng mẫu này.
    'rogue-hooded': 'roguehooded',
  },
  skeletons: {
    'skel-mage': 'skel-mage',
    'skel-mage-gold': 'skel-mage',
    'skel-mage-violet': 'skel-mage',
    'skel-minion': 'skel-minion',
    'skel-minion-ember': 'skel-minion',
    'skel-minion-rose': 'skel-minion',
    'skel-rogue': 'skel-rogue',
    'skel-rogue-frost': 'skel-rogue',
    'skel-rogue-mint': 'skel-rogue',
    'skel-warrior': 'skel-warrior',
    'skel-warrior-ash': 'skel-warrior',
    'skel-warrior-ghost': 'skel-warrior',
  },
  // blocky: không cần bảng — mỗi characterKey tự là mẫu gốc của mình.
};

/** Mẫu gốc của một nhân vật trong bộ (characterKey của nhân vật gốc đại diện cho mẫu). */
export function baseModelOf(characterKey: string, set: CharacterSetDef): string {
  return BASE_MODEL_BY_SET[set.setId]?.[characterKey] ?? characterKey;
}

/** Các mẫu gốc có mặt trong bộ, theo thứ tự xuất hiện đầu tiên trong danh sách nhân vật. */
export function baseModelsOf(set: CharacterSetDef): string[] {
  const seen: string[] = [];
  for (const c of set.characters) {
    const model = baseModelOf(c.characterKey, set);
    if (!seen.includes(model)) seen.push(model);
  }
  return seen;
}

/**
 * Số người (trừ `excludePlayerId` nếu có) đang giữ một nhân vật thuộc
 * CÙNG mẫu gốc với `characterKey` — dùng cho luật cân bằng + nhãn UI.
 */
export function modelAssignmentCount(
  assignments: Readonly<Record<string, string>>,
  characterKey: string,
  set: CharacterSetDef,
  excludePlayerId?: string,
): number {
  const model = baseModelOf(characterKey, set);
  let n = 0;
  for (const [id, key] of Object.entries(assignments)) {
    if (id === excludePlayerId) continue;
    if (baseModelOf(key, set) === model) n += 1;
  }
  return n;
}

/** Đếm số người theo từng mẫu gốc (bỏ qua gán không thuộc bộ + người bị loại trừ). */
function countsByModel(
  assignments: Readonly<Record<string, string>>,
  set: CharacterSetDef,
  excludePlayerId?: string,
): Map<string, number> {
  const counts = new Map<string, number>(baseModelsOf(set).map((m) => [m, 0]));
  const validKeys = new Set(set.characters.map((c) => c.characterKey));
  for (const [id, key] of Object.entries(assignments)) {
    if (id === excludePlayerId || !validKeys.has(key)) continue;
    const model = baseModelOf(key, set);
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  return counts;
}

/**
 * LUẬT CÂN BẰNG MẪU — người chơi `playerId` có được chọn `characterKey` không?
 * Công thức chính xác (đếm KHÔNG gồm gán hiện tại của chính playerId,
 * vì chọn mới sẽ thay gán cũ của họ):
 *   count(model)  = số NGƯỜI KHÁC đang giữ nhân vật thuộc mẫu gốc của characterKey
 *   minCount      = min của count(m) trên MỌI mẫu gốc có trong bộ
 *   được chọn  <=>  characterKey thuộc bộ
 *                   VÀ chưa người khác nào giữ đúng characterKey này (luật cũ)
 *                   VÀ count(model) <= minCount
 * Hệ quả: chỉ được chọn nhân vật thuộc nhóm mẫu đang ÍT người nhất;
 * nếu cứ chọn thì sau khi chọn, chênh lệch giữa mẫu đông nhất và mẫu
 * ít nhất vượt quá 1 — đúng điều luật cấm. Nhân vật người chơi đang
 * giữ sẵn luôn được coi là chọn được (giữ nguyên, không tự đá ra).
 */
export function canAssignCharacter(
  assignments: Readonly<Record<string, string>>,
  playerId: string,
  characterKey: string,
  set: CharacterSetDef,
): boolean {
  if (!characterByKey(set, characterKey)) return false;
  if (assignments[playerId] === characterKey) return true;
  if (takenByOther(assignments, characterKey, playerId)) return false;
  const counts = countsByModel(assignments, set, playerId);
  const target = counts.get(baseModelOf(characterKey, set)) ?? 0;
  const min = Math.min(...counts.values());
  return target <= min;
}

/* ------------------------------------------------------------------ */
/* Gán nhân vật — logic thuần (có test riêng).                          */
/* Một ván KHÔNG TRÙNG nhân vật khi bộ còn đủ nhân vật phân biệt;      */
/* gán tay + gán tự động đều tuân LUẬT CÂN BẰNG MẪU ở trên.            */
/* ------------------------------------------------------------------ */

/**
 * Chọn nhân vật «cân bằng nhất» trong các ứng viên: mẫu gốc đang có ít
 * người nhất thắng; hoà thì nhân vật đứng trước trong thứ tự bộ thắng.
 */
function pickBalancedCharacter(
  candidates: readonly CharacterDef[],
  set: CharacterSetDef,
  counts: ReadonlyMap<string, number>,
): CharacterDef | undefined {
  let best: CharacterDef | undefined;
  let bestCount = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const n = counts.get(baseModelOf(c.characterKey, set)) ?? 0;
    if (n < bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}

/**
 * Gán mặc định («Để app tự chọn» + đổi bộ): lần lượt từng người nhận
 * nhân vật TRỐNG thuộc mẫu gốc đang ít người nhất (hoà → thứ tự bộ),
 * nên phân bố theo mẫu gốc luôn chênh nhau tối đa 1 chừng nào bộ còn
 * nhân vật trống. Bộ hết nhân vật trống (bộ dự phòng 5 < số người) mới
 * lặp lại — vòng lặp lại cũng chọn mẫu đang ít người nhất.
 */
export function defaultAssignments(
  playerIds: readonly string[],
  set: CharacterSetDef,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (set.characters.length === 0) return out;
  const counts = countsByModel({}, set);
  const taken = new Set<string>();
  for (const id of playerIds) {
    const free = set.characters.filter((c) => !taken.has(c.characterKey));
    const pick = pickBalancedCharacter(free.length > 0 ? free : set.characters, set, counts);
    if (!pick) break;
    out[id] = pick.characterKey;
    taken.add(pick.characterKey);
    const model = baseModelOf(pick.characterKey, set);
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  return out;
}

/**
 * Bổ sung / sửa gán cho khớp bộ + danh sách người chơi hiện tại:
 * giữ gán cũ còn hợp lệ (nhân vật thuộc bộ, chưa ai khác giữ — người
 * đứng trước trong thứ tự người chơi thắng khi trùng nhân vật), người
 * chưa có nhận nhân vật TRỐNG thuộc mẫu gốc đang ít người nhất (luật
 * cân bằng, hoà → thứ tự bộ); chỉ khi bộ đã hết nhân vật trống mới
 * lặp lại, và vòng lặp lại cũng chọn theo mẫu ít người nhất.
 */
export function ensureAssignments(
  playerIds: readonly string[],
  set: CharacterSetDef,
  existing: Readonly<Record<string, string>>,
): Record<string, string> {
  const validKeys = new Set(set.characters.map((c) => c.characterKey));
  const taken = new Set<string>();
  const out: Record<string, string> = {};
  for (const id of playerIds) {
    const cur = existing[id];
    if (cur && validKeys.has(cur) && !taken.has(cur)) {
      out[id] = cur;
      taken.add(cur);
    }
  }
  const counts = countsByModel(out, set);
  for (const id of playerIds) {
    if (out[id]) continue;
    const free = set.characters.filter((c) => !taken.has(c.characterKey));
    const pick = pickBalancedCharacter(free.length > 0 ? free : set.characters, set, counts);
    if (!pick) break;
    out[id] = pick.characterKey;
    taken.add(pick.characterKey);
    const model = baseModelOf(pick.characterKey, set);
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  return out;
}

/** Nhân vật đã có NGƯỜI KHÁC giữ hay chưa (để mờ ô + nhãn «Đã có người chọn» và chặn gán trùng). */
export function takenByOther(
  assignments: Readonly<Record<string, string>>,
  characterKey: string,
  playerId: string,
): boolean {
  return Object.entries(assignments).some(([id, key]) => id !== playerId && key === characterKey);
}
