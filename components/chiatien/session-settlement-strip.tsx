'use client';

import type { RefObject } from 'react';
import { IconCheck, IconPlus } from './icons';
import { formatVNDDisplay } from '@/lib/money';
import { PrimaryButton, StatusLine, type OnlineStatus } from './ui-bits';
import { titleForcesStatic } from './phieu';
import { cn } from '@/lib/utils';

/**
 * Dock đáy của S2 — REDESIGN Pha 1 (SPEC §1.4/Q5, AUDIT D1/D2/D8):
 * dải quyết toán mobile CŨ (strip thu/mở render bản sao của panel)
 * đã CHẾT. Dock này KHÔNG render quyết toán — nó chỉ mang:
 *  - StatusLine: bề mặt trạng thái DUY NHẤT của màn S2 (D8);
 *  - 1 dòng tóm tắt quyết toán tối đa: «Còn N lệnh chưa trả · X đ»
 *    (Micro-fix 3: đếm LỆNH chuyển theo session-progress, không gọi
 *    là «khoản» — ghế 1 M-2 / ghế 3 MỚI-1 bắt độc lập.)
 *    (bấm để cuộn tới mục «Ai trả ai» — panel duy nhất);
 *  - CTA chính của S2: «+ Khoản chi».
 * (Trước đây dock còn là mốc neo --strip-h cho Sheet — Addendum §4
 * đã đảo ngược: Sheet phủ kín cả dock, dock không còn vai trò neo.)
 *
 * Neo đáy (panel2 NHỎ-M3): dock dùng `mt-auto` trong cột flex của
 * SessionView (root flex-1, main của app bỏ pb-10 khi workspace mở)
 * nên khi nội dung ngắn hơn viewport dock vẫn bám đáy màn hình thay
 * vì dừng giữa trang; khi nội dung dài, mt-auto co về 0 và sticky
 * bottom-0 giữ hành vi dính đáy như cũ (khoảng 24px phía trên dock
 * do mb-6 của lưới nội dung đảm nhiệm).
 */
export function SessionDock({
  sessionTitle,
  unpaidCount,
  unpaidTotal,
  allSettled,
  hasExpenses,
  online,
  dockRef,
  notice,
  onAddExpense,
  onGoSettlement,
}: {
  sessionTitle: string;
  unpaidCount: number;
  unpaidTotal: number;
  allSettled: boolean;
  hasExpenses: boolean;
  online: OnlineStatus;
  dockRef: RefObject<HTMLDivElement | null>;
  /** Lý do 1 dòng cạnh CTA khi bấm mà còn thiếu điều kiện (firstBlocker rút gọn ở dock). */
  notice: string;
  onAddExpense: () => void;
  onGoSettlement: () => void;
}) {
  return (
    <div
      ref={dockRef}
      data-dock
      className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-line-strong bg-strip px-4 pt-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6"
    >
      <StatusLine status={online} className="leading-[18px]" />
      <div className="flex items-center gap-2 pt-1">
        {unpaidCount > 0 ? (
          <button
            type="button"
            data-dock-summary
            onClick={onGoSettlement}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1 text-left text-sm font-semibold text-ink"
          >
            {/* Addendum §5: số tiền là span RIÊNG shrink-0 — không bao
                giờ bị truncate; chỉ phần chữ co lại. */}
            <span className="min-w-0 truncate">Còn {unpaidCount} lệnh chưa trả ·</span>
            <span className="font-figure shrink-0 font-bold">{formatVNDDisplay(unpaidTotal)}</span>
          </button>
        ) : allSettled ? (
          <p
            data-dock-summary
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-ink"
          >
            <IconCheck size={15} className="shrink-0 text-credit-solid" aria-hidden />
            <span className="truncate">Đã cân hết — không ai nợ ai</span>
          </p>
        ) : hasExpenses ? (
          <p
            data-dock-summary
            className="flex min-h-11 min-w-0 flex-1 items-center text-sm text-ink-2"
          >
            <span className="truncate">Chưa có gì để quyết toán</span>
          </p>
        ) : null}
        {/* Phiên chưa có khoản chi nào: KHÔNG render phần tử tóm tắt —
            dock chỉ còn StatusLine + CTA «+ Khoản chi» (Addendum §6). */}
        <div className="shrink-0 [&>*]:w-full">
          <PrimaryButton
            onClick={onAddExpense}
            className={cn(
              titleForcesStatic(sessionTitle) &&
                'bg-grey-900 text-white hover:bg-grey-800 active:bg-grey-800',
            )}
          >
            <IconPlus size={16} aria-hidden /> Khoản chi
          </PrimaryButton>
        </div>
      </div>
      {notice && (
        <p role="status" className="pb-1 text-xs text-grey-700">
          {notice}
        </p>
      )}
    </div>
  );
}
