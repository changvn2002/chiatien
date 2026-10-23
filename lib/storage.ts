import { sanitizeSession } from './sanitize';
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
 */
const STORAGE_KEY = 'chiatien:sessions:v1';

export function loadSessions(): Session[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const sessions = (parsed as { sessions?: unknown }).sessions;
    if (!Array.isArray(sessions)) return [];
    return sessions
      .map((s) => sanitizeSession(s, { allowEmptyMembers: true }))
      .filter((s): s is Session => s !== null);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }));
  } catch {
    // localStorage đầy hoặc bị chặn (private mode) — app vẫn chạy trong phiên
    // hiện tại, chỉ không bền qua lần mở sau. Không nuốt lỗi im lặng ở UI:
    // app.tsx kiểm tra ghi được hay không qua trySaveSessions.
  }
}

/** Ghi và báo thành công hay không để UI cảnh báo khi không lưu bền được. */
export function trySaveSessions(sessions: Session[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }));
    return true;
  } catch {
    return false;
  }
}
