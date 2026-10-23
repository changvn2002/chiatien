'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Link2, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { newId } from '@/lib/id';
import { formatVND } from '@/lib/money';
import { computeBalances, computeShares, totalSpent } from '@/lib/split';
import { buildSettlementText, simplifyDebts } from '@/lib/settle';
import { buildShareUrl } from '@/lib/share';
import { expenseDraftKey } from '@/lib/storage';
import { hasBank } from '@/lib/vietqr';
import type { Expense, Member, Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Avatar,
  GhostButton,
  IconButton,
  OfflineNotice,
  PrimaryButton,
  copyText,
  useOnlineStatus,
} from './ui-bits';
import { ExpenseEditor, type ExpenseSave } from './expense-editor';
import { MemberEditor, type MemberDraft } from './member-editor';
import { Settlement } from './settlement';
import { ConfirmDialog, Sheet } from './sheet';

const MODE_LABELS: Record<Expense['mode'], string> = {
  equal: 'Chia đều',
  custom: 'Tuỳ chỉnh số tiền',
  shares: 'Theo phần',
};

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: 'Thành viên',
  2: 'Khoản chi',
  3: 'Thanh toán',
};

/** Bước suy từ dữ liệu khi mở một cuộc chia (LAYOUT-SPEC §7). */
function deriveStep(session: Session): Step {
  if (session.members.length === 0) return 1;
  if (session.expenses.length === 0) return 2;
  return 3;
}

function stepFromUrl(): Step | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('buoc');
  return v === '1' || v === '2' || v === '3' ? (Number(v) as Step) : null;
}

/** Gắn mốc thời gian sửa đổi — để ngoài component cho lint react-hooks/purity. */
function touch(session: Session, partial: Partial<Session>): Session {
  return { ...session, ...partial, updatedAt: Date.now() };
}

/** Tạo khoản chi mới từ draft của form — để ngoài component cho lint purity. */
function expenseFromDraft(draft: ExpenseSave): Expense {
  return {
    id: newId(),
    title: draft.title,
    amount: draft.amount,
    payerId: draft.payerId,
    participantIds: draft.participantIds,
    mode: draft.mode,
    custom: draft.custom,
    weights: draft.weights,
    createdAt: Date.now(),
  };
}

/**
 * Màn hình chi tiết một cuộc chia: wizard 3 bước (Thành viên → Khoản chi →
 * Thanh toán) + Settlement Rail dính luôn hiện kết quả rút gọn và CTA của
 * bước. Bước lưu ở ?buoc= để Back trình duyệt quay lại bước trước. Mọi thay
 * đổi đi qua onChange để app.tsx lưu bền vào localStorage.
 */
