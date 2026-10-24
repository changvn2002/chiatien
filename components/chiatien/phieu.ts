import { formatVND } from '@/lib/money';
import type { Session, Transfer } from '@/lib/types';

/**
 * Lớp PHIẾU GẤP — trình diễn thuần ở tầng component (đợt v1.8.0).
 *
 * BẤT BIẾN NGHỊM THU SỐ 1 (Test Tắt Game): module này KHÔNG đụng tới
 * lib/ (settle/split/share/vietqr/money chỉ được ĐỌC qua các hàm đã có),
 * KHÔNG đổi Session/schema/payload. Mọi trạng thái của lớp phiếu (dấu
 * bản, phiếu đã mở, tắt theo phiên) sống ở localStorage với khoá riêng
 * có tiền tố `chiatien:phieu-*`, không bao giờ đi vào share payload.
 * Tắt/không bật lớp này => mọi đầu ra của engine + payload giữ nguyên
 * từng byte như v1.7.2 (chứng minh bằng phieu.spec.tsx trên corpus).
 */

/* ------------------------------------------------------------------ */
/* Dấu bản (§1.3/§1.7): «chốt lúc HH:MM · bản N» — đếm local theo      */
/* sessionId, giờ = giờ máy lúc chốt, KHÔNG vào payload/link.          */
/* ------------------------------------------------------------------ */

export interface SealMark {
  /** Số bản: bản đầu = 1; sửa NỘI DUNG phiên rồi chốt lại -> +1. */
  version: number;
  /** Mốc giờ máy lúc chốt (epoch ms) — chỉ HIỂN THỊ HH:MM. */
  sealedAt: number;
  /**
   * Vân tay nội dung của phiên tại lần chốt gần nhất — mốc phát hiện
   * «đã sửa». KHÔNG dùng session.updatedAt: lib/sanitize.ts ghi
   * updatedAt = Date.now() ở MỌI lần nạp (hành vi có sẵn của app), nên
   * updatedAt đổi cả khi không ai sửa gì. Vân tay chỉ phủ đúng phần nội
   * dung đi vào payload (title + members {id,name} + expenses).
   */
  contentKey: string;
}

