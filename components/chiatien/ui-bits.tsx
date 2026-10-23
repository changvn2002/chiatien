'use client';

import { useEffect, useId, useState } from 'react';
import { IDENTITY_PALETTE, initialsOf } from '@/lib/identity';
import { cn } from '@/lib/utils';
import { IconWifiOff } from './icons';

/* ------------------------------------------------------------------ */
/* Avatar REDESIGN-V3 — cơ chế đĩa + initials + viền (LK-15/16/17).     */
/*                                                                     */
/* DiceBear và nền avatar đặc ĐÃ CHẾT HẲN (LK-16): render là SVG       */
/* inline tự sinh — đĩa tròn fill neutral-50 #FAF3F1 CHUNG cho mọi     */
/* thành viên (đĩa không mang identity, ĐÓNG BĂNG), viền solid màu ô   */
/* identity, initials (initialsOf của lib/identity.ts) Inter 600 mang  */
/* màu ô. Màu vẫn được gán ở tầng dữ liệu (assignIdentityColors —       */
/* QUYẾT ĐỊNH M-2: seed chỉ-tên + thứ tự chuẩn); component CHỈ nhận    */
/* colorIndex đã gán sẵn, không tự chọn màu.                           */
/*                                                                     */
/* Tầng cỡ khoá (INTERFACE-SPEC §4): đĩa 24 → initials 10px, viền       */
/* 1,5px; đĩa 28 → 11px, viền 2px; đĩa 32 → 12px, viền 2px. Prop       */
/* `size` ánh xạ về tầng gần nhất không vượt trần 32 (22→24, 36→32).   */
/* Tĩnh tuyệt đối (LK-17/C8): 0 animation/transition trên avatar.      */
/* aria-hidden ở CẢ span bọc lẫn <svg> gốc (Panel #04 F-R2-02 giữ).    */
/* ------------------------------------------------------------------ */

const AVATAR_TIERS = [
  { size: 24, fontSize: 10, strokeWidth: 1.5 },
  { size: 28, fontSize: 11, strokeWidth: 2 },
  { size: 32, fontSize: 12, strokeWidth: 2 },
] as const;

function avatarTier(size: number) {
  if (size <= 26) return AVATAR_TIERS[0];
  if (size <= 30) return AVATAR_TIERS[1];
  return AVATAR_TIERS[2];
}

/**
 * Avatar đĩa + initials + viền — SVG inline sinh tại client, không gọi
 * mạng, không thư viện avatar. `colorIndex` là chỉ số palette danh tính
 * ĐÃ được gán ở tầng dữ liệu (assignIdentityColors ở lib/identity.ts).
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
  const paletteSize = IDENTITY_PALETTE.length;
  // Guard runtime như cơ chế cũ: colorIndex lạ/undefined rơi về màu đầu
  // palette thay vì làm sập màn hình.
  const safeIndex = Number.isFinite(colorIndex) ? Math.trunc(colorIndex) : 0;
  const idx = ((safeIndex % paletteSize) + paletteSize) % paletteSize;
  const hex = IDENTITY_PALETTE[idx];
  const tier = avatarTier(size);
  const center = tier.size / 2;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0"
      style={{ width: tier.size, height: tier.size }}
    >
      <svg
        aria-hidden="true"
        width={tier.size}
        height={tier.size}
        viewBox={`0 0 ${tier.size} ${tier.size}`}
        className="block"
      >
        <circle
          cx={center}
          cy={center}
          r={center - tier.strokeWidth / 2}
          fill="#FAF3F1"
          stroke={hex}
          strokeWidth={tier.strokeWidth}
        />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Inter, sans-serif"
          fontWeight={600}
          fontSize={tier.fontSize}
          fill={hex}
        >
          {initialsOf(name)}
        </text>
      </svg>
    </span>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-placeholder transition duration-100 ease-[var(--ease-lock)] focus:border-brand-deep';

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
        'ct-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-brand px-4 py-2.5 font-display text-sm font-bold text-white transition duration-[90ms] ease-[var(--ease-lock)] hover:bg-brand-deep active:scale-[0.98] active:bg-brand-deep disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-brand-soft disabled:text-brand-deep disabled:hover:bg-brand-soft',
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
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep active:bg-brand-soft/50 disabled:cursor-not-allowed disabled:text-muted disabled:hover:border-line disabled:hover:text-muted',
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
      className={cn('flex items-center gap-1.5 text-[13px] font-medium text-ink-2', className)}
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
