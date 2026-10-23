import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { newId } from './id';
import { sanitizeSessionDetailed, type SanitizeResult } from './sanitize';
import type { Session } from './types';

/**
 * Share link: toàn bộ một cuộc chia được nén (lz-string, tương thích URL)
 * vào hash của link — dạng https://chiatien-five.vercel.app/#chia=<data>.
 * Mở link là khôi phục nguyên cuộc chia để xem/sửa tiếp; dữ liệu KHÔNG đi qua
 * bất kỳ server nào (hash không được gửi lên server khi trình duyệt tải trang).
 *
 * Payload có version để sau này đổi format vẫn đọc được link cũ.
 * Dữ liệu giải mã từ link luôn qua lớp làm sạch nghiêm ngặt dùng chung ở
 * lib/sanitize.ts (cùng bộ quy tắc với localStorage) — link bị sửa tay
 * không thể tạo ra một cuộc chia lệch tiền.
 *
 * DATA-04 (BLOCKER kiến trúc, từ v2): thông tin ngân hàng của thành viên
 * KHÔNG BAO GIỜ nằm trong link chia sẻ — link bị chuyển tiếp/log/lưu ở bất
 * cứ đâu cũng không lộ số tài khoản của ai. Phòng thủ hai tầng:
 *  - Tầng ENCODE: payload v2 chỉ chứa members {id, name} — bank bị cắt
 *    trước khi nén, kể cả khi session truyền vào có bank.
 *  - Tầng DECODE: link v1 cũ (từng chứa bank) hoặc link bị sửa tay chèn
 *    bank đều bị sanitize với keepBank=false; SanitizeResult.strippedBank
 *    cho UI biết bank đã bị cắt để thông báo cho người nhận link.
 * Bank info sống trong "sổ ngân hàng" per-device (lib/storage.ts), khoá
 * theo (sessionId, memberId) — không đi theo link.
 */
const SHARE_PREFIX = 'chia=';
const SHARE_VERSION = 2;

/**
 * Trần độ dài mã share được chấp nhận giải mã (SEC-12.4): mã dài hơn bị
 * từ chối TRƯỚC khi giải nén để link quái vật không đốt CPU/bộ nhớ.
 */
export const MAX_SHARE_CODE_LENGTH = 200_000;

/** Trần độ dài chuỗi JSON sau giải nén — lớp thứ hai chống zip-bomb lz. */
const MAX_DECOMPRESSED_LENGTH = 2_000_000;

interface SharePayload {
  v: number;
  s: Session;
}

export function encodeSessionShare(session: Session): string {
  // DATA-04 tầng encode: bản sao session với members CHỈ còn {id, name}.
  const stripped: Session = {
    ...session,
    members: session.members.map((m) => ({ id: m.id, name: m.name })),
  };
  const payload: SharePayload = { v: SHARE_VERSION, s: stripped };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function buildShareUrl(session: Session): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${SHARE_PREFIX}${encodeSessionShare(session)}`;
}

const EMPTY_RESULT: SanitizeResult = { session: null, droppedExpenses: 0, strippedBank: false };

/**
 * Giải mã chuỗi share kèm số khoản chi đã bị lớp làm sạch loại bỏ;
 * dữ liệu hỏng/không đúng format -> session null (không throw).
 * Chấp nhận payload v1 (link cũ) và v2; MỌI đường đều sanitize với
 * keepBank=false nên bank không bao giờ lọt qua link vào app (DATA-04).
 */
export function decodeSessionShareWithReport(code: string): SanitizeResult {
  try {
    if (code.length > MAX_SHARE_CODE_LENGTH) return EMPTY_RESULT;
    const json = decompressFromEncodedURIComponent(code);
    if (!json) return EMPTY_RESULT;
    if (json.length > MAX_DECOMPRESSED_LENGTH) return EMPTY_RESULT;
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return EMPTY_RESULT;
    const payload = parsed as Partial<SharePayload>;
    if (payload.v !== 1 && payload.v !== SHARE_VERSION) return EMPTY_RESULT;
    return sanitizeSessionDetailed(payload.s, { keepBank: false });
  } catch {
    return EMPTY_RESULT;
  }
}

/** Giải mã chuỗi share; dữ liệu hỏng/không đúng format -> null (không throw). */
export function decodeSessionShare(code: string): Session | null {
  return decodeSessionShareWithReport(code).session;
}

/** Đọc cuộc chia từ location.hash hiện tại (kèm số khoản bị loại khi import). */
export function readShareFromHashWithReport(): SanitizeResult {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith(SHARE_PREFIX)) return EMPTY_RESULT;
  return decodeSessionShareWithReport(hash.slice(SHARE_PREFIX.length));
}

/** Đọc cuộc chia từ location.hash hiện tại (nếu có). */
export function readShareFromHash(): Session | null {
  return readShareFromHashWithReport().session;
}

/**
 * Gán id mới cho một cuộc chia được import — tránh đè lên cuộc chia sẵn có
 * trên máy người nhận khi hai máy tình cờ trùng id (và để người nhận có bản
 * riêng, sửa không ảnh hưởng bản của người gửi trên máy của họ).
 */
export function cloneForImport(session: Session): Session {
  const memberIdMap = new Map<string, string>();
  const members = session.members.map((m) => {
    const id = newId();
    memberIdMap.set(m.id, id);
    return { ...m, id };
  });
  const expenses = session.expenses.map((e) => ({
    ...e,
    id: newId(),
    payerId: memberIdMap.get(e.payerId) ?? e.payerId,
    participantIds: e.participantIds.map((id) => memberIdMap.get(id) ?? id),
    custom: remapRecord(e.custom, memberIdMap),
    weights: remapRecord(e.weights, memberIdMap),
  }));
  const now = Date.now();
  return { ...session, id: newId(), members, expenses, createdAt: now, updatedAt: now };
}

function remapRecord(
  rec: Record<string, number>,
  map: Map<string, string>,
): Record<string, number> {
  // Object.create(null) như mọi bảng theo member id khác (W2-F1): khoá cũ
  // trong bảng custom/weights có thể là id nguy hiểm kiểu "__proto__" —
  // gán vào object thường sẽ làm rơi phần tiền đó khi import.
  const out: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [k, v] of Object.entries(rec)) out[map.get(k) ?? k] = v;
  return out;
}
