'use client';

import { IconCheck, IconLink, IconList, IconPencil, IconReceipt, IconTrash } from './icons';
import { buildShareUrl } from '@/lib/share';
import { expenseDraftKey } from '@/lib/storage';
import type { Expense, Member, Session, Transfer } from '@/lib/types';
import { GhostButton, PrimaryButton, copyText } from './ui-bits';
import { ExpenseEditor, type ExpenseSave } from './expense-editor';
import { MemberEditor, type MemberDraft } from './member-editor';
import { PaymentSheet } from './payment-sheet';
import { transferKey } from './session-progress';
import { SlipGrid } from './slip-card';
import { ConfirmDialog, Sheet } from './sheet';
import type { MemberEditState } from './session-view-helpers';
import { useState } from 'react';

export type SessionSheetsProps = {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
  memberEditing: MemberEditState;
  expenseEditing: Expense | 'new' | null;
  expenseAction: Expense | null;
  sessionActionOpen: boolean;
  shareOpen: boolean;
  exportOpen: boolean;
  paymentIndex: number | null;
  paidKeys: Set<string>;
  confirmDeleteSession: boolean;
  pendingDeleteMember: Member | null;
  pendingDeleteExpense: Expense | null;
  /** Người trả mặc định cho khoản mới: người trả gần nhất của phiên. */
  defaultPayerId?: string;
  saveMember: (draft: MemberDraft) => void;
  saveBulkMembers: (names: string[]) => void;
  openMember: (member: Member, focusBank?: boolean) => void;
  requestDeleteMember: (member: Member) => void;
  saveExpense: (draft: ExpenseSave) => void;
  applyExpenseDraft: (draft: ExpenseSave) => void;
  confirmDeleteMember: () => void;
  confirmDeleteExpense: () => void;
  setTransferPaid: (transfer: Transfer, paid: boolean) => void;
  onCloseMemberEditor: () => void;
  onCloseExpenseEditor: () => void;
  onCloseExpenseAction: () => void;
  onEditExpenseAction: (expense: Expense) => void;
  onExpandExpenseAction: (id: string) => void;
  onDeleteExpenseAction: (expense: Expense) => void;
  onCloseSessionActions: () => void;
  onSessionShare: () => void;
  onSessionExport: () => void;
  onSessionDeleteRequest: () => void;
  onCloseShare: () => void;
  onCloseExport: () => void;
  onClosePayment: () => void;
  onOpenPayment: (index: number) => void;
  onCancelDeleteSession: () => void;
  onConfirmDeleteSession: () => void;
  onCancelDeleteMember: () => void;
  onCancelDeleteExpense: () => void;
};

/**
 * Toàn bộ lớp phủ của S2 — REDESIGN Pha 1 (SPEC §2): Sheet 1 Khoản
 * chi, Sheet 2 Người, Sheet 3 Thanh toán (payment-sheet.tsx), Sheet 4
 * Chia sẻ, sheet «Xuất phiếu» (Q1 — phiếu chỉ dựng khi bấm), menu «⋯»
 * của phiên và ba hộp xác nhận xoá. State + handler thuộc SessionView;
 * module này chỉ wiring trình bày.
 */
