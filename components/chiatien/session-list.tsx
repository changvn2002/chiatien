'use client';

import { useState } from 'react';
import { IconLink, IconMoreHorizontal, IconPlus, IconTrash } from './icons';
import { formatVNDDisplay } from '@/lib/money';
import { totalSpent } from '@/lib/split';
import type { Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  GhostButton,
  IconButton,
  PrimaryButton,
  StatusLine,
  inputClass,
  useOnlineStatus,
} from './ui-bits';
import { InfoSheet } from './info-sheet';
import { sessionProgress } from './session-progress';
import { ConfirmDialog, Sheet } from './sheet';

/**
 * S1 — Danh sách cuộc chia (REDESIGN Pha 1, SPEC §2 S1): ô tên + nút
 * «Cuộc chia mới» ở đầu; danh sách phiên dạng hàng hairline (tên · số
 * người · tổng · tiến độ «n/m lệnh đã trả»); phiên đang dở lên đầu, phiên
 * đã xong xếp dưới thu gọn; trạng thái rỗng phẳng (1 dòng + CTA, bỏ
 * hero minh hoạ).
 *
 * CẮT theo SPEC: aside desktop «Nhập từ link» + 3 dòng sự kiện dữ
 * liệu (D10) — nhập bằng link vẫn tự nhận khi mở link như cũ; nhập
 * tay dời vào menu «⋯» của S1 (mở đúng UI nhập cũ trong một sheet —
 * lựa chọn đã ghi: model import chỉ chạy ở bootstrap qua hash, nên
 * sheet giữ nguyên cơ chế gán hash + reload như aside cũ). Nút xoá
 * trên từng hàng -> menu hàng (giữ hộp xác nhận xoá hiện hữu).
 * FAQ accordion ở chân app.tsx đã chuyển vào Sheet 5 (mở từ menu ⋯).
 */
