import { newId } from './id';
import type { Expense, Member, Session, SplitMode } from './types';

/**
 * Lớp làm sạch DUY NHẤT cho mọi dữ liệu cuộc chia đến từ bên ngoài app:
 * link chia sẻ (lib/share.ts) và localStorage (lib/storage.ts) đều đi qua
 * đây — không đường nạp nào lỏng hơn đường nào.
 *
 * Quy tắc toàn vẹn tiền (QA chiatien F1 — chặn quyết toán lệch im lặng):
 *  - Mọi số tiền ép về SỐ NGUYÊN đồng ≥ 0: giá trị không phải số hữu hạn
 *    hoặc số âm trong bảng custom bị loại; trọng số ≤ 0 bị loại.
 *  - Khoản chi custom mà tổng các phần sau làm sạch KHÁC số tiền khoản chi
 *    thì khoản chi đó bị LOẠI khỏi cuộc chia và được đếm vào
 *    `droppedExpenses` để UI báo rõ cho người dùng. App không tự ý chia
 *    lại/scale — không bịa con số người dùng không nhập.
 *  - Chuỗi (tên cuộc chia, tên người, tên khoản) bị cắt ở độ dài tối đa
 *    để dữ liệu hỏng không phình giao diện.
 * Nhờ vậy mọi cuộc chia qua lớp này đều cho tổng số dư toàn phiên = 0.
 * (Lớp phòng thủ thứ hai nằm ở UI quyết toán: sumBalances + cảnh báo.)
 *
 * Đợt vá theo test W2 (2026-10-23 — file lib/w2-deep.spec.ts là đặc tả):
 *  - Trần số tiền MAX_AMOUNT_VND: khoản chi nhóm thực tế không bao giờ tới
 *    10^16 đồng (mười triệu tỷ — cỡ GDP cả nước), trong khi số float không
 *    trần thì phép nhân amount × trọng số tràn thành Infinity/NaN và quyết
 *    toán thành rác (W2-F2/F3). Dưới trần này, tầng tính chia nguyên đồng
 *    bằng BigInt giữ tổng khớp TUYỆT ĐỐI. Vượt trần = khoản bị loại + đếm
 *    vào droppedExpenses như mọi khoản không hợp lệ khác — không clamp
 *    lặng lẽ sang một con số người dùng không hề nhập.
 *  - Trần trọng số MAX_WEIGHT: trọng số là TỈ LỆ (1, 2, 0.5...), không phải
 *    tiền; giá trị trên 10^6 chỉ có thể là dữ liệu sửa tay phá hoại — loại
 *    khỏi bảng trọng số. Tầng tính cũng tự chuẩn hoá theo trọng số lớn nhất
 *    nên kể cả trọng số hợp lệ rất lớn vẫn không tràn số.
 *  - Mọi bảng tra theo member id (custom/weights) được dựng bằng
 *    Object.create(null): id "__proto__" qua được lớp này sẽ phá toàn vẹn
 *    tiền ở tầng tính nếu bảng là object thường (gán obj["__proto__"] không
 *    tạo thuộc tính riêng — phần tiền của người đó biến mất im lặng, W2-F1).
 *    Tầng tính (lib/split.ts) áp dụng cùng quy tắc cho bảng tích luỹ.
 */

const MAX_TITLE_LENGTH = 200;
const MAX_NAME_LENGTH = 200;

/** Trần số tiền một khoản chi / một phần custom — xem ghi chú đợt vá W2 ở trên. */
const MAX_AMOUNT_VND = 10_000_000_000_000_000; // 10^16 đồng

/** Trần trọng số chia theo phần — trọng số là tỉ lệ, không phải số tiền. */
const MAX_WEIGHT = 1_000_000;

/**
 * Cắt chuỗi ở tối đa `max` ký tự UTF-16 NHƯNG không xé đôi một surrogate
 * pair: nếu ký tự cuối sau khi cắt là nửa đầu của một emoji (high
 * surrogate), bỏ luôn ký tự đó — chuỗi kết quả ngắn hơn 1 ký tự còn hơn
 * mang ký tự lỗi U+D83D hiển thị thành ký tự thay thế (W2-F4).
 */
function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut;
}

/** Timestamp chỉ nhận khi là số hữu hạn — NaN/Infinity bị thay bằng hiện tại (W2-F5). */
function sanitizeTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}

export interface SanitizeResult {
  session: Session | null;
  /** Số khoản chi bị loại vì không hợp lệ (gồm cả custom lệch tổng). */
  droppedExpenses: number;
}

/** Làm sạch một cuộc chia thô; không hợp lệ ở mức cấu trúc -> session null. */
export function sanitizeSession(
  raw: unknown,
  opts?: { allowEmptyMembers?: boolean },
): Session | null {
  return sanitizeSessionDetailed(raw, opts).session;
}

