// identity.spec.ts — Kiểm chứng nguồn danh tính DUY NHẤT của game
// (đợt FIX-V3, P0.4): identity map tất định trên roster đầy đủ, glyph
// initials khớp lib/identity ở cả đường badge lẫn đường texture
// Phaser (kể cả fallback), và bảng strongHex khoá theo colorIndex.

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { initialsOf } from '@/lib/identity';
import { GameBadge } from '../screens/shared';
import {
  GLYPH_HEX_BY_COLOR_INDEX,
  STRONG_HEX_BY_COLOR_INDEX,
  STRONG_NAME_BY_COLOR_INDEX,
  buildIdentityMap,
  buildIdentityMapCovering,
  buildIdentityMapFromSessionMembers,
  glyphHexForDiscHex,
} from './identity';
import { avatarDiceBearOptions, initialsOfName } from '../phaser/textures';

const ROSTER7 = [
  { id: 'm-an', name: 'An' },
  { id: 'm-binh', name: 'Bình' },
  { id: 'm-chi', name: 'Chi' },
  { id: 'm-dung', name: 'Dũng' },
  { id: 'm-em', name: 'Em' },
  { id: 'm-phuc', name: 'Phúc' },
  { id: 'm-giang', name: 'Giang' },
] as const;

function glyphOfDiceBear(svg: string): string {
  return svg.match(/<text[^>]*>([^<]*)<\/text>/)?.[1] ?? '';
}

