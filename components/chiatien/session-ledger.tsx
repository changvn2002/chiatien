'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatVND, formatVNDDisplay } from '@/lib/money';
import { computeShares } from '@/lib/split';
import type { Expense, Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import { IconAlertTriangle, IconPlus } from './icons';
import { useSettleLock } from './session-view-hooks';

const MODE_LABELS: Record<Expense['mode'], string> = {
  equal: 'Chia đều',
  custom: 'Tuỳ chỉnh số tiền',
  shares: 'Theo phần',
};

/**
 * Cột sổ khoản chi của Màn B (ARC-11): thông báo thành viên, hai
 * trạng thái rỗng (chưa có người / chưa có khoản), danh sách khoản
 * chi (mới nhất trước) kèm phần chia mở rộng tại hàng, và hàng tổng
 * kẻ đôi ở chân cột.
 *
 * REDESIGN-V3: nhãn cột desktop (Inter 600 12px uppercase tracking
 * 0,06em — TYPE-AND-ICON §1); hàng mới vào theo C5 (100ms opacity tại
 * chỗ), hàng xoá exit 65ms --ease-leave qua hàng ma giữ 65ms; ô số
 * hàng tổng mang C1 settle-lock; hàng tổng được IntersectionObserver
 * theo dõi để Strip nhường kẻ đôi khi cùng khung (LK-22).
 */
export function SessionLedger({
  session,
  nameOf,
  total,
  memberNotice,
  expandedExpenseId,
  onFocusExpense,
  onOpenExpenseAction,
  onAddMember,
  onAddExpense,
  onTotalVisibility,
}: {
  session: Session;
  nameOf: (id: string) => string;
  total: number;
  memberNotice: string;
  expandedExpenseId: string | null;
  onFocusExpense: (id: string) => void;
  onOpenExpenseAction: (expense: Expense) => void;
  onAddMember: () => void;
  onAddExpense: () => void;
  /** Báo cho SessionView khi hàng tổng vào/ra khung nhìn (luật nhường kẻ đôi). */
  onTotalVisibility?: (visible: boolean) => void;
}) {
  const sortedExpenses = useMemo(
    () => [...session.expenses].sort((a, b) => b.createdAt - a.createdAt),
    [session.expenses],
  );
  const totalLocking = useSettleLock(total);
  const totalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = totalRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) onTotalVisibility?.(e.isIntersecting);
      },
      { threshold: 0.9 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onTotalVisibility, session.expenses.length]);

  /* C5 exit: khoản vừa bị xoá giữ một hàng ma mờ dần 65ms tại chỗ
     (không data-expense-row, không tương tác) rồi rời DOM. */
  const [exiting, setExiting] = useState<Expense[]>([]);
  const prevExpensesRef = useRef<Expense[]>(session.expenses);
  useEffect(() => {
    const prev = prevExpensesRef.current;
    prevExpensesRef.current = session.expenses;
    const currentIds = new Set(session.expenses.map((e) => e.id));
    const removed = prev.filter((e) => !currentIds.has(e.id));
    if (removed.length === 0) return;
    setExiting(removed);
    const t = window.setTimeout(() => setExiting([]), 65);
    return () => window.clearTimeout(t);
  }, [session.expenses]);

  const emptyLedger =
    session.members.length === 0 ? (
      <div className="mx-auto max-w-md py-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- minh hoạ empty-state là WebP tĩnh đã nén sẵn của app, kích thước hiển thị cố định; next/image không thêm lợi ích */}
        <img
          src="/products/brand/empty-state.webp"
          alt=""
          aria-hidden
          className="mx-auto mb-3 max-h-[160px] w-auto"
          loading="lazy"
        />
        <p className="text-sm text-ink">Thêm người đầu tiên để bắt đầu ghi khoản chi.</p>
        <button
          type="button"
          onClick={onAddMember}
          className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-lg border border-line-strong bg-card px-4 font-display text-sm font-bold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:border-brand-deep"
        >
          <IconPlus size={16} aria-hidden /> Thêm người
        </button>
      </div>
    ) : session.expenses.length === 0 ? (
      <div className="mx-auto max-w-md py-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- minh hoạ empty-state là WebP tĩnh đã nén sẵn của app, kích thước hiển thị cố định; next/image không thêm lợi ích */}
        <img
          src="/products/brand/empty-state.webp"
          alt=""
          aria-hidden
          className="mx-auto mb-3 max-h-[160px] w-auto"
          loading="lazy"
        />
        <p className="text-sm text-ink">
          Chưa có khoản chi nào. Ghi khoản đầu tiên: ai trả, bao nhiêu, chia cho ai.
        </p>
        <button
          type="button"
          onClick={onAddExpense}
          className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-lg border border-line-strong bg-card px-4 font-display text-sm font-bold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:border-brand-deep"
        >
          <IconPlus size={16} aria-hidden /> Thêm khoản chi
        </button>
      </div>
    ) : null;

  const ledger = (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto min-[900px]:flex-none min-[900px]:overflow-visible">
      {memberNotice && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg bg-debt-bg px-4 py-3 text-sm font-medium text-debt-ink"
        >
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{memberNotice}</span>
        </p>
      )}
      {emptyLedger}
      {session.expenses.length > 0 && (
        <>
          {/* Nhãn cột ledger (desktop, TYPE-AND-ICON §1): Inter 600,
              12px, uppercase, tracking 0,06em — có thật trong code. */}
          <div
            aria-hidden
            className="hidden grid-cols-[minmax(0,1fr)_auto] gap-x-2 pb-1 min-[900px]:grid"
          >
            <span className="font-figure text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
              Khoản chi
            </span>
            <span className="font-figure text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
              Số tiền
            </span>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {sortedExpenses.map((e) => {
              const shares = computeShares(e);
              const isExpanded = expandedExpenseId === e.id;
              return (
                <li key={e.id} className="animate-row-in">
                  <button
                    type="button"
                    data-expense-row={e.id}
                    onFocus={() => onFocusExpense(e.id)}
                    onClick={() => onOpenExpenseAction(e)}
                    className="grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5 text-left min-[900px]:min-h-[56px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-ink">
                        {e.title}
                      </span>
                      <span className="block text-[13px] break-words text-ink-2">
                        {nameOf(e.payerId)} đã trả · {MODE_LABELS[e.mode]} cho{' '}
                        {e.participantIds.length} người
                      </span>
                    </span>
                    {/* D4-CT-4 (sửa W3): cột tiền KHÔNG trần cứng —
                        trần 136px cũ cắt cụt «₫» của chuỗi trần
                        999.999.999.999 ₫ (cần 142px ở Inter 600 15px).
                        Cột auto nở theo nội dung, cột tên
                        minmax(0,1fr) + truncate nhường. */}
                    <span
                      className="font-figure text-[15px] font-semibold whitespace-nowrap text-ink"
                      title={formatVND(e.amount)}
                    >
                      {formatVNDDisplay(e.amount)}
                    </span>
                  </button>
                  {isExpanded && (
                    <ul className="grid gap-0.5 border-t border-line py-1.5">
                      {e.participantIds.map((id) => (
                        <li
                          key={id}
                          className="flex min-h-[32px] min-w-0 items-center justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 truncate text-ink-2">{nameOf(id)}</span>
                          <span
                            className="font-figure font-semibold whitespace-nowrap text-ink"
                            title={formatVND(shares[id] ?? 0)}
                          >
                            {formatVNDDisplay(shares[id] ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {exiting.map((e) => (
              <li key={`exiting-${e.id}`} aria-hidden className="animate-row-out">
                <div className="grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5 min-[900px]:min-h-[56px]">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-ink">
                      {e.title}
                    </span>
                    <span className="block text-[13px] break-words text-ink-2">
                      {nameOf(e.payerId)} đã trả · {MODE_LABELS[e.mode]} cho{' '}
                      {e.participantIds.length} người
                    </span>
                  </span>
                  <span className="font-figure text-[15px] font-semibold whitespace-nowrap text-ink">
                    {formatVNDDisplay(e.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div ref={totalRef} data-ledger-total>
            <div className="double-rule mt-1" aria-hidden />
            <div className="flex min-h-[48px] items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
                Tổng chi · {session.expenses.length} khoản
              </span>
              <span
                className={cn(
                  'font-figure text-[19px] font-bold whitespace-nowrap text-ink',
                  totalLocking && 'animate-settle-lock',
                )}
              >
                {formatVNDDisplay(total)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return ledger;
}