export function SessionSheets(props: SessionSheetsProps) {
  const {
    session,
    balances,
    transfers,
    memberEditing,
    expenseEditing,
    expenseAction,
    sessionActionOpen,
    shareOpen,
    exportOpen,
    paymentIndex,
    paidKeys,
    confirmDeleteSession,
    pendingDeleteMember,
    pendingDeleteExpense,
    defaultPayerId,
    saveMember,
    saveBulkMembers,
    openMember,
    requestDeleteMember,
    saveExpense,
    applyExpenseDraft,
    confirmDeleteMember,
    confirmDeleteExpense,
    setTransferPaid,
    onCloseMemberEditor,
    onCloseExpenseEditor,
    onCloseExpenseAction,
    onEditExpenseAction,
    onExpandExpenseAction,
    onDeleteExpenseAction,
    onCloseSessionActions,
    onSessionShare,
    onSessionExport,
    onSessionDeleteRequest,
    onCloseShare,
    onCloseExport,
    onClosePayment,
    onOpenPayment,
    onCancelDeleteSession,
    onConfirmDeleteSession,
    onCancelDeleteMember,
    onCancelDeleteExpense,
  } = props;

  const paymentTransfer = paymentIndex !== null ? (transfers[paymentIndex] ?? null) : null;

  return (
    <>
      {/* Sheet 2 — Người */}
      <Sheet
        open={memberEditing !== null}
        onClose={onCloseMemberEditor}
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
            onCancel={onCloseMemberEditor}
          />
        )}
      </Sheet>

      {/* Sheet 1 — Khoản chi */}
      <Sheet
        open={expenseEditing !== null}
        onClose={onCloseExpenseEditor}
        title={expenseEditing === 'new' ? 'Thêm khoản chi' : 'Sửa khoản chi'}
        wide
      >
        {expenseEditing !== null && (
          <ExpenseEditor
            key={expenseEditing === 'new' ? 'new' : expenseEditing.id}
            members={session.members}
            initial={expenseEditing === 'new' ? undefined : expenseEditing}
            defaultPayerId={defaultPayerId}
            draftKey={expenseDraftKey(
              session.id,
              expenseEditing === 'new' ? null : expenseEditing.id,
            )}
            onSave={saveExpense}
            onSaveAndMore={applyExpenseDraft}
            onCancel={onCloseExpenseEditor}
          />
        )}
      </Sheet>

      {/* Expense Action Sheet — bảng hành động của hàng sổ */}
      <Sheet
        open={expenseAction !== null}
        onClose={onCloseExpenseAction}
        title={expenseAction ? expenseAction.title : 'Khoản chi'}
      >
        {expenseAction && (
          <div className="grid">
            <button
              type="button"
              onClick={() => onEditExpenseAction(expenseAction)}
              className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
            >
              <IconPencil size={16} aria-hidden /> Sửa khoản chi
            </button>
            <button
              type="button"
              onClick={() => onExpandExpenseAction(expenseAction.id)}
              className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
            >
              <IconList size={16} aria-hidden /> Xem phần chia từng người
            </button>
            <button
              type="button"
              onClick={() => onDeleteExpenseAction(expenseAction)}
              className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-debt-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-debt-bg"
            >
              <IconTrash size={16} aria-hidden /> Xoá khoản chi
            </button>
          </div>
        )}
      </Sheet>

      {/* Menu «⋯» của S2 (SPEC §2): Chia sẻ -> Sheet 4 · Xuất phiếu ->
          dựng phiếu khi bấm (Q1) · Xoá phiên (giữ hộp xác nhận). Mọi
          nút sao chép/chia sẻ rải rác khác đã gỡ về Sheet 4/Sheet 3. */}
      <Sheet open={sessionActionOpen} onClose={onCloseSessionActions} title="Cuộc chia này">
        <div className="grid">
          <button
            type="button"
            onClick={onSessionShare}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <IconLink size={16} aria-hidden /> Chia sẻ
          </button>
          <button
            type="button"
            onClick={onSessionExport}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <IconReceipt size={16} aria-hidden /> Xuất phiếu
          </button>
          <button
            type="button"
            onClick={onSessionDeleteRequest}
            className="flex min-h-[48px] items-center gap-2 border-t border-line rounded-lg px-2 text-left text-base font-semibold text-debt-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-debt-bg"
          >
            <IconTrash size={16} aria-hidden /> Xoá cuộc chia
          </button>
        </div>
      </Sheet>

      {/* Sheet 4 — Chia sẻ: nơi DUY NHẤT của hành động chia sẻ. */}
      <ShareSheet open={shareOpen} session={session} onClose={onCloseShare} />

      {/* Xuất phiếu (Q1): phiếu chỉ được DỰNG khi người dùng bấm —
          dùng lại SlipGrid/phieu sẵn có làm bộ dựng khi-xuất; không
          còn lớp phiếu thường trực trong workspace/quyết toán. */}
      <Sheet open={exportOpen} onClose={onCloseExport} title="Phiếu của phiên" wide>
        {exportOpen && (
          <SlipGrid
            session={session}
            balances={balances}
            transfers={transfers}
            onOpenQr={(index) => {
              onCloseExport();
              onOpenPayment(index);
            }}
          />
        )}
      </Sheet>

      {/* Sheet 3 — Thanh toán (nơi duy nhất chứa QR thanh toán). */}
      <PaymentSheet
        session={session}
        transfer={paymentTransfer}
        paid={paymentTransfer ? paidKeys.has(transferKey(paymentTransfer)) : false}
        onClose={onClosePayment}
        onSetPaid={setTransferPaid}
        onEditMember={(member) => {
          onClosePayment();
          openMember(member, true);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteSession}
        title="Xoá cuộc chia này?"
        message={`Cuộc chia "${session.title}" và mọi khoản chi sẽ bị xoá khỏi máy này. Bạn vẫn hoàn tác được ngay sau khi xoá.`}
        confirmLabel="Xoá cuộc chia"
        onCancel={onCancelDeleteSession}
        onConfirm={onConfirmDeleteSession}
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
        onCancel={onCancelDeleteMember}
        onConfirm={confirmDeleteMember}
      />
      <ConfirmDialog
        open={pendingDeleteExpense !== null}
        title="Xoá khoản chi này?"
        message={
          pendingDeleteExpense
            ? `Khoản chi "${pendingDeleteExpense.title}" sẽ bị xoá, số dư tính lại ngay. Bạn vẫn hoàn tác được ngay sau khi xoá.`
            : ''
        }
        confirmLabel="Xoá khoản chi"
        onCancel={onCancelDeleteExpense}
        onConfirm={confirmDeleteExpense}
      />
    </>
  );
}

