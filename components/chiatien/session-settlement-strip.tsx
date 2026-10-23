'use client';

import type { RefObject } from 'react';
import { Check, ChevronDown, ChevronUp, Link2, MoveRight, Plus, Users } from 'lucide-react';
import { formatVNDDisplay } from '@/lib/money';
import type { Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PrimaryButton, StatusLine, type OnlineStatus } from './ui-bits';
import { SettlementPanel, type SettlementPanelProps } from './settlement';

/**
 * Dải quyết toán mobile của Màn B (ARC-11): phần tóm tắt luôn nhìn
 * thấy (tổng + lệnh chuyển đầu), panel quyết toán mở rộng tại chỗ và
 * DOCK neo đáy (StatusLine + nút tóm tắt + Action Deck). Cột quyết
 * toán desktop dùng cùng SettlementPanel qua panelProps.
 */
export function SessionSettlementStrip({
  session,
  expanded,
  total,
  discrepancy,
  allSettled,
  firstTransfer,
  transfers,
  nameOf,
  panelProps,
  online,
  deckNotice,
  dockRef,
  onCollapse,
  onToggle,
  onAddExpense,
  onOpenShare,
  onFocusMembers,
}: {
  session: Session;
  expanded: boolean;
  total: number;
  discrepancy: number;
  allSettled: boolean;
  firstTransfer: Transfer | undefined;
  transfers: Transfer[];
  nameOf: (id: string) => string;
  panelProps: SettlementPanelProps;
  online: OnlineStatus;
  deckNotice: string;
  dockRef: RefObject<HTMLDivElement | null>;
  onCollapse: () => void;
  onToggle: () => void;
  onAddExpense: () => void;
  onOpenShare: () => void;
  onFocusMembers: () => void;
}) {
  const stripSummaryContent = (
    <>
      <span className="flex w-full items-center gap-x-2">
        <span className="shrink-0 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
          Tổng
        </span>
        <span className="font-figure shrink-0 text-[19px] font-bold whitespace-nowrap text-ink">
          {formatVNDDisplay(total)}
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-deep">
          Quyết toán
          {discrepancy !== 0 && (
            <span
              aria-label="Có cảnh báo lệch số dư"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-debt text-[12px] font-bold text-white"
            >
              !
            </span>
          )}
          {expanded ? <ChevronDown size={15} aria-hidden /> : <ChevronUp size={15} aria-hidden />}
        </span>
      </span>
      {session.members.length === 0 ? (
        <span className="w-full min-w-0 truncate text-sm text-ink-2">Chưa có khoản chi nào</span>
      ) : session.expenses.length === 0 ? (
        <span className="w-full min-w-0 truncate text-sm text-ink-2">Chưa có gì để quyết toán</span>
      ) : allSettled ? (
        <span className="flex w-full min-w-0 items-center gap-1.5 text-sm font-medium text-ink">
          <Check size={15} className="shrink-0 text-credit" aria-hidden />
          <span className="truncate">Đã cân hết — không ai nợ ai</span>
        </span>
      ) : firstTransfer ? (
        <span className="flex w-full min-w-0 items-center gap-1.5 text-sm text-ink">
          <span className="min-w-0 flex-1 truncate">{nameOf(firstTransfer.fromId)}</span>
          <MoveRight size={14} className="shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{nameOf(firstTransfer.toId)}</span>
          <span className="font-figure shrink-0 font-semibold whitespace-nowrap">
            {formatVNDDisplay(firstTransfer.amount)}
          </span>
          {transfers.length > 1 && (
            <span className="shrink-0 text-ink-2">+{transfers.length - 1} lệnh</span>
          )}
        </span>
      ) : null}
    </>
  );

  // Settlement Strip mobile — layout thật dính đáy của cột flex.
  return (
    <section
      data-strip
      aria-label="Quyết toán"
      className="strip-shadow relative z-20 -mx-4 shrink-0 border-t border-line-strong bg-strip px-4 sm:-mx-6 sm:px-6 lg:hidden"
    >
      {expanded && (
        <div className="animate-strip-in max-h-[70dvh] overflow-y-auto pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-[19px] font-bold text-ink">Quyết toán</h2>
            <button
              type="button"
              onClick={onCollapse}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-deep transition hover:text-ink"
            >
              Thu gọn <ChevronDown size={15} aria-hidden />
            </button>
          </div>
          <SettlementPanel {...panelProps} variant="row" />
          <div className="pb-3" />
        </div>
      )}
      {/* DOCK — phần neo luôn nhìn thấy của Strip (Finding E): Sheet
        neo đáy theo chiều cao khối này qua --strip-h. */}
      <div ref={dockRef}>
        <StatusLine status={online} className="min-h-[28px] items-center" />
        <button
          type="button"
          data-strip-summary
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex min-h-11 w-full flex-col gap-y-0.5 py-1 text-left"
        >
          {stripSummaryContent}
        </button>
        {deckNotice && (
          <p role="status" className="pb-1 text-[13px] text-ink-2">
            {deckNotice}
          </p>
        )}
        {/* Action Deck */}
        <div className="flex min-h-[56px] items-start gap-2 pb-2">
          <div className="min-w-0 flex-1 [&>*]:w-full">
            <PrimaryButton
              disabledReason={
                session.members.length === 0 ? 'Thêm ít nhất 1 người để ghi khoản chi' : undefined
              }
              onClick={onAddExpense}
              className="w-full text-[15px]"
            >
              <Plus size={16} aria-hidden /> Thêm khoản
            </PrimaryButton>
          </div>
          <button
            type="button"
            aria-label="Chia sẻ link"
            aria-disabled={session.expenses.length === 0 || undefined}
            onClick={onOpenShare}
            className={cn(
              'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink transition hover:border-brand hover:text-brand-deep',
              session.expenses.length === 0 && 'cursor-not-allowed text-ink-2',
            )}
          >
            <Link2 size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Thành viên"
            onClick={onFocusMembers}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink transition hover:border-brand hover:text-brand-deep"
          >
            <Users size={18} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
