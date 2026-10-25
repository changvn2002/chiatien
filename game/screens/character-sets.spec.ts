// character-sets.spec.ts — Test logic thuần của lane F (FIX-V3 N2b):
// gán mặc định phân biệt, bảo toàn gán hợp lệ, loại trừ trùng nhân vật,
// fallback khi manifest vắng/sai dạng. Trình diễn thuần — không engine.

import { describe, expect, it } from 'vitest';
import {
  FALLBACK_SET,
  FALLBACK_SETS,
  baseModelOf,
  baseModelsOf,
  canAssignCharacter,
  defaultAssignments,
  ensureAssignments,
  loadCharacterSets,
  loadCharacterSetsDetailed,
  modelAssignmentCount,
  parseSetsManifest,
  setById,
  takenByOther,
} from './character-sets';
import type { CharacterSetDef } from './character-sets';

const BIG_SET: CharacterSetDef = {
  setId: 'big',
  name: 'Bộ lớn',
  theme: 'test',
  cell: 96,
  characters: Array.from({ length: 12 }, (_, i) => ({
    characterKey: `c${i}`,
    name: `Nhân vật ${i}`,
    modelKey: `m${i}`,
    atlasBase: `/game/atlas/sets/big/m${i}`,
  })),
};

describe('FALLBACK_SET (bộ Adventurers hiện tại)', () => {
  it('có 5 nhân vật phân biệt, atlasBase trỏ atlas g1 đã ship', () => {
    const keys = FALLBACK_SET.characters.map((c) => c.characterKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of FALLBACK_SET.characters) {
      expect(c.atlasBase).toMatch(/^\/game\/atlas\/g1-/);
    }
  });
});

describe('defaultAssignments — gán mặc định phân biệt theo thứ tự bộ', () => {
  it('người thứ i nhận nhân vật thứ i, tất cả phân biệt khi bộ đủ lớn', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const out = defaultAssignments(ids, BIG_SET);
    expect(out).toEqual({ a: 'c0', b: 'c1', c: 'c2', d: 'c3' });
    expect(new Set(Object.values(out)).size).toBe(4);
  });

  it('12 người với bộ 12 nhân vật: không ai trùng', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    const out = defaultAssignments(ids, BIG_SET);
    expect(new Set(Object.values(out)).size).toBe(12);
  });

  it('bộ dự phòng (5) với 7 người: 5 gán đầu phân biệt, phần còn lại lặp theo thứ tự', () => {
    const ids = Array.from({ length: 7 }, (_, i) => `p${i}`);
    const out = defaultAssignments(ids, FALLBACK_SET);
    const first5 = ids.slice(0, 5).map((id) => out[id]);
    expect(new Set(first5).size).toBe(5);
    expect(out['p5']).toBe(out['p0']);
    expect(out['p6']).toBe(out['p1']);
  });
});

describe('ensureAssignments — bảo toàn + loại trừ trùng', () => {
  it('giữ gán hợp lệ chưa ai giữ, bổ sung người thiếu bằng nhân vật trống đầu tiên', () => {
    const out = ensureAssignments(['a', 'b', 'c'], BIG_SET, { b: 'c5' });
    expect(out['b']).toBe('c5');
    expect(out['a']).toBe('c0');
    expect(out['c']).toBe('c1');
    expect(new Set(Object.values(out)).size).toBe(3);
  });

  it('hai người cùng giữ một nhân vật: người đứng trước thắng, người sau nhận nhân vật trống', () => {
    const out = ensureAssignments(['a', 'b'], BIG_SET, { a: 'c2', b: 'c2' });
    expect(out['a']).toBe('c2');
    expect(out['b']).not.toBe('c2');
  });

  it('gán cũ thuộc bộ khác (đổi bộ) bị loại và gán lại theo bộ mới', () => {
    const out = ensureAssignments(['a', 'b'], BIG_SET, { a: 'knight', b: 'mage' });
    expect(Object.values(out)).not.toContain('knight');
    expect(new Set(Object.values(out)).size).toBe(2);
  });

  it('người không còn trong danh sách chơi không xuất hiện trong kết quả', () => {
    const out = ensureAssignments(['a'], BIG_SET, { a: 'c1', ghost: 'c2' });
    expect(Object.keys(out)).toEqual(['a']);
  });
});

