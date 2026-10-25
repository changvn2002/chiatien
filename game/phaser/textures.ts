// textures.ts — Avatar DiceBear `initials` cho lớp diễn Phaser.
//
// CƠ CHẾ (đúng kỷ luật avatar của app — addendum v1.1 §5 + ui-bits.tsx):
// sinh SVG tại client bằng @dicebear/core + @dicebear/collection từ
// tên của người chơi, KHÔNG gọi HTTP API, chạy offline.
//
// GLYPH (đợt FIX-V3, P0.4 — khoá một nguồn danh tính duy nhất): glyph
// trên texture LUÔN bằng initialsOf của lib/identity, theo ĐÚNG cơ chế
// app chính (components/chiatien/ui-bits.tsx): seed = memberNameKey
// của tên, và khi tên chuẩn hoá có đúng 1 từ thì truyền `chars: 1` —
// DiceBear mặc định lấy 2 ký tự đầu của từ duy nhất («Bình» → «BÌ»),
// chars: 1 ép về 1 ký tự («B») khớp initialsOf. Đường fallback (chữ
// Phaser Text dưới avatar) dùng initialsOfName ở file này, nay là
// delegate trực tiếp sang initialsOf của lib — không còn bản rút gọn
// cục bộ lệch quy tắc.
//
// ĐƯỜNG CHÍNH: SVG → data-URL → HTMLImageElement → vẽ vào canvas 96×96 có
// clip tròn → `textures.addCanvas` thành texture Phaser. Việc «nướng» hình
// tròn vào texture (thay vì geometry mask) là có chủ đích: mask của Phaser
// không đi theo container khi nhân vật di chuyển (lao đòn ở G1), còn texture
// đã clip thì đi theo mọi transform.
//
// FALLBACK (ghi rõ theo hợp đồng lane): nếu sinh SVG lỗi, tải ảnh lỗi, hoặc
// canvas lỗi → scene giữ lớp fallback đã dựng sẵn bên dưới avatar: vòng tròn
// màu áo (Graphics) + chữ initials bằng Phaser Text (initialsOfName ở file
// này). Fallback luôn được dựng TRƯỚC; khi texture sẵn sàng, scene đặt
// Image lên trên và ẩn chữ initials. Không có đường nào làm scene chết vì
// avatar.
//
// MÀU NỀN của texture = player.colorHex, tức strongHex từ identity map
// duy nhất (game/assets/identity.ts, tính trên roster đầy đủ của
// phiên) do entry truyền vào PlayerView — file này không tự gán màu.

import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { initialsOf, memberNameKey, normalizeMemberName } from '@/lib/identity';
import { glyphHexForDiscHex } from '../assets/identity';
import type Phaser from 'phaser';
import type { PlayerView } from './bridge';

export const AVATAR_TEXTURE_SIZE = 96;

export function avatarTextureKey(playerId: string): string {
  return `aidai-avatar-${playerId}`;
}

/**
 * Initials cho lớp fallback — delegate TRỰC TIẾP sang initialsOf của
 * lib/identity (nguồn luật duy nhất: chữ đầu từ đầu + chữ đầu từ cuối,
 * giữ dấu phụ; tên một từ → một ký tự). Tên rỗng → '?' để fallback
 * vẫn có glyph hiển thị (initialsOf trả '' cho tên rỗng).
 */
export function initialsOfName(name: string): string {
  return initialsOf(name) || '?';
}

/**
 * Tham số DiceBear cho avatar của một người — ĐÚNG cơ chế ui-bits.tsx
 * của app chính, để glyph sinh ra luôn bằng initialsOf(tên):
 * seed = memberNameKey(tên); nền = ĐÚNG một màu được truyền vào
 * (strongHex của identity map, dạng hex có '#'); màu chữ theo bảng
 * glyph GLYPH_HEX_BY_COLOR_INDEX qua glyphHexForDiscHex (A11Y-FIX,
 * SPEC A11Y-FIX §4) — trắng hoặc mực #212121 tuỳ đĩa, màu nào cho tỉ
 * lệ tương phản WCAG cao hơn trên đĩa đó (trước đây ghim mực cho mọi
 * đĩa, chỉ đạt 1,62–1,87:1 trên các đĩa tối); tên chuẩn hoá đúng 1 từ
 * → `chars: 1` (khử glyph 2 ký tự mặc định kiểu «BÌ» / «DŨ» / «GI»
 * cắt giữa âm tiết).
 */
export function avatarDiceBearOptions(name: string, backgroundHex: string) {
  const wordCount = normalizeMemberName(name).split(' ').filter(Boolean).length;
  return {
    seed: memberNameKey(name),
    backgroundColor: [backgroundHex.replace('#', '')],
    textColor: [glyphHexForDiscHex(backgroundHex).replace('#', '')],
    fontFamily: ['Be Vietnam Pro', 'sans-serif'],
    fontWeight: 700,
    fontSize: 46,
    ...(wordCount === 1 ? { chars: 1 } : {}),
  };
}

function svgToDataUrl(svg: string): string {
  const cleaned = svg
    // Bỏ khối <metadata> RDF của DiceBear (như app đã làm ở ui-bits.tsx) —
    // giữ nguyên mọi byte hình/glyph/màu còn lại.
    .replace(/<metadata[\s\S]*?<\/metadata>/, '')
    // SVG của DiceBear không có width/height tuyệt đối; một số trình duyệt
    // không raster hoá được <img> SVG thiếu kích thước → gắn 96×96.
    .replace(/<svg/, `<svg width="${AVATAR_TEXTURE_SIZE}" height="${AVATAR_TEXTURE_SIZE}"`);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
}

/**
 * Nạp texture avatar cho một người chơi. Bất đồng bộ: gọi `onReady(key)`
 * khi texture đã có trong Texture Manager; nếu mọi đường đều hỏng thì
 * KHÔNG gọi onReady (scene giữ fallback). An toàn khi scene đã shutdown:
 * mọi truy cập textures đều bọc try/catch và kiểm tra `textures.exists`.
 */
export function loadAvatarTexture(
  scene: Phaser.Scene,
  player: PlayerView,
  onReady: (textureKey: string) => void,
): void {
  const key = avatarTextureKey(player.id);
  try {
    if (scene.textures.exists(key)) {
      onReady(key);
      return;
    }
  } catch {
    return;
  }

  let svg: string;
  try {
    const options = avatarDiceBearOptions(player.name || player.diceBearSeed, player.colorHex);
    svg = createAvatar(initials, {
      ...options,
      // Tên trống (dữ liệu lạ): giữ seed ổn định theo id như trước để
      // avatar vẫn tất định; trường hợp thường seed đã là nameKey.
      seed: options.seed || player.diceBearSeed,
    }).toString();
  } catch {
    return; // Giữ fallback.
  }

  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_TEXTURE_SIZE;
      canvas.height = AVATAR_TEXTURE_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const half = AVATAR_TEXTURE_SIZE / 2;
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, AVATAR_TEXTURE_SIZE, AVATAR_TEXTURE_SIZE);
      if (!scene.textures.exists(key)) {
        scene.textures.addCanvas(key, canvas);
      }
      onReady(key);
    } catch {
      // Giữ fallback.
    }
  };
  img.onerror = () => {
    // Giữ fallback — không log ồn, không ném lỗi.
  };
  img.src = svgToDataUrl(svg);
}
