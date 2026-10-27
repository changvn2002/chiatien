'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { newId } from '@/lib/id';
import { assignIdentityColors, normalizeMemberName } from '@/lib/identity';
import { computeBalances, totalSpent } from '@/lib/split';
import { simplifyDebts } from '@/lib/settle';
import type { Expense, Member, Session } from '@/lib/types';
import { useOnlineStatus } from './ui-bits';
import type { ExpenseSave } from './expense-editor';
import type { MemberDraft } from './member-editor';
import { InfoSheet } from './info-sheet';
import { SettlementPanel } from './settlement';
import { SessionAppBar } from './session-app-bar';
import { SessionLedger } from './session-ledger';
import { SessionMemberStrip } from './session-member-strip';
import { SessionDock } from './session-settlement-strip';
import { SessionSheets } from './session-sheets';
import { sessionProgress, usePaidTransfers } from './session-progress';
import {
  applyGameResult,
  expenseFromDraft,
  touch,
  type MemberEditState,
} from './session-view-helpers';
import { useSessionKeyboard, useStripHeightPublisher } from './session-view-hooks';
import { buildGameSessionInput } from '@/game/adapter';

// Game mode «Ai Đãi» (opt-in, tách hẳn): cổng game chỉ được nạp khi
// người dùng chọn nhánh «Game đãi» ở mục «Ai trả ai» — GameEntry pha
// panel render ngay trong mục đó qua slot của SettlementPanel (Pha 2
// §C2); dynamic ssr:false để Phaser/Howler/jsQR nằm trong lazy chunk
// riêng của game, không vào bundle route đầu (ARCH §1.1).
const GameEntry = dynamic(() => import('@/game/entry'), { ssr: false });

/**
 * S2 — Workspace phiên (REDESIGN Pha 1, SPEC §1.4/§2): MỘT màn cuộn
 * duy nhất, thứ tự cố định: header 1 hàng (back · tiêu đề sửa tại chỗ
 * · ? · menu ⋯) → mục Người → mục Sổ khoản chi → mục «Ai trả ai».
 * Quyết toán chỉ có MỘT SettlementPanel: mobile nằm trong luồng cuộn;
 * desktop ≥1024px chính node đó được lưới CSS ghim cột phải (Q5).
 * Dock đáy chỉ còn StatusLine + tóm tắt 1 dòng + CTA «+ Khoản chi».
 *
 * `startExpanded` là prop di sản của thời strip thu/mở (đã chết) —
 * giữ chữ ký cho các nơi gọi cũ, không còn tác dụng trình bày.
 */
