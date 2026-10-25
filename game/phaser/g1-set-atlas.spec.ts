// g1-set-atlas.spec.ts — Test logic thuần của lane INT (FIX-V3):
// kế hoạch nạp lười theo ván, ánh xạ fallback atlas cũ, số frame thật,
// anchors.json per-frame, neo đất đo từ sheet mới — đối chiếu trực tiếp
// với CÁC FILE THẬT đã ship trong public/game/atlas/sets/.

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  actionDurationForFrames,
  G1_SET_ACTION_FRAME_COUNTS,
  headAnchorFor,
  legacyFallbackModelKey,
  normPointOffset,
  parseSetAnchors,
  planMatchLoad,
  setGroundAnchorOf,
} from './g1-set-atlas';
import { parseSetsManifest } from '../screens/character-sets';

function readPublicJson(rel: string): unknown {
  const url = new URL(`../../public/${rel}`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as unknown;
}

function publicPath(rel: string): URL {
  return new URL(`../../public/${rel}`, import.meta.url);
}

const REAL_MANIFEST = readPublicJson('game/atlas/sets/SETS-MANIFEST.json');
const PARSED = parseSetsManifest(REAL_MANIFEST);

describe('manifest thật trên đĩa → contract F (lane INT)', () => {
  it('parse được 3 bộ × 12 nhân vật, tên/cell đúng A3', () => {
    expect(PARSED).not.toBeNull();
    expect(PARSED!.sets.map((s) => s.setId)).toEqual(['adventurers', 'skeletons', 'blocky']);
    expect(PARSED!.sets.map((s) => s.name)).toEqual(['Phiêu Lưu', 'Xương Khô', 'Bạn Khối']);
    expect(PARSED!.sets.map((s) => s.cell)).toEqual([96, 96, 128]);
    for (const set of PARSED!.sets) expect(set.characters).toHaveLength(12);
  });

  it('atlasBase của mọi nhân vật trỏ đúng file .webp + .json có thật trên đĩa', () => {
    for (const set of PARSED!.sets) {
      for (const c of set.characters) {
        expect(c.atlasBase).toBe(`/game/atlas/sets/${set.setId}/${c.characterKey}`);
        expect(existsSync(publicPath(`${c.atlasBase.slice(1)}.webp`))).toBe(true);
        expect(existsSync(publicPath(`${c.atlasBase.slice(1)}.json`))).toBe(true);
      }
    }
  });

  it('mọi nhân vật trong manifest đều có neo đất đã đo trong bảng g1-set-atlas', () => {
    for (const set of PARSED!.sets) {
      for (const c of set.characters) {
        expect(setGroundAnchorOf(set.setId, c.characterKey), `${set.setId}/${c.characterKey}`).toBeDefined();
      }
    }
  });
});

describe('planMatchLoad — tải lười theo ván', () => {
  it('ván mẫu 4 người bộ adventurers: chỉ nạp đúng 4 atlas của ván + 1 anchors', () => {
    const players = ['knight', 'barbarian', 'mage', 'rogue'].map((characterKey) => ({
      setId: 'adventurers',
      characterKey,
    }));
    const plan = planMatchLoad(players);
    expect(plan.refs.map((r) => r.imageUrl)).toEqual([
      '/game/atlas/sets/adventurers/knight.webp',
      '/game/atlas/sets/adventurers/barbarian.webp',
      '/game/atlas/sets/adventurers/mage.webp',
      '/game/atlas/sets/adventurers/rogue.webp',
    ]);
    expect(plan.refs.map((r) => r.jsonUrl)).toEqual(
      plan.refs.map((r) => r.imageUrl.replace(/\.webp$/, '.json')),
    );
    expect(plan.anchorsUrls).toEqual(['/game/atlas/sets/adventurers/anchors.json']);
    expect(plan.assignments.map((a) => a.atlasKey)).toEqual([
      'set-adventurers-knight',
      'set-adventurers-barbarian',
      'set-adventurers-mage',
      'set-adventurers-rogue',
    ]);
    // Không nạp atlas cũ, không nạp bộ khác.
    for (const r of plan.refs) {
      expect(r.imageUrl).not.toContain('/g1-');
      expect(r.imageUrl).not.toContain('skeletons');
      expect(r.imageUrl).not.toContain('blocky');
    }
  });

  it('ván mẫu 7 người bộ skeletons: 7 atlas skeletons phân biệt, 1 anchors, 0 atlas bộ khác/cũ', () => {
    const keys = [
      'skel-warrior',
      'skel-minion',
      'skel-rogue',
      'skel-mage',
      'skel-warrior-ghost',
      'skel-minion-ember',
      'skel-rogue-frost',
    ];
    const plan = planMatchLoad(keys.map((characterKey) => ({ setId: 'skeletons', characterKey })));
    expect(plan.refs).toHaveLength(7);
    expect(new Set(plan.refs.map((r) => r.atlasKey)).size).toBe(7);
    expect(plan.refs.every((r) => r.imageUrl.startsWith('/game/atlas/sets/skeletons/'))).toBe(true);
    expect(plan.anchorsUrls).toEqual(['/game/atlas/sets/skeletons/anchors.json']);
  });

  it('hai người trùng một nhân vật: atlas chỉ nạp 1 lần, gán vẫn đủ 2 người', () => {
    const plan = planMatchLoad([
      { setId: 'blocky', characterKey: 'blocky-a' },
      { setId: 'blocky', characterKey: 'blocky-a' },
    ]);
    expect(plan.refs).toHaveLength(1);
    expect(plan.assignments).toHaveLength(2);
  });

  it('thiếu setId/characterKey → bộ mặc định adventurers, gán phân biệt theo chỉ số', () => {
    const plan = planMatchLoad([{}, {}, {}]);
    expect(plan.refs.map((r) => r.characterKey)).toEqual(['knight', 'barbarian', 'mage']);
    expect(plan.refs.every((r) => r.setId === 'adventurers')).toBe(true);
  });
});

describe('legacyFallbackModelKey — đường fallback atlas cũ', () => {
  it('nhân vật có bản cũ tương ứng dùng đúng bản đó', () => {
    expect(legacyFallbackModelKey('knight', 3)).toBe('knight');
    expect(legacyFallbackModelKey('roguehooded', 0)).toBe('roguehooded');
    expect(legacyFallbackModelKey('rogue-hooded', 0)).toBe('roguehooded');
  });

  it('nhân vật chỉ có ở bộ mới → xoay vòng 5 model cũ theo chỉ số người chơi', () => {
    expect(legacyFallbackModelKey('skel-mage', 0)).toBe('knight');
    expect(legacyFallbackModelKey('blocky-a', 1)).toBe('barbarian');
    expect(legacyFallbackModelKey('knight-red', 7)).toBe('mage');
    expect(legacyFallbackModelKey(undefined, 4)).toBe('roguehooded');
  });
});

describe('số frame thật + thời lượng hành động', () => {
  it('bảng frame khớp A3 §3.2', () => {
    expect(G1_SET_ACTION_FRAME_COUNTS).toEqual({
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
    });
  });

  it('mọi JSON atlas thật của 36 nhân vật đều có đúng số frame theo bảng', () => {
    for (const set of PARSED!.sets) {
      for (const c of set.characters) {
        const atlas = readPublicJson(`${c.atlasBase.slice(1)}.json`) as {
          frames: Record<string, unknown>;
        };
        for (const [action, count] of Object.entries(G1_SET_ACTION_FRAME_COUNTS)) {
          const actual = Object.keys(atlas.frames).filter((k) => k.startsWith(`${action}_`)).length;
          expect(actual, `${c.characterKey}/${action}`).toBe(count);
        }
      }
    }
  });

  it('thời lượng tính từ số frame THẬT: punchA 5 frame @12fps ≈ 417ms, không còn 333ms của hằng 4', () => {
    expect(actionDurationForFrames(5, 12)).toBeCloseTo(416.67, 1);
    expect(actionDurationForFrames(3, 10)).toBe(300);
    expect(actionDurationForFrames(0, 12)).toBeCloseTo(333.33, 1); // không rõ → rơi về 4
  });
});

describe('anchors.json per-frame (N3)', () => {
  const anchorsRaw = readPublicJson('game/atlas/sets/adventurers/anchors.json');
  const anchors = parseSetAnchors(anchorsRaw);

  it('parse được anchors thật của cả 3 bộ, cell đúng bộ', () => {
    expect(anchors?.setId).toBe('adventurers');
    expect(anchors?.cell).toBe(96);
    expect(parseSetAnchors(readPublicJson('game/atlas/sets/skeletons/anchors.json'))?.cell).toBe(96);
    expect(parseSetAnchors(readPublicJson('game/atlas/sets/blocky/anchors.json'))?.cell).toBe(128);
  });

  it('tra đúng neo của (nhân vật, hành động, frame); frame vượt → kẹp frame cuối', () => {
    const raw = anchorsRaw as {
      characters: Record<string, Record<string, Array<{ x: number; y: number }>>>;
    };
    const run = raw.characters['knight']['run'];
    expect(headAnchorFor(anchors, 'knight', 'run', 2)).toEqual(run[2]);
    expect(headAnchorFor(anchors, 'knight', 'run', 99)).toEqual(run[run.length - 1]);
    expect(headAnchorFor(anchors, 'knight', 'khong-co-action', 0)).toBeUndefined();
    expect(headAnchorFor(anchors, 'khong-co-nhan-vat', 'run', 0)).toBeUndefined();
    expect(headAnchorFor(null, 'knight', 'run', 0)).toBeUndefined();
  });

  it('mọi nhân vật đều có neo cho đủ 10 hành động với số frame khớp bảng', () => {
    for (const setId of ['adventurers', 'skeletons', 'blocky']) {
      const parsed = parseSetAnchors(readPublicJson(`game/atlas/sets/${setId}/anchors.json`));
      expect(parsed).not.toBeNull();
      for (const set of PARSED!.sets.filter((s) => s.setId === setId)) {
        for (const c of set.characters) {
          for (const [action, count] of Object.entries(G1_SET_ACTION_FRAME_COUNTS)) {
            expect(
              parsed!.characters[c.characterKey]?.[action as keyof typeof G1_SET_ACTION_FRAME_COUNTS],
              `${setId}/${c.characterKey}/${action}`,
            ).toHaveLength(count);
          }
        }
      }
    }
  });

  it('parse sai dạng → null', () => {
    expect(parseSetAnchors(null)).toBeNull();
    expect(parseSetAnchors({ setId: 'x' })).toBeNull();
    expect(parseSetAnchors({ setId: 'x', characters: { k: { idle: [{ x: 'a', y: 0 }] } } })).toBeNull();
  });

  it('normPointOffset: quy chuẩn hoá về lệch px theo neo sprite (giữa-đáy ô), lật ngang gương qua trục giữa', () => {
    expect(normPointOffset({ x: 0.25, y: 0.75 }, 200, false)).toEqual({ x: -50, y: -50 });
    expect(normPointOffset({ x: 0.25, y: 0.75 }, 200, true)).toEqual({ x: 50, y: -50 });
    expect(normPointOffset({ x: 0.5, y: 1 }, 178, false)).toEqual({ x: 0, y: 0 });
  });

  it('neo đất knight/adventurers khớp số đo alpha của lane INT (groundX 0.263, groundY 0.844)', () => {
    const a = setGroundAnchorOf('adventurers', 'knight');
    expect(a?.groundX).toBeCloseTo(0.263, 3);
    expect(a?.groundY).toBeCloseTo(0.844, 3);
  });
});