export function SessionList({
  sessions,
  onCreate,
  onOpen,
  onDelete,
}: {
  sessions: Session[];
  onCreate: (title: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [rowMenu, setRowMenu] = useState<Session | null>(null);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const online = useOnlineStatus();

  // Phiên dở lên đầu (trong nhóm giữ thứ tự updatedAt giảm dần như
  // hiện hành); phiên xong (và phiên chưa có gì để trả) xếp dưới.
  const withProgress = sessions.map((s) => ({ session: s, progress: sessionProgress(s) }));
  const ordered = [...withProgress].sort((a, b) => {
    if (a.progress.unfinished !== b.progress.unfinished) {
      return a.progress.unfinished ? -1 : 1;
    }
    return b.session.updatedAt - a.session.updatedAt;
  });
  const unfinished = ordered.filter((x) => x.progress.unfinished);
  const rest = ordered.filter((x) => !x.progress.unfinished);

  function handleCreate() {
    const t = title.trim();
    if (!t) {
      // CTA không disabled: bấm khi chưa có tên -> focus về ô tên.
      document.getElementById('new-session')?.focus();
      return;
    }
    onCreate(t);
    setTitle('');
  }

  /**
   * Nhập từ link (giữ nguyên cơ chế của aside cũ): dữ liệu nằm trọn
   * trong hash #chia= và import chỉ chạy ở bootstrap (use-sessions),
   * nên trích hash từ link đã dán, gán vào URL hiện tại rồi reload.
   */
  function handleImportFromLink() {
    const raw = importUrl.trim();
    if (!raw) return;
    const hashStart = raw.indexOf('#chia=');
    if (hashStart === -1) {
      setImportError(
        'Link không mở được — có thể bị cắt ngắn khi gửi hoặc sai định dạng. Nhờ người gửi copy lại link đầy đủ.',
      );
      return;
    }
    setImportError('');
    window.location.hash = raw.slice(hashStart);
    window.location.reload();
  }

  function rowMeta(x: { session: Session; progress: ReturnType<typeof sessionProgress> }) {
    const { session: s, progress: p } = x;
    const parts = [`${s.members.length} người`, formatVNDDisplay(totalSpent(s))];
    if (p.totalTransfers > 0) parts.push(`${p.paidCount}/${p.totalTransfers} lệnh đã trả`);
    else if (p.finished) parts.push('Đã trả hết');
    return parts.join(' · ');
  }

  function renderRow(x: { session: Session; progress: ReturnType<typeof sessionProgress> }) {
    const s = x.session;
    return (
      <li
        key={s.id}
        className={cn(
          'flex min-h-[56px] min-w-0 items-center gap-2 border-b border-line py-2',
          !x.progress.unfinished && 'opacity-80',
        )}
      >
        <button type="button" onClick={() => onOpen(s.id)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-base font-bold text-ink">{s.title}</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-2">{rowMeta(x)}</span>
        </button>
        <IconButton title={`Menu của cuộc chia "${s.title}"`} onClick={() => setRowMenu(s)}>
          <IconMoreHorizontal size={16} />
        </IconButton>
      </li>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-6">
      {/* Tạo mới ở đầu: ô tên + CTA chính «Cuộc chia mới» + menu ⋯. */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold text-ink">
            <label htmlFor="new-session">Tạo cuộc chia mới</label>
          </h2>
          <button
            type="button"
            aria-label="Menu danh sách"
            onClick={() => setListMenuOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition duration-100 ease-[var(--ease-lock)] hover:bg-card"
          >
            <IconMoreHorizontal size={20} aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="new-session"
            className={cn(inputClass, 'min-w-0 flex-1')}
            placeholder="Ví dụ: Đà Lạt 3 ngày 2 đêm…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <PrimaryButton onClick={handleCreate} className="shrink-0">
            <IconPlus size={16} /> Cuộc chia mới
          </PrimaryButton>
        </div>
        {/* StatusLine: bề mặt trạng thái DUY NHẤT của màn S1 (D8). */}
        <StatusLine status={online} className="mt-3" />
      </div>

      {sessions.length === 0 ? (
        // Addendum §6 / Seat 3 L3: trạng thái rỗng chỉ còn đúng 1 dòng —
        // nút tạo thứ ba đã xoá (CTA tạo đã có ở khối trên), hậu tố
        // «dữ liệu chỉ lưu trên máy» đã xoá (StatusLine ngay trên đã nói).
        <div className="border-t border-line py-4">
          <p className="text-base text-ink">Chưa có cuộc chia nào.</p>
        </div>
      ) : (
        <>
          {unfinished.length > 0 && <ul className="grid">{unfinished.map(renderRow)}</ul>}
          {rest.length > 0 && (
            <div>
              {unfinished.length > 0 && (
                <h3 className="mb-1 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
                  Đã xong &amp; chưa bắt đầu
                </h3>
              )}
              <ul className="grid">{rest.map(renderRow)}</ul>
            </div>
          )}
        </>
      )}

      {/* Menu ⋯ của S1: nhập tay từ link + mở Sheet 5. */}
      <Sheet open={listMenuOpen} onClose={() => setListMenuOpen(false)} title="Danh sách cuộc chia">
        <div className="grid">
          <button
            type="button"
            onClick={() => {
              setListMenuOpen(false);
              setImportOpen(true);
            }}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <IconLink size={16} aria-hidden /> Nhập từ link
          </button>
          <button
            type="button"
            onClick={() => {
              setListMenuOpen(false);
              setInfoOpen(true);
            }}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <span aria-hidden className="w-4 text-center font-bold">
              ?
            </span>{' '}
            Hướng dẫn &amp; dữ liệu
          </button>
        </div>
      </Sheet>

      {/* UI nhập từ link cũ, nguyên cơ chế, nay trong sheet. */}
      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title="Nhập từ link">
        <p className="text-base text-ink-2">
          Dán link cuộc chia đã nhận để mở bản sao trên máy này.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <input
            aria-label="Link cuộc chia"
            className={inputClass}
            placeholder="Dán link có #chia=…"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleImportFromLink();
            }}
          />
          <GhostButton onClick={handleImportFromLink} disabled={!importUrl.trim()}>
            <IconLink size={16} /> Nhập từ link
          </GhostButton>
        </div>
        {importError && (
          <p role="alert" className="mt-2 text-base font-medium text-debt-ink">
            {importError}
          </p>
        )}
      </Sheet>

      {/* Menu hàng: nơi duy nhất chứa xoá ở S1 (giữ ConfirmDialog). */}
      <Sheet open={rowMenu !== null} onClose={() => setRowMenu(null)} title={rowMenu?.title ?? ''}>
        {rowMenu && (
          <div className="grid">
            <button
              type="button"
              onClick={() => {
                onOpen(rowMenu.id);
                setRowMenu(null);
              }}
              className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
            >
              <IconPlus size={16} aria-hidden /> Mở cuộc chia
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingDelete(rowMenu);
                setRowMenu(null);
              }}
              className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-debt-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-debt-bg"
            >
              <IconTrash size={16} aria-hidden /> Xoá cuộc chia
            </button>
          </div>
        )}
      </Sheet>

      <InfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Xoá cuộc chia này?"
        message={
          pendingDelete
            ? `Cuộc chia "${pendingDelete.title}" và mọi khoản chi sẽ bị xoá khỏi máy này. Bạn vẫn hoàn tác được ngay sau khi xoá.`
            : ''
        }
        confirmLabel="Xoá cuộc chia"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
