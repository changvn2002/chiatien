'use client';

import { IconChevronLeft, IconMoreHorizontal } from './icons';

/**
 * Header 1 hàng của S2 (REDESIGN Pha 1, SPEC §2 S2): back về danh
 * sách (luôn có, 1 bấm — Q4) · tiêu đề phiên sửa tại chỗ (H1 duy nhất
 * của workspace) · nút «?» mở Sheet 5 «Hướng dẫn & dữ liệu» · menu «⋯»
 * (Chia sẻ / Xuất phiếu / Xoá phiên). State tiêu đề thuộc SessionView.
 */
export function SessionAppBar({
  title,
  editing,
  draft,
  onDraftChange,
  onStartEdit,
  onCommit,
  onBack,
  onOpenInfo,
  onOpenActions,
}: {
  title: string;
  editing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCommit: () => void;
  onBack: () => void;
  onOpenInfo: () => void;
  onOpenActions: () => void;
}) {
  return (
    <div className="relative z-20 flex h-12 shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Tất cả cuộc chia"
        className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg px-1.5 text-sm font-semibold whitespace-nowrap text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
      >
        <IconChevronLeft size={16} aria-hidden />
        <span className="hidden min-[391px]:inline">Tất cả cuộc chia</span>
      </button>
      {editing ? (
        <input
          aria-label="Tên cuộc chia"
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-line-strong bg-card px-2 py-1.5 font-display text-[24px] font-extrabold text-ink outline-none focus:border-brand-deep sm:text-[32px]"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommit();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg px-1 text-left"
          title="Chạm để sửa tên cuộc chia"
        >
          <h1 className="truncate font-display text-[24px] leading-tight font-extrabold text-ink sm:text-[32px]">
            {title}
          </h1>
        </button>
      )}
      <button
        type="button"
        aria-label="Hướng dẫn & dữ liệu"
        onClick={onOpenInfo}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-bold text-ink-2 transition duration-100 ease-[var(--ease-lock)] hover:bg-card hover:text-ink"
      >
        ?
      </button>
      <button
        type="button"
        aria-label="Hành động của cuộc chia"
        onClick={onOpenActions}
        className="focus-neutral inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition duration-100 ease-[var(--ease-lock)] hover:bg-card"
      >
        <IconMoreHorizontal size={20} aria-hidden />
      </button>
    </div>
  );
}
