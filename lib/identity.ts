/**
 * Danh tính thành viên — chuẩn hoá tên, glyph initials và màu avatar.
 *
 * Nguồn luật: REDESIGN-V3 — COLOR-SYSTEM §4–§5 (12 ô identity lens-11,
 * LK-14/15/16), INTERFACE-SPEC §4 (cơ chế đĩa + initials + viền) và
 * QUYẾT ĐỊNH M-2 của wave V3 (V3-IMPL-STATE.md mục 1, chốt 2026-10-24,
 * xử lý tranh chấp 2 của Panel #04).
 *
 * QUYẾT ĐỊNH M-2 (hướng (i) — seed CHỈ-TÊN + tie-break xác định):
 * màu ứng viên của một thành viên chỉ suy từ tên đã chuẩn hoá
 * (memberNameKey) — `fnv1a32(nameKey) % 12` — ordinal KHÔNG còn nằm
 * trong seed. Việc gán diễn ra theo THỨ TỰ CHUẨN (nameKey tăng dần,
 * ordinal gốc tăng dần làm tie-break cuối cho tên trùng tuyệt đối)
 * rồi ánh xạ kết quả về vị trí gốc trong mảng đầu vào. Member id
 * KHÔNG tham gia ở bất kỳ bước nào. Hàm thuần, không random, không
 * trạng thái phụ.
 *
 * Giới hạn ghi thẳng (theo đúng STATE mục 1):
 * - Tên phân biệt ⇒ màu của một người chỉ phụ thuộc TẬP TÊN của nhóm
 *   — không phụ thuộc thứ tự mảng, máy, hay id: cùng một người giữ
 *   nguyên màu ở mọi phiên/mọi máy kể cả khi thứ tự thành viên khác
 *   nhau (đây là điểm cơ chế (tên + ordinal) của V2 không đạt: đổi
 *   thứ tự là mọi người sau điểm chèn đổi màu).
 * - Tên trùng tuyệt đối ⇒ TẬP màu của nhóm tên đó ổn định; gán cá
 *   nhân bên trong nhóm trùng đi theo thứ tự chèn (ordinal).
 * - Thêm thành viên mới chỉ có thể đổi màu trong chuỗi va chạm chứa
 *   tên mới (thăm tuyến tính từ ứng viên của tên mới); thành viên
 *   ngoài chuỗi va chạm không đổi màu.
 * - Đổi tên một thành viên = đổi danh tính hiển thị ⇒ màu suy ra từ
 *   tên mới, theo đúng các luật trên.
 *
 * Lịch sử: cơ chế V2 (Panel-02 M-2) seed bằng (tên + ordinal) và
 * palette tông đất 12 màu — đã thay bằng quyết định M-2 của V3 ở trên;
 * palette cũ (gồm #654321) chết hẳn theo LK-14.
 */

import type { Member } from './types';

