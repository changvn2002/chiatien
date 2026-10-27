'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  IconCheck,
  IconChevronDown,
  IconPencil,
  IconQr,
  IconSettleGlyph,
  IconAlertTriangle,
} from './icons';
import { assignIdentityColors } from '@/lib/identity';
import { formatVNDDisplay } from '@/lib/money';
import { owedByMember, paidByMember, sumBalances } from '@/lib/split';
import { hasBank } from '@/lib/vietqr';
import type { Member, Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, GhostButton, PrimaryButton } from './ui-bits';
import { titleForcesStatic } from './phieu';
import { transferKey } from './session-progress';
import { useSettleLock } from './session-view-hooks';

export type SettlementPanelProps = {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
  /** Sổ đã-trả local (session-progress) — khoá lệnh đã đánh dấu đã trả. */
  paidKeys: Set<string>;
  /** Mở Sheet 3 (Thanh toán) cho lệnh theo chỉ số trong transfers. */
  onOpenPayment: (index: number) => void;
  onEditMember: (member: Member, opts?: { focusBank?: boolean }) => void;
  /**
   * REDESIGN Pha 2 (SPEC §C2): panel game render NGAY trong mục này
   * khi nhánh «Game đãi» được chọn — session-view truyền GameEntry
   * (pha panel) vào slot này; không còn nút mở overlay riêng. Vắng
   * slot thì nhánh Game đãi chỉ hiện khung chờ trống.
   */
  gamePanel?: ReactNode;
  /** Nhánh quyết toán được kiểm soát từ session-view (để game thoát về Chia đều). */
  mode?: 'equal' | 'game';
  onModeChange?: (mode: 'equal' | 'game') => void;
  /**
   * Hàng tổng ledger đang cùng khung → panel nhường kẻ đôi (về kẻ
   * đơn), giữ ≤1 cụm kẻ đôi/viewport (LK-22, INTERFACE-SPEC §1).
   */
  doubleRuleYielded?: boolean;
};

/**
 * Mục «Ai trả ai» — REDESIGN Pha 1 (SPEC Q5/D1/D2): khối quyết toán
 * chỉ còn MỘT component render duy nhất này. Mobile nằm trong luồng
 * cuộn của S2; desktop ≥1024px chính node này được CSS grid của
 * SessionView ghim cột phải — không còn aside/strip nhân bản DOM.
 *
 * Đầu mục là lựa chọn 2 nhánh «Chia đều (mặc định) | Game đãi»;
 * nhánh Game đãi chứa điểm mở game duy nhất. QR thanh toán KHÔNG còn
 * ở đây — Sheet 3 (payment-sheet.tsx) là nơi duy nhất chứa QR. Các
 * nút Sao chép/Chia sẻ ở chân panel đã gỡ về Sheet 4; lớp phiếu/
 * CompletionCard đã gỡ khỏi trình bày thường trực (Q1 — «Xuất phiếu»
 * ở menu ⋯ của S2 dựng phiếu khi bấm).
 */
