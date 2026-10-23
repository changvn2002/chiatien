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
 */

const MAX_TITLE_LENGTH = 200;
const MAX_NAME_LENGTH = 200;

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
    const member: Member = { id: m.id, name: m.name.slice(0, MAX_NAME_LENGTH) };
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
    if (amount <= 0) {
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
      title: e.title.slice(0, MAX_TITLE_LENGTH),
      amount,
      payerId: e.payerId,
      participantIds,
      mode,
      custom,
      weights,
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
    });
  }

  return {
    session: {
      id: typeof s.id === 'string' ? s.id : newId(),
      title: s.title.slice(0, MAX_TITLE_LENGTH),
      members,
      expenses,
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
      updatedAt: Date.now(),
    },
    droppedExpenses,
  };
}

/** Bảng số tiền custom: chỉ giữ số hữu hạn ≥ 0, ép về nguyên đồng. */
function sanitizeMoneyRecord(rec: unknown): Record<string, number> {
  if (!rec || typeof rec !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
  }
  return out;
}

/** Bảng trọng số: chỉ giữ số hữu hạn > 0 (0/âm coi như không tham gia phần đó). */
function sanitizeWeightsRecord(rec: unknown): Record<string, number> {
  if (!rec || typeof rec !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}