export function SessionView({
  session,
  initialStep,
  onChange,
  onDelete,
  onNotifyUndo,
}: {
  session: Session;
  initialStep?: Step;
  onChange: (next: Session) => void;
  onDelete: () => void;
  onNotifyUndo: (label: string, undo: () => void) => void;
}) {
  const [step, setStep] = useState<Step>(() => initialStep ?? stepFromUrl() ?? deriveStep(session));
  const [memberEditing, setMemberEditing] = useState<Member | 'new' | null>(null);
  const [expenseEditing, setExpenseEditing] = useState<Expense | 'new' | null>(null);
  const [memberNotice, setMemberNotice] = useState('');
  const [lockNotice, setLockNotice] = useState('');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [settledCopied, setSettledCopied] = useState(false);
  const [settledCopyFailed, setSettledCopyFailed] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [pendingDeleteMember, setPendingDeleteMember] = useState<Member | null>(null);
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState<Expense | null>(null);
  const online = useOnlineStatus();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const firstRenderRef = useRef(true);

  const balances = useMemo(() => computeBalances(session), [session]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const total = totalSpent(session);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';

  const canStep2 = session.members.length >= 1;
  const canStep3 = canStep2 && session.expenses.length >= 1;

  function lockReason(target: Step): string {
    if (target === 2 && !canStep2) return 'Thêm ít nhất 1 người để sang bước Khoản chi.';
    if (target === 3 && !canStep3)
      return canStep2
        ? 'Thêm ít nhất 1 khoản chi để sang bước Thanh toán.'
        : 'Thêm ít nhất 1 người và 1 khoản chi để sang bước Thanh toán.';
    return '';
  }

  function goStep(next: Step) {
    const reason = lockReason(next);
    if (reason) {
      setLockNotice(reason);
      return;
    }
    setLockNotice('');
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set('buoc', String(next));
    window.history.pushState(null, '', url);
  }

  // Back/Forward của trình duyệt di chuyển giữa các bước (không thoát cuộc chia).
  useEffect(() => {
    function onPopState() {
      const fromUrl = stepFromUrl();
      if (fromUrl) setStep(fromUrl);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Chuyển bước -> focus về dòng trạng thái của bước mới (A11Y-03).
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    statusRef.current?.focus({ preventScroll: true });
  }, [step]);

  function patch(partial: Partial<Session>) {
    onChange(touch(session, partial));
  }

  function saveMember(draft: MemberDraft) {
    if (memberEditing === 'new') {
      patch({ members: [...session.members, { id: newId(), ...draft }] });
    } else if (memberEditing) {
      patch({
        members: session.members.map((m) =>
          m.id === memberEditing.id ? { ...m, name: draft.name, bank: draft.bank } : m,
        ),
      });
    }
    setMemberEditing(null);
    setMemberNotice('');
  }

  function requestDeleteMember(member: Member) {
    const referenced = session.expenses.some(
      (e) => e.payerId === member.id || e.participantIds.includes(member.id),
    );
    if (referenced) {
      setMemberNotice(
        `Không xoá được ${member.name} vì đã có khoản chi liên quan. Hãy sửa/xoá các khoản chi đó trước.`,
      );
      return;
    }
    setPendingDeleteMember(member);
  }

  function confirmDeleteMember() {
    if (!pendingDeleteMember) return;
    const snapshot = session;
    const name = pendingDeleteMember.name;
    patch({ members: session.members.filter((m) => m.id !== pendingDeleteMember.id) });
    setPendingDeleteMember(null);
    onNotifyUndo(`Đã xoá thành viên ${name}`, () => onChange(snapshot));
  }

  function saveExpense(draft: ExpenseSave) {
    if (draft.id) {
      patch({
        expenses: session.expenses.map((e) =>
          e.id === draft.id ? { ...e, ...draft, id: e.id, createdAt: e.createdAt } : e,
        ),
      });
    } else {
      patch({ expenses: [...session.expenses, expenseFromDraft(draft)] });
    }
    setExpenseEditing(null);
  }

  function confirmDeleteExpense() {
    if (!pendingDeleteExpense) return;
    const snapshot = session;
    const title = pendingDeleteExpense.title;
    patch({ expenses: session.expenses.filter((x) => x.id !== pendingDeleteExpense.id) });
    setPendingDeleteExpense(null);
    onNotifyUndo(`Đã xoá khoản chi "${title}"`, () => onChange(snapshot));
  }

  async function handleCopySettlement() {
    const ok = await copyText(buildSettlementText(session, balances, transfers));
    setSettledCopied(ok);
    setSettledCopyFailed(!ok);
    if (ok) window.setTimeout(() => setSettledCopied(false), 2500);
  }

  async function handleCopyShareLink() {
    const url = buildShareUrl(session);
    setShareUrl(url);
    const ok = await copyText(url);
    setShareState(ok ? 'copied' : 'failed');
    if (ok) window.setTimeout(() => setShareState('idle'), 3000);
  }

  function openShare() {
    setShareState('idle');
    setShareOpen(true);
  }

  const firstTransfer = transfers[0];
  const transferSummary = firstTransfer
    ? `${nameOf(firstTransfer.fromId)} → ${nameOf(firstTransfer.toId)} ${formatVND(firstTransfer.amount)}${transfers.length > 1 ? ` +${transfers.length - 1} lệnh` : ''}`
    : null;

  const railSummary =
    step === 1 && !canStep2
      ? 'Thêm ít nhất 1 người để tiếp tục'
      : step === 2 && !canStep3
        ? 'Thêm ít nhất 1 khoản chi để tiếp tục'
        : (transferSummary ??
          (session.expenses.length > 0
            ? 'Đã cân bằng — không ai nợ ai'
            : `${session.members.length} người · chưa có khoản chi`));

  const stepCta =
    step === 1 ? (
      <PrimaryButton disabled={!canStep2} onClick={() => goStep(2)} className="shrink-0">
        Tiếp tục: Khoản chi
      </PrimaryButton>
    ) : step === 2 ? (
      <PrimaryButton disabled={!canStep3} onClick={() => goStep(3)} className="shrink-0">
        Tiếp tục: Thanh toán
      </PrimaryButton>
    ) : null;

  return (
    <div className="pb-32 lg:pb-0">
      {/* Tiêu đề phiên — 2 dòng riêng để không phần tử nào ép ngang 390px (panel §7.1). */}
      <div>
        <input
          aria-label="Tên cuộc chia"
          className="-mx-2 w-[calc(100%+1rem)] min-w-0 rounded-xl border border-transparent bg-transparent px-2 py-1.5 font-display text-2xl font-bold text-ink outline-none transition focus:border-line-strong focus:bg-card sm:text-[28px]"
          value={session.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <GhostButton onClick={openShare}>
            <Link2 size={16} /> Chia sẻ link
          </GhostButton>
          <GhostButton
            onClick={() => setConfirmDeleteSession(true)}
            className="hover:border-debt hover:text-debt"
          >
            <Trash2 size={16} /> Xoá
          </GhostButton>
        </div>
      </div>

      {/* Stepper dính — điều hướng thật giữa 3 bước. */}
      <nav
        aria-label="Các bước của cuộc chia"
        className="sticky top-0 z-30 -mx-4 mt-4 border-y border-line bg-rail px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border"
      >
        <ol className="flex h-[52px] items-center">
          {([1, 2, 3] as Step[]).map((n, idx) => {
            const done = n < step;
            const active = n === step;
            const locked = lockReason(n) !== '';
            return (
              <li key={n} className={cn('flex items-center', idx < 2 && 'min-w-0 flex-1')}>
                <button
                  type="button"
                  aria-current={active ? 'step' : undefined}
                  aria-disabled={locked || undefined}
                  onClick={() => goStep(n)}
                  className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full pr-1"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold',
                      done && 'bg-credit text-white',
                      active && 'bg-brand text-white',
                      !done && !active && 'border border-line-strong bg-card text-muted',
                    )}
                  >
                    {done ? <Check size={14} /> : n}
                  </span>
                  <span
                    className={cn(
                      'truncate font-display text-sm font-bold',
                      active ? 'text-ink' : 'text-muted',
                    )}
                  >
                    {STEP_LABELS[n]}
                  </span>
                </button>
                {idx < 2 && (
                  <span aria-hidden className="mx-1 min-w-3 flex-1 border-t border-line" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {lockNotice && (
        <p role="status" className="mt-2 text-sm font-medium text-brand-deep">
          {lockNotice}
        </p>
      )}

      <div className="items-start gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div key={step} className="animate-step-in mt-5 min-w-0 lg:max-w-[720px]">
          {step === 1 && (
            <section aria-label="Thành viên">
              <p ref={statusRef} tabIndex={-1} className="mb-3 text-sm text-muted outline-none">
                {session.members.length} người · Ai nhận tiền qua QR thì lưu tài khoản ngay trên máy
                của mình.
              </p>
              {memberNotice && (
                <p
                  role="alert"
                  className="mb-3 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
                >
                  <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>{memberNotice}</span>
                </p>
              )}
              {session.members.length === 0 ? (
                <p className="rounded-2xl border border-line bg-card p-5 text-sm text-muted shadow-[var(--shadow-card)]">
                  Chưa có thành viên nào. Thêm người vào để bắt đầu ghi khoản chi.
                </p>
              ) : (
                <div className="rounded-2xl border border-line bg-card px-4 shadow-[var(--shadow-card)] sm:px-5">
                  <ul className="divide-y divide-line">
                    {session.members.map((m) => (
                      <li key={m.id} className="flex min-w-0 items-center gap-3 py-3">
                        <Avatar id={m.id} name={m.name} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{m.name}</p>
                          <p className="truncate text-xs text-muted">
                            {hasBank(m)
                              ? 'Đã lưu ngân hàng trên máy này — có VietQR tại đây'
                              : 'Chưa lưu ngân hàng trên máy này — chưa có VietQR tại đây'}
                          </p>
                        </div>
                        <IconButton title={`Sửa ${m.name}`} onClick={() => setMemberEditing(m)}>
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          title={`Xoá ${m.name}`}
                          danger
                          onClick={() => requestDeleteMember(m)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => setMemberEditing('new')}
                className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-card font-display text-sm font-bold text-brand-deep transition hover:border-brand-deep active:bg-brand-soft/50"
              >
                <Plus size={16} /> Thêm người
              </button>
            </section>
          )}

          {step === 2 && (
            <section aria-label="Khoản chi">
              <p ref={statusRef} tabIndex={-1} className="mb-3 text-sm text-muted outline-none">
                {session.expenses.length} khoản · Tổng{' '}
                <span className="font-display font-bold text-ink">{formatVND(total)}</span>
              </p>
              {session.members.length === 0 ? (
                <p className="rounded-2xl border border-line bg-card p-5 text-sm text-muted shadow-[var(--shadow-card)]">
                  Cần có thành viên trước khi ghi khoản chi.
                </p>
              ) : session.expenses.length === 0 ? (
                <p className="rounded-2xl border border-line bg-card p-5 text-sm text-muted shadow-[var(--shadow-card)]">
                  Chưa có khoản chi nào. Ghi khoản đầu tiên: ai trả, bao nhiêu, chia cho ai.
                </p>
              ) : (
                <div className="rounded-2xl border border-line bg-card px-4 shadow-[var(--shadow-card)] sm:px-5">
                  <ul className="divide-y divide-line">
                    {[...session.expenses]
                      .sort((a, b) => a.createdAt - b.createdAt)
                      .map((e) => {
                        const shares = computeShares(e);
                        const expanded = expandedExpenseId === e.id;
                        return (
                          <li key={e.id} className="py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => setExpandedExpenseId(expanded ? null : e.id)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span className="block truncate font-semibold text-ink">
                                  {e.title}
                                </span>
                                <span className="block truncate text-sm text-muted">
                                  <strong className="font-semibold text-ink">
                                    {nameOf(e.payerId)}
                                  </strong>{' '}
                                  đã trả · {MODE_LABELS[e.mode]} cho {e.participantIds.length} người
                                </span>
                              </button>
                              <span className="font-display text-base font-bold whitespace-nowrap text-ink">
                                {formatVND(e.amount)}
                              </span>
                              <ChevronDown
                                size={16}
                                aria-hidden
                                className={cn(
                                  'shrink-0 text-muted transition-transform',
                                  expanded && 'rotate-180',
                                )}
                              />
                              <IconButton
                                title="Sửa khoản chi"
                                onClick={() => setExpenseEditing(e)}
                              >
                                <Pencil size={16} />
                              </IconButton>
                              <IconButton
                                title="Xoá khoản chi"
                                danger
                                onClick={() => setPendingDeleteExpense(e)}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </div>
                            {expanded && (
                              <ul className="mt-2 grid gap-1 border-t border-line pt-2">
                                {e.participantIds.map((id) => (
                                  <li
                                    key={id}
                                    className="flex min-w-0 items-baseline justify-between gap-3 text-xs text-muted"
                                  >
                                    <span className="min-w-0 truncate">{nameOf(id)}</span>
                                    <span className="font-display text-xs font-bold whitespace-nowrap text-ink">
                                      {formatVND(shares[id] ?? 0)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
              {session.members.length >= 1 && (
                <button
                  type="button"
                  onClick={() => setExpenseEditing('new')}
                  className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-card font-display text-sm font-bold text-brand-deep transition hover:border-brand-deep active:bg-brand-soft/50"
                >
                  <Plus size={16} /> Thêm khoản chi
                </button>
              )}
            </section>
          )}

          {step === 3 && (
            <>
              <p ref={statusRef} tabIndex={-1} className="sr-only">
                Bước 3: Thanh toán
              </p>
              {session.members.length > 0 && session.expenses.length > 0 ? (
                <Settlement
                  session={session}
                  balances={balances}
                  transfers={transfers}
                  copied={settledCopied}
                  copyFailed={settledCopyFailed}
                  onCopy={handleCopySettlement}
                  onShare={openShare}
                  onEditMember={(m) => setMemberEditing(m)}
                  offlineNotice={<OfflineNotice status={online} className="mb-3 hidden lg:flex" />}
                />
              ) : (
                <p className="rounded-2xl border border-line bg-card p-5 text-sm text-muted shadow-[var(--shadow-card)]">
                  Cần có thành viên và ít nhất một khoản chi để xem quyết toán.
                </p>
              )}
            </>
          )}
        </div>

        {/* Settlement Rail desktop — cột phải dính; ẩn ở bước 3 (nội dung đã là chính văn). */}
        {step !== 3 && (
          <aside
            aria-label="Tóm tắt quyết toán"
            className="sticky top-[68px] mt-5 hidden rounded-2xl border border-line bg-rail p-4 lg:block"
          >
            <OfflineNotice status={online} className="mb-2" />
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Tổng chi</p>
            <p className="mt-0.5 font-display text-xl font-extrabold text-ink">
              {formatVND(total)}
            </p>
            <p className="mt-1 truncate text-sm text-muted">{railSummary}</p>
            <div className="mt-4">
              <PrimaryButton
                className="w-full"
                disabled={step === 1 ? !canStep2 : !canStep3}
                onClick={() => goStep(step === 1 ? 2 : 3)}
              >
                {step === 1 ? 'Tiếp tục: Khoản chi' : 'Tiếp tục: Thanh toán'}
              </PrimaryButton>
            </div>
          </aside>
        )}
      </div>

      {/* Settlement Rail mobile — dính đáy, CTA của bước luôn trong tầm tay. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-rail lg:hidden">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-2.5">
          <OfflineNotice status={online} className="mb-1.5" />
          {step === 3 ? (
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {transfers.length > 0 ? `Còn ${transfers.length} lần chuyển` : 'Đã cân bằng'}
              </p>
              <PrimaryButton onClick={handleCopySettlement} className="shrink-0">
                {settledCopied ? <Check size={16} /> : <Copy size={16} />}
                {settledCopied ? 'Đã copy!' : 'Copy bản quyết toán'}
              </PrimaryButton>
              <GhostButton onClick={openShare} className="shrink-0 bg-rail">
                Chia sẻ link
              </GhostButton>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold whitespace-nowrap text-ink">
                  Tổng chi {formatVND(total)}
                </p>
                <p className="truncate text-xs text-muted">{railSummary}</p>
              </div>
              {stepCta}
            </div>
          )}
        </div>
      </div>

      {/* Sheet sửa/thêm thành viên */}
      <Sheet
        open={memberEditing !== null}
        onClose={() => setMemberEditing(null)}
        title={memberEditing === 'new' ? 'Thêm thành viên' : 'Sửa thành viên'}
        tinted
      >
        {memberEditing !== null && (
          <MemberEditor
            key={memberEditing === 'new' ? 'new' : memberEditing.id}
            initial={memberEditing === 'new' ? undefined : memberEditing}
            onSave={saveMember}
            onCancel={() => setMemberEditing(null)}
          />
        )}
      </Sheet>

      {/* Sheet sửa/thêm khoản chi */}
      <Sheet
        open={expenseEditing !== null}
        onClose={() => setExpenseEditing(null)}
        title={expenseEditing === 'new' ? 'Thêm khoản chi' : 'Sửa khoản chi'}
        wide
        tinted
      >
        {expenseEditing !== null && (
          <ExpenseEditor
            key={expenseEditing === 'new' ? 'new' : expenseEditing.id}
            members={session.members}
            initial={expenseEditing === 'new' ? undefined : expenseEditing}
            draftKey={expenseDraftKey(
              session.id,
              expenseEditing === 'new' ? null : expenseEditing.id,
            )}
            onSave={saveExpense}
            onCancel={() => setExpenseEditing(null)}
          />
        )}
      </Sheet>

      {/* ShareSheet — link chỉ mang thành viên, khoản chi và kết quả ai nợ ai (DATA-04). */}
      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Chia sẻ cuộc chia này">
        <p className="text-sm leading-relaxed text-ink">
          Link gồm thành viên, khoản chi và kết quả ai nợ ai. Thông tin ngân hàng không nằm trong
          link — mã QR chỉ hiện trên máy đã lưu tài khoản của người nhận.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton onClick={handleCopyShareLink}>
            {shareState === 'copied' ? <Check size={16} /> : <Link2 size={16} />}
            {shareState === 'copied' ? 'Đã copy link!' : 'Copy link'}
          </PrimaryButton>
          <GhostButton onClick={() => setShareOpen(false)}>Huỷ</GhostButton>
        </div>
        <span className="sr-only" role="status">
          {shareState === 'copied' ? 'Đã sao chép link chia sẻ vào bộ nhớ tạm.' : ''}
        </span>
        {shareState === 'failed' && shareUrl && (
          <div className="mt-3">
            <p className="mb-1.5 text-sm text-muted">
              Trình duyệt không cho copy tự động — hãy copy thủ công link này:
            </p>
            <input
              readOnly
              aria-label="Link chia sẻ cuộc chia"
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-xl border border-line-strong bg-card px-3 py-2.5 text-base break-all text-ink outline-none focus:border-brand-deep"
            />
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDeleteSession}
        title="Xoá cuộc chia này?"
        message={`Cuộc chia "${session.title}" cùng mọi khoản chi trong đó sẽ bị xoá khỏi máy này. Bạn vẫn hoàn tác được ngay sau khi xoá.`}
        confirmLabel="Xoá cuộc chia"
        onCancel={() => setConfirmDeleteSession(false)}
        onConfirm={() => {
          setConfirmDeleteSession(false);
          onDelete();
        }}
      />
      <ConfirmDialog
        open={pendingDeleteMember !== null}
        title="Xoá thành viên này?"
        message={
          pendingDeleteMember
            ? `Thành viên ${pendingDeleteMember.name} sẽ bị xoá khỏi cuộc chia. Bạn vẫn hoàn tác được ngay sau khi xoá.`
            : ''
        }
        confirmLabel="Xoá thành viên"
        onCancel={() => setPendingDeleteMember(null)}
        onConfirm={confirmDeleteMember}
      />
      <ConfirmDialog
        open={pendingDeleteExpense !== null}
        title="Xoá khoản chi này?"
        message={
          pendingDeleteExpense
            ? `Khoản chi "${pendingDeleteExpense.title}" sẽ bị xoá và số dư quyết toán tính lại ngay. Bạn vẫn hoàn tác được ngay sau khi xoá.`
            : ''
        }
        confirmLabel="Xoá khoản chi"
        onCancel={() => setPendingDeleteExpense(null)}
        onConfirm={confirmDeleteExpense}
      />
    </div>
  );
}
