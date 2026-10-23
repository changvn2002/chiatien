'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GhostButton } from './ui-bits';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Vỏ chứa dùng chung cho mọi editor/sheet của app: bottom-sheet trên mobile,
 * dialog giữa màn hình trên desktop. Có focus trap tối thiểu (Tab vòng trong
 * panel), Esc đóng, khoá cuộn nền và trả focus về phần tử đã mở khi đóng —
 * theo A11Y-03/04 của spec redesign.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
  tinted,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Dialog rộng 640px trên desktop (form khoản chi). */
  wide?: boolean;
  /** Nền editor tint — đánh dấu "đang sửa ở đây". */
  tinted?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus vào ô nhập đầu tiên nếu có, không thì vào chính panel.
    const firstInput = panel.querySelector<HTMLElement>('input, select, textarea');
    (firstInput ?? panel).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(panel!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-ink/45"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'animate-sheet-in relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl shadow-[var(--shadow-lift)] outline-none sm:rounded-2xl',
          wide ? 'sm:max-w-[640px]' : 'sm:max-w-lg',
          tinted ? 'bg-editor' : 'bg-card',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
          <h2 className="min-w-0 truncate font-display text-lg font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Đóng ${title}`}
            className="-mt-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-white/70 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 pb-5 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Hộp thoại xác nhận phá huỷ trong hệ thống thiết kế của app — thay cho
 * window.confirm() native (panel §7.10). Nút xác nhận là hành động nguy hiểm
 * nên mang màu Brick Red; việc xoá thật kèm toast Hoàn tác ở tầng app.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-sm leading-relaxed text-ink">{message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-debt px-4 py-2.5 font-display text-sm font-bold text-white transition hover:brightness-90 active:brightness-75"
        >
          {confirmLabel}
        </button>
        <GhostButton onClick={onCancel}>Huỷ</GhostButton>
      </div>
    </Sheet>
  );
}
