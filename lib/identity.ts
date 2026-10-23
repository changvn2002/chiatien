/**
 * Danh tính thành viên — chuẩn hoá tên, glyph initials và màu avatar.
 *
 * Nguồn luật: redesign-v2 DESIGN-LANGUAGE §8 (avatar, Panel-02 M-2) và
 * §13.2 (chuẩn hoá tên + chống trùng, Panel-02 D-3).
 *
 * Ba lỗi của cơ chế cũ mà module này thay thế (M-2): màu ghim bằng hash
 * của member id (import qua share link cấp id mới → cùng một người đổi
 * màu giữa hai máy), hash không chống va chạm (trùng màu trong cùng
 * nhóm), và palette chứa màu ngữ nghĩa tiền (#177245 credit).
 *
 * Cơ chế mới: màu suy XÁC ĐỊNH từ hai dữ kiện mà payload share v2 đã
 * mang theo trên mọi máy — (a) tên thành viên đã chuẩn hoá và (b) thứ
 * tự (ordinal) của thành viên trong mảng members. Member id KHÔNG
 * tham gia ở bất kỳ bước nào. Hàm thuần, không random, không trạng
 * thái phụ: cùng payload ⇒ cùng kết quả trên mọi máy.
 *
 * Giới hạn ghi thẳng (theo §8.1): nếu người dùng ĐỔI TÊN thành viên
 * hoặc sắp xếp lại thứ tự sau khi import, màu suy ra có thể đổi — vì
 * danh tính hiển thị đã đổi. Trên cùng một bản dữ liệu, mọi máy luôn
 * khớp nhau.
 */

import type { Member } from './types';

/* ------------------------------------------------------------------ */
/* Palette danh tính (DESIGN-LANGUAGE §8.3, DESIGN.md.proposed        */
/* identity-01..12) — 12 màu tông đất/ấm, mọi màu đạt ≥4.5:1 với chữ   */
/* initials trắng.                                                     */
/*                                                                    */
/* The Identity Palette Rule: TUYỆT ĐỐI không chứa brand #B45309,     */
/* brand-deep #92400E, credit #177245, debt #B3352C — màu thương hiệu  */
/* (hành động) và màu ngữ nghĩa tiền không bao giờ đóng vai danh tính */
/* một con người; ngược lại màu danh tính cũng không dùng cho số      */
/* dư/nút/focus. Thứ tự dưới đây là thứ tự token identity-01..12.     */
/* ------------------------------------------------------------------ */
export const IDENTITY_PALETTE: readonly string[] = [
  '#7C4A1E', // identity-01
  '#8A5A2B', // identity-02
  '#7A3B2E', // identity-03
  '#946B00', // identity-04
  '#5E503F', // identity-05
  '#855C1F', // identity-06
  '#4A6741', // identity-07
  '#6E5636', // identity-08
  '#654321', // identity-09
  '#7D5A3C', // identity-10
  '#596235', // identity-11
  '#8C6A3F', // identity-12
];

/* ------------------------------------------------------------------ */
/* Chuẩn hoá tên (§13.2) — hàm dùng chung cho seed avatar (§8.1), so   */
/* trùng tên và hiển thị.                                             */
/* ------------------------------------------------------------------ */

/**
 * Dạng HIỂN THỊ của tên: NFC → trim → gộp mọi dãy whitespace (kể cả
 * tab/newline) thành một khoảng trắng. Giữ nguyên hoa/thường.
 */
export function normalizeMemberName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * Dạng SO SÁNH của tên: chuẩn hoá hiển thị rồi hạ chữ thường.
 * " an " ≡ "An" ≡ "AN" (cùng key "an"); "A  n" → key "a n" ≠ "an".
 */