export function SettlementPanel({
  session,
  balances,
  transfers,
  paidKeys,
  onOpenPayment,
  onEditMember,
  gamePanel,
  mode: controlledMode,
  onModeChange,
  doubleRuleYielded = false,
}: SettlementPanelProps) {
  const [internalMode, setInternalMode] = useState<'equal' | 'game'>('equal');
  const mode = controlledMode ?? internalMode;
  const setMode = (next: 'equal' | 'game') => {
    setInternalMode(next);
    onModeChange?.(next);
  };
  const paid = paidByMember(session);
  const owed = owedByMember(session);
  // Chốt chặn toàn vẹn: dữ liệu hợp lệ luôn cho tổng số dư = 0.
  const discrepancy = sumBalances(balances);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const colorOf = (id: string) => {
    const idx = session.members.findIndex((m) => m.id === id);
    return idx >= 0 ? (colors[idx] ?? 0) : 0;
  };
  const calmAccent = titleForcesStatic(session.title);
  const calmBtnClass = calmAccent
    ? 'bg-grey-900 text-white hover:bg-grey-800 active:bg-grey-800'
    : undefined;
  const totalTransfers = transfers.reduce((s, t) => s + t.amount, 0);
  const totalLocking = useSettleLock(totalTransfers);
  const hasExpenses = session.expenses.length > 0;
  const allSettled = transfers.length === 0 && hasExpenses;
  const canPlayGame = session.members.length >= 2;

  // Người nhận còn thiếu bank local — GOM theo người nhận thành MỘT
  // danh sách gọn (D11): mỗi người 1 hàng, tên + 1 nút «Nhập tài khoản».
  const missingRecipients = useMemo(() => {
    const byRecipient = new Map<string, { member: Member; count: number; total: number }>();
    for (const t of transfers) {
      const recipient = session.members.find((m) => m.id === t.toId);
      if (!recipient || hasBank(recipient)) continue;
      const entry = byRecipient.get(recipient.id) ?? { member: recipient, count: 0, total: 0 };
      entry.count += 1;
      entry.total += t.amount;
      byRecipient.set(recipient.id, entry);
    }
    return [...byRecipient.values()];
  }, [transfers, session.members]);

  return (
    <section aria-label="Quyết toán" className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {discrepancy !== 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-debt-bg px-4 py-3 text-base font-medium text-debt-ink"
        >
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Số dư chưa cân bằng: còn {formatVNDDisplay(Math.abs(discrepancy))} chưa có người chịu,
            nên quyết toán bên dưới chưa khớp hết. Hãy kiểm tra lại các khoản chi “Tuỳ chỉnh số
            tiền” — tổng các phần chia phải đúng bằng số tiền của khoản chi.
          </span>
        </p>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
            Ai trả ai
          </h2>
          {/* Lựa chọn 2 nhánh ở đầu mục (SPEC §1.4): Chia đều mặc định;
              Game đãi là điểm mở game duy nhất. */}
          <div
            className="grid grid-cols-2 gap-1 rounded-lg border border-line-strong bg-card p-1"
            role="radiogroup"
            aria-label="Cách quyết toán"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'equal'}
              onClick={() => setMode('equal')}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-bold transition duration-100 ease-[var(--ease-lock)]',
                mode === 'equal' ? 'bg-ink text-white' : 'text-ink hover:bg-brand-soft/60',
              )}
            >
              Chia đều
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'game'}
              aria-disabled={!canPlayGame || undefined}
              onClick={() => setMode('game')}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-bold transition duration-100 ease-[var(--ease-lock)]',
                mode === 'game' ? 'bg-ink text-white' : 'text-ink hover:bg-brand-soft/60',
                !canPlayGame && 'text-ink-2',
              )}
            >
              Game đãi
            </button>
          </div>
        </div>

        {mode === 'game' &&
          (canPlayGame ? (
            // Panel game mở NGAY tại mục thanh toán (Pha 2 §C2) — slot
            // do session-view truyền (GameEntry pha panel).
            <div className="mb-3 border-b border-line pb-3">{gamePanel}</div>
          ) : (
            <div className="mb-3 grid gap-2 border-b border-line pb-3">
              <PrimaryButton
                disabledReason="Cần ít nhất 2 thành viên để chơi game đãi."
                className={cn('w-full', calmBtnClass)}
              >
                Chơi game đãi
              </PrimaryButton>
            </div>
          ))}

        {allSettled ? (
          <p className="flex items-center gap-2 py-2 text-base font-medium text-ink">
            <IconCheck size={16} className="shrink-0 text-credit-solid" aria-hidden />
            Đã cân hết — không ai nợ ai
          </p>
        ) : transfers.length === 0 ? (
          <p className="py-2 text-base text-ink-2">Chưa có gì để quyết toán</p>
        ) : (
          <ul className="divide-y divide-line">
            {transfers.map((t, i) => {
              const recipient = session.members.find((m) => m.id === t.toId);
              const canQr = recipient !== undefined && hasBank(recipient);
              const isPaid = paidKeys.has(transferKey(t));
              return (
                <li key={`${t.fromId}-${t.toId}-${i}`} data-transfer-row={`${t.fromId}-${t.toId}`}>
                  <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                        <Avatar name={nameOf(t.fromId)} colorIndex={colorOf(t.fromId)} size={24} />
                        <span className="min-w-0 truncate font-semibold text-ink">
                          {nameOf(t.fromId)}
                        </span>
                      </span>
                      <IconSettleGlyph size={15} className="shrink-0 text-ink" aria-hidden />
                      <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                        <Avatar name={nameOf(t.toId)} colorIndex={colorOf(t.toId)} size={24} />
                        <span className="min-w-0 truncate font-semibold text-ink">
                          {nameOf(t.toId)}
                        </span>
                      </span>
                      {isPaid && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-credit-ink">
                          <IconCheck size={13} aria-hidden /> Đã trả
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="font-figure text-base font-bold whitespace-nowrap text-ink"
                        title={formatVNDDisplay(t.amount)}
                      >
                        {formatVNDDisplay(t.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPayment(i)}
                        aria-label={
                          canQr
                            ? `VietQR: ${nameOf(t.fromId)} trả ${nameOf(t.toId)}`
                            : `Thanh toán: ${nameOf(t.fromId)} trả ${nameOf(t.toId)}`
                        }
                        className={cn(
                          // Addendum §4: nút dòng lệnh là hành động phụ —
                          // nền trắng, viền hairline, chữ ink, icon QR màu
                          // brand. Cam đặc chỉ dành cho CTA chính.
                          'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 text-base font-bold text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand-deep',
                          calmBtnClass,
                        )}
                      >
                        <IconQr size={14} className="shrink-0 text-brand-600" />{' '}
                        {canQr ? 'VietQR' : 'Trả'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* D11: khối thiếu-QR gom thành 1 danh sách gọn — tên + 1 nút/người. */}
        {missingRecipients.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <h3 className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
              Chưa có QR trên máy này
            </h3>
            <ul className="divide-y divide-line">
              {missingRecipients.map(({ member, count, total }) => (
                <li
                  key={member.id}
                  className="flex min-h-[56px] items-center justify-between gap-2 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{member.name}</span>
                    <span className="block text-[13px] text-ink-2">
                      {count} lệnh · {formatVNDDisplay(total)}
                    </span>
                  </span>
                  <GhostButton onClick={() => onEditMember(member, { focusBank: true })}>
                    <IconPencil size={15} /> Nhập tài khoản
                  </GhostButton>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* «Số dư từng người» thu gọn trong cùng mục (details). Phiên
          CHƯA có khoản chi thì ẩn hẳn khối này + dòng Tổng chuyển
          (Addendum §6 / Seat 3 L4) — chỉ giữ «Chưa có gì để quyết
          toán» ở trên. Câu giải thích dấu +/- nằm TRONG nội dung khi
          mở ra (Seat 3 N11); summary chỉ còn nhãn + chevron. */}
      {hasExpenses && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
              Số dư từng người
            </span>
            <IconChevronDown
              size={14}
              aria-hidden
              className="shrink-0 text-muted transition-transform duration-100 ease-[var(--ease-lock)] group-open:rotate-180"
            />
          </summary>
          <p className="border-t border-line pt-2 text-xs text-ink-2">
            Dấu + là được nhận lại, dấu − là trả thêm.
          </p>
          <ul className="divide-y divide-line">
            {session.members.map((m, idx) => {
              const b = balances[m.id] ?? 0;
              return (
                <li
                  key={m.id}
                  className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={m.name} colorIndex={colors[idx] ?? 0} size={28} />
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold text-ink">{m.name}</p>
                      <p className="text-[13px] text-ink-2">
                        Đã trả{' '}
                        <span className="font-figure font-bold">
                          {formatVNDDisplay(paid[m.id] ?? 0)}
                        </span>
                        {' · Phải chịu '}
                        <span className="font-figure font-bold">
                          {formatVNDDisplay(owed[m.id] ?? 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-full',
                        b > 0 && 'bg-credit-solid',
                        b < 0 && 'bg-debt-solid',
                        b === 0 && 'bg-neutral-300',
                      )}
                    />
                    <span className="font-figure text-base font-bold whitespace-nowrap text-ink">
                      {b > 0 ? '+' : ''}
                      {formatVNDDisplay(b)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {hasExpenses && (
        <div>
          {doubleRuleYielded ? (
            <div className="border-t border-line" aria-hidden />
          ) : (
            <div className="double-rule" aria-hidden />
          )}
          <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
              Tổng chuyển
            </span>
            <span
              className={cn(
                'font-figure ml-auto text-2xl leading-none font-bold whitespace-nowrap text-ink',
                totalLocking && 'animate-settle-lock',
              )}
            >
              {formatVNDDisplay(totalTransfers)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

/** Tên cũ giữ làm alias cho mọi nơi gọi còn sót — component là một. */
export const Settlement = SettlementPanel;