/**
 * Sheet 4 — Chia sẻ phiên: link phiên + «Sao chép link» + đúng 1 dòng
 * DATA-04. Link dựng tại máy bằng buildShareUrl (lib/share) — payload
 * không chứa thông tin ngân hàng ở tầng schema (ADR-1).
 */
function ShareSheet({
  open,
  session,
  onClose,
}: {
  open: boolean;
  session: Session;
  onClose: () => void;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const url = open ? buildShareUrl(session) : '';

  async function handleCopy() {
    const ok = await copyText(url);
    setState(ok ? 'copied' : 'failed');
    if (ok) window.setTimeout(() => setState('idle'), 3000);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Chia sẻ phiên">
      <div className="grid gap-3">
        <p className="text-sm text-ink-2">Link không chứa thông tin ngân hàng.</p>
        <textarea
          readOnly
          aria-label="Link chia sẻ phiên"
          value={url}
          onFocus={(e) => e.target.select()}
          rows={4}
          className="w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 text-base break-all text-ink outline-none focus:border-brand-deep"
        />
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={handleCopy}>
            {state === 'copied' ? <IconCheck size={16} /> : <IconLink size={16} />}
            {state === 'copied' ? 'Đã copy link!' : 'Sao chép link'}
          </PrimaryButton>
          <GhostButton onClick={onClose}>Đóng</GhostButton>
        </div>
        <span className="sr-only" role="status">
          {state === 'copied' ? 'Đã sao chép link chia sẻ vào bộ nhớ tạm.' : ''}
        </span>
        {state === 'failed' && (
          <p role="alert" className="text-base font-medium text-debt-ink">
            Trình duyệt không cho copy tự động — hãy copy thủ công link ở trên.
          </p>
        )}
      </div>
    </Sheet>
  );
}
