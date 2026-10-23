'use client';

import { cn } from '@/lib/utils';

/** Bảng màu đặc cho avatar — màu đặc, không gradient. */
const AVATAR_COLORS = [
  '#B45309',
  '#177245',
  '#1D4ED8',
  '#B3352C',
  '#7C2D12',
  '#0F766E',
  '#A21CAF',
  '#854D0E',
  '#9D174D',
  '#374151',
];

export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Avatar tròn chứa chữ cái đầu của tên. */
export function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
      style={{ width: size, height: size, backgroundColor: avatarColor(id), fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}

export function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <span className="text-brand">{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl border border-line bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-placeholder focus:border-brand';

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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-display text-sm font-bold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40',
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand-deep',
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card text-muted transition hover:text-ink',
        danger && 'hover:border-debt hover:text-debt',
      )}
    >
      {children}
    </button>
  );
}