describe('takenByOther', () => {
  it('đúng khi người khác giữ, sai khi chính mình giữ hoặc chưa ai giữ', () => {
    const map = { a: 'c1', b: 'c2' };
    expect(takenByOther(map, 'c1', 'b')).toBe(true);
    expect(takenByOther(map, 'c1', 'a')).toBe(false);
    expect(takenByOther(map, 'c9', 'a')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* FIX-V4 Cụm 3 — mẫu gốc + luật cân bằng mẫu. Fixture chép đúng nhóm  */
/* thật trong manifest (đối chiếu build-sets.py / render-set.mjs).     */
/* ------------------------------------------------------------------ */

function makeSet(setId: string, keys: readonly string[]): CharacterSetDef {
  return {
    setId,
    name: setId,
    theme: 'test',
    cell: 96,
    characters: keys.map((k) => ({
      characterKey: k,
      name: k,
      modelKey: k,
      atlasBase: `/game/atlas/sets/${setId}/${k}`,
    })),
  };
}

const ADV_SET = makeSet('adventurers', [
  'knight',
  'knight-night',
  'knight-red',
  'barbarian',
  'barbarian-ice',
  'mage',
  'mage-leaf',
  'mage-purple',
  'rogue',
  'rogue-orange',
  'roguehooded',
  'hooded-teal',
]);

const SKEL_SET = makeSet('skeletons', [
  'skel-mage',
  'skel-mage-gold',
  'skel-mage-violet',
  'skel-minion',
  'skel-minion-ember',
  'skel-minion-rose',
  'skel-rogue',
  'skel-rogue-frost',
  'skel-rogue-mint',
  'skel-warrior',
  'skel-warrior-ash',
  'skel-warrior-ghost',
]);

const BLOCKY_SET = makeSet(
  'blocky',
  Array.from({ length: 12 }, (_, i) => `blocky-${'abcdefghijkl'[i]}`),
);

function modelCountsOf(
  assignments: Readonly<Record<string, string>>,
  set: CharacterSetDef,
): number[] {
  return baseModelsOf(set)
    .map((m) => Object.values(assignments).filter((k) => baseModelOf(k, set) === m).length)
    .sort((x, y) => x - y);
}

describe('baseModelOf — nhóm mẫu gốc đúng với pipeline thật', () => {
  it('adventurers: 12 nhân vật gom về đúng 5 mẫu gốc', () => {
    expect(baseModelsOf(ADV_SET)).toEqual(['knight', 'barbarian', 'mage', 'rogue', 'roguehooded']);
    expect(baseModelOf('knight-red', ADV_SET)).toBe('knight');
    expect(baseModelOf('knight-night', ADV_SET)).toBe('knight');
    expect(baseModelOf('barbarian-ice', ADV_SET)).toBe('barbarian');
    expect(baseModelOf('mage-leaf', ADV_SET)).toBe('mage');
    expect(baseModelOf('mage-purple', ADV_SET)).toBe('mage');
    expect(baseModelOf('rogue-orange', ADV_SET)).toBe('rogue');
    expect(baseModelOf('hooded-teal', ADV_SET)).toBe('roguehooded');
  });

  it('skeletons: 12 nhân vật gom về đúng 4 mẫu gốc', () => {
    expect(baseModelsOf(SKEL_SET)).toEqual([
      'skel-mage',
      'skel-minion',
      'skel-rogue',
      'skel-warrior',
    ]);
    expect(baseModelOf('skel-mage-gold', SKEL_SET)).toBe('skel-mage');
    expect(baseModelOf('skel-mage-violet', SKEL_SET)).toBe('skel-mage');
    expect(baseModelOf('skel-minion-ember', SKEL_SET)).toBe('skel-minion');
    expect(baseModelOf('skel-minion-rose', SKEL_SET)).toBe('skel-minion');
    expect(baseModelOf('skel-rogue-frost', SKEL_SET)).toBe('skel-rogue');
    expect(baseModelOf('skel-rogue-mint', SKEL_SET)).toBe('skel-rogue');
    expect(baseModelOf('skel-warrior-ash', SKEL_SET)).toBe('skel-warrior');
    expect(baseModelOf('skel-warrior-ghost', SKEL_SET)).toBe('skel-warrior');
  });

  it('blocky + bộ lạ: mỗi nhân vật là mẫu riêng của chính nó', () => {
    expect(baseModelsOf(BLOCKY_SET)).toHaveLength(12);
    expect(baseModelOf('blocky-g', BLOCKY_SET)).toBe('blocky-g');
    expect(baseModelOf('c7', BIG_SET)).toBe('c7');
  });

  it('modelAssignmentCount đếm theo mẫu gốc, loại trừ được chính người chơi', () => {
    const map = { a: 'knight', b: 'knight-red', c: 'mage' };
    expect(modelAssignmentCount(map, 'knight-night', ADV_SET)).toBe(2);
    expect(modelAssignmentCount(map, 'mage-purple', ADV_SET)).toBe(1);
    expect(modelAssignmentCount(map, 'knight-night', ADV_SET, 'a')).toBe(1);
  });
});

describe('canAssignCharacter — luật cân bằng mẫu', () => {
  it('chưa ai chọn gì: chọn nhân vật nào cũng được', () => {
    expect(canAssignCharacter({}, 'a', 'knight', ADV_SET)).toBe(true);
    expect(canAssignCharacter({}, 'a', 'hooded-teal', ADV_SET)).toBe(true);
  });

  it('nhân vật đã có người khác giữ → không được (luật cũ, giữ nguyên)', () => {
    expect(canAssignCharacter({ a: 'knight' }, 'b', 'knight', ADV_SET)).toBe(false);
  });

  it('người thứ hai không được dồn vào mẫu đã có người khi còn mẫu trống', () => {
    const map = { a: 'knight' };
    expect(canAssignCharacter(map, 'b', 'knight-red', ADV_SET)).toBe(false);
    expect(canAssignCharacter(map, 'b', 'knight-night', ADV_SET)).toBe(false);
    expect(canAssignCharacter(map, 'b', 'barbarian', ADV_SET)).toBe(true);
    expect(canAssignCharacter(map, 'b', 'hooded-teal', ADV_SET)).toBe(true);
  });

  it('mọi mẫu đều đã có 1 người: được chọn thêm vào bất kỳ mẫu nào (chênh tối đa 1)', () => {
    const map = { a: 'knight', b: 'barbarian', c: 'mage', d: 'rogue', e: 'roguehooded' };
    expect(canAssignCharacter(map, 'f', 'knight-night', ADV_SET)).toBe(true);
    expect(canAssignCharacter(map, 'f', 'mage-leaf', ADV_SET)).toBe(true);
  });

  it('người thứ ba không được dồn vào mẫu đã có 2 khi còn mẫu mới có 1', () => {
    const map = {
      a: 'knight',
      b: 'knight-night',
      c: 'barbarian',
      d: 'mage',
      e: 'rogue',
      f: 'roguehooded',
    };
    // knight đã có 2, các mẫu còn lại mới 1 → knight bị khoá, mẫu khác mở.
    expect(canAssignCharacter(map, 'g', 'knight-red', ADV_SET)).toBe(false);
    expect(canAssignCharacter(map, 'g', 'mage-leaf', ADV_SET)).toBe(true);
    expect(canAssignCharacter(map, 'g', 'barbarian-ice', ADV_SET)).toBe(true);
  });

  it('giữ nguyên nhân vật của mình / đổi sang nhân vật cùng mẫu của mình thì được', () => {
    const map = { a: 'knight', b: 'barbarian' };
    expect(canAssignCharacter(map, 'a', 'knight', ADV_SET)).toBe(true);
    expect(canAssignCharacter(map, 'a', 'knight-red', ADV_SET)).toBe(true);
    // Nhưng đổi sang mẫu của người khác (đang đông hơn mẫu trống) thì không.
    expect(canAssignCharacter(map, 'a', 'barbarian-ice', ADV_SET)).toBe(false);
  });

  it('nhân vật không thuộc bộ → không được', () => {
    expect(canAssignCharacter({}, 'a', 'khong-co', ADV_SET)).toBe(false);
  });

  it('blocky không bị chặn oan: mỗi mẫu mới có đúng 1 nhân vật, chưa ai giữ là chọn được', () => {
    const map = { a: 'blocky-a', b: 'blocky-b', c: 'blocky-c' };
    expect(canAssignCharacter(map, 'd', 'blocky-d', BLOCKY_SET)).toBe(true);
    expect(canAssignCharacter(map, 'd', 'blocky-l', BLOCKY_SET)).toBe(true);
    expect(canAssignCharacter(map, 'd', 'blocky-a', BLOCKY_SET)).toBe(false);
  });

  it('skeletons: mẫu xương pháp sư đã có người thì người sau phải sang mẫu khác trước', () => {
    const map = { a: 'skel-mage' };
    expect(canAssignCharacter(map, 'b', 'skel-mage-gold', SKEL_SET)).toBe(false);
    expect(canAssignCharacter(map, 'b', 'skel-warrior', SKEL_SET)).toBe(true);
  });
});

describe('gán tự động tuân luật cân bằng mẫu', () => {
  it('defaultAssignments 5 người / 5 mẫu adventurers: mỗi mẫu đúng 1 người', () => {
    const ids = ['p0', 'p1', 'p2', 'p3', 'p4'];
    const out = defaultAssignments(ids, ADV_SET);
    expect(out).toEqual({
      p0: 'knight',
      p1: 'barbarian',
      p2: 'mage',
      p3: 'rogue',
      p4: 'roguehooded',
    });
    expect(modelCountsOf(out, ADV_SET)).toEqual([1, 1, 1, 1, 1]);
  });

  it('defaultAssignments 7 người / 5 mẫu: phân bố 2,2,1,1,1 và không trùng nhân vật', () => {
    const ids = Array.from({ length: 7 }, (_, i) => `p${i}`);
    const out = defaultAssignments(ids, ADV_SET);
    expect(new Set(Object.values(out)).size).toBe(7);
    expect(modelCountsOf(out, ADV_SET)).toEqual([1, 1, 1, 2, 2]);
  });

  it('defaultAssignments 12 người adventurers: dùng hết 12 nhân vật, không trùng', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    const out = defaultAssignments(ids, ADV_SET);
    expect(new Set(Object.values(out)).size).toBe(12);
  });

  it('ensureAssignments bổ sung người thiếu bằng mẫu đang ít người nhất, không theo thứ tự thô', () => {
    const out = ensureAssignments(['a', 'b', 'c'], ADV_SET, { a: 'knight' });
    // b/c không được nhận knight-night/knight-red (mẫu knight đã có người).
    expect(out).toEqual({ a: 'knight', b: 'barbarian', c: 'mage' });
  });

  it('mọi gán tự động sinh ra đều qua được canAssignCharacter tại thời điểm gán', () => {
    const ids = Array.from({ length: 9 }, (_, i) => `p${i}`);
    const out = defaultAssignments(ids, ADV_SET);
    const step: Record<string, string> = {};
    for (const id of ids) {
      expect(canAssignCharacter(step, id, out[id], ADV_SET)).toBe(true);
      step[id] = out[id];
    }
  });
});

describe('preview trong manifest (contract A4) + theme bộ dự phòng', () => {
  it('parse được preview: webp thành đường dẫn tuyệt đối, cell/cols giữ nguyên', () => {
    const parsed = parseSetsManifest({
      sets: [
        {
          setId: 'adventurers',
          displayName: 'Phiêu Lưu',
          preview: { webp: 'sets/adventurers-preview.webp', cell: 192, cols: 4 },
          characters: [
            { modelKey: 'knight', displayName: 'Hiệp Sĩ', webp: 'sets/adventurers/knight.webp' },
          ],
        },
      ],
    });
    expect(parsed?.sets[0].preview).toEqual({
      webp: '/game/atlas/sets/adventurers-preview.webp',
      cell: 192,
      cols: 4,
    });
  });

  it('thiếu preview → bộ vẫn hợp lệ, preview undefined (rơi về crop atlas cũ)', () => {
    const parsed = parseSetsManifest({
      sets: [
        {
          setId: 'x',
          name: 'X',
          characters: [{ characterKey: 'k', name: 'K', modelKey: 'k', atlasBase: '/x/k' }],
        },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.sets[0].preview).toBeUndefined();
  });

  it('preview sai dạng → bỏ preview, KHÔNG loại cả bộ', () => {
    const parsed = parseSetsManifest({
      sets: [
        {
          setId: 'x',
          name: 'X',
          preview: { webp: 42, cell: 'to', cols: null },
          characters: [{ characterKey: 'k', name: 'K', modelKey: 'k', atlasBase: '/x/k' }],
        },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.sets[0].preview).toBeUndefined();
  });

  it('FALLBACK_SET: theme là câu người dùng (không còn chữ kỹ thuật) + không có preview', () => {
    expect(FALLBACK_SET.theme).toBe('Hiệp sĩ, chiến binh, pháp sư và thích khách dũng cảm');
    expect(FALLBACK_SET.preview).toBeUndefined();
  });

  it('loadCharacterSetsDetailed phân biệt tải thật với rơi về dự phòng', async () => {
    const okRes = await loadCharacterSetsDetailed(async () => ({
      ok: true,
      json: async () => ({
        sets: [
          {
            setId: 'x',
            name: 'X',
            characters: [{ characterKey: 'k', name: 'K', modelKey: 'k', atlasBase: '/x/k' }],
          },
        ],
      }),
    }));
    expect(okRes.fromFallback).toBe(false);
    expect(okRes.sets[0].setId).toBe('x');

    const badRes = await loadCharacterSetsDetailed(async () => ({
      ok: false,
      json: async () => null,
    }));
    expect(badRes.fromFallback).toBe(true);
    expect(badRes.sets).toBe(FALLBACK_SETS);
  });
});

describe('parseSetsManifest — dạng THẬT của manifest A3 (lane INT)', () => {
  // Fixture chép đúng dạng trên đĩa: bộ dùng displayName + cell + dir,
  // nhân vật nằm ở characters[] với { modelKey, displayName, webp }.
  const REAL_SHAPE = {
    sets: [
      {
        setId: 'adventurers',
        displayName: 'Phiêu Lưu',
        theme: 'Chủ đề thám hiểm',
        cell: 96,
        dir: 'public/game/atlas/sets/adventurers/',
        characters: [
          { modelKey: 'knight', displayName: 'Hiệp Sĩ', webp: 'sets/adventurers/knight.webp' },
          {
            modelKey: 'roguehooded',
            displayName: 'Thích Khách Trùm Đầu',
            webp: 'sets/adventurers/roguehooded.webp',
          },
        ],
      },
      {
        setId: 'blocky',
        displayName: 'Bạn Khối',
        theme: 'Chủ đề khối vuông',
        cell: 128,
        dir: 'public/game/atlas/sets/blocky/',
        characters: [
          { modelKey: 'blocky-a', displayName: 'Khối Cam', webp: 'sets/blocky/blocky-a.webp' },
        ],
      },
    ],
  };

  it('ánh xạ displayName/modelKey/webp/cell sang contract F', () => {
    const parsed = parseSetsManifest(REAL_SHAPE);
    expect(parsed).not.toBeNull();
    const adv = parsed!.sets[0];
    expect(adv.name).toBe('Phiêu Lưu');
    expect(adv.cell).toBe(96);
    expect(adv.characters[0]).toEqual({
      characterKey: 'knight',
      name: 'Hiệp Sĩ',
      modelKey: 'knight',
      atlasBase: '/game/atlas/sets/adventurers/knight',
    });
    // characterKey của Rogue_Hooded là 'roguehooded' (không gạch) như modelKey thật.
    expect(adv.characters[1].characterKey).toBe('roguehooded');
    expect(parsed!.sets[1].cell).toBe(128);
    expect(parsed!.sets[1].characters[0].atlasBase).toBe('/game/atlas/sets/blocky/blocky-a');
  });

  it('bộ dự phòng mang cell 192 của atlas cũ', () => {
    expect(FALLBACK_SET.cell).toBe(192);
  });

  it('nhân vật thiếu cả webp lẫn atlasBase → null (rơi về fallback)', () => {
    expect(
      parseSetsManifest({
        sets: [
          {
            setId: 'x',
            displayName: 'X',
            characters: [{ modelKey: 'k', displayName: 'K' }],
          },
        ],
      }),
    ).toBeNull();
  });
});

describe('parseSetsManifest + loadCharacterSets — fallback khi manifest vắng/lỗi', () => {
  it('manifest đúng dạng được giữ nguyên', () => {
    const parsed = parseSetsManifest({
      sets: [
        {
          setId: 's1',
          name: 'Bộ 1',
          theme: 't',
          characters: [{ characterKey: 'k', name: 'K', modelKey: 'mk', atlasBase: '/x/mk' }],
        },
      ],
    });
    expect(parsed?.sets[0].characters[0].atlasBase).toBe('/x/mk');
  });

  it.each([null, {}, { sets: [] }, { sets: [{ setId: 'x' }] }, 'nope'])(
    'dạng sai %j → null',
    (raw) => {
      expect(parseSetsManifest(raw)).toBeNull();
    },
  );

  it('fetch 404 → FALLBACK_SETS', async () => {
    const sets = await loadCharacterSets(async () => ({ ok: false, json: async () => null }));
    expect(sets).toBe(FALLBACK_SETS);
  });

  it('fetch ném lỗi → FALLBACK_SETS', async () => {
    const sets = await loadCharacterSets(async () => {
      throw new Error('offline');
    });
    expect(sets).toBe(FALLBACK_SETS);
  });

  it('setById không thấy → bộ đầu tiên', () => {
    expect(setById([BIG_SET], 'khong-co').setId).toBe('big');
    expect(setById([BIG_SET], 'big').setId).toBe('big');
  });
});
