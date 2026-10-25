// avatar-store.ts — Kho ẢNH AVATAR CHỤP của game mode «Ai Đãi»
// (đợt FIX-V3, mục N3 — lane F).
//
// KỶ LUẬT RIÊNG TƯ CỨNG (DATA-04, SPEC §M1/M2 cùng nguyên tắc):
// - Ảnh CHỈ được xử lý và lưu TRÊN THIẾT BỊ này: cắt vuông tại client
//   (canvas, trong màn chọn nhân vật), lưu vào localStorage dưới khoá
//   RIÊNG `ct-game-avatars-v1`, key theo member id của phiên.
// - Kho này TÁCH HẲN khỏi kho ván `chiatien-game-v1` (game/store.ts):
//   ảnh KHÔNG vào bản ghi ván / event log / paramsHash / seed, KHÔNG
//   vào share payload, KHÔNG fetch/upload đi bất kỳ đâu.
// - Mọi bề mặt cần ảnh (M3, màn gán nhân vật, M5, M7, PlayerView cho
//   scene) đều TRA kho này theo member id TẠI LÚC HIỂN THỊ / lúc bắt
//   đầu ván / lúc phát lại M8 — không sao chép ảnh vào dữ liệu ván.
// - Xoá ảnh = xoá key của member đó khỏi kho này; không ảnh → các bề
//   mặt tự rơi về GameBadge (DiceBear initials) như trước.

/** Khoá localStorage riêng của kho ảnh avatar — KHÔNG dùng chung khoá với store.ts. */
export const AVATAR_STORE_KEY = 'ct-game-avatars-v1';

/** Cạnh (px) của ảnh avatar đã cắt vuông lưu trong kho — đủ nét cho badge lớn nhất (M7, 56px @2x–3x). */
export const AVATAR_PHOTO_SIZE = 256;

/** Map memberId → data URL (JPEG) của ảnh đã cắt vuông. */
export type AvatarPhotoMap = ReadonlyMap<string, string>;

/** Interface tối thiểu của storage — để test thuần không cần trình duyệt. */
export interface AvatarStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): AvatarStorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Giải mã nội dung thô của kho → map. Dữ liệu hỏng / sai dạng → map rỗng (không ném lỗi). */
export function parseAvatarStore(raw: string | null): Map<string, string> {
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
    const out = new Map<string, string>();
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.startsWith('data:image/')) out.set(key, value);
    }
    return out;
  } catch {
    return new Map();
  }
}

/** Đọc toàn bộ kho ảnh trên máy. Không có storage (SSR/test) → map rỗng. */
export function loadAvatarPhotos(
  storage: AvatarStorageLike | null = defaultStorage(),
): Map<string, string> {
  if (!storage) return new Map();
  try {
    return parseAvatarStore(storage.getItem(AVATAR_STORE_KEY));
  } catch {
    return new Map();
  }
}

function saveAvatarPhotos(map: Map<string, string>, storage: AvatarStorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(AVATAR_STORE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    // Hết quota / chế độ riêng tư: ảnh chỉ mất tính bền qua reload,
    // ván đang mở không bị chặn (cùng kỷ luật suy biến của store.ts).
  }
}

/** Lưu (hoặc thay) ảnh của một thành viên. Trả map mới để phía React cập nhật state. */
export function setAvatarPhoto(
  memberId: string,
  dataUrl: string,
  storage: AvatarStorageLike | null = defaultStorage(),
): Map<string, string> {
  const map = loadAvatarPhotos(storage);
  map.set(memberId, dataUrl);
  saveAvatarPhotos(map, storage);
  return map;
}

/** Xoá ảnh của một thành viên («Xoá ảnh» ở UI). Trả map mới. */
export function removeAvatarPhoto(
  memberId: string,
  storage: AvatarStorageLike | null = defaultStorage(),
): Map<string, string> {
  const map = loadAvatarPhotos(storage);
  map.delete(memberId);
  saveAvatarPhotos(map, storage);
  return map;
}

/** Tra ảnh của một thành viên tại lúc hiển thị — undefined khi chưa có ảnh. */
export function avatarPhotoOf(map: AvatarPhotoMap, memberId: string): string | undefined {
  return map.get(memberId);
}

/**
 * Hình vuông cắt ở GIỮA của một ảnh nguồn (toán thuần cho bước cắt
 * trên canvas): trả vùng nguồn {sx, sy, size} để vẽ vào canvas vuông
 * AVATAR_PHOTO_SIZE × AVATAR_PHOTO_SIZE.
 */
export function centerSquareCrop(
  sourceWidth: number,
  sourceHeight: number,
): { sx: number; sy: number; size: number } {
  const size = Math.max(1, Math.min(sourceWidth, sourceHeight));
  return {
    sx: Math.max(0, Math.floor((sourceWidth - size) / 2)),
    sy: Math.max(0, Math.floor((sourceHeight - size) / 2)),
    size,
  };
}
