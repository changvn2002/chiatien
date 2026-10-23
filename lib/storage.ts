import { sanitizeBankInfo, sanitizeSession } from './sanitize';
import type { ExpenseDraft } from './split';
import type { BankInfo, Session } from './types';

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
 *
 * Sổ ngân hàng per-device (DATA-04, 2026-10-23): thông tin ngân hàng của
 * thành viên KHÔNG nằm trong blob sessions nữa mà tách ra BANK_BOOK_KEY,
 * khoá theo (sessionId, memberId). Blob sessions luôn được ghi ở dạng đã
 * cắt bank (serializeSessions) nên mọi đường rò rỉ blob — sao lưu, xuất
 * dữ liệu, đối chiếu cross-tab — đều không mang theo số tài khoản. Dữ
 * liệu legacy (blob cũ còn chứa bank) được migration MỘT LẦN khi nạp:
 * bank được trích vào sổ, blob được ghi lại ở dạng sạch.
 */
export const STORAGE_KEY = 'chiatien:sessions:v1';

/** Khoá localStorage của sổ ngân hàng per-device — xem ghi chú DATA-04 ở trên. */
export const BANK_BOOK_KEY = 'chiatien:bank-book:v1';

/** Sổ ngân hàng: sessionId -> memberId -> thông tin ngân hàng của người đó. */
export type BankBook = Record<string, Record<string, BankInfo>>;

/** Một bản sao cuộc chia với bank đã bị cắt khỏi mọi thành viên (không mutate input). */
export function stripSessionBanks(session: Session): Session {
  return {
    ...session,
    members: session.members.map((m) => ({ id: m.id, name: m.name })),
  };
}

/** Trích sổ ngân hàng từ một danh sách cuộc chia (chỉ các thành viên CÓ bank). */
export function extractBankBook(sessions: Session[]): BankBook {
  const book: BankBook = Object.create(null) as BankBook;
  for (const s of sessions) {
    for (const m of s.members) {
      if (!m.bank) continue;
      let perSession = book[s.id];
      if (!perSession) {
        perSession = Object.create(null) as Record<string, BankInfo>;
        book[s.id] = perSession;
      }
      perSession[m.id] = { ...m.bank };
    }
  }
  return book;
}

/**
 * Gắn bank từ sổ vào các cuộc chia (theo sessionId + memberId). Trả về bản
 * sao mới — input không bị mutate. Thành viên không có entry trong sổ giữ
 * nguyên trạng (kể cả bank sẵn có trên member, nếu có).
 */
export function applyBankBook(sessions: Session[], book: BankBook): Session[] {
  return sessions.map((s) => {
    const perSession = book[s.id];
    if (!perSession) return { ...s, members: s.members.map((m) => ({ ...m })) };
    return {
      ...s,
      members: s.members.map((m) => {
        const bank = perSession[m.id];
        return bank ? { ...m, bank: { ...bank } } : { ...m };
      }),
    };
  });
}

/** Nạp sổ ngân hàng từ localStorage; dữ liệu hỏng/kiểu sai -> sổ rỗng, không throw. */
export function loadBankBook(): BankBook {
  const book: BankBook = Object.create(null) as BankBook;
  try {
    const raw = window.localStorage.getItem(BANK_BOOK_KEY);
    if (!raw) return book;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return book;
    for (const [sessionId, perSessionRaw] of Object.entries(parsed)) {
      if (!perSessionRaw || typeof perSessionRaw !== 'object') continue;
      const perSession: Record<string, BankInfo> = Object.create(null) as Record<string, BankInfo>;
      for (const [memberId, bankRaw] of Object.entries(perSessionRaw)) {
        const bank = sanitizeBankInfo(bankRaw);
        if (bank) perSession[memberId] = bank;
      }
      if (Object.keys(perSession).length > 0) book[sessionId] = perSession;
    }
    return book;
  } catch {
    return book;
  }
}

