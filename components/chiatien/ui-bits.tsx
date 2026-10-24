'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { memberNameKey, normalizeMemberName } from '@/lib/identity';
import { cn } from '@/lib/utils';
import { IconWifiOff } from './icons';

/* ------------------------------------------------------------------ */
/* Avatar DiceBear — style `initials`, sinh 100% tại client (offline), */
/* KHÔI PHỤC theo lệnh override của user 2026-10-24 (luật thường trực: */
/* avatar mặc định ở mọi project dùng thư viện DiceBear — @dicebear/   */
/* core + @dicebear/collection, seed tất định, KHÔNG qua HTTP API).    */
/*                                                                     */
/* REDESIGN-V4 (V-11.5, COLOR-SYSTEM §4): bảng nền MỚI = bậc 100 của   */
/* 16 họ Material công bố (tokens.json `avatar-backgrounds`, thứ tự    */
/* key amber→yellow ở AVATAR_BACKGROUNDS_V4 dưới đây); chữ initials   */
/* LUÔN là mực Grey 900 #212121 trên mọi nền (đo 9,75–15,03, đạt       */
/* 16/16 — quy tắc 900-cùng-họ của V3 đã bị veto và chết); font của    */
/* initials = Be Vietnam Pro 700 (TYPE-AND-ICON §1: initials dùng     */
/* BVP 700, cấm Archivo/Inter cho initials).                           */
/*                                                                     */
/* BẤT BIẾN M-2 (lib/identity.ts ĐÓNG BĂNG): màu của một người CHỈ    */
/* phụ thuộc nameKey — assignIdentityColors ở tầng dữ liệu cho chỉ số  */
/* 0..11, component tra chỉ số đó vào bảng nền V4 này (bảng sống ở     */
/* tầng component, lib không đổi một byte). Component truyền vào       */
/* DiceBear đúng MỘT phần tử backgroundColor = ô đã gán — DiceBear     */
/* KHÔNG tự chọn màu theo seed từ cả palette. seed = memberNameKey.    */
/*                                                                     */
/* Glyph: getInitials của @dicebear/initials lấy chữ đầu của từ đầu +  */
/* từ cuối (giữ dấu tiếng Việt, viết hoa). CHÊNH LỆCH đã đo: tên MỘT  */
/* từ thì DiceBear mặc định lấy 2 ký tự đầu («Bình» → BÌ) còn          */
/* initialsOf chỉ lấy 1 («B») — khử bằng option `chars: 1` khi tên     */
/* chuẩn hoá có đúng 1 từ, để glyph luôn bằng initialsOf(name).         */
/*                                                                     */
/* Render bằng SVG INLINE trong DOM (createAvatar(...).toString() qua */
/* dangerouslySetInnerHTML), KHÔNG <img>/data URI/HTTP. Tĩnh tuyệt     */
/* đối: 0 animation/transition trên avatar. aria-hidden ở CẢ span bọc  */
/* lẫn <svg> gốc (Panel #04 F-R2-02 giữ).                              */
/* ------------------------------------------------------------------ */

/**
 * Bảng nền avatar V4 — bậc 100 của 16 họ Material, thứ tự key đúng
 * tokens.json (amber, blue, cyan, deep-orange, deep-purple, green,
 * indigo, light-blue, light-green, lime, orange, pink, purple, red,
 * teal, yellow) để khoá đồng bộ tokens.json ↔ globals.css (--avatar-*)
 * ↔ bảng này. Chỉ số 0..11 do assignIdentityColors (lib đóng băng)
 * gán; 12..15 là các ô còn lại của bảng, tới được qua guard modulo.
 */
export const AVATAR_BACKGROUNDS_V4: readonly string[] = [
  '#FFECB3', // amber 100
  '#BBDEFB', // blue 100
  '#B2EBF2', // cyan 100
  '#FFCCBC', // deep-orange 100
  '#D1C4E9', // deep-purple 100
  '#C8E6C9', // green 100
  '#C5CAE9', // indigo 100
  '#B3E5FC', // light-blue 100
  '#DCEDC8', // light-green 100
  '#F0F4C3', // lime 100
  '#FFE0B2', // orange 100
  '#F8BBD0', // pink 100
  '#E1BEE7', // purple 100
  '#FFCDD2', // red 100
  '#B2DFDB', // teal 100
  '#FFF9C4', // yellow 100
];

const avatarSvgCache = new Map<string, string>();