/** Như sanitizeSession nhưng kèm số khoản chi đã bị loại để UI thông báo. */
export function sanitizeSessionDetailed(
  raw: unknown,
  opts?: { allowEmptyMembers?: boolean },
): SanitizeResult {
  const fail: SanitizeResult = { session: null, droppedExpenses: 0 };
  if (!raw || typeof raw !== 'object') return fail;
  const s = raw as Partial<Session>;
  if (typeof s.title !== 'string' || !Array.isArray(s.members) || !Array.isArray(s.expenses)) {
    return fail;
  }

  const members: Member[] = [];
  const seenMemberIds = new Set<string>();
  for (const rawMember of s.members) {
    if (!rawMember || typeof rawMember !== 'object') continue;
    const m = rawMember as Partial<Member>;
    if (typeof m.id !== 'string' || typeof m.name !== 'string' || !m.name.trim()) continue;
    if (seenMemberIds.has(m.id)) continue;
    seenMemberIds.add(m.id);
    const member: Member = { id: m.id, name: truncateText(m.name, MAX_NAME_LENGTH) };
    if (
      m.bank &&
      typeof m.bank === 'object' &&
      typeof m.bank.bin === 'string' &&
      typeof m.bank.accountNumber === 'string' &&
      typeof m.bank.accountName === 'string'
    ) {
      member.bank = {
        bin: m.bank.bin,
        bankName: typeof m.bank.bankName === 'string' ? m.bank.bankName : '',
        accountNumber: m.bank.accountNumber,
        accountName: m.bank.accountName,
      };
    }
    members.push(member);
  }
  if (members.length === 0 && !opts?.allowEmptyMembers) return fail;
  const memberIds = new Set(members.map((m) => m.id));

  const expenses: Expense[] = [];
  const seenExpenseIds = new Set<string>();
  let droppedExpenses = 0;
  for (const rawExpense of s.expenses) {
    if (!rawExpense || typeof rawExpense !== 'object') {
      droppedExpenses += 1;
      continue;
    }
    const e = rawExpense as Partial<Expense>;
    if (typeof e.id !== 'string' || typeof e.title !== 'string') {
      droppedExpenses += 1;
      continue;
    }
    if (seenExpenseIds.has(e.id)) {
      droppedExpenses += 1;
      continue;
    }
    if (typeof e.amount !== 'number' || !Number.isFinite(e.amount) || e.amount <= 0) {
      droppedExpenses += 1;
      continue;
    }
    const amount = Math.round(e.amount);
    if (amount <= 0 || amount > MAX_AMOUNT_VND) {
      // Vượt trần an toàn (W2-F2): giữ lại thì tầng tính có nguy cơ tràn
      // Infinity/NaN — loại + đếm như mọi khoản không hợp lệ khác.
      droppedExpenses += 1;
      continue;
    }
    if (typeof e.payerId !== 'string' || !memberIds.has(e.payerId)) {
      droppedExpenses += 1;
      continue;
    }
    if (!Array.isArray(e.participantIds)) {
      droppedExpenses += 1;
      continue;
    }
    // Khử trùng lặp người tham gia (giữ thứ tự đầu tiên) — trùng id sẽ làm
    // tầng tính chia đếm một người hai lần.
    const participantIds: string[] = [];
    for (const id of e.participantIds) {
      if (typeof id === 'string' && memberIds.has(id) && !participantIds.includes(id)) {
        participantIds.push(id);
      }
    }
    if (participantIds.length === 0) {
      droppedExpenses += 1;
      continue;
    }
    const mode: SplitMode =
      e.mode === 'custom' || e.mode === 'shares' || e.mode === 'equal' ? e.mode : 'equal';
    const custom = sanitizeMoneyRecord(e.custom);
    const weights = sanitizeWeightsRecord(e.weights);
    if (mode === 'custom') {
      const sum = participantIds.reduce((acc, id) => acc + (custom[id] ?? 0), 0);
      if (sum !== amount) {
        // Tổng phần chia không khớp số tiền khoản chi: khoản này không có
        // cách hiểu nào là đúng — loại và ghi nhận, tuyệt đối không giữ
        // nguyên trạng để quyết toán lệch trong im lặng.
        droppedExpenses += 1;
        continue;
      }
    }
    seenExpenseIds.add(e.id);
    expenses.push({
      id: e.id,
      title: truncateText(e.title, MAX_TITLE_LENGTH),
      amount,
      payerId: e.payerId,
      participantIds,
      mode,
      custom,
      weights,
      createdAt: sanitizeTimestamp(e.createdAt),
    });
  }

  return {
    session: {
      id: typeof s.id === 'string' ? s.id : newId(),
      title: truncateText(s.title, MAX_TITLE_LENGTH),
      members,
      expenses,
      createdAt: sanitizeTimestamp(s.createdAt),
      updatedAt: Date.now(),
    },
    droppedExpenses,
  };
}

/**
 * Bảng số tiền custom: chỉ giữ số hữu hạn ≥ 0 trong trần MAX_AMOUNT_VND,
 * ép về nguyên đồng. Bảng dựng bằng Object.create(null) để khoá id nguy
 * hiểm ("__proto__", "constructor", "prototype") vẫn là thuộc tính riêng
 * bình thường — không làm rơi phần tiền của ai (W2-F1).
 */
function sanitizeMoneyRecord(rec: unknown): Record<string, number> {
  const out: Record<string, number> = Object.create(null) as Record<string, number>;
  if (!rec || typeof rec !== 'object') return out;
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_AMOUNT_VND) {
      out[k] = Math.round(v);
    }
  }
  return out;
}

/**
 * Bảng trọng số: chỉ giữ số hữu hạn trong (0, MAX_WEIGHT] (0/âm coi như
 * không tham gia phần đó; vượt trần tỉ lệ = dữ liệu sửa tay — loại).
 * Cùng quy tắc Object.create(null) như bảng custom (W2-F1/F3).
 */
function sanitizeWeightsRecord(rec: unknown): Record<string, number> {
  const out: Record<string, number> = Object.create(null) as Record<string, number>;
  if (!rec || typeof rec !== 'object') return out;
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= MAX_WEIGHT) {
      out[k] = v;
    }
  }
  return out;
}