describe('buildIdentityMap — tất định trên roster đầy đủ', () => {
  it('cùng roster → cùng màu/initials cho từng người, bất kể thứ tự mảng roster', () => {
    const a = buildIdentityMap(ROSTER7);
    const shuffled = buildIdentityMap([...ROSTER7].reverse());
    for (const m of ROSTER7) {
      expect(shuffled.get(m.id)?.colorIndex).toBe(a.get(m.id)?.colorIndex);
      expect(shuffled.get(m.id)?.strongHex).toBe(a.get(m.id)?.strongHex);
      expect(shuffled.get(m.id)?.initials).toBe(a.get(m.id)?.initials);
    }
  });

  it('tra theo tập con / thứ tự chọn khác nhau không đổi màu của ai (regression An/Chi hoán đổi)', () => {
    const full = buildIdentityMap(ROSTER7);
    // Mô phỏng ván chỉ lấy 4 người, chọn theo thứ tự khác hẳn roster.
    const subsetPickOrder = ['m-dung', 'm-chi', 'm-an', 'm-binh'];
    const subsetColors = subsetPickOrder.map((id) => full.get(id)?.strongHex);
    expect(subsetColors).toEqual([
      full.get('m-dung')?.strongHex,
      full.get('m-chi')?.strongHex,
      full.get('m-an')?.strongHex,
      full.get('m-binh')?.strongHex,
    ]);
    // An và Chi là hai người khác nhau → hai màu khác nhau, ổn định.
    expect(full.get('m-an')?.colorIndex).not.toBe(full.get('m-chi')?.colorIndex);
    // Mọi người trong roster ≤ 12 đều có colorIndex phân biệt.
    const indexes = ROSTER7.map((m) => full.get(m.id)?.colorIndex);
    expect(new Set(indexes).size).toBe(ROSTER7.length);
  });

  it('màu chỉ phụ thuộc tập TÊN, không phụ thuộc id (quyết định M-2 của lib)', () => {
    const a = buildIdentityMap(ROSTER7);
    const otherIds = buildIdentityMap(ROSTER7.map((m) => ({ id: `x-${m.id}`, name: m.name })));
    for (const m of ROSTER7) {
      expect(otherIds.get(`x-${m.id}`)?.colorIndex).toBe(a.get(m.id)?.colorIndex);
    }
  });

  it('strongHex / strongName luôn tra theo đúng colorIndex trong bảng đã khoá', () => {
    const map = buildIdentityMap(ROSTER7);
    for (const m of ROSTER7) {
      const entry = map.get(m.id);
      expect(entry).toBeDefined();
      expect(entry?.strongHex).toBe(STRONG_HEX_BY_COLOR_INDEX[entry?.colorIndex ?? -1]);
      expect(entry?.strongName).toBe(STRONG_NAME_BY_COLOR_INDEX[entry?.colorIndex ?? -1]);
      expect(entry?.nameKey).toBe(m.name.normalize('NFC').toLowerCase());
    }
    // Bảng khoá sau FIX-V4 (Cụm 2): thứ tự họ của nền avatar V4 giữ
    // nguyên (amber, blue, cyan, deep-orange, deep-purple, green,
    // indigo, light-blue, light-green, lime, orange, pink); 5 ô đổi
    // bậc để tách họ xanh ở tông mạnh + cặp cam — 1 blue 900, 2 cyan
    // 800, 6 indigo ngả tím, 7 light-blue A400, 10 orange 800; các ô
    // còn lại giữ Material bậc 700 như bản đầu.
    expect(STRONG_HEX_BY_COLOR_INDEX).toEqual([
      '#FFA000',
      '#0D47A1',
      '#00838F',
      '#E64A19',
      '#512DA8',
      '#388E3C',
      '#3730A3',
      '#00B0FF',
      '#689F38',
      '#AFB42B',
      '#EF6C00',
      '#C2185B',
    ]);
    // Tên khoá khớp màu thật sau FIX-V4 (kênh phụ phân biệt).
    expect(STRONG_NAME_BY_COLOR_INDEX).toEqual([
      'hổ phách',
      'xanh dương đậm',
      'xanh ngọc',
      'cam cháy',
      'tím đậm',
      'xanh lá',
      'chàm tím',
      'xanh da trời sáng',
      'xanh lá non',
      'xanh cốm',
      'cam đậm',
      'hồng đậm',
    ]);
  });

  it('buildIdentityMapFromSessionMembers ánh xạ displayName → cùng kết quả', () => {
    const fromSession = buildIdentityMapFromSessionMembers(
      ROSTER7.map((m) => ({ id: m.id, displayName: m.name })),
    );
    const direct = buildIdentityMap(ROSTER7);
    for (const m of ROSTER7) {
      expect(fromSession.get(m.id)).toEqual(direct.get(m.id));
    }
  });

  it('buildIdentityMapCovering giữ nguyên màu của người thuộc roster, chỉ nối thêm người lạ', () => {
    const covered = buildIdentityMapCovering(ROSTER7, [
      { id: 'm-an', name: 'An' },
      { id: 'm-la', name: 'Người Lạ' },
    ]);
    const full = buildIdentityMap(ROSTER7);
    expect(covered.get('m-an')?.colorIndex).toBe(full.get('m-an')?.colorIndex);
    expect(covered.get('m-la')).toBeDefined();
  });
});

describe('initials — luôn bằng initialsOf của lib', () => {
  const cases: Array<[string, string]> = [
    ['Bình', 'B'],
    ['Dũng', 'D'],
    ['Giang', 'G'],
    ['Đức Anh', 'ĐA'],
    ['Nguyễn Văn An', 'NA'],
    // Tên ở dạng tổ hợp (decomposed): dấu là combining mark tách rời —
    // không được cắt giữa âm tiết, kết quả phải như dạng dựng sẵn (NFC).
    ['Bi\u0300nh', 'B'],
    ['Du\u0303ng', 'D'],
    ['Đu\u031b\u0301c Anh', 'ĐA'],
  ];

  it.each(cases)('%s → %s (map, delegate fallback, và glyph DiceBear)', (name, expected) => {
    const map = buildIdentityMap([{ id: 'm-x', name }]);
    expect(map.get('m-x')?.initials).toBe(expected);
    expect(map.get('m-x')?.initials).toBe(initialsOf(name));
    // Đường fallback của Phaser (scenes dùng initialsOfName).
    expect(initialsOfName(name)).toBe(expected);
    // Đường chính của Phaser: DiceBear sinh từ avatarDiceBearOptions
    // phải cho glyph y hệt (cơ chế chars: 1 cho tên một từ).
    const svg = createAvatar(initials, avatarDiceBearOptions(name, '#FFA000')).toString();
    expect(glyphOfDiceBear(svg)).toBe(expected);
  });

  it('tên rỗng: map cho initials rỗng như lib, fallback hiển thị ?', () => {
    expect(initialsOf('')).toBe('');
    expect(initialsOfName('')).toBe('?');
    expect(initialsOfName('   ')).toBe('?');
  });
});

