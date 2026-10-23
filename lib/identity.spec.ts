import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  IDENTITY_PALETTE,
  assignIdentityColors,
  avatarColorIndex,
  findDuplicateMember,
  fnv1a32,
  initialsOf,
  memberNameKey,
  normalizeMemberName,
  parseBulkMemberNames,
} from './identity';
import type { Member } from './types';

describe('fnv1a32 — vector tính tay độc lập', () => {
  it('chuỗi rỗng trả về offset basis 0x811C9DC5', () => {
    // FNV-1a không duyệt ký tự nào -> nguyên offset basis.
    expect(fnv1a32('')).toBe(2166136261);
    expect(fnv1a32('')).toBe(0x811c9dc5);
  });

  it('"a" khớp vector FNV-1a 32-bit đã công bố 0xE40C292C', () => {
    // Tính tay: (2166136261 XOR 97) * 16777619 mod 2^32 = 3826002220.
    expect(fnv1a32('a')).toBe(3826002220);
    expect(fnv1a32('a')).toBe(0xe40c292c);
  });

  it('"an#0" = 2271448573 (vector fnv giữ nguyên — fnv không đổi ở V3)', () => {
    expect(fnv1a32('an#0')).toBe(2271448573);
  });

  it('M-2: seed CHỈ-TÊN — avatarColorIndex("an") = fnv1a32("an") % 12 = 6, ordinal bị bỏ khỏi seed', () => {
    // fnv1a32('an') = 1092940518 (tính tay độc lập cùng thuật toán) → % 12 = 6.
    expect(fnv1a32('an')).toBe(1092940518);
    expect(avatarColorIndex('an')).toBe(6);
    // Tham số ordinal (giữ để tương thích chữ ký V2) KHÔNG ảnh hưởng kết quả.
    expect(avatarColorIndex('an', 0)).toBe(6);
    expect(avatarColorIndex('an', 1)).toBe(6);
    expect(avatarColorIndex('an', 11)).toBe(6);
  });

  it('luôn trả về số nguyên không dấu 32-bit', () => {
    for (const s of ['Đức Anh', 'a'.repeat(64), '#0', 'Nguyễn Văn An#11']) {
      const h = fnv1a32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('IDENTITY_PALETTE — COLOR-SYSTEM §4 (LK-14) + Identity Palette Rule', () => {
  it('đúng 12 hex lens-11 theo thứ tự identity-01..12, chép nguyên byte', () => {
    expect(IDENTITY_PALETTE).toEqual([
      '#CF284D',
      '#353C1D',
      '#607200',
      '#4C654C',
      '#00423F',
      '#224A71',
      '#006CD3',
      '#061D9D',
      '#5E56DE',
      '#5637A7',
      '#9F43C3',
      '#8A5673',
    ]);
  });

  it('TUYỆT ĐỐI không chứa brand seed V3 / semantic — và bộ palette cũ chết hẳn (LK-14)', () => {
    const upper = IDENTITY_PALETTE.map((hex) => hex.toUpperCase());
    for (const forbidden of [
      '#A5482F', // brand seed V3
      '#1D7725',
      '#004F09', // credit solid/ink
      '#A80011',
      '#6B0006', // debt solid/ink
      '#AB5E00',
      '#783F00', // warning solid/ink
      // Bộ cũ V2 chết hẳn — gồm #654321 bị cấm đích danh LK-14:
      '#7C4A1E',
      '#8A5A2B',
      '#7A3B2E',
      '#946B00',
      '#5E503F',
      '#855C1F',
      '#4A6741',
      '#6E5636',
      '#654321',
      '#7D5A3C',
      '#596235',
      '#8C6A3F',
    ]) {
      expect(upper).not.toContain(forbidden);
    }
  });

  it('LK-16 một nguồn duy nhất: biến --identity-* trong app/globals.css khớp byte với palette', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    const fromCss: string[] = [];
    for (let i = 1; i <= 12; i++) {
      const token = `--identity-${String(i).padStart(2, '0')}`;
      const match = css.match(new RegExp(`${token}:\\s*(#[0-9A-Fa-f]{6})`));
      expect(match, `globals.css thiếu ${token}`).not.toBeNull();
      fromCss.push(match![1].toUpperCase());
    }
    expect(fromCss).toEqual(IDENTITY_PALETTE.map((hex) => hex.toUpperCase()));
  });
});

describe('IDENTITY_PALETTE — hồi quy a11y LK-16: contrast I-1 đã ký (COLOR-SYSTEM §4)', () => {
  // Số sàn đã ký trong COLOR-SYSTEM §4: [hex, I-1/giấy #FDF5F2, I-1/đĩa #FAF3F1].
  const SIGNED_I1: [string, number, number][] = [
    ['#CF284D', 4.8, 4.71],
    ['#353C1D', 10.75, 10.55],
    ['#607200', 5.0, 4.91],
    ['#4C654C', 5.96, 5.85],
    ['#00423F', 10.55, 10.35],
    ['#224A71', 8.54, 8.38],
    ['#006CD3', 4.78, 4.69],
    ['#061D9D', 11.69, 11.47],
    ['#5E56DE', 5.05, 4.96],
    ['#5637A7', 7.81, 7.66],
    ['#9F43C3', 4.8, 4.71],
    ['#8A5673', 5.33, 5.23],
  ];
  const PAPER = '#FDF5F2';
  const DISC = '#FAF3F1'; // neutral-50 — đĩa ĐÓNG BĂNG (LK-15)

  function relativeLuminance(hex: string): number {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  function contrastRatio(a: string, b: string): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  it('bảng ký trong spec khớp byte với IDENTITY_PALETTE', () => {
    expect(SIGNED_I1.map(([hex]) => hex)).toEqual([...IDENTITY_PALETTE]);
  });

  it('từng ô: contrast tính lại khớp số đã ký trên giấy và trên đĩa (dung sai 0,02) và ≥ 4,5', () => {
    for (const [hex, signedPaper, signedDisc] of SIGNED_I1) {
      const onPaper = contrastRatio(hex, PAPER);
      const onDisc = contrastRatio(hex, DISC);
      expect(Math.abs(onPaper - signedPaper)).toBeLessThanOrEqual(0.02);
      expect(Math.abs(onDisc - signedDisc)).toBeLessThanOrEqual(0.02);
      expect(onPaper).toBeGreaterThanOrEqual(4.5);
      expect(onDisc).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('normalizeMemberName / memberNameKey — §13.2', () => {
  it('NFC → trim → gộp mọi dãy whitespace (kể cả tab/newline) thành 1 space', () => {
    expect(normalizeMemberName('  Đức\t\n  Anh  ')).toBe('Đức Anh');
    expect(normalizeMemberName('An')).toBe('An');
    expect(normalizeMemberName('   ')).toBe('');
  });

  it('giữ nguyên hoa/thường cho hiển thị, nhưng chuẩn hoá tổ hợp dấu về NFC', () => {
    expect(normalizeMemberName('đỨc aNH')).toBe('đỨc aNH');
    const nfd = 'Đức Anh'.normalize('NFD');
    expect(normalizeMemberName(nfd)).toBe('Đức Anh'.normalize('NFC'));
  });

  it('key so sánh: " an " ≡ "An" ≡ "AN" đều là "an"', () => {
    expect(memberNameKey(' an ')).toBe('an');
    expect(memberNameKey('An')).toBe('an');
    expect(memberNameKey('AN')).toBe('an');
  });

  it('key: "A  n" sau gộp là "a n" — KHÁC "an", không trùng', () => {
    expect(memberNameKey('A  n')).toBe('a n');
    expect(memberNameKey('A  n')).not.toBe(memberNameKey('An'));
  });
});

describe('initialsOf — glyph từ tên hiển thị (§8)', () => {
  it('tên hai từ có dấu: "Đức Anh" -> "ĐA"', () => {
    expect(initialsOf('Đức Anh')).toBe('ĐA');
  });

  it('tên một từ: "Bình" -> "B" (một ký tự)', () => {
    expect(initialsOf('Bình')).toBe('B');
  });

  it('tên ba từ lấy từ đầu + từ cuối: "Nguyễn Văn An" -> "NA"', () => {
    expect(initialsOf('Nguyễn Văn An')).toBe('NA');
    expect(initialsOf('  Trần   Thị Hồng ')).toBe('TH');
  });

  it('viết hoa cả khi tên gốc thường; rỗng -> ""', () => {
    expect(initialsOf('văn an')).toBe('VA');
    expect(initialsOf('   ')).toBe('');
  });
});

describe('assignIdentityColors — gán phân biệt xác định theo thứ tự chuẩn (M-2 V3)', () => {
  it('va chạm liên-tên xác định: Mai/Phúc cùng ứng viên 2 — theo thứ tự chuẩn "mai" < "phúc" nên Mai=2, Phúc thăm sang 3, ở MỌI thứ tự đầu vào', () => {
    // Kiểm chứng độc lập bằng phép tính FNV-1a ngoài test (seed chỉ-tên):
    // avatarColorIndex("mai") = 2 và avatarColorIndex("phúc") = 2 (va chạm).
    expect(avatarColorIndex('mai')).toBe(2);
    expect(avatarColorIndex('phúc')).toBe(2);
    expect(assignIdentityColors([{ name: 'Mai' }, { name: 'Phúc' }])).toEqual([2, 3]);
    // Đảo thứ tự đầu vào: màu THEO TÊN không đổi (kết quả ánh xạ về vị trí gốc).
    expect(assignIdentityColors([{ name: 'Phúc' }, { name: 'Mai' }])).toEqual([3, 2]);
  });

  it('bất biến chéo thứ tự: cùng tập tên ở ≥3 thứ tự khác nhau ⇒ màu theo tên giống hệt (gồm cả tên va chạm)', () => {
    // Tập có HAI cặp va chạm ứng viên: bình/chi cùng 5, mai/phúc cùng 2.
    // Theo thứ tự chuẩn (nameKey↑): an=6 · bình=5 · chi thăm 5→6→7 · mai=2 · phúc thăm 2→3.
    const expectedByName: Record<string, number> = { An: 6, Bình: 5, Chi: 7, Mai: 2, Phúc: 3 };
    const orders: string[][] = [
      ['An', 'Bình', 'Chi', 'Mai', 'Phúc'],
      ['Phúc', 'Mai', 'Chi', 'Bình', 'An'],
      ['Chi', 'Phúc', 'An', 'Mai', 'Bình'],
      ['Mai', 'An', 'Phúc', 'Bình', 'Chi'],
    ];
    for (const order of orders) {
      const colors = assignIdentityColors(order.map((name) => ({ name })));
      const byName: Record<string, number> = {};
      order.forEach((name, i) => {
        byName[name] = colors[i];
      });
      expect(byName).toEqual(expectedByName);
    }
  });

  it('tên trùng tuyệt đối: TẬP màu của nhóm tên trùng ổn định chéo thứ tự; gán cá nhân theo thứ tự chèn trong nhóm', () => {
    // Ứng viên: an=6, bình=5. Nhóm "An"×2 chiếm {6, 7} (người chèn trước
    // lấy 6 theo tie-break ordinal trong thứ tự chuẩn), Bình luôn 5.
    const orders: string[][] = [
      ['An', 'Bình', 'An'],
      ['An', 'An', 'Bình'],
      ['Bình', 'An', 'An'],
    ];
    for (const order of orders) {
      const colors = assignIdentityColors(order.map((name) => ({ name })));
      const anColors = order
        .map((name, i) => (name === 'An' ? colors[i] : -1))
        .filter((c) => c >= 0);
      expect(new Set(anColors)).toEqual(new Set([6, 7]));
      // Người "An" xuất hiện đầu tiên trong mảng luôn nhận 6 (tie-break ordinal).
      expect(colors[order.indexOf('An')]).toBe(6);
      expect(colors[order.indexOf('Bình')]).toBe(5);
      expect(new Set(colors).size).toBe(3);
    }
  });

  it('thêm thành viên ngoài chuỗi va chạm không đổi màu ai: chèn "Hà" (ứng viên 9) vào đầu không đổi màu An/Bình', () => {
    const before = assignIdentityColors([{ name: 'An' }, { name: 'Bình' }]);
    const after = assignIdentityColors([{ name: 'Hà' }, { name: 'An' }, { name: 'Bình' }]);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
  });

  it('nhóm 12 người: mọi người một màu khác nhau', () => {
    const names = [
      'An',
      'Bình',
      'Cường',
      'Dũng',
      'Đức Anh',
      'Hà',
      'Hùng',
      'Lan',
      'Mai',
      'Nam',
      'Phúc',
      'Sơn',
    ];
    const colors = assignIdentityColors(names.map((name) => ({ name })));
    expect(colors).toHaveLength(12);
    expect(new Set(colors).size).toBe(12);
    for (const c of colors) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(12);
    }
  });

  it('hàm xác định: gọi 2 lần cùng mảng -> cùng kết quả', () => {
    const members = [{ name: 'An' }, { name: 'Dũng' }, { name: 'Bình' }, { name: 'Lan' }];
    expect(assignIdentityColors(members)).toEqual(assignIdentityColors(members));
  });

  it('không phụ thuộc member id: đổi toàn bộ id -> màu không đổi', () => {
    const withIdsA: (Member & { name: string })[] = [
      { id: '862da49d-0000-4000-8000-000000000001', name: 'An' },
      { id: '862da49d-0000-4000-8000-000000000002', name: 'Dũng' },
      { id: '862da49d-0000-4000-8000-000000000003', name: 'Bình' },
    ];
    // Sau import, cùng payload nhận id mới hoàn toàn (ca M-2 của panel).
    const withIdsB = withIdsA.map((m, i) => ({ ...m, id: `a89a93b2-imported-${i}` }));
    expect(assignIdentityColors(withIdsB)).toEqual(assignIdentityColors(withIdsA));
    expect(assignIdentityColors(withIdsA)).toEqual(
      assignIdentityColors(withIdsA.map(({ name }) => ({ name }))),
    );
  });

  it('nhóm > 12: lặp màu chỉ khi glyph khác người đã giữ màu đó', () => {
    const names = [
      'An',
      'Bình',
      'Cường',
      'Dũng',
      'Đức Anh',
      'Hà',
      'Hùng',
      'Lan',
      'Mai',
      'Nam',
      'Phúc',
      'Sơn',
      'Tâm', // người thứ 13 — mọi màu đã có người giữ
    ];
    const members = names.map((name) => ({ name }));
    const colors = assignIdentityColors(members);
    expect(colors).toHaveLength(13);
    // Không hai thành viên nào trùng cả cặp (màu, glyph).
    const pairs = members.map((m, i) => `${colors[i]}|${initialsOf(m.name)}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    // Và vẫn xác định khi gọi lại.
    expect(assignIdentityColors(members)).toEqual(colors);
  });

  it('nhóm > 12 toàn trùng glyph: quay về ứng viên gốc', () => {
    const members = Array.from({ length: 13 }, () => ({ name: 'An' }));
    const colors = assignIdentityColors(members);
    // 12 người đầu phủ kín palette (mỗi người một màu).
    expect(new Set(colors.slice(0, 12)).size).toBe(12);
    // Người thứ 13: mọi màu đều do glyph "A" giữ -> fallback ứng viên gốc (chỉ-tên).
    expect(colors[12]).toBe(avatarColorIndex('an'));
  });
});

describe('findDuplicateMember — chống trùng tên (§13.2)', () => {
  const members: Member[] = [
    { id: 'm1', name: 'An' },
    { id: 'm2', name: 'Bình' },
  ];

  it('trùng sau chuẩn hoá + hạ chữ thường: " an " và "AN" đều trùng "An"', () => {
    expect(findDuplicateMember(members, ' an ')?.id).toBe('m1');
    expect(findDuplicateMember(members, 'AN')?.id).toBe('m1');
  });

  it('"A  n" (key "a n") không trùng "An"', () => {
    expect(findDuplicateMember(members, 'A  n')).toBeUndefined();
  });

  it('bỏ qua chính excludeId khi đang sửa tên của họ', () => {
    expect(findDuplicateMember(members, 'Bình', 'm2')).toBeUndefined();
    expect(findDuplicateMember(members, 'Bình', 'm1')?.id).toBe('m2');
  });

  it('tên mới hoàn toàn -> undefined; tên rỗng -> undefined', () => {
    expect(findDuplicateMember(members, 'Cường')).toBeUndefined();
    expect(findDuplicateMember(members, '   ')).toBeUndefined();
  });
});

describe('parseBulkMemberNames — nhập nhanh (§13.3)', () => {
  it('tách theo dấu phẩy, chuẩn hoá từng phần, bỏ phần rỗng', () => {
    expect(parseBulkMemberNames('Lan, Hùng,  Mai ,')).toEqual(['Lan', 'Hùng', 'Mai']);
    expect(parseBulkMemberNames('  An  , ,Bình')).toEqual(['An', 'Bình']);
  });

  it('chuỗi rỗng / chỉ dấu phẩy -> []', () => {
    expect(parseBulkMemberNames('')).toEqual([]);
    expect(parseBulkMemberNames(' , , ')).toEqual([]);
  });

  it('giữ hoa/thường hiển thị, gộp khoảng trắng trong từng tên', () => {
    expect(parseBulkMemberNames('đức   anh, BÌNH')).toEqual(['đức anh', 'BÌNH']);
  });
});
