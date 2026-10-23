'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { WifiOff } from 'lucide-react';
import { IDENTITY_PALETTE, initialsOf } from '@/lib/identity';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Avatar DiceBear — style initials, sinh 100% tại client (offline).   */
/*                                                                     */
/* Cơ chế danh tính M-2 (DESIGN-LANGUAGE §8, DESIGN.md mục Avatar):    */
/* màu KHÔNG còn suy từ member id nữa — import qua share link cấp id   */
/* mới nên cơ chế cũ làm cùng một người đổi màu giữa hai máy, lại      */
/* không chống trùng màu trong nhóm và palette cũ còn chứa cả màu      */
/* ngữ nghĩa tiền (#177245). Nay màu được gán ở tầng dữ liệu:          */
/* assignIdentityColors() trong lib/identity.ts suy màu xác định từ    */
/* tên đã chuẩn hoá + ordinal của thành viên trong mảng members của    */
/* payload (FNV-1a-32 → IDENTITY_PALETTE, thăm tuyến tính chống        */
/* trùng), và component này CHỈ nhận colorIndex đã gán sẵn — nó        */
/* không tự chọn màu. Glyph cũng lấy từ cùng nguồn sự thật đó:         */
/* seed = initialsOf(name) của lib/identity.ts.                        */
/*                                                                     */
/* Render bằng SVG INLINE trong DOM (createAvatar(...).toString() qua */
/* dangerouslySetInnerHTML), KHÔNG qua <img>/data URI: <img> không     */
/* dùng được webfont của trang nên glyph từng rơi về sans mặc định     */
/* theo OS; SVG inline kế thừa Be Vietnam Pro 700 đã tải của trang.    */
/* ------------------------------------------------------------------ */

const avatarSvgCache = new Map<string, string>();

function avatarSvg(name: string, colorIndex: number): string {
  const paletteSize = IDENTITY_PALETTE.length;
  // Guard runtime: colorIndex luôn bắt buộc ở tầng type, nhưng một caller
  // chưa migrate mà truyền undefined không được làm sập cả màn hình —
  // rơi về màu đầu palette thay vì NaN -> undefined.replace crash.
  const safeIndex = Number.isFinite(colorIndex) ? Math.trunc(colorIndex) : 0;
  const idx = ((safeIndex % paletteSize) + paletteSize) % paletteSize;
  const key = `${name}|${idx}`;
  const cached = avatarSvgCache.get(key);
  if (cached) return cached;
  const rawSvg = createAvatar(initials, {
    seed: initialsOf(name),
    // IDENTITY_PALETTE giữ dạng '#RRGGBB'; schema DiceBear cần hex không '#'.
    backgroundColor: [IDENTITY_PALETTE[idx].replace('#', '')],
    textColor: ['ffffff'],
    fontFamily: ['Be Vietnam Pro', 'Inter', 'sans-serif'],
    fontWeight: 700,
    fontSize: 46,
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
 * mạng. `colorIndex` là chỉ số palette danh tính ĐÃ được gán ở tầng dữ
 * liệu (assignIdentityColors ở lib/identity.ts) cho vị trí của thành
 * viên trong cuộc chia; component không suy màu từ id hay từ tên.
 */
export function Avatar({
  name,
  colorIndex,
  size = 36,
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
  'w-full rounded-xl border border-line-strong bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-placeholder transition focus:border-brand-deep';

export const labelClass = 'mb-1.5 block text-sm font-semibold text-ink';

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
   * nút render bằng bề mặt deck-sand + chữ brand-deep + biên line-strong,
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
        // Disabled KHÔNG dùng opacity mờ (panel §7.2): nền Amber Tint + chữ
        // Dark Amber đạt 6.09:1 — đọc rõ là "chưa bấm được", không như bị khoá.
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-transparent bg-brand px-4 py-2.5 font-display text-sm font-bold text-white transition hover:bg-brand-deep active:bg-brand-deep disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-brand-soft disabled:text-brand-deep disabled:hover:bg-brand-soft',
        // Disabled-có-lý-do (DESIGN-LANGUAGE §6): bề mặt deck-sand là bề
        // mặt disabled duy nhất của hệ — brand-deep trên sand đạt 5.73:1.
        reasonDisabled &&
          'cursor-not-allowed border-line-strong bg-deck-sand text-brand-deep hover:bg-deck-sand active:bg-deck-sand',
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
      <span id={reasonId} className="text-[13px] text-ink-2">
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
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand-deep active:bg-brand-soft/50 disabled:cursor-not-allowed disabled:text-muted disabled:hover:border-line disabled:hover:text-muted',
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
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-muted transition hover:border-line-strong hover:text-ink active:bg-paper',
        danger && 'hover:border-debt hover:text-debt',
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
      className={cn('flex items-center gap-1.5 text-[13px] font-medium text-ink-2', className)}
    >
      {status === 'offline' ? (
        <>
          <WifiOff size={14} aria-hidden className="shrink-0" />
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
          <WifiOff size={14} aria-hidden className="shrink-0" />
          <span>Đang offline — vẫn chia tiền được, dữ liệu lưu trên máy này.</span>
        </>
      ) : (
        <span>Đã có mạng trở lại</span>
      )}
    </p>
  );
}