/* ------------------------------------------------------------------ */
/* FIX-V4 Cụm 2 — tách màu ở tông mạnh, đo bằng HSL (không chấm bằng   */
/* mắt): một cặp coi là phân biệt được khi chênh hue ≥ 12° HOẶC chênh */
/* lightness ≥ 0,18. Số đo đầy đủ ghi ở REBUILD-C3-ID2-IDENTITY.md.   */
/* ------------------------------------------------------------------ */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function distinguishable(indexA: number, indexB: number): { dh: number; dl: number } {
  const a = hexToHsl(STRONG_HEX_BY_COLOR_INDEX[indexA]);
  const b = hexToHsl(STRONG_HEX_BY_COLOR_INDEX[indexB]);
  return { dh: hueDistance(a.h, b.h), dl: Math.abs(a.l - b.l) };
}

describe('FIX-V4 — họ xanh ở tông mạnh phải tách nhau bằng số đo', () => {
  const BLUE_FAMILY = [1, 2, 6, 7] as const;
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < BLUE_FAMILY.length; i++) {
    for (let j = i + 1; j < BLUE_FAMILY.length; j++) {
      pairs.push([BLUE_FAMILY[i], BLUE_FAMILY[j]]);
    }
  }

  it.each(pairs)('cặp xanh %i ↔ %i: chênh hue ≥ 12° hoặc chênh sáng ≥ 0,18', (a, b) => {
    const { dh, dl } = distinguishable(a, b);
    expect(dh >= 12 || dl >= 0.18).toBe(true);
  });

  it('cặp gây lỗi panel v4 — Chi (7 light-blue) ↔ Dũng (1 blue) — nay tách cả hue lẫn sáng', () => {
    // Bản cũ: #1976D2 ↔ #0288D1 — hue 209,8° ↔ 201,2° (chênh 8,7°),
    // L 0,461 ↔ 0,414 (chênh 0,047): trùng ở cỡ vòng chân/badge.
    const { dh, dl } = distinguishable(1, 7);
    expect(dh).toBeGreaterThanOrEqual(12);
    expect(dl).toBeGreaterThanOrEqual(0.1);
    expect(STRONG_HEX_BY_COLOR_INDEX[1]).toBe('#0D47A1');
    expect(STRONG_HEX_BY_COLOR_INDEX[7]).toBe('#00B0FF');
  });

  it('6 chàm tím không dời va chạm sang 4 deep-purple: chênh hue ≥ 12°', () => {
    // #4527A0 (deep-purple 800) bị loại vì chỉ cách #512DA8 đúng 2,7°.
    const { dh } = distinguishable(4, 6);
    expect(dh).toBeGreaterThanOrEqual(12);
    expect(STRONG_HEX_BY_COLOR_INDEX[6]).toBe('#3730A3');
  });

  it('2 cyan ngả teal và 10 orange tách cân bằng với các kề của chúng', () => {
    expect(STRONG_HEX_BY_COLOR_INDEX[2]).toBe('#00838F');
    expect(STRONG_HEX_BY_COLOR_INDEX[10]).toBe('#EF6C00');
    // 0 amber ↔ 10 orange: bản cũ chênh hue 7,3° → nay ≥ 10°.
    expect(distinguishable(0, 10).dh).toBeGreaterThanOrEqual(10);
    // 3 deep-orange ↔ 10 orange: giữ ≥ 12° (phương án #E65100 chỉ còn 6,8°).
    expect(distinguishable(3, 10).dh).toBeGreaterThanOrEqual(12);
  });
});

