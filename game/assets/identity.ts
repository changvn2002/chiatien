// identity.ts — NGUỒN DANH TÍNH DUY NHẤT của game mode «Ai Đãi»
// (đợt FIX-V3, mục P0.4 — khoá danh tính một nguồn duy nhất).
//
// Trước đợt này game có hai hệ danh tính song song: (1) lib/identity của
// app chính (màu theo TÊN trên toàn bộ roster phiên + glyph initialsOf)
// cho avatar ở một số màn, và (2) một hệ gán màu theo ID trên TẬP CON
// đang chọn cho màu áo trong game — cùng một người đổi màu khi cỡ nhóm
// đổi (panel v3 ghế 2/4/5). Từ nay MỌI bề mặt (badge DOM, chip, vòng /
// plate / cột trong Phaser qua PlayerView.colorHex) đều lấy danh tính
// từ map dựng ở file này.
//
// LUẬT CỦA MAP:
// - Đầu vào LUÔN là roster ĐẦY ĐỦ của phiên (mọi thành viên phiên),
//   KHÔNG BAO GIỜ là tập người được chọn / tập người chơi của một ván.
//   Nhờ vậy màu + initials của một người không đổi khi tập người chơi
//   thay đổi (M3 chọn 7 người hay ván chỉ lấy 4 người vẫn một màu).
// - colorIndex do ĐÚNG hàm assignIdentityColors của lib/identity
//   (ĐÓNG BĂNG, quyết định M-2: seed chỉ-tên) gán trên roster đầy đủ —
//   cùng chỉ số mà Avatar của app chính (components/chiatien/ui-bits)
//   nhận. lib là nguồn luật; file này chỉ chiếu chỉ số đó sang các
//   bề mặt của game, không tự suy màu theo id, không hash riêng.
// - initials LUÔN là initialsOf của lib (chữ đầu từ đầu + chữ đầu từ
//   cuối, giữ dấu phụ đi kèm; tên một từ → một ký tự).
// - strongHex là màu ĐẬM (tông mạnh, bậc 700–900/A400 tuỳ ô sau
//   FIX-V4) dùng cho vòng / plate / cột / chip / badge trong game,
//   ánh xạ THEO colorIndex từ bảng dưới đây — cùng HỌ MÀU với nền
//   avatar V4 của app chính nên mắt nối được người ở app chính với
//   vòng/plate/badge (đậm) của cùng một người trong game.

import {
  assignIdentityColors,
  initialsOf,
  memberNameKey,
  normalizeMemberName,
} from '@/lib/identity';

/**
 * Bảng màu đậm theo colorIndex 0..11 — họ màu Material Design công bố
 * của Google (Material Design color palette, material.io — cùng nguồn
 * họ màu với bảng nền avatar V4 bậc 100 ở components/chiatien/ui-bits.tsx
 * `AVATAR_BACKGROUNDS_V4`, THỨ TỰ HỌ GIỮ NGUYÊN: 0 amber, 1 blue,
 * 2 cyan, 3 deep-orange, 4 deep-purple, 5 green, 6 indigo, 7 light-blue,
 * 8 light-green, 9 lime, 10 orange, 11 pink). colorIndex chỉ tới được
 * 0..11 vì assignIdentityColors gán trong cỡ palette 12 của lib.
 *
 * FIX-V4 (Cụm 2 — tách họ xanh ở tông mạnh): bản đầu (toàn bậc 700) để
 * index 1 blue #1976D2 và index 7 light-blue #0288D1 cùng hue ~205°
 * (chênh hue 8,7°, chênh sáng L 0,05) → Chi («xanh da trời») và Dũng
 * («xanh dương») trùng nhau ở cỡ vòng chân/badge (panel v4 SERIOUS 2).
 * Đợt này CHỈ đổi cách chiếu ở lớp game — colorIndex vẫn do
 * assignIdentityColors của lib gán nguyên vẹn — kéo 4 chỉ số xanh ra
 * bốn hướng đo được (số đo HSL đầy đủ ở REBUILD-C3-ID2-IDENTITY.md):
 * 1 sang blue 900 ĐẬM sâu #0D47A1 (hue 216,5°), 7 sang light-blue A400
 * SÁNG rõ #00B0FF (hue 198,6°, L 0,50), 2 sang cyan 800 ngả teal
 * #00838F (hue 185,0°), 6 sang chàm ngả tím #3730A3 (hue 243,7°).
 * Mọi cặp trong {1,2,6,7} nay chênh hue ≥ 13,6° hoặc chênh L ≥ 0,18.
 * Hai độ lệch CÓ ĐO so với hướng gợi ý ban đầu, đều vì cặp kề khác:
 * (i) 6 KHÔNG lấy #4527A0 — đó là deep-purple 800, cách index 4
 * deep-purple 700 đúng 2,7° hue / 0,03 L, tức dời va chạm sang cặp
 * 4↔6; #3730A3 giữ hue cách 4 là 13,9°. (ii) 10 KHÔNG lấy #E65100 —
 * hue 21,1° chỉ cách index 3 deep-orange 6,8°; #EF6C00 (orange 800)
 * tách cân bằng cả hai phía: cách 0 amber 10,5° (bản cũ 7,3°) và
 * cách 3 là 12,8°.
 */