function avatarSvg(name: string, colorIndex: number): string {
  const paletteSize = AVATAR_BACKGROUNDS_V4.length;
  // Guard runtime như cơ chế cũ: colorIndex lạ/undefined rơi về màu đầu
  // palette thay vì làm sập màn hình.
  const safeIndex = Number.isFinite(colorIndex) ? Math.trunc(colorIndex) : 0;
  const idx = ((safeIndex % paletteSize) + paletteSize) % paletteSize;
  const nameKey = memberNameKey(name);
  const key = `${nameKey}|${idx}`;
  const cached = avatarSvgCache.get(key);
  if (cached) return cached;
  const wordCount = normalizeMemberName(name).split(' ').filter(Boolean).length;
  const rawSvg = createAvatar(initials, {
    seed: nameKey,
    // AVATAR_BACKGROUNDS_V4 giữ dạng '#RRGGBB'; schema DiceBear cần hex
    // không '#'. Mảng ĐÚNG 1 phần tử = ô M-2 đã gán cho người này (bất
    // biến M-2). Chữ initials = mực #212121 trên mọi nền (V-11.5).
    backgroundColor: [AVATAR_BACKGROUNDS_V4[idx].replace('#', '')],
    textColor: ['212121'],
    fontFamily: ['Be Vietnam Pro', 'sans-serif'],
    fontWeight: 700,
    fontSize: 46,
    // Tên một từ: DiceBear mặc định lấy 2 ký tự đầu — ép về 1 cho khớp
    // initialsOf (xem ghi chú glyph ở đầu khối).
    ...(wordCount === 1 ? { chars: 1 } : {}),
  }).toString();
  // Panel #03 (MINOR): DiceBear nhúng một khối <metadata> RDF dài 688 ký
  // tự (dc:title/dc:creator/dc:rights — chứa chuỗi "DiceBear" nhiều lần)
  // vào đầu mọi SVG. SVG được inject INLINE nên khối đó lọt vào
  // textContent của span avatar và nhiễm accessible name của mọi nút
  // chứa avatar (nút thành viên, hàng quyết toán…). Lọc bỏ CHỈ khối
  // <metadata>…</metadata> trước khi cache/inject — hình, glyph chữ viết
  // tắt và màu nền nằm NGOÀI khối đó nên giữ nguyên từng byte.
  // Panel #04 (F-R2-02, MINOR): gắn aria-hidden="true" vào thẻ <svg> GỐC
  // (chỉ lần xuất hiện đầu tiên — mọi byte hình/glyph/màu còn lại giữ
  // nguyên): span bọc ngoài đã aria-hidden nhưng screen reader vẫn có
  // thể chạm tới cây SVG con; icon trang trí phải ẩn ở cả hai tầng.
  const svg = rawSvg
    .replace(/<metadata[\s\S]*?<\/metadata>/, '')
    .replace(/<svg/, '<svg aria-hidden="true"');
  avatarSvgCache.set(key, svg);
  return svg;
}

/**
 * Avatar tròn DiceBear initials — SVG inline sinh tại client, không gọi
 * mạng (không api.dicebear.com, không fetch ảnh). `colorIndex` là chỉ
 * số ĐÃ được gán ở tầng dữ liệu (assignIdentityColors
 * ở lib/identity.ts) cho vị trí của thành viên trong cuộc chia;
 * component không tự suy màu từ id hay để DiceBear chọn màu theo seed.
 */