/** Vân tay nội dung payload của phiên (FNV-1a trên JSON đã rút gọn). */
export function sessionContentKey(session: Session): string {
  const payloadContent = JSON.stringify({
    t: session.title,
    m: session.members.map((m) => [m.id, m.name]),
    e: session.expenses,
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < payloadContent.length; i++) {
    hash ^= payloadContent.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Vân tay NỘI DUNG của một phiên để dedupe khi import link (MINOR-2,
 * Panel #07): cloneForImport cấp id MỚI cho phiên/thành viên/khoản chi
 * ở mỗi lần import, nên sessionContentKey (vốn phủ id) không bao giờ
 * khớp giữa hai lần mở cùng một link. Vân tay này thay mọi id bằng
 * TÊN của thành viên tương ứng (payer/participants/custom/weights đều
 * tra theo tên) — hai lần import cùng một link cho cùng một vân tay,
 * và một phiên đã có trên máy với đúng nội dung đó cũng khớp. Giới
 * hạn khai thật: hai thành viên trùng tên trong cùng phiên thì các
 * khoản gắn với họ không phân biệt được ở vân tay này (app vẫn cho
 * phép trùng tên) — dedupe khi đó có thể gộp nhầm; chấp nhận vì link
 * trùng hệt là ca phổ biến cần chặn.
 */
export function importLinkFingerprint(session: Session): string {
  const nameById = new Map(session.members.map((m) => [m.id, m.name]));
  const byName = (rec: Record<string, number>) =>
    Object.entries(rec)
      .map(([id, v]) => [nameById.get(id) ?? id, v] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
  const canonical = JSON.stringify({
    t: session.title,
    m: session.members.map((m) => m.name),
    e: session.expenses.map((e) => ({
      t: e.title,
      a: e.amount,
      p: nameById.get(e.payerId) ?? e.payerId,
      ps: e.participantIds.map((id) => nameById.get(id) ?? id),
      mode: e.mode,
      c: byName(e.custom),
      w: byName(e.weights),
    })),
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

const SEAL_KEY_PREFIX = 'chiatien:phieu-seal:v1:';
const OPENED_KEY_PREFIX = 'chiatien:phieu-opened:v1:';
const OFF_KEY = 'chiatien:phieu-off:v1';

export function sealKey(sessionId: string): string {
  return `${SEAL_KEY_PREFIX}${sessionId}`;
}

export function openedKey(sessionId: string): string {
  return `${OPENED_KEY_PREFIX}${sessionId}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bỏ qua có chủ đích: lớp phiếu là trình diễn — mất trạng thái local
    // chỉ đưa phiếu về dạng đóng / dấu bản về bản 1, không chạm dữ liệu.
  }
}

/** Đọc dấu bản local của một phiên (null = phiên chưa từng chốt trên máy này). */
export function loadSeal(sessionId: string): SealMark | null {
  if (typeof window === 'undefined') return null;
  const raw = readJson<Partial<SealMark>>(sealKey(sessionId));
  if (
    !raw ||
    typeof raw.version !== 'number' ||
    typeof raw.sealedAt !== 'number' ||
    typeof raw.contentKey !== 'string'
  ) {
    return null;
  }
  return { version: raw.version, sealedAt: raw.sealedAt, contentKey: raw.contentKey };
}

/**
 * Chốt một bản cho phiên tại thời điểm `now`:
 * - Chưa từng chốt -> bản 1.
 * - Đã chốt và phiên ĐÃ SỬA kể từ lần chốt trước (updatedAt lớn hơn mốc
 *   đã ghi) -> bản N+1 (thấy rõ là bản mới hơn).
 * - Chốt lại mà phiên chưa sửa -> giữ nguyên N, chỉ cập nhật giờ chốt.
 * Ghi local + trả về dấu vừa chốt để copy text / thẻ dùng ngay cùng một dấu.
 */
/** Dấu bản sẽ được dùng nếu chốt ngay lúc `now` — KHÔNG ghi local. */
export function previewSeal(session: Session, now: number): SealMark {
  const prev = loadSeal(session.id);
  const key = sessionContentKey(session);
  if (prev === null) return { version: 1, sealedAt: now, contentKey: key };
  return prev.contentKey !== key
    ? { version: prev.version + 1, sealedAt: now, contentKey: key }
    : { ...prev, sealedAt: now };
}

/** Ghi một dấu bản đã tính (chỉ gọi khi hành động chốt/copy thật sự thành công). */
export function persistSeal(sessionId: string, seal: SealMark): void {
  writeJson(sealKey(sessionId), seal);
}

export function sealSession(session: Session, now: number): SealMark {
  const next = previewSeal(session, now);
  persistSeal(session.id, next);
  return next;
}

/**
 * Dấu bản của một LINK vừa được import trên máy nhận: payload không mang
 * số bản của người gửi (§1.7 — đếm local, không vào schema), nên máy nhận
 * chỉ ghi được «bản của link này trên máy này» = bản 1, giờ là mốc của
 * bản sao import (cloneForImport đóng updatedAt = lúc nhập). KHÔNG bịa
 * số bản của người gửi.
 */
export function ensureImportedSeal(session: Session): SealMark {
  const prev = loadSeal(session.id);
  if (prev) return prev;
  const seal: SealMark = {
    version: 1,
    sealedAt: session.updatedAt,
    contentKey: sessionContentKey(session),
  };
  writeJson(sealKey(session.id), seal);
  return seal;
}

/** «HH:MM» theo giờ máy từ epoch ms. */
export function formatSealTime(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Cụm dấu bản dùng thống nhất ở thẻ hoàn tất / copy text của NGƯỜI GỬI: «chốt lúc 20:42 · bản 2». */
export function sealLabel(seal: SealMark): string {
  return `chốt lúc ${formatSealTime(seal.sealedAt)} · bản ${seal.version}`;
}

/**
 * Dấu bản phía LINK (lớp 1, máy người nhận): payload không mang giờ
 * chốt của người gửi (§1.7) nên lớp 1 KHÔNG BAO GIỜ nói «chốt lúc» —
 * mốc giờ duy nhất máy nhận có là giờ import của chính nó, gắn nhãn
 * giờ chốt là khẳng định sai (Panel #07, S-1 SERIOUS). Lớp 1 chỉ
 * ghi số bản của bản sao trên máy này.
 */
export function linkSealLabel(seal: SealMark): string {
  return `bản ${seal.version} của link này`;
}

/* ------------------------------------------------------------------ */
/* Copy text mặc định (§4): CHỈ tóm tắt trung tính + link.             */
/* ------------------------------------------------------------------ */

/**
 * Text mặc định DUY NHẤT của Copy/Chia sẻ (cả chế độ phiếu lẫn tĩnh):
 * «Chia Tiền — phiên “[Tên]”: Tổng X ₫ · N lần chuyển. Mở link để xem
 * phần của bạn và mã QR. (Chốt lúc HH:MM · bản N)» + link ở dòng riêng.
 * Không chuỗi mũi tên, không số của bất kỳ cá nhân nào.
 */
export function buildSummaryShareText(
  session: Session,
  transfers: Transfer[],
  seal: SealMark,
  shareUrl?: string,
): string {
  const total = session.expenses.reduce((s, e) => s + e.amount, 0);
  const base = `Chia Tiền — phiên “${session.title}”: Tổng ${formatVND(total)} · ${transfers.length} lần chuyển. Mở link để xem phần của bạn và mã QR. (Chốt lúc ${formatSealTime(seal.sealedAt)} · bản ${seal.version})`;
  return shareUrl ? `${base}\n${shareUrl}` : base;
}

/** Dòng trạng thái trên thẻ hoàn tất (§4): chủ ngữ = phiên, dấu giờ/bản nằm trong dòng. */
export function completionStatusLine(
  session: Session,
  transfers: Transfer[],
  seal: SealMark,
): string {
  const total = session.expenses.reduce((s, e) => s + e.amount, 0);
  return `Phiên “${session.title}” đã ${sealLabel(seal)}. Tổng ${formatVND(total)} · ${transfers.length} lần chuyển.`;
}

/** Dòng tóm tắt lớp 1 của link (§4): cùng cấu trúc với thẻ hoàn tất,
 * nhưng dấu bản dùng linkSealLabel — không giờ, không «chốt lúc». */
export function layer1SummaryLine(session: Session, transfers: Transfer[], seal: SealMark): string {
  const total = session.expenses.reduce((s, e) => s + e.amount, 0);
  return `Phiên “${session.title}” · ${linkSealLabel(seal)}. Tổng ${formatVND(total)} · ${transfers.length} lần chuyển.`;
}

/* ------------------------------------------------------------------ */
/* Điều kiện bật/tắt (§3)                                              */
/* ------------------------------------------------------------------ */

/**
 * Từ khoá bối cảnh trong tên phiên -> tự về tĩnh (§3). Hàng rào yếu hai
 * chiều (spec khai đúng mức): chỉ là lớp phụ bên cạnh lựa chọn tay của
 * người tổ chức; khớp = chứa chuỗi con sau khi hạ chữ thường.
 */
export const STATIC_TITLE_KEYWORDS: readonly string[] = [
  'giỗ',
  'phúng',
  'tang',
  'thăm bệnh',
  'quyên góp',
  'hỗ trợ',
  'viện phí',
];

export function titleForcesStatic(title: string): boolean {
  const lower = title.toLocaleLowerCase('vi-VN');
  return STATIC_TITLE_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * «Nhớ lựa chọn» (§3): CHỈ nhớ trạng thái TẮT. Danh sách sessionId đã bị
 * tắt tường minh trên máy này. Trạng thái BẬT không bao giờ được ghi —
 * mỗi phiên mở ra luôn khởi đầu TẮT trừ khi người tổ chức bật trong
 * chính lần mở đó (state trong bộ nhớ của SessionView).
 */
export function loadPhieuOffIds(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = readJson<unknown>(OFF_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

export function rememberPhieuOff(sessionId: string): void {
  const ids = loadPhieuOffIds();
  if (!ids.includes(sessionId)) writeJson(OFF_KEY, [...ids, sessionId]);
}

/* ------------------------------------------------------------------ */
/* Trạng thái phiếu đã mở — local theo sessionId, không vào link (§2)  */
/* ------------------------------------------------------------------ */

export function loadOpenedSlips(sessionId: string): string[] {
  if (typeof window === 'undefined') return [];
  const raw = readJson<unknown>(openedKey(sessionId));
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

export function saveOpenedSlips(sessionId: string, memberIds: string[]): void {
  writeJson(openedKey(sessionId), memberIds);
}

/* ------------------------------------------------------------------ */
/* Bộ từ cấm V-05 (§4) — dùng cho test rà soát mọi copy mới.            */
/* ------------------------------------------------------------------ */

export const BANNED_WORDS: readonly string[] = [
  'trúng',
  'thua',
  'cược',
  'hên xui',
  'vận may',
  'ăn cả',
  'thử vận',
  'gỡ',
  'quay thưởng',
  'trúng thưởng',
  'jackpot',
  'con nợ',
  'bao thủ',
];

/** Layout nhóm đông (§6): ngưỡng phiếu chưa mở còn giữ dạng lưới chuyển động. */
export const SLIP_GRID_ANIMATED_MAX = 8;
