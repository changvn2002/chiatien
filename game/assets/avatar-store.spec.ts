// avatar-store.spec.ts — Test kho ảnh avatar trên máy (FIX-V3 N3):
// key riêng, tra theo member id, xoá từng người, dữ liệu hỏng → rỗng,
// toán cắt vuông ở giữa. Storage giả lập trong bộ nhớ — không trình duyệt.

import { describe, expect, it } from 'vitest';
import {
  AVATAR_STORE_KEY,
  centerSquareCrop,
  loadAvatarPhotos,
  parseAvatarStore,
  removeAvatarPhoto,
  setAvatarPhoto,
} from './avatar-store';
import type { AvatarStorageLike } from './avatar-store';

function fakeStorage(): AvatarStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

const PHOTO = 'data:image/jpeg;base64,AAAA';

describe('kho ảnh avatar — vòng đời trên máy', () => {
  it('lưu dưới đúng khoá riêng ct-game-avatars-v1, key theo member id', () => {
    const s = fakeStorage();
    setAvatarPhoto('m1', PHOTO, s);
    expect([...s.data.keys()]).toEqual([AVATAR_STORE_KEY]);
    expect(AVATAR_STORE_KEY).toBe('ct-game-avatars-v1');
    expect(loadAvatarPhotos(s).get('m1')).toBe(PHOTO);
  });

  it('tra theo member id: người có ảnh / người không có ảnh', () => {
    const s = fakeStorage();
    setAvatarPhoto('m1', PHOTO, s);
    const map = loadAvatarPhotos(s);
    expect(map.get('m1')).toBe(PHOTO);
    expect(map.get('m2')).toBeUndefined();
  });

  it('xoá ảnh chỉ xoá đúng người đó, người khác giữ nguyên', () => {
    const s = fakeStorage();
    setAvatarPhoto('m1', PHOTO, s);
    setAvatarPhoto('m2', PHOTO, s);
    removeAvatarPhoto('m1', s);
    const map = loadAvatarPhotos(s);
    expect(map.has('m1')).toBe(false);
    expect(map.get('m2')).toBe(PHOTO);
  });

  it('lưu đè ảnh mới cho cùng một người', () => {
    const s = fakeStorage();
    setAvatarPhoto('m1', PHOTO, s);
    const next = 'data:image/jpeg;base64,BBBB';
    setAvatarPhoto('m1', next, s);
    expect(loadAvatarPhotos(s).get('m1')).toBe(next);
  });

  it('không có storage (SSR) → map rỗng, không ném lỗi', () => {
    expect(loadAvatarPhotos(null).size).toBe(0);
    expect(() => setAvatarPhoto('m1', PHOTO, null)).not.toThrow();
  });
});

describe('parseAvatarStore — dữ liệu hỏng không làm sập', () => {
  it.each([null, '', '{hỏng', '[]', '"chuỗi"', '{"m1":123}', '{"m1":"không-phải-data-url"}'])(
    'raw %j → map rỗng',
    (raw) => {
      expect(parseAvatarStore(raw as string | null).size).toBe(0);
    },
  );

  it('chỉ giữ các giá trị data:image/* hợp lệ', () => {
    const map = parseAvatarStore(
      JSON.stringify({ m1: PHOTO, m2: 'x', m3: 'data:image/png;base64,CC' }),
    );
    expect(map.size).toBe(2);
    expect(map.get('m3')).toBe('data:image/png;base64,CC');
  });
});

describe('centerSquareCrop — cắt vuông ở giữa', () => {
  it('ảnh ngang 400×200 → vuông 200 ở giữa theo chiều ngang', () => {
    expect(centerSquareCrop(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 });
  });
  it('ảnh dọc 200×400 → vuông 200 ở giữa theo chiều dọc', () => {
    expect(centerSquareCrop(200, 400)).toEqual({ sx: 0, sy: 100, size: 200 });
  });
  it('ảnh vuông giữ nguyên; ảnh lẻ làm tròn xuống không âm', () => {
    expect(centerSquareCrop(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 });
    expect(centerSquareCrop(401, 200)).toEqual({ sx: 100, sy: 0, size: 200 });
  });
});
