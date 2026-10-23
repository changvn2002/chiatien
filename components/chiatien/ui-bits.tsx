'use client';

import { useEffect, useMemo, useState } from 'react';
import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Avatar DiceBear — style initials, sinh 100% tại client (offline).   */
/*                                                                     */
/* Đọc source @dicebear/initials 9.4.2: glyph lấy từ SEED              */
/* (getInitials(prng.seed.trim()) — 1 từ lấy 2 ký tự đầu, nhiều từ    */
/* lấy ký tự đầu của từ đầu + từ cuối). Vì vậy seed PHẢI là tên thành  */
/* viên thì avatar mới hiện đúng chữ cái của người đó. Màu nền thì     */
/* ngược lại: ghim đúng 1 màu bằng hash ổn định của member id và       */
/* truyền mảng backgroundColor 1 phần tử — sửa tên không đổi màu       */
/* avatar, đúng kỷ luật "định danh ổn định theo id".                   */
/* ------------------------------------------------------------------ */

/** Họ ấm khoá palette cho nền avatar (hex không '#', theo schema DiceBear). */
const AVATAR_PALETTE = [
  'B45309',
  '92400E',
  'B3352C',
  '177245',
  '854D0E',
  '7C2D12',
  '9A3412',
  'A16207',
];

function avatarBackground(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

const avatarCache = new Map<string, string>();

function avatarDataUri(id: string, name: string): string {
  const key = `${id}|${name}`;
  const cached = avatarCache.get(key);
  if (cached) return cached;
  const uri = createAvatar(initials, {
    seed: name,
    backgroundColor: [avatarBackground(id)],
    textColor: ['ffffff'],
    // Style initials hỗ trợ fontFamily (schema có sẵn option này).
    fontFamily: ['Be Vietnam Pro', 'Arial', 'sans-serif'],
    fontWeight: 700,
    fontSize: 46,
  }).toDataUri();
  avatarCache.set(key, uri);
  return uri;
}

/** Avatar tròn DiceBear initials — data URI nội bộ, không gọi mạng. */
export function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  const uri = useMemo(() => avatarDataUri(id, name), [id, name]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className="shrink-0 rounded-full"
      style={{ width: size, height: size }}
      draggable={false}
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
  className,
  type,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Disabled KHÔNG dùng opacity mờ (panel §7.2): nền Amber Tint + chữ
        // Dark Amber đạt 6.09:1 — đọc rõ là "chưa bấm được", không như bị khoá.
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-transparent bg-brand px-4 py-2.5 font-display text-sm font-bold text-white transition hover:bg-brand-deep active:bg-brand-deep disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-brand-soft disabled:text-brand-deep disabled:hover:bg-brand-soft',
        className,
      )}
    >
      {children}
    </button>
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
    /* eslint-disable react-hooks/set-state-in-effect */
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
 * Dòng chỉ báo trạng thái mạng — thông tin trạng thái, không phải lỗi:
 * không nền đỏ, không chặn thao tác, aria-live polite cho screen reader.
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