/** Ghi sổ ngân hàng — lỗi ghi (quota/private mode) được bỏ qua như mọi đường lưu khác. */
export function saveBankBook(book: BankBook): void {
  try {
    window.localStorage.setItem(BANK_BOOK_KEY, JSON.stringify(book));
  } catch {
    // Bỏ qua có chủ đích — cùng lý do với saveSessions: app vẫn chạy trong
    // phiên hiện tại, chỉ là bank không bền qua lần mở sau.
  }
}

/** Gộp hai sổ: entry của `override` thắng entry cùng (sessionId, memberId) của `base`. */
function mergeBankBooks(base: BankBook, override: BankBook): BankBook {
  const out: BankBook = Object.create(null) as BankBook;
  for (const source of [base, override]) {
    for (const [sessionId, perSession] of Object.entries(source)) {
      let target = out[sessionId];
      if (!target) {
        target = Object.create(null) as Record<string, BankInfo>;
        out[sessionId] = target;
      }
      for (const [memberId, bank] of Object.entries(perSession)) {
        target[memberId] = { ...bank };
      }
    }
  }
  return out;
}

export function loadSessions(): Session[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const sessionsRaw = (parsed as { sessions?: unknown }).sessions;
    if (!Array.isArray(sessionsRaw)) return [];
    const seenIds = new Set<string>();
    const sessions = sessionsRaw
      .map((s) => sanitizeSession(s, { allowEmptyMembers: true }))
      .filter((s): s is Session => s !== null)
      .filter((s) => {
        // Khử trùng id cuộc chia — giữ bản đầu tiên gặp (W2-F6).
        if (seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      });
    // DATA-04: bank trong blob (legacy) được trích vào sổ và thắng entry
    // sẵn có cho chính (session, member) đó; sổ là nguồn bank duy nhất
    // kể từ đây, blob được ghi lại ở dạng đã cắt bank (migration một lần).
    const fromBlob = extractBankBook(sessions);
    const hasLegacyBank = Object.keys(fromBlob).length > 0;
    const book = mergeBankBooks(loadBankBook(), fromBlob);
    if (hasLegacyBank) {
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeSessions(sessions));
        saveBankBook(book);
      } catch {
        // Migration lỗi (quota/private mode) thì bỏ qua — sessions trả về
        // dưới đây vẫn đúng; lần nạp sau sẽ thử migration lại.
      }
    }
    return applyBankBook(sessions, book);
  } catch {
    return [];
  }
}

/**
 * Dạng chuỗi chính xác được ghi vào localStorage cho một danh sách cuộc
 * chia: JSON của các cuộc chia ĐÃ CẮT bank (DATA-04) — bank chỉ sống
 * trong sổ ngân hàng (BANK_BOOK_KEY), không bao giờ nằm trong blob này.
 */
export function serializeSessions(sessions: Session[]): string {
  return JSON.stringify({ sessions: sessions.map(stripSessionBanks) });
}

/**
 * Cập nhật sổ ngân hàng theo danh sách cuộc chia sắp lưu: bank mới trong
 * tham số thắng; thành viên của một cuộc chia CÓ trong tham số mà không
 * còn bank nữa thì entry tương ứng bị xoá khỏi sổ (người dùng đã gỡ
 * bank); cuộc chia không có trong tham số giữ nguyên entry.
 */
function syncBankBookWithSessions(sessions: Session[]): void {
  const book = mergeBankBooks(loadBankBook(), extractBankBook(sessions));
  for (const s of sessions) {
    const perSession = book[s.id];
    if (!perSession) continue;
    for (const m of s.members) {
      if (!m.bank) delete perSession[m.id];
    }
  }
  saveBankBook(book);
}

export function saveSessions(sessions: Session[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeSessions(sessions));
    syncBankBookWithSessions(sessions);
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
    syncBankBookWithSessions(sessions);
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
