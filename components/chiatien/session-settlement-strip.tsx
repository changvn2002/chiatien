'use client';

import type { RefObject } from 'react';
import { formatVNDDisplay } from '@/lib/money';
import type { Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLink,
  IconPlus,
  IconSettleGlyph,
  IconUsers,
} from './icons';
import { PrimaryButton, StatusLine, type OnlineStatus } from './ui-bits';
import { SettlementPanel, type SettlementPanelProps } from './settlement';
import { useSettleLock } from './session-view-hooks';

/**
 * Dải quyết toán mobile của Màn B (ARC-11): phần tóm tắt luôn nhìn
 * thấy (tổng + lệnh chuyển đầu), panel quyết toán mở rộng tại chỗ và
 * DOCK neo đáy (StatusLine + nút tóm tắt + Action Deck). Cột quyết
 * toán desktop dùng cùng SettlementPanel qua panelProps.
 *
 * REDESIGN-V3:
 * - Hàng lệnh đầu theo D4-CT-1: lưới cột tên `minmax(72px, 1fr)` ở
 *   320px / `minmax(96px, 1fr)` từ 390px — CẤM min-width:0 trên ô tên
 *   (bản flex-1 + min-w-0 của Finding A bị thay bởi sàn lưới này);
 *   thứ tự hy sinh D4-CT-2: cụm «+N lệnh» biến mất khỏi hàng dưới
 *   360px trước tiên, số tiền (cột auto, nowrap) không bao giờ co.
 * - Ô số tổng mang C1 settle-lock (useSettleLock, 240ms --ease-lock).
 * - Kẻ đôi ở chân Strip (vị trí 2 của LK-22) CHỈ hiện khi hàng tổng
 *   ledger không cùng khung (doubleRuleYielded do SessionView cấp qua
 *   IntersectionObserver) và Strip đang thu gọn — ≤1 cụm/viewport;
 *   khi nhường, Strip giữ kẻ đơn border-t như cũ. Kẻ đôi tĩnh ở t=0,
 *   không animation riêng (C7).
 * - Ngân sách chrome: StatusLine 18 + tóm tắt 44 + Deck 44 + hairline
 *   = 107px ≤ 108 (AppBar 48 + dải thành viên 56 + Strip 108 ≤ 212).
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
  doubleRuleYielded,
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
  /** Hàng tổng ledger đang cùng khung → Strip nhường kẻ đôi (LK-22). */
  doubleRuleYielded: boolean;
  onCollapse: () => void;
  onToggle: () => void;
  onAddExpense: () => void;
  onOpenShare: () => void;
  onFocusMembers: () => void;
}) {
  const totalLocking = useSettleLock(total);
  const stripSummaryContent = (
    <>
      <span className="flex w-full items-center gap-x-2">
        <span className="shrink-0 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
          Tổng
        </span>
        <span
          className={cn(
            'font-figure shrink-0 text-[19px] leading-none font-bold whitespace-nowrap text-ink',
            totalLocking && 'animate-settle-lock',
          )}
        >
          {formatVNDDisplay(total)}
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-base font-semibold text-brand-deep">
          <IconSettleGlyph size={15} className="shrink-0 text-ink" aria-hidden />
          Quyết toán
          {discrepancy !== 0 && (
            <span
              aria-label="Có cảnh báo lệch số dư"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-debt-solid text-[12px] font-bold text-white"
            >
              !
            </span>
          )}
          {expanded ? (
            <IconChevronDown size={15} aria-hidden />
          ) : (
            <IconChevronUp size={15} aria-hidden />
          )}
        </span>
      </span>
      {session.members.length === 0 ? (
        <span className="w-full min-w-0 truncate text-base text-ink-2">Chưa có khoản chi nào</span>
      ) : session.expenses.length === 0 ? (
        <span className="w-full min-w-0 truncate text-base text-ink-2">
          Chưa có gì để quyết toán
        </span>
      ) : allSettled ? (
        <span className="flex w-full min-w-0 items-center gap-1.5 text-base font-medium text-ink">
          <IconCheck size={15} className="shrink-0 text-credit-solid" aria-hidden />
          <span className="truncate">Đã cân hết — không ai nợ ai</span>
        </span>
      ) : firstTransfer ? (
        <span className="grid w-full grid-cols-[minmax(72px,1fr)_auto_minmax(72px,1fr)_auto_auto] items-center gap-x-1.5 text-base text-ink min-[390px]:grid-cols-[minmax(96px,1fr)_auto_minmax(96px,1fr)_auto_auto]">
          <span className="truncate">{nameOf(firstTransfer.fromId)}</span>
          <IconSettleGlyph size={14} className="shrink-0 text-ink" aria-hidden />
          <span className="truncate">{nameOf(firstTransfer.toId)}</span>
          <span className="font-figure shrink-0 font-semibold whitespace-nowrap">
            {formatVNDDisplay(firstTransfer.amount)}
          </span>
          {transfers.length > 1 && (
            <span className="hidden shrink-0 text-ink-2 min-[360px]:inline">
              +{transfers.length - 1} lệnh
            </span>
          )}
        </span>
      ) : null}
    </>
  );

  // Settlement Strip mobile — layout thật dính đáy của cột flex. Phân
  // tầng bằng hairline border-t (bóng tĩnh = 0, LK-32 — class
  // .strip-shadow của V2 đã xoá hẳn).
  return (
    <section
      data-strip
      aria-label="Quyết toán"
      className="relative z-20 -mx-4 shrink-0 border-t border-line-strong bg-strip px-4 sm:-mx-6 sm:px-6 min-[900px]:hidden"
    >
      {expanded && (
        <div className="animate-step-in max-h-[70dvh] overflow-y-auto pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-[25px] font-extrabold text-ink">Quyết toán</h2>
            <button
              type="button"
              onClick={onCollapse}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-base font-semibold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
            >
              Thu gọn <IconChevronDown size={15} aria-hidden />
            </button>
          </div>
          <SettlementPanel {...panelProps} variant="row" />
          <div className="pb-3" />
        </div>
      )}
      {/* DOCK — phần neo luôn nhìn thấy của Strip (Finding E): Sheet
        neo đáy theo chiều cao khối này qua --strip-h. */}
      <div ref={dockRef}>
        <StatusLine status={online} className="leading-[18px]" />
        <button
          type="button"
          data-strip-summary
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex min-h-11 w-full flex-col gap-y-0.5 py-0 text-left"
        >
          {stripSummaryContent}
        </button>
        {deckNotice && (
          <p role="status" className="pb-1 text-xs text-ink-2">
            {deckNotice}
          </p>
        )}
        {/* Action Deck — phẳng trên cùng bề mặt Strip (hết hộp-trong-hộp). */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 [&>*]:w-full">
            <PrimaryButton
              disabledReason={
                session.members.length === 0 ? 'Thêm ít nhất 1 người để ghi khoản chi' : undefined
              }
              onClick={onAddExpense}
              className="w-full text-base"
            >
              <IconPlus size={16} aria-hidden /> Thêm khoản
            </PrimaryButton>
          </div>
          <button
            type="button"
            aria-label="Chia sẻ link"
            aria-disabled={session.expenses.length === 0 || undefined}
            onClick={onOpenShare}
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep',
              session.expenses.length === 0 && 'cursor-not-allowed text-ink-2',
            )}
          >
            <IconLink size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Thành viên"
            onClick={onFocusMembers}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep"
          >
            <IconUsers size={18} aria-hidden />
          </button>
        </div>
      </div>
      {/* Kẻ đôi chân Strip — chỉ khi không cụm nào khác cùng khung. */}
      {!expanded && !doubleRuleYielded && <div className="double-rule" aria-hidden />}
    </section>
  );
}