export const STRONG_HEX_BY_COLOR_INDEX: readonly string[] = [
  '#FFA000', // 0 — amber 700
  '#0D47A1', // 1 — blue 900 (FIX-V4: đậm sâu, tách khỏi 7)
  '#00838F', // 2 — cyan 800 (FIX-V4: ngả teal)
  '#E64A19', // 3 — deep-orange 700
  '#512DA8', // 4 — deep-purple 700
  '#388E3C', // 5 — green 700
  '#3730A3', // 6 — indigo ngả tím (FIX-V4: hue 243,7°, vẫn cách 4 ≥ 13,9°)
  '#00B0FF', // 7 — light-blue A400 (FIX-V4: sáng rõ, tách khỏi 1)
  '#689F38', // 8 — light-green 700
  '#AFB42B', // 9 — lime 700
  '#EF6C00', // 10 — orange 800 (FIX-V4: tách cân bằng 0 ↔ 3)
  '#C2185B', // 11 — pink 700
];

/**
 * Bảng màu GLYPH (chữ initials) theo colorIndex — khoá CẠNH bảng đĩa
 * STRONG ở trên (A11Y-FIX, SPEC A11Y-FIX §4 / hồ sơ W2 B.1). Quy tắc:
 * mỗi idx chọn trắng #FFFFFF hoặc mực #212121 theo tỉ lệ WCAG cao hơn
 * trên đĩa STRONG tương ứng; bảng đĩa giữ nguyên 100% (không đổi một
 * hex nào của STRONG_HEX_BY_COLOR_INDEX) — chỉ màu chữ trên đĩa đổi.
 * Sau sửa toàn bảng ≥ 4,11:1, 12/12 ≥ 3:1, 10/12 ≥ 4,5:1 (tỉ lệ cạnh
 * từng idx dưới đây là tỉ lệ của glyph đã chọn trên đĩa STRONG đó,
 * tính bằng công thức tương phản WCAG 2.x — nguồn: SPEC A11Y-FIX §4 /
 * W2 B.1). Mọi bề mặt vẽ glyph (badge DOM, plate/cột G1, ghế G2,
 * texture DiceBear) đều đọc bảng này — không bề mặt nào tự ghim trắng
 * hay mực cho mọi đĩa nữa.
 */
export const GLYPH_HEX_BY_COLOR_INDEX: readonly string[] = [
  '#212121', // 0 — mực trên #FFA000: 7,88:1
  '#FFFFFF', // 1 — trắng trên #0D47A1: 8,63:1
  '#FFFFFF', // 2 — trắng trên #00838F: 4,52:1
  '#212121', // 3 — mực trên #E64A19: 4,11:1
  '#FFFFFF', // 4 — trắng trên #512DA8: 9,17:1
  '#FFFFFF', // 5 — trắng trên #388E3C: 4,12:1
  '#FFFFFF', // 6 — trắng trên #3730A3: 9,93:1
  '#212121', // 7 — mực trên #00B0FF: 6,64:1
  '#212121', // 8 — mực trên #689F38: 5,06:1
  '#212121', // 9 — mực trên #AFB42B: 7,20:1
  '#212121', // 10 — mực trên #EF6C00: 5,23:1
  '#FFFFFF', // 11 — trắng trên #C2185B: 5,87:1
];

/**
 * Màu glyph cho một đĩa biết hex — cho các bề mặt Phaser chỉ có
 * colorHex của player (PlayerView.colorHex, tức strongHex của identity
 * map): tra colorIndex bằng STRONG_HEX_BY_COLOR_INDEX rồi trả glyph
 * tương ứng trong GLYPH_HEX_BY_COLOR_INDEX. Hex lạ (không thuộc bảng
 * STRONG) → '#FFFFFF' (mặc định cũ của DiceBear / glyph trắng).
 */
export function glyphHexForDiscHex(discHex: string): string {
  const idx = STRONG_HEX_BY_COLOR_INDEX.indexOf(discHex.toUpperCase());
  return idx >= 0 ? (GLYPH_HEX_BY_COLOR_INDEX[idx] ?? '#FFFFFF') : '#FFFFFF';
}

