import { newId } from '@/lib/id';
import type { Expense, Member, Session } from '@/lib/types';
import type { ExpenseSave } from './expense-editor';

/**
 * Helper thuần + type trạng thái của Session View (ARC-11): tách khỏi
 * session-view.tsx để file đó chỉ còn vai trò composition root. Các
 * hàm này cố ý để ngoài component (lint react-hooks/purity) như trước.
 */

/** Gắn mốc thời gian sửa đổi — để ngoài component cho lint react-hooks/purity. */
export function touch(session: Session, partial: Partial<Session>): Session {
  return { ...session, ...partial, updatedAt: Date.now() };
}

/** Tạo khoản chi mới từ draft của form — để ngoài component cho lint purity. */
export function expenseFromDraft(draft: ExpenseSave): Expense {
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

export type MemberEditState =
  { kind: 'new'; focusBank: boolean } | { kind: 'edit'; member: Member; focusBank: boolean } | null;
