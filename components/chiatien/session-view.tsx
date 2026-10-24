'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { IconPlus } from './icons';
import { newId } from '@/lib/id';
import { assignIdentityColors, normalizeMemberName } from '@/lib/identity';
import { computeBalances, sumBalances, totalSpent } from '@/lib/split';
import { buildSettlementText, simplifyDebts } from '@/lib/settle';
import { buildShareUrl } from '@/lib/share';
import type { Expense, Member, Session } from '@/lib/types';
import { GhostButton, PrimaryButton, StatusLine, copyText, useOnlineStatus } from './ui-bits';
import type { ExpenseSave } from './expense-editor';
import type { MemberDraft } from './member-editor';
import { SettlementPanel } from './settlement';
import { SessionAppBar } from './session-app-bar';
import { SessionLedger } from './session-ledger';
import { SessionMemberStrip } from './session-member-strip';
import { SessionSettlementStrip } from './session-settlement-strip';
import { SessionSheets } from './session-sheets';
import { expenseFromDraft, touch, type MemberEditState } from './session-view-helpers';
import {
  useSessionKeyboard,
  useStripExpansion,
  useStripHeightPublisher,
} from './session-view-hooks';

/**
 * Màn làm việc MỘT MÀN HÌNH (REDESIGN-V2, "Settlement in Sight"): bỏ
 * toàn bộ wizard/stepper/?buoc= (link cũ có ?buoc= bị bỏ qua lặng lẽ).
 * Mobile: AppBar 48px + Member Strip 56px + Ledger phẳng cuộn nội bộ +
 * Settlement Strip dính đáy (thu gọn = tổng + lệnh đầu; mở rộng tại chỗ
 * = SettlementPanel toàn văn, tối đa 70dvh, đẩy 1 history state).
 * Desktop ≥1024: lưới 2 cột — trái Command Bar + Member Strip + Ledger,
 * phải SettlementPanel thường trực (biến thể stacked) + StatusLine cuối cột.
 * Từ ARC-11, file này là composition root mỏng: giữ state của phiên,
 * dữ liệu dẫn xuất và handler nghiệp vụ; trình bày + hạ tầng tách ra
 * session-app-bar / session-member-strip / session-ledger /
 * session-settlement-strip / session-sheets / session-view-hooks /
 * session-view-helpers (xem docs/ARCHITECTURE.md).
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
  const expandedRef = useRef(startExpanded);
  const { expanded, expandStrip, collapseStrip } = useStripExpansion(startExpanded, expandedRef);
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
  // Luật nhường kẻ đôi (LK-22): hàng tổng ledger cùng khung → Strip/panel nhường.
  const [ledgerTotalVisible, setLedgerTotalVisible] = useState(false);
  const handleTotalVisibility = useCallback((visible: boolean) => {
    setLedgerTotalVisible(visible);
  }, []);
  const [deckNotice, setDeckNotice] = useState('');
  const [focusedExpenseId, setFocusedExpenseId] = useState<string | null>(null);
  const online = useOnlineStatus();
  const memberStripRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const balances = useMemo(() => computeBalances(session), [session]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const total = totalSpent(session);
  const discrepancy = sumBalances(balances);
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const allSettled = session.expenses.length > 0 && transfers.length === 0;
  const firstTransfer = transfers[0];

  useStripHeightPublisher(rootRef, dockRef);

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
    setShareUrl('');
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

  function addMember() {
    setMemberEditing({ kind: 'new', focusBank: false });
  }

  function addExpense() {
    setExpenseEditing('new');
  }

  function startTitleEdit() {
    setTitleDraft(session.title);
    setTitleEditing(true);
  }

  useSessionKeyboard({
    session,
    focusedExpenseId,
    onBack,
    expandedRef,
    collapseStrip,
    onOpenExpenseAction: (expense) => setExpenseAction(expense),
    onNewExpense: addExpense,
    onNewMember: addMember,
    onCopySettlement: handleCopySettlement,
  });

  /* ---------------- Các khối dùng chung ---------------- */
  const panelProps = {
    session,
    balances,
    transfers,
    doubleRuleYielded: ledgerTotalVisible,
    copied: settledCopied,
    copyFailed: settledCopyFailed,
    onCopy: handleCopySettlement,
    onShare: openShare,
    onEditMember: (m: Member, opts?: { focusBank?: boolean }) =>
      openMember(m, opts?.focusBank ?? false),
  };

  return (
    <div
      ref={rootRef}
      className="relative flex h-[calc(100dvh-104px)] min-w-0 flex-col overflow-x-clip min-[900px]:h-auto min-[900px]:min-h-0"
    >
      {/* Scrim paper 60% trên ledger khi dải mở rộng (mobile). */}
      {expanded && (
        <div aria-hidden className="absolute inset-0 z-10 bg-paper/60 min-[900px]:hidden" />
      )}

      <SessionAppBar
        title={session.title}
        editing={titleEditing}
        draft={titleDraft}
        onDraftChange={setTitleDraft}
        onStartEdit={startTitleEdit}
        onCommit={commitTitle}
        onOpenActions={() => setSessionActionOpen(true)}
      />

      <div className="grid min-h-0 min-w-0 flex-1 items-start min-[900px]:grid-cols-[minmax(0,1fr)_288px] min-[900px]:gap-8 lg:grid-cols-[minmax(0,640px)_320px] xl:grid-cols-[minmax(0,720px)_360px] xl:gap-12">
        <div className="flex min-h-0 min-w-0 flex-col self-stretch lg:self-auto">
          {/* Command Bar desktop */}
          <div className="hidden h-[52px] shrink-0 items-center gap-2 min-[900px]:flex">
            <PrimaryButton
              disabledReason={
                session.members.length === 0 ? 'Thêm ít nhất 1 người để ghi khoản chi' : undefined
              }
              onClick={addExpense}
            >
              <IconPlus size={16} aria-hidden /> Thêm khoản
            </PrimaryButton>
            <GhostButton onClick={addMember}>
              <IconPlus size={16} aria-hidden /> Thêm người
            </GhostButton>
            <span className="ml-auto flex items-center gap-4 text-xs text-ink-2">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-[12px] text-ink">
                  N
                </kbd>{' '}
                thêm khoản
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-[12px] text-ink">
                  M
                </kbd>{' '}
                thêm người
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-[12px] text-ink">
                  ⌘K
                </kbd>{' '}
                hành động
              </span>
            </span>
          </div>
          <SessionMemberStrip
            members={session.members}
            colors={colors}
            stripRef={memberStripRef}
            flash={stripFlash}
            onOpenMember={openMember}
            onAddMember={addMember}
          />
          <SessionLedger
            session={session}
            nameOf={nameOf}
            total={total}
            memberNotice={memberNotice}
            expandedExpenseId={expandedExpenseId}
            onFocusExpense={setFocusedExpenseId}
            onOpenExpenseAction={setExpenseAction}
            onAddMember={addMember}
            onAddExpense={addExpense}
            onTotalVisibility={handleTotalVisibility}
            allSettled={allSettled}
          />
        </div>

        {/* Cột quyết toán desktop — cùng SettlementPanel, biến thể stacked. */}
        <aside
          aria-label="Quyết toán"
          className="sticky top-6 hidden border-l border-line-strong pl-6 min-[900px]:block"
        >
          <h2 className="mb-3 font-display text-[25px] font-extrabold text-ink">Quyết toán</h2>
          <SettlementPanel {...panelProps} variant="stacked" />
          <StatusLine status={online} className="mt-4" />
        </aside>
      </div>

      <p className="mt-2 hidden h-8 shrink-0 items-center text-xs text-ink-2 min-[900px]:flex">
        N thêm khoản · M thêm người · ⌘K hành động của hàng · C copy quyết toán khi dải mở · Esc lùi
        lớp
      </p>

      <SessionSettlementStrip
        session={session}
        expanded={expanded}
        total={total}
        discrepancy={discrepancy}
        allSettled={allSettled}
        firstTransfer={firstTransfer}
        transfers={transfers}
        nameOf={nameOf}
        panelProps={panelProps}
        online={online}
        deckNotice={deckNotice}
        dockRef={dockRef}
        doubleRuleYielded={ledgerTotalVisible}
        onCollapse={() => collapseStrip()}
        onToggle={() => (expanded ? collapseStrip() : expandStrip())}
        onAddExpense={addExpense}
        onOpenShare={openShare}
        onFocusMembers={focusMemberStrip}
      />

      <SessionSheets
        session={session}
        total={total}
        memberEditing={memberEditing}
        expenseEditing={expenseEditing}
        expenseAction={expenseAction}
        sessionActionOpen={sessionActionOpen}
        shareOpen={shareOpen}
        shareState={shareState}
        shareUrl={shareUrl}
        confirmDeleteSession={confirmDeleteSession}
        pendingDeleteMember={pendingDeleteMember}
        pendingDeleteExpense={pendingDeleteExpense}
        saveMember={saveMember}
        saveBulkMembers={saveBulkMembers}
        openMember={openMember}
        requestDeleteMember={requestDeleteMember}
        saveExpense={saveExpense}
        applyExpenseDraft={applyExpenseDraft}
        confirmDeleteMember={confirmDeleteMember}
        confirmDeleteExpense={confirmDeleteExpense}
        handleCopyShareLink={handleCopyShareLink}
        onCloseMemberEditor={() => setMemberEditing(null)}
        onCloseExpenseEditor={() => setExpenseEditing(null)}
        onCloseExpenseAction={() => setExpenseAction(null)}
        onEditExpenseAction={(expense) => {
          setExpenseEditing(expense);
          setExpenseAction(null);
        }}
        onExpandExpenseAction={(id) => {
          setExpandedExpenseId(id);
          setExpenseAction(null);
        }}
        onDeleteExpenseAction={(expense) => {
          setPendingDeleteExpense(expense);
          setExpenseAction(null);
        }}
        onCloseSessionActions={() => setSessionActionOpen(false)}
        onSessionBack={() => {
          setSessionActionOpen(false);
          onBack();
        }}
        onSessionShare={() => {
          setSessionActionOpen(false);
          openShare();
        }}
        onSessionCopy={() => {
          setSessionActionOpen(false);
          void handleCopySettlement();
        }}
        onSessionRename={() => {
          setSessionActionOpen(false);
          startTitleEdit();
        }}
        onSessionDeleteRequest={() => {
          setSessionActionOpen(false);
          setConfirmDeleteSession(true);
        }}
        onCloseShare={() => setShareOpen(false)}
        onCancelDeleteSession={() => setConfirmDeleteSession(false)}
        onConfirmDeleteSession={() => {
          setConfirmDeleteSession(false);
          onDelete();
        }}
        onCancelDeleteMember={() => setPendingDeleteMember(null)}
        onCancelDeleteExpense={() => setPendingDeleteExpense(null)}
      />
    </div>
  );
}
