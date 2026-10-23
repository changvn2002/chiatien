'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GhostButton } from './ui-bits';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Thông tin phần tử đã mở sheet — ghi nhận MỘT LẦN ở chuyển mở. */
interface OpenerRecord {
  el: HTMLElement | null;
  /** Giá trị data-autofocus-target của opener (nếu nó khai) — khoá tìm lại node thay thế. */
  target: string | null;
  /** aria-label/title của opener — khoá dự phòng cuối khi node bị thay. */
  label: string | null;
}

/**
 * Tìm phần tử thay thế cho opener đã rời document: ưu tiên node còn sống
 * mang cùng data-autofocus-target, rồi mọi node mang [data-sheet-opener],
 * cuối cùng là nút mang cùng aria-label/title (IconButton của app luôn
 * khai title -> aria-label nên node được React tạo lại vẫn khớp khoá này).
 */
function findFallbackOpener(record: OpenerRecord): HTMLElement | null {
  if (record.target) {
    const byTarget = Array.from(
      document.querySelectorAll<HTMLElement>('[data-autofocus-target]'),
    ).find((el) => el.getAttribute('data-autofocus-target') === record.target);
    if (byTarget) return byTarget;
  }
  const marked = document.querySelector<HTMLElement>('[data-sheet-opener]');
  if (marked) return marked;
  if (record.label) {
    const byLabel = Array.from(
      document.querySelectorAll<HTMLElement>('button, [role="button"]'),
    ).find(
      (el) =>
        el.getAttribute('aria-label') === record.label || el.getAttribute('title') === record.label,
    );
    if (byLabel) return byLabel;
  }
  return null;
}

