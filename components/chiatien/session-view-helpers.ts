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

/** Một phần đãi của một người trong kết quả ván game (báo từ game/entry). */
export interface GamePayment {
  payerId: string;
  amountVnd: number;
}

/**
 * Ghi kết quả game vào sổ — NGỮ NGHĨA ĐÃI (Addendum §1): người đãi
 * CHỊU 100% phần của mình, không bao giờ chia đều ngược cho cả nhóm.
 *
 * - Không có payment hợp lệ (số tiền > 0 và người đãi là thành viên)
 *   → trả null (không đổi gì).
 * - TRƯỜNG HỢP A — phiên ĐÃ có khoản chi và tổng game bằng đúng tổng
 *   các khoản hiện có: KHÔNG thêm khoản mới (tránh cộng trùng tổng
 *   hoá đơn); biến đổi MỌI khoản hiện có: giữ nguyên
 *   id/title/amount/payerId/createdAt, participantIds = mọi thành
 *   viên, mode 'custom', custom phân bổ amount của khoản theo tỉ lệ
 *   phần đãi của từng người đãi trong payments (floor từng phần bằng
 *   BigInt, phần dư +1 lần lượt cho các payment đầu — tổng khớp tuyệt
 *   đối). Hàm IDEMPOTENT: áp lần 2 với cùng payments cho kết quả y
 *   hệt lần 1 (phân bổ chỉ phụ thuộc amount + payments).
 * - TRƯỜNG HỢP B — phiên chưa có khoản, hoặc tổng game lệch tổng
 *   phiên: thêm 1 khoản «Game đãi — ván …» cho mỗi người đãi, người
 *   đãi trả và chịu 100% phần của mình (custom = { [payerId]: amount }).
 */
export function applyGameResult(
  expenses: Expense[],
  members: Member[],
  payments: GamePayment[],
  matchCode: string,
): Expense[] | null {
  const memberIds = members.map((m) => m.id);
  const memberSet = new Set(memberIds);
  const validPayments = payments.filter(
    (p) => p.amountVnd > 0 && Number.isFinite(p.amountVnd) && memberSet.has(p.payerId),
  );
  if (validPayments.length === 0) return null;
  const gameTotal = validPayments.reduce((s, p) => s + p.amountVnd, 0);
  const existingTotal = expenses.reduce((s, e) => s + e.amount, 0);

  if (expenses.length > 0 && gameTotal === existingTotal) {
    const total = BigInt(gameTotal);
    return expenses.map((e) => {
      const amount = BigInt(e.amount);
      const custom: Record<string, number> = {};
      let allocated = 0;
      for (const p of validPayments) {
        const share = Number((amount * BigInt(p.amountVnd)) / total);
        custom[p.payerId] = (custom[p.payerId] ?? 0) + share;
        allocated += share;
      }
      let remainder = e.amount - allocated;
      for (const p of validPayments) {
        if (remainder <= 0) break;
        custom[p.payerId] = (custom[p.payerId] ?? 0) + 1;
        remainder -= 1;
      }
      return {
        ...e,
        participantIds: [...memberIds],
        mode: 'custom' as const,
        weights: {},
        custom,
      };
    });
  }

  const additions = validPayments.map((p) =>
    expenseFromDraft({
      title: `Game đãi — ván ${matchCode}`,
      amount: p.amountVnd,
      payerId: p.payerId,
      participantIds: [...memberIds],
      mode: 'custom',
      custom: { [p.payerId]: p.amountVnd },
      weights: {},
    }),
  );
  return [...expenses, ...additions];
}