describe('FIX-V4 — GameBadge ở tầng DOM dùng ĐÚNG tông mạnh như plate trong sân', () => {
  function badgeMarkup(name: string, colorIndex: number): string {
    return renderToStaticMarkup(createElement(GameBadge, { name, colorIndex, size: 32 }));
  }

  it('đĩa nền = strongHex theo colorIndex và glyph TRẮNG, không còn nền pastel bậc 100', () => {
    const dung = badgeMarkup('Dũng', 1).toLowerCase();
    expect(dung).toContain('#0d47a1'); // strongHex index 1
    expect(dung).toContain('fill="#ffffff"'); // glyph trắng trên đĩa mạnh
    expect(dung).not.toContain('#bbdefb'); // nền pastel blue 100 của app chính — KHÔNG được rò vào game
    const chi = badgeMarkup('Chi', 7).toLowerCase();
    expect(chi).toContain('#00b0ff'); // strongHex index 7 — khác hẳn đĩa của Dũng
    expect(chi).not.toContain('#0d47a1');
  });

  it('glyph trên badge DOM vẫn bằng initialsOf của lib (tên một từ → 1 ký tự)', () => {
    expect(glyphOfDiceBear(badgeMarkup('Đức Anh', 3))).toBe('ĐA');
    expect(glyphOfDiceBear(badgeMarkup('Bình', 5))).toBe('B');
  });
});

/* ------------------------------------------------------------------ */
/* A11Y-FIX — glyph theo đĩa (SPEC A11Y-FIX §4): bảng đĩa STRONG giữ  */
/* nguyên 100%; màu glyph khoá theo colorIndex — mỗi idx chọn trắng   */
/* #FFFFFF hoặc mực #212121 theo tỉ lệ WCAG cao hơn trên đĩa đó.      */
/* ------------------------------------------------------------------ */

function relativeLuminance(hex: string): number {
  const channel = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('A11Y-FIX — glyph theo đĩa (SPEC A11Y-FIX §4)', () => {
  it('bảng glyph khoá đúng 12 giá trị theo thứ tự colorIndex', () => {
    expect(GLYPH_HEX_BY_COLOR_INDEX).toEqual([
      '#212121',
      '#FFFFFF',
      '#FFFFFF',
      '#212121',
      '#FFFFFF',
      '#FFFFFF',
      '#FFFFFF',
      '#212121',
      '#212121',
      '#212121',
      '#212121',
      '#FFFFFF',
    ]);
  });

  it('mỗi idx: glyph trên đĩa STRONG ≥ 3:1 và là lựa chọn tốt hơn trong {#FFFFFF, #212121}', () => {
    for (let idx = 0; idx < 12; idx++) {
      const disc = STRONG_HEX_BY_COLOR_INDEX[idx];
      const glyph = GLYPH_HEX_BY_COLOR_INDEX[idx];
      const other = glyph === '#FFFFFF' ? '#212121' : '#FFFFFF';
      expect(contrastRatio(glyph, disc)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(glyph, disc)).toBeGreaterThanOrEqual(contrastRatio(other, disc));
    }
  });

  it('glyphHexForDiscHex tra glyph theo hex đĩa; hex lạ → trắng', () => {
    expect(glyphHexForDiscHex('#00B0FF')).toBe('#212121');
    expect(glyphHexForDiscHex('#0D47A1')).toBe('#FFFFFF');
    expect(glyphHexForDiscHex('#123456')).toBe('#FFFFFF');
  });

  it('bề mặt texture: avatarDiceBearOptions dùng glyph theo đĩa', () => {
    expect(avatarDiceBearOptions('An', '#00B0FF').textColor).toEqual(['212121']);
    expect(avatarDiceBearOptions('An', '#0D47A1').textColor).toEqual(['FFFFFF']);
  });

  it('bề mặt DOM: GameBadge vẽ glyph theo bảng (idx 7 mực, idx 1 trắng)', () => {
    const chi = renderToStaticMarkup(
      createElement(GameBadge, { name: 'Chi', colorIndex: 7, size: 32 }),
    ).toLowerCase();
    expect(chi).toContain('fill="#212121"');
    const dung = renderToStaticMarkup(
      createElement(GameBadge, { name: 'Dũng', colorIndex: 1, size: 32 }),
    ).toLowerCase();
    expect(dung).toContain('fill="#ffffff"');
  });
});