export function Avatar({
  name,
  colorIndex,
  size = 28,
}: {
  name: string;
  colorIndex: number;
  size?: number;
}) {
  const svg = useMemo(() => avatarSvg(name, colorIndex), [name, colorIndex]);
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 overflow-hidden rounded-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export const inputClass =
  'w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-placeholder transition duration-100 ease-[var(--ease-lock)] focus:border-brand-deep';

export const labelClass = 'mb-1.5 block text-base font-semibold text-ink';

export function PrimaryButton({
  children,
  onClick,
  disabled,
  disabledReason,
  className,
  type,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Trạng thái disabled CÓ LÝ DO (DESIGN-LANGUAGE §6): khi có giá trị,
   * nút render bằng bề mặt deck-sand + chữ ink + biên line-strong,
   * giữ focus được bằng aria-disabled (KHÔNG dùng thuộc tính disabled
   * cứng, KHÔNG opacity), onClick không chạy, và dòng lý do hiện ngay
   * dưới nút, được nút trỏ tới bằng aria-describedby. Không có
   * disabledReason -> hành vi disabled thường như trước.
   */
  disabledReason?: string;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const reactId = useId();
  const reasonId = `primary-reason-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const reasonDisabled = Boolean(disabledReason);

  const button = (
    <button
      type={type ?? 'button'}
      onClick={reasonDisabled ? undefined : onClick}
      disabled={reasonDisabled ? undefined : disabled}
      aria-disabled={reasonDisabled || undefined}
      aria-describedby={reasonDisabled ? reasonId : undefined}
      className={cn(
        // V4 (COLOR-SYSTEM §1/D7): CTA = nền brand-500 #FF5722 + nhãn mực
        // đen #000000 (ink-on-seed, 6,64:1); hover/pressed brand-600 nhãn
        // vẫn đen. Disabled KHÔNG dùng opacity mờ (panel §7.2): bề mặt
        // deck-sand (grey-200) + biên line-strong + chữ ink — đọc rõ là
        // "chưa bấm được", không như bị khoá.
        'ct-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-[90ms] ease-[var(--ease-lock)] hover:bg-brand-600 active:scale-[0.98] active:bg-brand-600 disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-deck-sand disabled:text-ink disabled:hover:bg-deck-sand',
        // Disabled-có-lý-do (DESIGN-LANGUAGE §6): bề mặt deck-sand là bề
        // mặt disabled duy nhất của hệ — chữ ink trên đó (D8).
        reasonDisabled &&
          'cursor-not-allowed border-line-strong bg-deck-sand text-ink hover:bg-deck-sand active:bg-deck-sand',
        className,
      )}
    >
      {children}
    </button>
  );

  if (!reasonDisabled) return button;

  return (
    <span className="inline-flex flex-col items-stretch gap-1">
      {button}
      <span id={reasonId} className="text-xs text-ink-2">
        {disabledReason}
      </span>
    </span>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep active:bg-brand-soft/50 disabled:cursor-not-allowed disabled:text-muted disabled:hover:border-line disabled:hover:text-muted',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  title,
  danger,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-muted transition duration-100 ease-[var(--ease-lock)] hover:border-line-strong hover:text-ink active:bg-paper',
        danger && 'hover:border-debt-solid hover:text-debt-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Copy text với fallback textarea cho trình duyệt chặn Clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

/* ------------------------------------------------------------------ */
/* Trạng thái mạng — chỉ báo offline của Settlement Rail (W5-01).      */
/* 'back' = vừa có mạng trở lại, hiện "Đã có mạng trở lại" rồi tự ẩn.  */
/* ------------------------------------------------------------------ */

export type OnlineStatus = 'online' | 'offline' | 'back';

export function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>('online');

  useEffect(() => {
    // Lý do (CQ-02): đồng bộ trạng thái mạng THẬT lúc mount — SSR/mặc định
    // lạc quan là 'online', nếu máy đang offline phải hạ xuống ngay trong
    // effect này; đây là đồng bộ với hệ thống ngoài (navigator), đúng mẫu
    // React docs cho external system, không phải vòng lặp render.
    /* eslint-disable react-hooks/set-state-in-effect -- đồng bộ trạng thái mạng thật (navigator.onLine) một lần lúc mount, không phải vòng lặp render */
    if (!navigator.onLine) setStatus('offline');
    /* eslint-enable react-hooks/set-state-in-effect */
    let timer: number | undefined;
    function onOffline() {
      window.clearTimeout(timer);
      setStatus('offline');
    }
    function onOnline() {
      setStatus('back');
      timer = window.setTimeout(() => setStatus('online'), 3000);
    }
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return status;
}

/**
 * Dòng trạng thái THƯỜNG TRỰC của app-shell (LAYOUT-SPEC §6.3, D-2):
 * cùng một component ở mọi bề mặt (Màn A: chân card tạo mới; Màn B:
 * trong Settlement Strip), suy trạng thái ngay khi mount qua
 * useOnlineStatus nên hiện đúng cả sau reload lạnh lúc offline.
 * Phần tử LUÔN hiển thị — không biến mất, không opacity-0 khi nghỉ:
 * online -> "Đã lưu trên máy này" (đây cũng là chỉ báo lưu thường trực,
 * thay cho nhãn "Đã lưu" thoáng qua ở AppBar); offline -> câu offline
 * kèm icon WifiOff; vừa có mạng lại -> "Đã có mạng trở lại" (trạng thái
 * 'back' tự quay về 'online' sau 3 giây trong useOnlineStatus).
 * aria-live="polite" chỉ để THÔNG BÁO THAY ĐỔI trạng thái cho screen
 * reader; nội dung nhìn thấy không phụ thuộc vào live region.
 */
export function StatusLine({ status, className }: { status: OnlineStatus; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-1.5 text-xs font-medium text-ink-2', className)}
    >
      {status === 'offline' ? (
        <>
          <IconWifiOff size={14} aria-hidden className="shrink-0" />
          <span>Đang offline — vẫn chia tiền được, dữ liệu lưu trên máy này.</span>
        </>
      ) : status === 'back' ? (
        <span>Đã có mạng trở lại</span>
      ) : (
        <span>Đã lưu trên máy này</span>
      )}
    </p>
  );
}

/**
 * Dòng chỉ báo trạng thái mạng — thông tin trạng thái, không phải lỗi:
 * không nền đỏ, không chặn thao tác, aria-live polite cho screen reader.
 * (Giữ cho tương thích với các bề mặt chưa chuyển sang StatusLine; bề
 * mặt mới dùng StatusLine thường trực ở trên.)
 */
export function OfflineNotice({ status, className }: { status: OnlineStatus; className?: string }) {
  if (status === 'online') return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-1.5 text-xs font-medium text-brand-deep', className)}
    >
      {status === 'offline' ? (
        <>
          <IconWifiOff size={14} aria-hidden className="shrink-0" />
          <span>Đang offline — vẫn chia tiền được, dữ liệu lưu trên máy này.</span>
        </>
      ) : (
        <span>Đã có mạng trở lại</span>
      )}
    </p>
  );
}
