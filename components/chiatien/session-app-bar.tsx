'use client';

import { IconMoreHorizontal } from './icons';

/**
 * AppBar của Màn B (ARC-11): tiêu đề cuộc chia (H1 duy nhất của
 * workspace, sửa tại chỗ) + nút mở bảng hành động của cuộc chia.
 * State tiêu đề vẫn thuộc SessionView; component này chỉ trình bày.
 */
export function SessionAppBar({
  title,
  editing,
  draft,
  onDraftChange,
  onStartEdit,
  onCommit,
  onOpenActions,
}: {
  title: string;
  editing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCommit: () => void;
  onOpenActions: () => void;
}) {
  // AppBar của Màn B: tên cuộc chia (H1 duy nhất của workspace) + nút ⋯
  // — logo ÷ KHÔNG lặp ở đây: app-shell header ngay phía trên đã
  // render logo rồi (Finding K, hai logo xếp chồng trong 150px đầu).
  return (
    // R3 (mục 14): AppBar nổi TRÊN lớp scrim của dải quyết toán mở rộng
    // (z-10) — tiêu đề phiên giữ mực ink đầy đủ ở mọi màn, không còn
    // xám mờ như bị vô hiệu hoá ở completion/table/group12.
    <div className="relative z-20 flex h-12 shrink-0 items-center gap-2">
      {editing ? (
        <input
          aria-label="Tên cuộc chia"
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-line-strong bg-card px-2 py-1.5 font-display text-[32px] font-extrabold text-ink outline-none focus:border-brand-deep"
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
          <h1 className="truncate font-display text-[32px] leading-tight font-extrabold text-ink">
            {title}
          </h1>
        </button>
      )}
      <button
        type="button"
        aria-label="Hành động của cuộc chia"
        onClick={onOpenActions}
        // R7 (mục 4a): vòng focus của nút này TRUNG TÍNH (grey-900,
        // .focus-neutral trong globals.css) — vòng cam brand-900
        // quanh «…» bị panel R6 bắt trên màn static-sensitive.
        className="focus-neutral inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition duration-100 ease-[var(--ease-lock)] hover:bg-card"
      >
        <IconMoreHorizontal size={20} aria-hidden />
      </button>
    </div>
  );
}
