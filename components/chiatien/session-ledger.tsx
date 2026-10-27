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
 * Nhãn dòng khoản chi NÓI THẬT (Addendum §1): khi đúng MỘT người chịu
 * toàn bộ số tiền của khoản (phần của mọi người còn lại = 0 — ca
 * người đãi chịu 100% sau ghi sổ game), nhãn phải nêu «chịu toàn bộ»
 * thay cho nhãn kiểu chia — không bao giờ hiện «Chia đều» /
 * «Tuỳ chỉnh số tiền» cho trường hợp này.
 */
export function expenseRowLabel(e: Expense, nameOf: (id: string) => string): string {
  if (e.amount > 0) {
    const shares = computeShares(e);
    const bearers = [...new Set(e.participantIds)].filter((id) => (shares[id] ?? 0) > 0);
    if (bearers.length === 1 && shares[bearers[0]] === e.amount) {
      return bearers[0] === e.payerId
        ? `${nameOf(e.payerId)} đã trả · chịu toàn bộ`
        : `${nameOf(e.payerId)} đã trả · ${nameOf(bearers[0])} chịu toàn bộ`;
    }
  }
  return `${nameOf(e.payerId)} đã trả · ${MODE_LABELS[e.mode]} cho ${e.participantIds.length} người`;
}

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

  // REDESIGN Pha 1: trạng thái rỗng PHẲNG — đúng 1 dòng + CTA của
  // việc cần làm, bỏ hero minh hoạ (DESIGN-DIRECTION §2/§3).
  const emptyLedger =
    session.members.length === 0 ? (
      <div className="py-4">
        <p className="text-base text-ink">Thêm người để bắt đầu.</p>
        <button
          type="button"
          onClick={onAddMember}
          className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-lg border border-line-strong bg-card px-4 text-base font-bold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:border-brand-deep"
        >
          <IconPlus size={16} aria-hidden /> Thêm người
        </button>
      </div>
    ) : session.expenses.length === 0 ? (
      // MICRO-FIX F-04: sổ trống KHÔNG còn nút inline «Thêm khoản chi»
      // — dock dính đáy là CTA duy nhất cho việc này (1 việc 1 nút).
      <div className="py-4">
        <p className="text-base text-ink">Chưa có khoản chi nào.</p>
      </div>
    ) : null;

  const ledger = (
    // REDESIGN Pha 1: S2 là MỘT màn cuộn duy nhất — ledger không còn
    // vùng cuộn nội bộ + đệm --strip-h; trang cuộn chung, dock dính đáy.
    <div className="min-w-0">
      <h2 className="mb-1 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
        Sổ khoản chi
      </h2>
      {memberNotice && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg bg-debt-bg px-4 py-3 text-base font-medium text-debt-ink"
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
            <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
              Khoản chi
            </span>
            <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
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
                    className="grid min-h-[56px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-ink">
                        {e.title}
                      </span>
                      <span className="block text-xs break-words text-ink-2">
                        {expenseRowLabel(e, nameOf)}
                      </span>
                    </span>
                    {/* D4-CT-4 (sửa W3): cột tiền KHÔNG trần cứng —
                        trần 136px cũ cắt cụt «₫» của chuỗi trần
                        999.999.999.999 ₫. Cột auto nở theo nội dung,
                        cột tên minmax(0,1fr) + truncate nhường.
                        (Micro-fix 3: cỡ số tiền 15px -> 16px về thang
                        SPEC 12/13/14/16/19/24/32.) */}
                    <span
                      className="font-figure text-base font-semibold whitespace-nowrap text-ink"
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
                          className="flex min-h-[32px] min-w-0 items-center justify-between gap-3 text-base"
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
                <div className="grid min-h-[56px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium text-ink">{e.title}</span>
                    <span className="block text-xs break-words text-ink-2">
                      {expenseRowLabel(e, nameOf)}
                    </span>
                  </span>
                  <span className="font-figure text-base font-semibold whitespace-nowrap text-ink">
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