/** Tên màu tiếng Việt theo colorIndex — cho chip / nhãn chữ đi kèm màu (không ai bị phân biệt CHỈ bằng màu). Tên phải đúng màu thật sau FIX-V4: 1 đậm ↔ 7 sáng là cặp đối lập có chủ đích; 4 đổi «tím chàm» → «tím đậm» để nhường họ «chàm» cho 6 «chàm tím», tránh hai tên gần trùng nhau. */
export const STRONG_NAME_BY_COLOR_INDEX: readonly string[] = [
  'hổ phách', // 0 amber
  'xanh dương đậm', // 1 blue 900
  'xanh ngọc', // 2 cyan (ngả teal)
  'cam cháy', // 3 deep-orange
  'tím đậm', // 4 deep-purple
  'xanh lá', // 5 green
  'chàm tím', // 6 indigo ngả tím
  'xanh da trời sáng', // 7 light-blue sáng
  'xanh lá non', // 8 light-green
  'xanh cốm', // 9 lime
  'cam đậm', // 10 orange 800
  'hồng đậm', // 11 pink
];

/** Một thành viên của roster phiên ở dạng chuẩn của game (id ổn định + tên hiển thị). */
export interface IdentityRosterMember {
  id: string;
  name: string;
}

/** Danh tính đầy đủ của một thành viên — mọi bề mặt của game đọc từ đây. */
export interface GameIdentity {
  /** Id ổn định của thành viên trong phiên. */
  memberId: string;
  /** Tên hiển thị đã chuẩn hoá (normalizeMemberName của lib). */
  name: string;
  /** Dạng so sánh của tên (memberNameKey của lib) — cũng là seed DiceBear ở app chính. */
  nameKey: string;
  /** Chỉ số màu do assignIdentityColors của lib gán trên roster đầy đủ (0..11). */
  colorIndex: number;
  /** Màu đậm (tông mạnh) theo colorIndex — cho vòng / plate / cột / chip / badge và PlayerView.colorHex. */
  strongHex: string;
  /** Tên màu tiếng Việt của strongHex — cho chip / nhãn chữ. */
  strongName: string;
  /** Glyph initials theo initialsOf của lib — glyph duy nhất trên mọi badge. */
  initials: string;
}

/**
 * Dựng identity map từ roster ĐẦY ĐỦ của phiên. Hàm thuần, tất định:
 * cùng một tập tên → cùng màu / initials cho từng người, bất kể thứ tự
 * mảng roster (assignIdentityColors của lib sắp xếp theo thứ tự chuẩn
 * trước khi gán) và bất kể tập con người chơi được chọn sau đó (người
 * gọi tra map theo id, không dựng lại map trên tập con).
 */
export function buildIdentityMap(
  roster: readonly IdentityRosterMember[],
): ReadonlyMap<string, GameIdentity> {
  const colorIndexes = assignIdentityColors(roster.map((m) => ({ name: m.name })));
  const out = new Map<string, GameIdentity>();
  roster.forEach((member, i) => {
    const colorIndex = colorIndexes[i] ?? 0;
    out.set(member.id, {
      memberId: member.id,
      name: normalizeMemberName(member.name),
      nameKey: memberNameKey(member.name),
      colorIndex,
      strongHex: STRONG_HEX_BY_COLOR_INDEX[colorIndex] ?? STRONG_HEX_BY_COLOR_INDEX[0],
      strongName: STRONG_NAME_BY_COLOR_INDEX[colorIndex] ?? STRONG_NAME_BY_COLOR_INDEX[0],
      initials: initialsOf(member.name),
    });
  });
  return out;
}

/** Như buildIdentityMap nhưng đầu vào là members của GameSessionInput (id + displayName). */
export function buildIdentityMapFromSessionMembers(
  members: readonly { id: string; displayName: string }[],
): ReadonlyMap<string, GameIdentity> {
  return buildIdentityMap(members.map((m) => ({ id: m.id, name: m.displayName })));
}

/**
 * Như buildIdentityMap, nhưng đảm bảo mọi id trong `mustCover` đều có
 * mặt trong map: dùng cho ván đã chốt / bản ghi khôi phục, nơi danh
 * sách người chơi của ván là nguồn tên phụ — người chơi nào đã có
 * trong roster phiên thì GIỮ NGUYÊN danh tính theo roster (roster
 * thắng), người chơi lạ (không còn trong phiên hiện tại) được nối
 * thêm vào CUỐI roster trước khi gán, để tra cứu không bao giờ thiếu.
 */
export function buildIdentityMapCovering(
  roster: readonly IdentityRosterMember[],
  mustCover: readonly IdentityRosterMember[],
): ReadonlyMap<string, GameIdentity> {
  const known = new Set(roster.map((m) => m.id));
  const extras = mustCover.filter((m) => !known.has(m.id));
  return buildIdentityMap(extras.length > 0 ? [...roster, ...extras] : roster);
}

/** Tra danh tính theo id — trả undefined nếu id không thuộc roster đã dựng map. */
export function identityOf(
  map: ReadonlyMap<string, GameIdentity>,
  memberId: string,
): GameIdentity | undefined {
  return map.get(memberId);
}