export function memberNameKey(name: string): string {
  return normalizeMemberName(name).toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Hash + chọn màu (§8.1)                                             */
/* ------------------------------------------------------------------ */

/**
 * FNV-1a 32-bit (offset basis 0x811C9DC5, prime 0x01000193), duyệt
 * theo từng code unit UTF-16 — xác định giống nhau trên mọi máy JS.
 * Trả về số nguyên không dấu.
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Chỉ số màu ỨNG VIÊN của một thành viên: FNV-1a-32 của
 * `${nameKey}#${ordinal}` modulo cỡ palette. nameKey phải là dạng so
 * sánh (memberNameKey). Đây mới là ứng viên — màu gán thật đi qua
 * chống trùng của assignIdentityColors.
 */
export function avatarColorIndex(nameKey: string, ordinal: number): number {
  return fnv1a32(`${nameKey}#${ordinal}`) % IDENTITY_PALETTE.length;
}

/* ------------------------------------------------------------------ */
/* Glyph initials (§8)                                                */
/* ------------------------------------------------------------------ */

/** Chữ cái đầu của một từ: ký tự chữ đầu tiên kèm dấu phụ đi kèm (nếu có). */
function firstLetterOf(word: string): string {
  const match = word.match(/^\p{L}\p{M}*/u);
  if (match) return match[0];
  return [...word][0] ?? '';
}

/**
 * Glyph initials từ tên hiển thị đã chuẩn hoá: chữ cái đầu của từ đầu
 * + chữ cái đầu của từ cuối, viết hoa; tên một từ → một ký tự.
 * "Đức Anh" → "ĐA", "Bình" → "B", "Nguyễn Văn An" → "NA".
 */
export function initialsOf(name: string): string {
  const normalized = normalizeMemberName(name);
  if (!normalized) return '';
  const words = normalized.split(' ');
  const first = firstLetterOf(words[0]);
  if (words.length === 1) return first.toUpperCase();
  const last = firstLetterOf(words[words.length - 1]);
  return (first + last).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Gán màu phân biệt xác định trong cùng cuộc chia (§8.2)             */
/* ------------------------------------------------------------------ */

/**
 * Gán chỉ số màu palette cho từng thành viên, duyệt theo ordinal tăng
 * dần (đúng thứ tự mảng members của payload):
 *
 * 1. Ứng viên = avatarColorIndex(memberNameKey(name), ordinal).
 * 2. Ứng viên chưa ai dùng → gán. Đã bị dùng → thăm tuyến tính xác
 *    định (ứng viên + k) mod 12, k = 1, 2, … tới màu chưa dùng.
 *    Nhóm ≤ 12 người (cỡ palette) luôn gán được màu KHÁC NHAU cho
 *    mọi thành viên.
 * 3. Ngoài giới hạn đó (dữ liệu import lạ có > 12 người): khi mọi màu
 *    đã có người giữ, vòng hai cho phép lặp lại từ ứng viên gốc nhưng
 *    chỉ chọn màu mà cặp (màu, glyph initials) còn trống — tức không
 *    người giữ màu đó có cùng glyph với thành viên này. Không tìm
 *    được cặp trống nào → quay về ứng viên gốc.
 *
 * Chỉ phụ thuộc vào (tên, thứ tự) của mảng đầu vào — KHÔNG phụ thuộc
 * member id: cùng danh sách tên theo cùng thứ tự ⇒ cùng bảng gán,
 * kể cả khi id của mọi thành viên đều khác (sau import).
 */
export function assignIdentityColors(members: readonly { name: string }[]): number[] {
  const size = IDENTITY_PALETTE.length;
  const result: number[] = new Array<number>(members.length);
  const usedColors = new Set<number>();
  /** glyph đã giữ từng màu — chỉ cần cho vòng hai khi nhóm > palette. */
  const glyphsByColor = new Map<number, Set<string>>();

  members.forEach((member, ordinal) => {
    const candidate = avatarColorIndex(memberNameKey(member.name), ordinal);
    let assigned = -1;

    // Vòng một: màu phân biệt, thăm tuyến tính từ ứng viên.
    for (let k = 0; k < size; k++) {
      const idx = (candidate + k) % size;
      if (!usedColors.has(idx)) {
        assigned = idx;
        break;
      }
    }

    // Vòng hai (> 12 người): lặp màu được phép nếu cặp (màu, glyph) trống.
    if (assigned === -1) {
      const glyph = initialsOf(member.name);
      for (let k = 0; k < size; k++) {
        const idx = (candidate + k) % size;
        const holders = glyphsByColor.get(idx);
        if (!holders || !holders.has(glyph)) {
          assigned = idx;
          break;
        }
      }
      if (assigned === -1) assigned = candidate;
    }

    result[ordinal] = assigned;
    usedColors.add(assigned);
    const glyph = initialsOf(member.name);
    const holders = glyphsByColor.get(assigned) ?? new Set<string>();
    holders.add(glyph);
    glyphsByColor.set(assigned, holders);
  });

  return result;
}

/* ------------------------------------------------------------------ */
/* Chống trùng tên + nhập hàng loạt (§13.2, §13.3)                     */
/* ------------------------------------------------------------------ */

/**
 * Tìm thành viên đã có cùng tên (so theo memberNameKey) với tên ứng
 * viên — trùng sau chuẩn hoá + hạ chữ thường theo §13.2. Bỏ qua
 * chính thành viên excludeId (khi đang sửa tên của họ). Tên ứng viên
 * rỗng sau chuẩn hoá không coi là trùng.
 */
export function findDuplicateMember(
  members: readonly Member[],
  candidateName: string,
  excludeId?: string,
): Member | undefined {
  const key = memberNameKey(candidateName);
  if (!key) return undefined;
  return members.find((m) => m.id !== excludeId && memberNameKey(m.name) === key);
}

/**
 * Tách danh sách tên ngăn bằng dấu phẩy (nhập nhanh §13.3):
 * normalizeMemberName từng phần, bỏ phần rỗng.
 * "Lan, Hùng,  Mai ," → ["Lan", "Hùng", "Mai"].
 */
export function parseBulkMemberNames(input: string): string[] {
  return input
    .split(',')
    .map((part) => normalizeMemberName(part))
    .filter((name) => name.length > 0);
}