export function SessionView({
  session,
  onBack,
  onChange,
  onDelete,
  onNotifyUndo,
  qrRequest = null,
}: {
  session: Session;
  /** Di sản strip cũ — không còn dùng (xem ghi chú đầu file). */
  startExpanded?: boolean;
  onBack: () => void;
  onChange: (next: Session) => void;
  onDelete: () => void;
  onNotifyUndo: (label: string, undo: () => void) => void;
  /** Yêu cầu mở QR chuyển tiếp từ lớp 1 người nhận (link -> phiếu -> QR). */
  qrRequest?: { index: number; nonce: number } | null;
}) {
  const [memberEditing, setMemberEditing] = useState<MemberEditState>(null);
  const [expenseEditing, setExpenseEditing] = useState<Expense | 'new' | null>(null);
  const [expenseAction, setExpenseAction] = useState<Expense | null>(null);
  const [sessionActionOpen, setSessionActionOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [paymentIndex, setPaymentIndex] = useState<number | null>(null);
  const [memberNotice, setMemberNotice] = useState('');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [pendingDeleteMember, setPendingDeleteMember] = useState<Member | null>(null);
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState<Expense | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const [ledgerTotalVisible, setLedgerTotalVisible] = useState(false);
  const [dockNotice, setDockNotice] = useState('');
  const [settlementMode, setSettlementMode] = useState<'equal' | 'game'>('equal');
  const [focusedExpenseId, setFocusedExpenseId] = useState<string | null>(null);
  const [stripFlash, setStripFlash] = useState(false);
  const online = useOnlineStatus();
  const memberStripRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const settlementRef = useRef<HTMLDivElement | null>(null);
  const qrNonceRef = useRef(0);

  const balances = useMemo(() => computeBalances(session), [session]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const total = totalSpent(session);
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const { paidKeys, setTransferPaid } = usePaidTransfers(session.id);
  const progress = useMemo(() => sessionProgress(session, paidKeys), [session, paidKeys]);
  const allSettled = progress.finished;
  // Người trả mặc định của khoản mới: người trả của khoản GẦN NHẤT
  // (theo createdAt), không có khoản nào thì thành viên đầu (chủ phiên).
  const defaultPayerId = useMemo(() => {
    const latest = [...session.expenses].sort((a, b) => b.createdAt - a.createdAt)[0];
    return latest?.payerId ?? session.members[0]?.id;
  }, [session.expenses, session.members]);

  useStripHeightPublisher(rootRef, dockRef);

  // Yêu cầu mở QR từ lớp 1: mở Sheet 3 của đúng lệnh (nonce chống lặp).
  useEffect(() => {
    if (!qrRequest || qrRequest.nonce === qrNonceRef.current) return;
    qrNonceRef.current = qrRequest.nonce;
    setPaymentIndex(qrRequest.index);
  }, [qrRequest]);

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

  /* ---------------- Điều hướng / hành động ---------------- */
  function commitTitle() {
    const next = titleDraft.trim();
    setTitleEditing(false);
    if (next && next !== session.title) patch({ title: next });
    else setTitleDraft(session.title);
  }

  function startTitleEdit() {
    setTitleDraft(session.title);
    setTitleEditing(true);
  }

  function addMember() {
    setMemberEditing({ kind: 'new', focusBank: false });
  }

  function addExpense() {
    if (session.members.length === 0) {
      // CTA không disabled (luật firstBlocker rút gọn ở dock): bấm khi
      // thiếu người -> lý do 1 dòng tại dock + focus về mục Người.
      setDockNotice('Thêm ít nhất 1 người để ghi khoản chi');
      memberStripRef.current?.scrollIntoView({ block: 'nearest' });
      setStripFlash(true);
      window.setTimeout(() => setStripFlash(false), 600);
      return;
    }
    setDockNotice('');
    setExpenseEditing('new');
  }

  function goSettlement() {
    settlementRef.current?.scrollIntoView({ block: 'start' });
  }

  /**
   * Game mode báo kết quả cần ghi — ngữ nghĩa ĐÃI do helper thuần
   * `applyGameResult` quyết định (Addendum §1): người đãi chịu 100%;
   * phiên đã có khoản và tổng game khớp tổng phiên thì áp kết quả
   * lên các khoản hiện có (không cộng trùng), ngược lại thêm khoản
   * «Game đãi — ván …». Game không tự ghi vào phiên.
   */
  function recordGameResult(payments: { payerId: string; amountVnd: number }[], matchCode: string) {
    const next = applyGameResult(session.expenses, session.members, payments, matchCode);
    if (next === null) return;
    patch({ expenses: next });
  }

  useSessionKeyboard({
    session,
    focusedExpenseId,
    onBack,
    onOpenExpenseAction: (expense) => setExpenseAction(expense),
    onNewExpense: addExpense,
    onNewMember: addMember,
  });

  const panelProps = {
    session,
    balances,
    transfers,
    paidKeys,
    doubleRuleYielded: ledgerTotalVisible,
    onOpenPayment: (index: number) => setPaymentIndex(index),
    onEditMember: (m: Member, opts?: { focusBank?: boolean }) =>
      openMember(m, opts?.focusBank ?? false),
    // Pha 2: nhánh quyết toán do SessionView giữ để game thoát là về
    // «Chia đều»; panel game mount qua slot — GameEntry tự chuyển
    // sang overlay full-screen khi ván bắt đầu.
    mode: settlementMode,
    onModeChange: setSettlementMode,
    gamePanel: (
      <GameEntry
        input={buildGameSessionInput(session)}
        onExit={() => setSettlementMode('equal')}
        onRecordLedgerPayments={recordGameResult}
        onOpenMembers={addMember}
      />
    ),
  };

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 flex-col">
      <SessionAppBar
        title={session.title}
        editing={titleEditing}
        draft={titleDraft}
        onDraftChange={setTitleDraft}
        onStartEdit={startTitleEdit}
        onCommit={commitTitle}
        onBack={onBack}
        onOpenInfo={() => setInfoOpen(true)}
        onOpenActions={() => setSessionActionOpen(true)}
      />

      {/* Lưới S2: mobile 1 cột theo đúng thứ tự Người -> Sổ -> Ai trả
          ai; desktop ≥1024px cột trái (Người + Sổ) và cột phải GHIM
          chính SettlementPanel duy nhất đó (Q5 — CSS định vị, không
          nhân bản DOM). */}
      {/* mb-6 giữ khoảng 24px trên dock khi nội dung dài — dock nay
          dùng mt-auto (neo đáy khi nội dung ngắn) nên khoảng đệm này
          chuyển từ margin của dock sang margin của lưới. */}
      <div className="mb-6 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="grid min-w-0 gap-6">
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
            onTotalVisibility={setLedgerTotalVisible}
          />
        </div>
        <div ref={settlementRef} className="min-w-0 scroll-mt-4 lg:sticky lg:top-6">
          <SettlementPanel {...panelProps} />
        </div>
      </div>

      <SessionDock
        sessionTitle={session.title}
        unpaidCount={progress.unpaidCount}
        unpaidTotal={progress.unpaidTotal}
        allSettled={allSettled}
        hasExpenses={session.expenses.length > 0}
        online={online}
        dockRef={dockRef}
        notice={dockNotice}
        onAddExpense={addExpense}
        onGoSettlement={goSettlement}
      />

      <InfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />

      <SessionSheets
        session={session}
        balances={balances}
        transfers={transfers}
        memberEditing={memberEditing}
        expenseEditing={expenseEditing}
        expenseAction={expenseAction}
        sessionActionOpen={sessionActionOpen}
        shareOpen={shareOpen}
        exportOpen={exportOpen}
        paymentIndex={paymentIndex}
        paidKeys={paidKeys}
        confirmDeleteSession={confirmDeleteSession}
        pendingDeleteMember={pendingDeleteMember}
        pendingDeleteExpense={pendingDeleteExpense}
        defaultPayerId={defaultPayerId}
        saveMember={saveMember}
        saveBulkMembers={saveBulkMembers}
        openMember={openMember}
        requestDeleteMember={requestDeleteMember}
        saveExpense={saveExpense}
        applyExpenseDraft={applyExpenseDraft}
        confirmDeleteMember={confirmDeleteMember}
        confirmDeleteExpense={confirmDeleteExpense}
        setTransferPaid={setTransferPaid}
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
        onSessionShare={() => {
          setSessionActionOpen(false);
          setShareOpen(true);
        }}
        onSessionExport={() => {
          setSessionActionOpen(false);
          setExportOpen(true);
        }}
        onSessionDeleteRequest={() => {
          setSessionActionOpen(false);
          setConfirmDeleteSession(true);
        }}
        onCloseShare={() => setShareOpen(false)}
        onCloseExport={() => setExportOpen(false)}
        onClosePayment={() => setPaymentIndex(null)}
        onOpenPayment={(index) => setPaymentIndex(index)}
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
