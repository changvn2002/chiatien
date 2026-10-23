'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Link2,
  List,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { newId } from '@/lib/id';
import { assignIdentityColors, normalizeMemberName } from '@/lib/identity';
import { formatVND, formatVNDDisplay } from '@/lib/money';
import { computeBalances, computeShares, sumBalances, totalSpent } from '@/lib/split';
import { buildSettlementText, simplifyDebts } from '@/lib/settle';
import { buildShareUrl } from '@/lib/share';
import { expenseDraftKey } from '@/lib/storage';
import { hasBank } from '@/lib/vietqr';
import type { Expense, Member, Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Avatar,
  GhostButton,
  PrimaryButton,
  StatusLine,
  copyText,
  useOnlineStatus,
} from './ui-bits';
import { ExpenseEditor, type ExpenseSave } from './expense-editor';
import { MemberEditor, type MemberDraft } from './member-editor';
import { SettlementPanel } from './settlement';
import { ConfirmDialog, Sheet } from './sheet';

const MODE_LABELS: Record<Expense['mode'], string> = {
  equal: 'Chia đều',
  custom: 'Tuỳ chỉnh số tiền',
  shares: 'Theo phần',
};

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

type MemberEditState =
  { kind: 'new'; focusBank: boolean } | { kind: 'edit'; member: Member; focusBank: boolean } | null;

/**
 * Màn làm việc MỘT MÀN HÌNH (REDESIGN-V2, "Settlement in Sight"): bỏ
 * toàn bộ wizard/stepper/?buoc= (link cũ có ?buoc= bị bỏ qua lặng lẽ).
 * Mobile: AppBar 48px + Member Strip 56px + Ledger phẳng cuộn nội bộ +
 * Settlement Strip dính đáy (thu gọn = tổng + lệnh đầu; mở rộng tại chỗ
 * = SettlementPanel toàn văn, tối đa 70dvh, đẩy 1 history state).
 * Desktop ≥1024: lưới 2 cột — trái Command Bar + Member Strip + Ledger,
 * phải SettlementPanel thường trực (biến thể stacked) + StatusLine cuối cột.
 */