/* ------------------------------------------------------------------ */
/* Palette danh tính V3 (COLOR-SYSTEM §4, LK-14) — 12 ô của lens-11   */
/* chép NGUYÊN BYTE, là đầu ra của phép tìm kiếm max-min trên lưới    */
/* OKLCH với ràng buộc kênh mới (initials + viền trên đĩa neutral).   */
/* Vai a11y quyết định là INITIALS mang màu ô trên đĩa neutral-50     */
/* #FAF3F1 (ĐÓNG BĂNG, LK-15) và trên giấy #FDF5F2 — cột I-1 đã ký     */
/* trong COLOR-SYSTEM §4 được kiểm lại bằng test hồi quy trong        */
/* identity.spec.ts (LK-16: một nguồn generated duy nhất cho sink     */
/* này + globals.css + spec — ba nơi phải giống hệt nhau).            */
/*                                                                    */
/* The Identity Palette Rule: TUYỆT ĐỐI không chứa brand #A5482F     */
/* (seed V3) hay bất kỳ hex semantic nào của hệ (credit #1D7725 /     */
/* #004F09, debt #A80011 / #6B0006, warning #AB5E00 / #783F00) — màu  */
/* thương hiệu (hành động) và màu ngữ nghĩa tiền không bao giờ đóng   */
/* vai danh tính một con người; ngược lại màu danh tính cũng không    */
/* dùng cho số dư/nút/focus. Thứ tự dưới đây là token identity-01..12. */
/* ------------------------------------------------------------------ */
export const IDENTITY_PALETTE: readonly string[] = [
  '#CF284D', // identity-01
  '#353C1D', // identity-02
  '#607200', // identity-03
  '#4C654C', // identity-04
  '#00423F', // identity-05
  '#224A71', // identity-06
  '#006CD3', // identity-07
  '#061D9D', // identity-08
  '#5E56DE', // identity-09
  '#5637A7', // identity-10
  '#9F43C3', // identity-11
  '#8A5673', // identity-12
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
/* Hash + chọn màu (M-2 V3: seed chỉ-tên)                             */
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
 * Chỉ số màu ỨNG VIÊN của một thành viên (QUYẾT ĐỊNH M-2, V3): chỉ
 * FNV-1a-32 của `nameKey` modulo cỡ palette — seed CHỈ-TÊN, ordinal
 * đã bị bỏ khỏi seed. nameKey phải là dạng so sánh (memberNameKey).
 * Đây mới là ứng viên — màu gán thật đi qua chống trùng xác định
 * theo thứ tự chuẩn của assignIdentityColors.
 *
 * Tham số `_ordinal` được GIỮ trong chữ ký chỉ để tương thích lời
 * gọi cũ (V2 truyền ordinal vào đây) — nó không ảnh hưởng kết quả.
 */
export function avatarColorIndex(nameKey: string, _ordinal?: number): number {
  void _ordinal;
  return fnv1a32(nameKey) % IDENTITY_PALETTE.length;
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
/* Gán màu phân biệt xác định — thứ tự chuẩn (M-2 V3)                 */
/* ------------------------------------------------------------------ */

/**
 * Gán chỉ số màu palette cho từng thành viên theo QUYẾT ĐỊNH M-2 (V3):
 *
 * 0. THỨ TỰ CHUẨN: sắp xếp thành viên theo (nameKey tăng dần theo
 *    code unit, ordinal gốc tăng dần). So sánh chuỗi bằng toán tử
 *    quan hệ của JS (code unit UTF-16) — KHÔNG dùng localeCompare
 *    (phụ thuộc locale/máy). Ordinal chỉ còn vai tie-break cuối cho
 *    tên trùng tuyệt đối.
 * 1. Ứng viên = avatarColorIndex(nameKey) — seed CHỈ-TÊN.
 * 2. Ứng viên chưa ai dùng → gán. Đã bị dùng → thăm tuyến tính xác
 *    định (ứng viên + k) mod 12, k = 1, 2, … tới màu chưa dùng.
 *    Nhóm ≤ 12 người (cỡ palette) luôn gán được màu KHÁC NHAU cho
 *    mọi thành viên.
 * 3. Ngoài giới hạn đó (dữ liệu import lạ có > 12 người): khi mọi màu
 *    đã có người giữ, vòng hai cho phép lặp lại từ ứng viên gốc nhưng
 *    chỉ chọn màu mà cặp (màu, glyph initials) còn trống — tức không
 *    người giữ màu đó có cùng glyph với thành viên này. Không tìm
 *    được cặp trống nào → quay về ứng viên gốc.
 * 4. Kết quả gán theo thứ tự chuẩn được ánh xạ về vị trí gốc trong
 *    mảng đầu vào.
 *
 * Hệ quả (giới hạn đã ghi ở đầu file): với tên phân biệt, màu theo
 * tên chỉ phụ thuộc TẬP TÊN — bất biến chéo thứ tự mảng và chéo máy;
 * KHÔNG phụ thuộc member id (import cấp id mới không đổi màu ai cả).
 */
export function assignIdentityColors(members: readonly { name: string }[]): number[] {
  const size = IDENTITY_PALETTE.length;
  const result: number[] = new Array<number>(members.length);
  const usedColors = new Set<number>();
  /** glyph đã giữ từng màu — chỉ cần cho vòng hai khi nhóm > palette. */
  const glyphsByColor = new Map<number, Set<string>>();

  const canonical = members
    .map((member, ordinal) => ({ member, ordinal, nameKey: memberNameKey(member.name) }))
    .sort((a, b) => {
      if (a.nameKey < b.nameKey) return -1;
      if (a.nameKey > b.nameKey) return 1;
      return a.ordinal - b.ordinal;
    });

  for (const { member, ordinal, nameKey } of canonical) {
    const candidate = avatarColorIndex(nameKey);
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
  }

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
