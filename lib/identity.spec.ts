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

  it('"an#0" = 2271448573, suy ra avatarColorIndex("an", 0) = 1', () => {
    expect(fnv1a32('an#0')).toBe(2271448573);
    expect(avatarColorIndex('an', 0)).toBe(1);
    expect(avatarColorIndex('an', 1)).toBe(2);
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

describe('IDENTITY_PALETTE — §8.3 + Identity Palette Rule', () => {
  it('đúng 12 hex theo thứ tự identity-01..12 của DESIGN.md.proposed', () => {
    expect(IDENTITY_PALETTE).toEqual([
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
    ]);
  });

  it('TUYỆT ĐỐI không chứa brand / brand-deep / credit / debt', () => {
    const upper = IDENTITY_PALETTE.map((hex) => hex.toUpperCase());
    for (const forbidden of ['#B45309', '#92400E', '#177245', '#B3352C']) {
      expect(upper).not.toContain(forbidden);
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

describe('assignIdentityColors — gán phân biệt xác định (§8.2)', () => {
  it('va chạm hash gốc được thăm tuyến tính: An/Dũng cùng ứng viên 1 -> [1, 2]', () => {
    // Kiểm chứng độc lập bằng phép tính FNV-1a ngoài test:
    // avatarColorIndex("an", 0) = 1 và avatarColorIndex("dũng", 1) = 1
    // (va chạm) -> Dũng bị thăm sang (1 + 1) mod 12 = 2.
    expect(avatarColorIndex('an', 0)).toBe(1);
    expect(avatarColorIndex('dũng', 1)).toBe(1);
    expect(assignIdentityColors([{ name: 'An' }, { name: 'Dũng' }])).toEqual([1, 2]);
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
    // Người thứ 13: mọi màu đều do glyph "A" giữ -> fallback ứng viên gốc.
    expect(colors[12]).toBe(avatarColorIndex('an', 12));
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
