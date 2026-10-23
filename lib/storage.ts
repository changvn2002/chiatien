import { sanitizeSession } from './sanitize';
import type { ExpenseDraft } from './split';
import type { Session } from './types';

/**
 * Lưu toàn bộ các cuộc chia vào localStorage của trình duyệt.
 * App không có backend — dữ liệu của người dùng nằm trên chính máy họ,
 * và share link (lib/share.ts) là cách mang một cuộc chia sang máy khác.
 *
 * Khi nạp lại, mọi cuộc chia đều qua CÙNG lớp làm sạch nghiêm ngặt với
 * đường share link (lib/sanitize.ts): dữ liệu bị hỏng/bị can thiệp trong
 * máy không thể lọt vào tính toán quyết toán. Khác biệt duy nhất: phiên
 * mới tạo chưa có thành viên vẫn được giữ (allowEmptyMembers).
 *
 * Đợt vá theo test W5/W2 (2026-10-23):
 *  - loadSessions khử trùng id cuộc chia (bản đầu thắng): hai cuộc chia
 *    trùng id trong máy từng được nạp cả hai, khiến thao tác sửa/xoá theo
 *    id mơ hồ (W2-F6).
 *  - Chống mất dữ liệu khi mở nhiều tab (W5-02): app.tsx nghe sự kiện
 *    `storage` trên STORAGE_KEY và đối chiếu với serializeSessions của
 *    lần ghi gần nhất của chính tab đó — khác nhau nghĩa là tab khác vừa
 *    ghi, phải nạp lại bản mới nhất + báo cho người dùng thay vì để state
 *    cũ ghi đè im lặng.
 *  - Draft khoản chi đang nhập được giữ riêng theo (cuộc chia, khoản chi)
 *    để reload trang không làm mất nội dung đang gõ (W5-06 / backlog F4).
 */
export const STORAGE_KEY = 'chiatien:sessions:v1';

export function loadSessions(): Session[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const sessions = (parsed as { sessions?: unknown }).sessions;
    if (!Array.isArray(sessions)) return [];
    const seenIds = new Set<string>();
    return sessions
      .map((s) => sanitizeSession(s, { allowEmptyMembers: true }))
      .filter((s): s is Session => s !== null)
      .filter((s) => {
        // Khử trùng id cuộc chia — giữ bản đầu tiên gặp (W2-F6).
        if (seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      });
  } catch {
    return [];
  }
}

/** Dạng chuỗi chính xác được ghi vào localStorage cho một danh sách cuộc chia. */
export function serializeSessions(sessions: Session[]): string {
  return JSON.stringify({ sessions });
}

export function saveSessions(sessions: Session[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeSessions(sessions));
  } catch {
    // localStorage đầy hoặc bị chặn (private mode) — app vẫn chạy trong phiên
    // hiện tại, chỉ không bền qua lần mở sau. Không nuốt lỗi im lặng ở UI:
    // app.tsx kiểm tra ghi được hay không qua trySaveSessions.
  }
}

/** Ghi và báo thành công hay không để UI cảnh báo khi không lưu bền được. */
export function trySaveSessions(sessions: Session[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeSessions(sessions));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Draft khoản chi đang nhập (W5-06 / backlog F4)                      */
/* ------------------------------------------------------------------ */

const DRAFT_KEY_PREFIX = 'chiatien:expense-draft:v1:';

/**
 * Khoá lưu draft cho form khoản chi của một cuộc chia; expenseId = null là
 * form "thêm khoản mới", có id là form sửa khoản đó. Mỗi form một draft
 * riêng — đang sửa khoản A không đè lên bản nháp của khoản B.
 */
export function expenseDraftKey(sessionId: string, expenseId: string | null): string {
  return `${DRAFT_KEY_PREFIX}${sessionId}:${expenseId ?? 'new'}`;
}

/**
 * Nạp draft đã lưu; dữ liệu hỏng/kiểu sai -> null (form dùng giá trị ban
 * đầu như chưa từng có draft). Draft là dữ liệu do chính app ghi, nhưng
 * vẫn kiểm kiểu từng trường vì localStorage có thể bị can thiệp — một
 * draft hỏng không bao giờ được phép làm hỏng form.
 */
export function loadExpenseDraft(key: string): ExpenseDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const d = parsed as Partial<ExpenseDraft>;
    return {
      title: typeof d.title === 'string' ? d.title : '',
      amount: typeof d.amount === 'number' && Number.isFinite(d.amount) ? d.amount : 0,
      payerId: typeof d.payerId === 'string' ? d.payerId : '',
      participantIds: Array.isArray(d.participantIds)
        ? d.participantIds.filter((id): id is string => typeof id === 'string')
        : [],
      mode: d.mode === 'custom' || d.mode === 'shares' || d.mode === 'equal' ? d.mode : 'equal',
      custom: sanitizeDraftRecord(d.custom),
      weights: sanitizeDraftRecord(d.weights),
    };
  } catch {
    return null;
  }
}

/** Ghi draft — lỗi ghi (quota/private mode) được bỏ qua: draft chỉ là lớp tiện ích giữ hộ nội dung đang nhập, mất draft không được phép làm sập thao tác chính của app. */
export function saveExpenseDraft(key: string, draft: ExpenseDraft): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Bỏ qua có chủ đích — xem ghi chú ở trên.
  }
}

/** Xoá draft khi khoản chi đã lưu thành công hoặc người dùng bấm Huỷ. */
export function clearExpenseDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Bỏ qua có chủ đích — cùng lý do với saveExpenseDraft.
  }
}

/** Bảng số trong draft: chỉ giữ giá trị số hữu hạn theo member id. */
function sanitizeDraftRecord(rec: unknown): Record<string, number> {
  const out: Record<string, number> = Object.create(null) as Record<string, number>;
  if (!rec || typeof rec !== 'object') return out;
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}