export function SessionView({
  session,
  startExpanded = false,
  onBack,
  onChange,
  onDelete,
  onNotifyUndo,
}: {
  session: Session;
  startExpanded?: boolean;
  onBack: () => void;
  onChange: (next: Session) => void;
  onDelete: () => void;
  onNotifyUndo: (label: string, undo: () => void) => void;
}) {
  const [expanded, setExpanded] = useState(startExpanded);
  const [memberEditing, setMemberEditing] = useState<MemberEditState>(null);
  const [expenseEditing, setExpenseEditing] = useState<Expense | 'new' | null>(null);
  const [expenseAction, setExpenseAction] = useState<Expense | null>(null);
  const [sessionActionOpen, setSessionActionOpen] = useState(false);
  const [memberNotice, setMemberNotice] = useState('');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [settledCopied, setSettledCopied] = useState(false);
  const [settledCopyFailed, setSettledCopyFailed] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [pendingDeleteMember, setPendingDeleteMember] = useState<Member | null>(null);
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState<Expense | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const [stripFlash, setStripFlash] = useState(false);
  const [deckNotice, setDeckNotice] = useState('');
  const [focusedExpenseId, setFocusedExpenseId] = useState<string | null>(null);
  const online = useOnlineStatus();
  const memberStripRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const pushedRef = useRef(false);

  const balances = useMemo(() => computeBalances(session), [session]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const total = totalSpent(session);
  const discrepancy = sumBalances(balances);
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const sortedExpenses = useMemo(
    () => [...session.expenses].sort((a, b) => b.createdAt - a.createdAt),
    [session.expenses],
  );
  const allSettled = session.expenses.length > 0 && transfers.length === 0;
  const firstTransfer = transfers[0];

  /* ---------------- Mở rộng dải + history + Esc theo lớp ---------------- */
  function expandStrip(push = true) {
    if (expandedRef.current) return;
    setExpanded(true);
    if (push && typeof window !== 'undefined') {
      window.history.pushState({ ctStrip: true }, '', window.location.href);
      pushedRef.current = true;
    }
  }
  function collapseStrip(fromPopState = false) {
    if (!expandedRef.current) return;
    setExpanded(false);
    if (!fromPopState && pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
  }

  useEffect(() => {
    if (startExpanded) {
      // Mở sẵn do import: cũng đẩy 1 history state để Back thu gọn trước.
      window.history.pushState({ ctStrip: true }, '', window.location.href);
      pushedRef.current = true;
    }
    function onPopState() {
      if (expandedRef.current) {
        pushedRef.current = false;
        setExpanded(false);
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // Chỉ chạy khi mount: startExpanded là điều kiện mở ban đầu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phím desktop (LAYOUT-SPEC §7) + Esc lùi lớp. Sheet tự xử lý Esc của nó
  // bằng listener capture + stopPropagation, nên handler này (bubble) chỉ
  // nhận Esc khi KHÔNG có sheet nào mở.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (expandedRef.current) collapseStrip();
        else onBack();
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(target?.isContentEditable);
      if (typing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const id =
          focusedExpenseId ??
          (document.activeElement as HTMLElement | null)
            ?.closest?.('[data-expense-row]')
            ?.getAttribute('data-expense-row') ??
          null;
        const expense = session.expenses.find((e) => e.id === id);
        if (expense) setExpenseAction(expense);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'n' || event.key === 'N') {
        if (session.members.length > 0) setExpenseEditing('new');
      } else if (event.key === 'm' || event.key === 'M') {
        setMemberEditing({ kind: 'new', focusBank: false });
      } else if (event.key === 'c' || event.key === 'C') {
        if (expandedRef.current) void handleCopySettlement();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // handleCopySettlement/onBack/collapseStrip đọc state qua ref/setter ổn
    // định; deps theo các giá trị dữ liệu mà handler thật sự dùng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, focusedExpenseId, onBack]);

  function patch(partial: Partial<Session>) {
    onChange(touch(session, partial));
  }

  /* ---------------- Thành viên ---------------- */
  function openMember(member: Member, focusBank = false) {
    setMemberEditing({ kind: 'edit', member, focusBank });
  }

  function saveMember(draft: MemberDraft) {
    if (memberEditing?.kind === 'new') {
      patch({ members: [...session.members, { id: newId(), ...draft }] });
    } else if (memberEditing?.kind === 'edit') {
      const id = memberEditing.member.id;
      patch({
        members: session.members.map((m) =>
          m.id === id ? { ...m, name: draft.name, bank: draft.bank } : m,
        ),
      });
    }
    setMemberEditing(null);
    setMemberNotice('');
  }

  function saveBulkMembers(names: string[]) {
    const created = names.map((name) => ({ id: newId(), name: normalizeMemberName(name) }));
    patch({ members: [...session.members, ...created] });
    setMemberEditing(null);
    setMemberNotice('');
  }

  function requestDeleteMember(member: Member) {
    const related = session.expenses.filter(
      (e) => e.payerId === member.id || e.participantIds.includes(member.id),
    );
    setMemberEditing(null);
    if (related.length > 0) {
      setMemberNotice(
        `Không xoá được ${member.name} vì đã có khoản chi liên quan: ${related
          .map((e) => `“${e.title}”`)
          .join(', ')}. Hãy sửa/xoá các khoản chi đó trước.`,
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

  /* ---------------- Khoản chi ---------------- */
  function applyExpenseDraft(draft: ExpenseSave) {
    if (draft.id) {
      patch({
        expenses: session.expenses.map((e) =>
          e.id === draft.id ? { ...e, ...draft, id: e.id, createdAt: e.createdAt } : e,
        ),
      });
    } else {
      patch({ expenses: [...session.expenses, expenseFromDraft(draft)] });
    }
  }

  function saveExpense(draft: ExpenseSave) {
    applyExpenseDraft(draft);
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

  /* ---------------- Copy / chia sẻ ---------------- */
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
    if (session.expenses.length === 0) {
      setDeckNotice('Có khoản chi đầu tiên rồi mới chia sẻ được');
      return;
    }
    setDeckNotice('');
    setShareState('idle');
    setShareOpen(true);
  }

  function focusMemberStrip() {
    memberStripRef.current?.scrollIntoView({ block: 'nearest' });
    memberStripRef.current?.focus({ preventScroll: true });
    setStripFlash(true);
    window.setTimeout(() => setStripFlash(false), 600);
  }

  function commitTitle() {
    const next = titleDraft.trim();
    setTitleEditing(false);
    if (next && next !== session.title) patch({ title: next });
    else setTitleDraft(session.title);
  }

  /* ---------------- Các khối dùng chung ---------------- */
  const panelProps = {
    session,
    balances,
    transfers,
    copied: settledCopied,
    copyFailed: settledCopyFailed,
    onCopy: handleCopySettlement,
    onShare: openShare,
    onEditMember: (m: Member, opts?: { focusBank?: boolean }) =>
      openMember(m, opts?.focusBank ?? false),
  };

  const memberStrip = (
    <div
      ref={memberStripRef}
      tabIndex={-1}
      aria-label="Thành viên"
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 outline-none',
        stripFlash && 'rounded-xl outline-2 outline-brand-deep',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
        {session.members.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            aria-label={m.name}
            title={m.name}
            onClick={() => openMember(m)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-card pr-3 pl-1 transition hover:border-line-strong"
          >
            <Avatar name={m.name} colorIndex={colors[idx] ?? 0} size={32} />
            <span className="max-w-[96px] truncate text-sm font-semibold text-ink">{m.name}</span>
            <span
              aria-hidden
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                hasBank(m) ? 'bg-credit' : 'border border-line-strong bg-transparent',
              )}
            />
            <span className="sr-only">{hasBank(m) ? 'Có QR' : 'Chưa có QR'}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMemberEditing({ kind: 'new', focusBank: false })}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-deep transition hover:text-ink"
      >
        <Plus size={16} aria-hidden /> Thêm
      </button>
    </div>
  );

  const emptyLedger =
    session.members.length === 0 ? (
      <div className="max-h-[240px] py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/products/brand/empty-state.webp"
          alt=""
          aria-hidden
          className="mb-2 max-h-[120px] w-auto"
          loading="lazy"
        />
        <p className="text-sm text-ink">Thêm người đầu tiên để bắt đầu ghi khoản chi.</p>
        <button
          type="button"
          onClick={() => setMemberEditing({ kind: 'new', focusBank: false })}
          className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl border border-line-strong bg-card px-4 font-display text-sm font-bold text-brand-deep transition hover:border-brand-deep"
        >
          <Plus size={16} aria-hidden /> Thêm người
        </button>
      </div>
    ) : session.expenses.length === 0 ? (
      <div className="max-h-[240px] py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/products/brand/empty-state.webp"
          alt=""
          aria-hidden
          className="mb-2 max-h-[120px] w-auto"
          loading="lazy"
        />
        <p className="text-sm text-ink">
          Chưa có khoản chi nào. Ghi khoản đầu tiên: ai trả, bao nhiêu, chia cho ai.
        </p>
        <button
          type="button"
          onClick={() => setExpenseEditing('new')}
          className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-xl border border-line-strong bg-card px-4 font-display text-sm font-bold text-brand-deep transition hover:border-brand-deep"
        >
          <Plus size={16} aria-hidden /> Thêm khoản chi
        </button>
      </div>
    ) : null;

  const ledger = (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto lg:flex-none lg:overflow-visible">
      {memberNotice && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{memberNotice}</span>
        </p>
      )}
      {emptyLedger}
      {session.expenses.length > 0 && (
        <>
          <ul className="divide-y divide-line border-t border-line">
            {sortedExpenses.map((e) => {
              const shares = computeShares(e);
              const isExpanded = expandedExpenseId === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    data-expense-row={e.id}
                    onFocus={() => setFocusedExpenseId(e.id)}
                    onClick={() => setExpenseAction(e)}
                    className="grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5 text-left lg:min-h-[56px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-ink">
                        {e.title}
                      </span>
                      <span className="block truncate text-[13px] text-ink-2">
                        {nameOf(e.payerId)} đã trả · {MODE_LABELS[e.mode]} cho{' '}
                        {e.participantIds.length} người
                      </span>
                    </span>
                    <span className="font-figure max-w-[136px] text-[15px] font-semibold whitespace-nowrap text-ink">
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
                          <span className="font-figure font-semibold whitespace-nowrap text-ink">
                            {formatVNDDisplay(shares[id] ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="double-rule mt-1" aria-hidden />
          <div className="flex min-h-[48px] items-center justify-between gap-3">
            <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
              Tổng chi · {session.expenses.length} khoản
            </span>
            <span className="font-figure text-[19px] font-bold whitespace-nowrap text-ink">
              {formatVNDDisplay(total)}
            </span>
          </div>
        </>
      )}
    </div>
  );

  const stripSummaryContent = (
    <>
      <span className="shrink-0 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
        Tổng
      </span>
      <span className="font-figure shrink-0 text-[19px] font-bold whitespace-nowrap text-ink">
        {formatVNDDisplay(total)}
      </span>
      {session.members.length === 0 ? (
        <span className="min-w-0 flex-1 truncate text-sm text-ink-2">Chưa có khoản chi nào</span>
      ) : session.expenses.length === 0 ? (
        <span className="min-w-0 flex-1 truncate text-sm text-ink-2">Chưa có gì để quyết toán</span>
      ) : allSettled ? (
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-ink">
          <Check size={15} className="shrink-0 text-credit" aria-hidden />
          <span className="truncate">Đã cân hết — không ai nợ ai</span>
        </span>
      ) : firstTransfer ? (
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-ink">
          <span className="min-w-0 truncate">{nameOf(firstTransfer.fromId)}</span>
          <MoveRight size={14} className="shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 truncate">{nameOf(firstTransfer.toId)}</span>
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

  return (
    <div className="relative flex h-[calc(100dvh-104px)] min-w-0 flex-col lg:h-auto lg:min-h-0">
      {/* Scrim paper 60% trên ledger khi dải mở rộng (mobile). */}
      {expanded && <div aria-hidden className="absolute inset-0 z-10 bg-paper/60 lg:hidden" />}

      {/* AppBar của Màn B: mark + tên cuộc chia (H1) + nút ⋯ */}
      <div className="flex h-12 shrink-0 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/products/brand/chiatien-logo.svg" alt="" aria-hidden width={28} height={28} />
        {titleEditing ? (
          <input
            aria-label="Tên cuộc chia"
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-line-strong bg-card px-2 py-1.5 font-display text-[19px] font-bold text-ink outline-none focus:border-brand-deep"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitleDraft(session.title);
              setTitleEditing(true);
            }}
            className="min-w-0 flex-1 rounded-xl px-1 text-left"
            title="Chạm để sửa tên cuộc chia"
          >
            <h1 className="truncate font-display text-[19px] leading-tight font-bold text-ink">
              {session.title}
            </h1>
          </button>
        )}
        <button
          type="button"
          aria-label="Hành động của cuộc chia"
          onClick={() => setSessionActionOpen(true)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-card"
        >
          <MoreHorizontal size={20} aria-hidden />
        </button>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 items-start lg:grid-cols-[minmax(0,640px)_320px] lg:gap-8 xl:grid-cols-[minmax(0,720px)_360px] xl:gap-12">
        <div className="flex min-h-0 min-w-0 flex-col self-stretch lg:self-auto">
          {/* Command Bar desktop */}
          <div className="hidden h-[52px] shrink-0 items-center gap-2 lg:flex">
            <PrimaryButton
              disabledReason={
                session.members.length === 0 ? 'Thêm ít nhất 1 người để ghi khoản chi' : undefined
              }
              onClick={() => setExpenseEditing('new')}
            >
              <Plus size={16} aria-hidden /> Thêm khoản
            </PrimaryButton>
            <GhostButton onClick={() => setMemberEditing({ kind: 'new', focusBank: false })}>
              <Plus size={16} aria-hidden /> Thêm người
            </GhostButton>
            <span className="ml-auto flex items-center gap-2 text-xs text-ink-2">
              <span>
                <kbd className="font-mono">N</kbd> thêm khoản
              </span>
              <span>
                <kbd className="font-mono">M</kbd> thêm người
              </span>
              <span>
                <kbd className="font-mono">⌘K</kbd> hành động
              </span>
            </span>
          </div>
          {memberStrip}
          {ledger}
        </div>

        {/* Cột quyết toán desktop — cùng SettlementPanel, biến thể stacked. */}
        <aside
          aria-label="Quyết toán"
          className="sticky top-6 hidden border-l border-line-strong pl-6 lg:block"
        >
          <h2 className="mb-3 font-display text-[19px] font-bold text-ink">Quyết toán</h2>
          <SettlementPanel {...panelProps} variant="stacked" />
          <StatusLine status={online} className="mt-4" />
        </aside>
      </div>

      <p className="mt-2 hidden h-8 shrink-0 items-center text-xs text-ink-2 lg:flex">
        N thêm khoản · M thêm người · ⌘K hành động của hàng · C copy quyết toán khi dải mở · Esc lùi
        lớp
      </p>

      {/* Settlement Strip mobile — layout thật dính đáy của cột flex. */}
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
                onClick={() => collapseStrip()}
                className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-deep transition hover:text-ink"
              >
                Thu gọn <ChevronDown size={15} aria-hidden />
              </button>
            </div>
            <SettlementPanel {...panelProps} variant="row" />
            <div className="pb-3" />
          </div>
        )}
        <StatusLine status={online} className="min-h-[28px] items-center" />
        <button
          type="button"
          data-strip-summary
          aria-expanded={expanded}
          onClick={() => (expanded ? collapseStrip() : expandStrip())}
          className="flex min-h-[36px] w-full flex-wrap items-center gap-x-2 gap-y-0.5 py-1 text-left"
        >
          {stripSummaryContent}
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-deep">
            Quyết toán
            {discrepancy !== 0 && (
              <span
                aria-label="Có cảnh báo lệch số dư"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-debt text-[11px] font-bold text-white"
              >
                !
              </span>
            )}
            {expanded ? <ChevronDown size={15} aria-hidden /> : <ChevronUp size={15} aria-hidden />}
          </span>
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
              onClick={() => setExpenseEditing('new')}
              className="w-full text-[15px]"
            >
              <Plus size={16} aria-hidden /> Thêm khoản
            </PrimaryButton>
          </div>
          <button
            type="button"
            aria-label="Chia sẻ link"
            aria-disabled={session.expenses.length === 0 || undefined}
            onClick={openShare}
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
            onClick={focusMemberStrip}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink transition hover:border-brand hover:text-brand-deep"
          >
            <Users size={18} aria-hidden />
          </button>
        </div>
      </section>

      {/* Member Sheet */}
      <Sheet
        open={memberEditing !== null}
        onClose={() => setMemberEditing(null)}
        title={memberEditing?.kind === 'edit' ? 'Sửa thành viên' : 'Thêm thành viên'}
      >
        {memberEditing !== null && (
          <MemberEditor
            key={memberEditing.kind === 'edit' ? memberEditing.member.id : 'new'}
            initial={memberEditing.kind === 'edit' ? memberEditing.member : undefined}
            members={session.members}
            autoEnableBank={memberEditing.focusBank}
            onSave={saveMember}
            onSaveBulk={saveBulkMembers}
            onOpenExisting={(m) => openMember(m)}
            onDeleteRequest={
              memberEditing.kind === 'edit'
                ? () => requestDeleteMember(memberEditing.member)
                : undefined
            }
            onCancel={() => setMemberEditing(null)}
          />
        )}
      </Sheet>

      {/* Expense Sheet */}
      <Sheet
        open={expenseEditing !== null}
        onClose={() => setExpenseEditing(null)}
        title={expenseEditing === 'new' ? 'Thêm khoản chi' : 'Sửa khoản chi'}
        wide
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
            onSaveAndMore={applyExpenseDraft}
            onCancel={() => setExpenseEditing(null)}
          />
        )}
      </Sheet>

      {/* Expense Action Sheet — bảng hành động của hàng ledger */}
      <Sheet
        open={expenseAction !== null}
        onClose={() => setExpenseAction(null)}
        title={expenseAction ? expenseAction.title : 'Khoản chi'}
      >
        {expenseAction && (
          <div className="grid">
            <button
              type="button"
              onClick={() => {
                setExpenseEditing(expenseAction);
                setExpenseAction(null);
              }}
              className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-ink transition hover:bg-paper"
            >
              <Pencil size={16} aria-hidden /> Sửa khoản chi
            </button>
            <button
              type="button"
              onClick={() => {
                setExpandedExpenseId(expenseAction.id);
                setExpenseAction(null);
              }}
              className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-ink transition hover:bg-paper"
            >
              <List size={16} aria-hidden /> Xem phần chia từng người
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingDeleteExpense(expenseAction);
                setExpenseAction(null);
              }}
              className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-debt transition hover:bg-debt/10"
            >
              <Trash2 size={16} aria-hidden /> Xoá khoản chi
            </button>
          </div>
        )}
      </Sheet>

      {/* Session Action Sheet — nơi DUY NHẤT chứa Xoá cuộc chia */}
      <Sheet
        open={sessionActionOpen}
        onClose={() => setSessionActionOpen(false)}
        title="Cuộc chia này"
      >
        <div className="grid">
          <button
            type="button"
            onClick={() => {
              setSessionActionOpen(false);
              onBack();
            }}
            className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-ink transition hover:bg-paper"
          >
            <Users size={16} aria-hidden /> Tất cả cuộc chia
          </button>
          <button
            type="button"
            onClick={() => {
              setSessionActionOpen(false);
              openShare();
            }}
            className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-ink transition hover:bg-paper"
          >
            <Link2 size={16} aria-hidden /> Chia sẻ link
          </button>
          <button
            type="button"
            onClick={() => {
              setSessionActionOpen(false);
              void handleCopySettlement();
            }}
            className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-ink transition hover:bg-paper"
          >
            <Copy size={16} aria-hidden /> Copy bản quyết toán
          </button>
          <button
            type="button"
            onClick={() => {
              setSessionActionOpen(false);
              setTitleDraft(session.title);
              setTitleEditing(true);
            }}
            className="flex min-h-[48px] items-center gap-2 rounded-xl px-2 text-left text-sm font-semibold text-ink transition hover:bg-paper"
          >
            <Pencil size={16} aria-hidden /> Đổi tên cuộc chia
          </button>
          <button
            type="button"
            onClick={() => {
              setSessionActionOpen(false);
              setConfirmDeleteSession(true);
            }}
            className="flex min-h-[48px] items-center gap-2 border-t border-line rounded-xl px-2 text-left text-sm font-semibold text-debt transition hover:bg-debt/10"
          >
            <Trash2 size={16} aria-hidden /> Xoá cuộc chia
          </button>
        </div>
      </Sheet>

      {/* Share Sheet — link chỉ mang thành viên, khoản chi và kết quả ai nợ ai (DATA-04). */}
      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Chia sẻ cuộc chia này">
        <p className="text-sm leading-relaxed text-ink">
          Link gồm thành viên, khoản chi và kết quả ai nợ ai. Thông tin ngân hàng không nằm trong
          link — mã QR chỉ hiện trên máy đã lưu tài khoản của người nhận.
        </p>
        <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-sm font-medium text-ink">
          Link sẽ chứa: {session.members.length} thành viên · {session.expenses.length} khoản chi ·
          tổng {formatVND(total)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ai có link đều mở xem và sửa tiếp được bản sao của riêng họ — và link không thu hồi được
          sau khi đã gửi, nên chỉ gửi cho người trong nhóm.
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
            <textarea
              readOnly
              aria-label="Link chia sẻ cuộc chia"
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-xl border border-line-strong bg-card px-3 py-2.5 text-base break-all text-ink outline-none focus:border-brand-deep"
              rows={3}
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