/**
 * Vỏ chứa dùng chung cho mọi editor/sheet của app: bottom-sheet trên mobile,
 * dialog giữa màn hình trên desktop. Có focus trap tối thiểu (Tab vòng trong
 * panel), Esc đóng, khoá cuộn nền và trả focus về phần tử đã mở khi đóng —
 * theo A11Y-03/04 của spec redesign.
 *
 * D-7 (Panel-02, audit lại 2026-10-23) — vì sao bản cũ để focus rơi về BODY
 * dù đã có `previouslyFocused?.focus()` trong cleanup:
 *  1. Việc trả focus nằm trong cleanup của MỘT passive effect có deps
 *     [open, onClose], mà MỌI nơi gọi đều truyền onClose là arrow inline —
 *     nên cleanup chạy ở mọi lần parent re-render khi sheet đang mở, không
 *     chỉ khi đóng: focus bị kéo về opener giữa phiên làm việc, rồi effect
 *     chạy lại và GHI NHẬN LẠI document.activeElement làm "opener" mới.
 *  2. Thời điểm ghi nhận lại đó không kiểm chứng node còn sống hay không:
 *     các bề mặt dữ liệu của app re-render theo session mới ở mỗi lần ghi
 *     (use-sessions tạo mảng/object mới), node opener có thể đã bị React
 *     thay bằng node khác — cleanup lúc đóng gọi .focus() lên node ĐÃ RỜI
 *     document (detached) thì trình duyệt bỏ qua im lặng, và vì phần tử
 *     đang focus thật (trong panel) vừa bị unmount, activeElement mặc
 *     định rơi về BODY. Gọi .focus() lên detached node không throw nên
 *     lỗi hoàn toàn câm ở cả hai kênh.
 * Cách sửa ở tầng Sheet này (không đổi API):
 *  - Ghi nhận opener đúng MỘT LẦN ở chuyển đóng->mở (cờ wasOpen), kèm
 *    khoá tìm lại (data-autofocus-target / aria-label / title); effect
 *    chính chỉ phụ thuộc [open], onClose đi qua ref nên re-render không
 *    còn kích hoạt cleanup/re-capture nữa. Vì opener còn có thể bị thay
 *    node ngay trong commit mở (activeElement kịp rơi về BODY trước khi
 *    effect chạy), Sheet còn theo dõi phần tử ngoài dialog nhận focus
 *    gần nhất qua sự kiện focusin từ lúc mount làm nguồn ghi nhận dự
 *    phòng — bắt đầu theo dõi từ khi sheet còn đóng, không phải từ lúc mở.
 *  - Trả focus là một bước riêng, chạy bằng requestAnimationFrame SAU
 *    khi panel đã unmount hoàn toàn khỏi DOM (không còn đua với việc
 *    React gỡ panel và trình duyệt reset focus về BODY): opener còn
 *    trong document (isConnected) thì focus nó; đã bị thay node thì tìm
 *    node thay thế theo khoá đã ghi nhận.
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
  const openerRef = useRef<OpenerRecord>({ el: null, target: null, label: null });
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  // Phần tử ngoài dialog nhận focus gần nhất — theo dõi LIÊN TỤC từ lúc
  // Sheet mount (kể cả khi đang đóng), vì tới lúc effect mở chạy thì
  // opener có thể đã bị thay node ngay trong chính commit mở sheet
  // (parent re-render theo state mở) và document.activeElement đã kịp
  // rơi về BODY — ghi nhận ở thời điểm mở như bản cũ là quá muộn.
  const lastFocusRef = useRef<OpenerRecord>({ el: null, target: null, label: null });

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.getAttribute !== 'function') return;
      if (target.closest('[role="dialog"]')) return;
      lastFocusRef.current = {
        el: target,
        target: target.getAttribute('data-autofocus-target') ?? null,
        label: target.getAttribute('aria-label') ?? target.getAttribute('title') ?? null,
      };
    }
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, []);

  // onClose mới nhất đi qua ref để effect chính không phải chạy lại mỗi
  // khi nơi gọi re-render với arrow inline mới (một nửa nguyên nhân D-7).
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Sheet bị gỡ khỏi cây khi đang mở (nơi gọi unmount luôn cả sheet):
  // nhánh đóng trong effect chính không có cơ hội chạy, nên cleanup lúc
  // unmount tự lên lịch trả focus theo cùng cơ chế frame + node còn sống.
  useEffect(() => {
    return () => {
      if (!wasOpenRef.current) return;
      wasOpenRef.current = false;
      const record = openerRef.current;
      requestAnimationFrame(() => {
        if (record.el?.isConnected) {
          record.el.focus();
          return;
        }
        findFallbackOpener(record)?.focus();
      });
    };
  }, []);

  useEffect(() => {
    if (!open) {
      if (!wasOpenRef.current) return;
      wasOpenRef.current = false;
      // Panel đã bị gỡ khỏi DOM ở commit này (Sheet trả về null). Đợi
      // thêm một frame để trình duyệt chốt xong việc reset focus khi
      // phần tử đang focus bị unmount, rồi mới trả focus — restore chạy
      // đồng bộ trong cleanup như bản cũ là đua với chính việc unmount đó.
      const record = openerRef.current;
      const raf = requestAnimationFrame(() => {
        if (record.el?.isConnected) {
          record.el.focus();
          return;
        }
        findFallbackOpener(record)?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }

    // Chuyển đóng -> mở: ghi nhận opener MỘT LẦN (các lần effect chạy lại
    // trong cùng phiên mở không được ghi đè bằng phần tử trong panel).
    // Ưu tiên activeElement hiện tại; nếu nó đã rơi về BODY (opener bị
    // thay node ngay trong commit mở) thì dùng bản ghi focusin gần nhất.
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      const active = document.activeElement as HTMLElement | null;
      const opener =
        active && active !== document.body && !active.closest('[role="dialog"]') ? active : null;
      openerRef.current = opener
        ? {
            el: opener,
            target: opener.getAttribute('data-autofocus-target') ?? null,
            label: opener.getAttribute('aria-label') ?? opener.getAttribute('title') ?? null,
          }
        : lastFocusRef.current;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus vào ô nhập đầu tiên nếu có, không thì vào chính panel.
    const panel = panelRef.current;
    if (panel) {
      const firstInput = panel.querySelector<HTMLElement>('input, select, textarea');
      (firstInput ?? panel).focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const currentPanel = panelRef.current;
      if (!currentPanel) return;
      const items = Array.from(currentPanel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
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
      // KHÔNG trả focus ở đây: cleanup này cũng chạy khi effect được
      // thiết lập lại — việc trả focus thuộc về nhánh đóng ở trên.
    };
  }, [open]);

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
