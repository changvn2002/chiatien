'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatVND } from '@/lib/money';
import { simplifyDebts } from '@/lib/settle';
import { computeBalances, totalSpent } from '@/lib/split';
import type { Session } from '@/lib/types';
import { IconButton, PrimaryButton, inputClass } from './ui-bits';
import { ConfirmDialog } from './sheet';

/** Danh sách các cuộc chia đã lưu trên máy + form tạo mới. */
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

  const latest = sessions[0];
  const latestSummary = useMemo(() => {
    if (!latest) return null;
    const transfers = simplifyDebts(computeBalances(latest));
    const nameOf = (id: string) => latest.members.find((m) => m.id === id)?.name ?? 'Thành viên';
    return { transfers, nameOf };
  }, [latest]);

  function handleCreate() {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle('');
  }

  function focusCreateInput() {
    const input = document.getElementById('new-session');
    input?.scrollIntoView({ block: 'center' });
    input?.focus();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-6">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <label
            className="mb-1.5 block font-display text-base font-bold text-ink"
            htmlFor="new-session"
          >
            Tạo cuộc chia mới
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="new-session"
              className={inputClass}
              placeholder="Ví dụ: Đà Lạt 3 ngày 2 đêm, Nhậu cuối tuần, Tiền trọ tháng 10…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <PrimaryButton onClick={handleCreate} disabled={!title.trim()} className="shrink-0">
              <Plus size={16} /> Tạo cuộc chia
            </PrimaryButton>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card px-5 py-6 text-center shadow-[var(--shadow-card)]">
            {/* Lý do (CQ-02): ảnh minh hoạ empty-state là WebP tĩnh đã nén
                sẵn của chính app trong /public, kích thước hiển thị cố
                định — next/image không thêm lợi ích ở đây. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/brand/empty-state.webp"
              alt=""
              aria-hidden
              className="mx-auto mb-3 max-h-[180px] w-auto"
              loading="lazy"
            />
            <p className="font-display text-lg font-bold text-ink">Chưa có cuộc chia nào</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Chia tiền nhóm — quyết toán một lần, hết nợ nần. Dữ liệu chỉ lưu trên máy của bạn —
              không cần tài khoản.
            </p>
            <PrimaryButton onClick={focusCreateInput} className="mt-4">
              <Plus size={16} /> Tạo cuộc chia đầu tiên
            </PrimaryButton>
          </div>
        ) : (
          <ul className="grid gap-3">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex min-w-0 items-center gap-2 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-line-strong"
              >
                <button
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-display text-lg font-bold text-ink">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">
                    {s.members.length} người · {s.expenses.length} khoản ·{' '}
                    <span className="font-display font-semibold text-ink">
                      {formatVND(totalSpent(s))}
                    </span>
                  </span>
                </button>
                <IconButton
                  title={`Xoá cuộc chia "${s.title}"`}
                  danger
                  onClick={() => setPendingDelete(s)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cột phải desktop: tóm tắt cuộc chia gần nhất — dạng tĩnh của Settlement Rail. */}
      {latest && latestSummary && (
        <aside
          aria-label="Cuộc chia gần nhất"
          className="sticky top-6 hidden rounded-2xl border border-line bg-rail p-4 lg:block"
        >
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Gần nhất</p>
          <p className="mt-1 truncate font-display text-base font-bold text-ink">{latest.title}</p>
          <p className="mt-1 text-sm text-muted">
            Tổng{' '}
            <span className="font-display font-bold text-ink">{formatVND(totalSpent(latest))}</span>{' '}
            · {latest.members.length} người · {latest.expenses.length} khoản
          </p>
          {latestSummary.transfers.length > 0 ? (
            <ul className="mt-3 grid gap-1.5 border-t border-line pt-3 text-sm">
              {latestSummary.transfers.slice(0, 2).map((t, i) => (
                <li key={i} className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {latestSummary.nameOf(t.fromId)} → {latestSummary.nameOf(t.toId)}
                  </span>
                  <span className="font-display font-bold whitespace-nowrap text-ink">
                    {formatVND(t.amount)}
                  </span>
                </li>
              ))}
              {latestSummary.transfers.length > 2 && (
                <li className="text-muted">+{latestSummary.transfers.length - 2} lệnh nữa</li>
              )}
            </ul>
          ) : (
            <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
              Chưa có lệnh chuyển nào.
            </p>
          )}
          <button
            type="button"
            onClick={() => onOpen(latest.id)}
            className="mt-3 inline-flex min-h-11 items-center font-display text-sm font-bold text-brand-deep transition hover:text-ink"
          >
            Mở cuộc chia này
          </button>
        </aside>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Xoá cuộc chia này?"
        message={
          pendingDelete
            ? `Cuộc chia "${pendingDelete.title}" cùng mọi khoản chi trong đó sẽ bị xoá khỏi máy này. Bạn vẫn hoàn tác được ngay sau khi xoá.`
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
