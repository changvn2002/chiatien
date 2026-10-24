'use client';

import { IconCheck, IconCopy, IconLink, IconList, IconPencil, IconTrash, IconUsers } from './icons';
import { formatVND } from '@/lib/money';
import { expenseDraftKey } from '@/lib/storage';
import type { Expense, Member, Session } from '@/lib/types';
import { GhostButton, PrimaryButton } from './ui-bits';
import { ExpenseEditor, type ExpenseSave } from './expense-editor';
import { MemberEditor, type MemberDraft } from './member-editor';
import { ConfirmDialog, Sheet } from './sheet';
import type { MemberEditState } from './session-view-helpers';

export type SessionSheetsProps = {
  session: Session;
  total: number;
  memberEditing: MemberEditState;
  expenseEditing: Expense | 'new' | null;
  expenseAction: Expense | null;
  sessionActionOpen: boolean;
  shareOpen: boolean;
  shareState: 'idle' | 'copied' | 'failed';
  shareUrl: string;
  confirmDeleteSession: boolean;
  pendingDeleteMember: Member | null;
  pendingDeleteExpense: Expense | null;
  saveMember: (draft: MemberDraft) => void;
  saveBulkMembers: (names: string[]) => void;
  openMember: (member: Member, focusBank?: boolean) => void;
  requestDeleteMember: (member: Member) => void;
  saveExpense: (draft: ExpenseSave) => void;
  applyExpenseDraft: (draft: ExpenseSave) => void;
  confirmDeleteMember: () => void;
  confirmDeleteExpense: () => void;
  handleCopyShareLink: () => Promise<void>;
  onCloseMemberEditor: () => void;
  onCloseExpenseEditor: () => void;
  onCloseExpenseAction: () => void;
  onEditExpenseAction: (expense: Expense) => void;
  onExpandExpenseAction: (id: string) => void;
  onDeleteExpenseAction: (expense: Expense) => void;
  onCloseSessionActions: () => void;
  onSessionBack: () => void;
  onSessionShare: () => void;
  onSessionCopy: () => void;
  onSessionRename: () => void;
  onSessionDeleteRequest: () => void;
  onCloseShare: () => void;
  onCancelDeleteSession: () => void;
  onConfirmDeleteSession: () => void;
  onCancelDeleteMember: () => void;
  onCancelDeleteExpense: () => void;
};

/**
 * Toàn bộ lớp phủ của Màn B (ARC-11): Member Sheet, Expense Sheet,
 * bảng hành động của hàng sổ, bảng hành động của cuộc chia (nơi duy
 * nhất chứa Xoá cuộc chia), Share Sheet cảnh báo 2 lớp và ba hộp
 * thoại xác nhận xoá. State + handler vẫn thuộc SessionView; module
 * này chỉ wiring trình bày.
 */
export function SessionSheets(props: SessionSheetsProps) {
  const {
    session,
    total,
    memberEditing,
    expenseEditing,
    expenseAction,
    sessionActionOpen,
    shareOpen,
    shareState,
    shareUrl,
    confirmDeleteSession,
    pendingDeleteMember,
    pendingDeleteExpense,
    saveMember,
    saveBulkMembers,
    openMember,
    requestDeleteMember,
    saveExpense,
    applyExpenseDraft,
    confirmDeleteMember,
    confirmDeleteExpense,
    handleCopyShareLink,
    onCloseMemberEditor,
    onCloseExpenseEditor,
    onCloseExpenseAction,
    onEditExpenseAction,
    onExpandExpenseAction,
    onDeleteExpenseAction,
    onCloseSessionActions,
    onSessionBack,
    onSessionShare,
    onSessionCopy,
    onSessionRename,
    onSessionDeleteRequest,
    onCloseShare,
    onCancelDeleteSession,
    onConfirmDeleteSession,
    onCancelDeleteMember,
    onCancelDeleteExpense,
  } = props;
  return (
    <>
      {/* Member Sheet */}
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

      {/* Expense Sheet */}
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

      {/* Expense Action Sheet — bảng hành động của hàng ledger */}
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

      {/* Session Action Sheet — nơi DUY NHẤT chứa Xoá cuộc chia */}
      <Sheet open={sessionActionOpen} onClose={onCloseSessionActions} title="Cuộc chia này">
        <div className="grid">
          <button
            type="button"
            onClick={onSessionBack}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <IconUsers size={16} aria-hidden /> Tất cả cuộc chia
          </button>
          <button
            type="button"
            onClick={onSessionShare}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <IconLink size={16} aria-hidden /> Chia sẻ link
          </button>
          <button
            type="button"
            onClick={onSessionCopy}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <IconCopy size={16} aria-hidden /> Copy bản quyết toán
          </button>
          <button
            type="button"
            onClick={onSessionRename}
            className="flex min-h-[48px] items-center gap-2 rounded-lg px-2 text-left text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-paper"
          >
            <IconPencil size={16} aria-hidden /> Đổi tên cuộc chia
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

      {/* Share Sheet — cảnh báo 2 lớp (DATA-04(ii)): Lớp 1 headline +
      nút xác nhận trong viewport đầu; Lớp 2 tối đa 3 gạch đầu dòng
      ngay dưới headline. Link chỉ được tạo + copy SAU khi người dùng
      bấm «Tôi hiểu, tạo link» (handleCopyShareLink). */}
      <Sheet open={shareOpen} onClose={onCloseShare} title="Chia sẻ cuộc chia này">
        <p className="text-base leading-relaxed font-medium text-ink">
          Bất kỳ ai có link này đều xem và sửa được bản sao cuộc chia — và link không thu hồi được
          sau khi gửi.
        </p>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-base leading-relaxed text-ink-2">
          <li>
            Link chứa: {session.members.length} thành viên · {session.expenses.length} khoản chi ·
            tổng {formatVND(total)} — không chứa thông tin ngân hàng; mã QR chỉ hiện trên máy đã lưu
            tài khoản của người nhận.
          </li>
          <li>
            Người nhận mở link sẽ có bản sao trên máy của họ và sửa tiếp được — đối chiếu lại trước
            khi thanh toán theo.
          </li>
          <li>Chỉ gửi link cho người trong nhóm.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton onClick={handleCopyShareLink}>
            {shareState === 'copied' ? <IconCheck size={16} /> : <IconLink size={16} />}
            {shareState === 'copied' ? 'Đã copy link!' : 'Tôi hiểu, tạo link'}
          </PrimaryButton>
          <GhostButton onClick={onCloseShare}>Quay lại</GhostButton>
        </div>
        <span className="sr-only" role="status">
          {shareState === 'copied' ? 'Đã sao chép link chia sẻ vào bộ nhớ tạm.' : ''}
        </span>
        {shareState === 'failed' && shareUrl && (
          <div className="mt-3">
            <p className="mb-1.5 text-base text-muted">
              Trình duyệt không cho copy tự động — hãy copy thủ công link này:
            </p>
            <textarea
              readOnly
              aria-label="Link chia sẻ cuộc chia"
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 text-base break-all text-ink outline-none focus:border-brand-deep"
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
            ? `Khoản chi "${pendingDeleteExpense.title}" sẽ bị xoá và số dư quyết toán tính lại ngay. Bạn vẫn hoàn tác được ngay sau khi xoá.`
            : ''
        }
        confirmLabel="Xoá khoản chi"
        onCancel={onCancelDeleteExpense}
        onConfirm={confirmDeleteExpense}
      />
    </>
  );
}
