'use client';

import { useState } from 'react';
import { computeBalances } from '@/lib/split';
import { simplifyDebts } from '@/lib/settle';
import type { Session, Transfer } from '@/lib/types';

/**
 * Tiến độ quyết toán của một phiên — REDESIGN Pha 1 (SPEC §B/§1.4).
 *
 * SỰ THẬT MODEL (đọc code, không bịa): lib KHÔNG có trường «đã trả»
 * cho từng lệnh chuyển — Session chỉ có members + expenses; lệnh
 * chuyển là dữ kiện SUY RA (computeBalances -> simplifyDebts). Trạng
 * thái «đã trả» vì vậy sống ở tầng component như một sổ local
 * per-device (cùng tiền lệ dấu bản của phieu.ts): khoá
 * `chiatien:paid-transfers:v1:<sessionId>` chứa các khoá lệnh
 * `fromId>toId:amount`. KHÔNG vào Session, KHÔNG vào share payload
 * (DATA-04 giữ nguyên); lệnh đổi số tiền/người thì khoá cũ tự vô hiệu
 * vì không còn khớp lệnh hiện tại.
 */

const PAID_KEY_PREFIX = 'chiatien:paid-transfers:v1:';

/** Khoá định danh một lệnh chuyển trong sổ đã-trả local. */
export function transferKey(transfer: Transfer): string {
  return `${transfer.fromId}>${transfer.toId}:${transfer.amount}`;
}

export function loadPaidKeys(sessionId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(`${PAID_KEY_PREFIX}${sessionId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function savePaidKeys(sessionId: string, keys: Set<string>): void {
  try {
    window.localStorage.setItem(`${PAID_KEY_PREFIX}${sessionId}`, JSON.stringify([...keys]));
  } catch {
    // localStorage bị chặn — trạng thái đã-trả chỉ sống trong phiên mở này.
  }
}

/** Danh sách lệnh chuyển hiện tại của phiên (suy ra từ sổ, nguồn duy nhất). */
export function sessionTransfers(session: Session): Transfer[] {
  return simplifyDebts(computeBalances(session));
}

export interface SessionProgress {
  /** Tổng số lệnh chuyển hiện tại. */
  totalTransfers: number;
  /** Số lệnh đã đánh dấu đã trả trên máy này. */
  paidCount: number;
  /** Số lệnh chưa trả + tổng tiền chưa trả. */
  unpaidCount: number;
  unpaidTotal: number;
  /** Phiên «đang dở»: còn ít nhất 1 lệnh chưa trả. */
  unfinished: boolean;
  /** Phiên «đã xong»: có khoản chi và không còn lệnh chưa trả. */
  finished: boolean;
}

export function sessionProgress(session: Session, paidKeys?: Set<string>): SessionProgress {
  const transfers = sessionTransfers(session);
  const paid = paidKeys ?? loadPaidKeys(session.id);
  let paidCount = 0;
  let unpaidTotal = 0;
  for (const t of transfers) {
    if (paid.has(transferKey(t))) paidCount += 1;
    else unpaidTotal += t.amount;
  }
  const unpaidCount = transfers.length - paidCount;
  return {
    totalTransfers: transfers.length,
    paidCount,
    unpaidCount,
    unpaidTotal,
    unfinished: unpaidCount > 0,
    finished: session.expenses.length > 0 && unpaidCount === 0,
  };
}

/** «Đang dở» cho cổng mở app Q4 — đúng định nghĩa tiến độ ở trên. */
export function isSessionUnfinished(session: Session): boolean {
  return sessionProgress(session).unfinished;
}

/**
 * Hook giữ sổ đã-trả của phiên đang mở: nạp từ localStorage lúc mount,
 * ghi lại ngay khi đánh dấu. SessionView là nơi duy nhất dùng hook này;
 * danh sách phiên đọc thẳng qua sessionProgress().
 */
export function usePaidTransfers(sessionId: string) {
  // Sổ gắn theo sessionId bằng pattern state-kèm-id: đổi phiên thì
  // derive sổ của phiên mới ngay khi render, không cần effect đồng bộ
  // state (SessionView cũng được App mount lại theo key=id).
  const [state, setState] = useState<{ sessionId: string; keys: Set<string> }>(() => ({
    sessionId,
    keys: loadPaidKeys(sessionId),
  }));
  const paidKeys = state.sessionId === sessionId ? state.keys : loadPaidKeys(sessionId);

  function setTransferPaid(transfer: Transfer, paid: boolean) {
    const next = new Set(paidKeys);
    if (paid) next.add(transferKey(transfer));
    else next.delete(transferKey(transfer));
    savePaidKeys(sessionId, next);
    setState({ sessionId, keys: next });
  }

  return { paidKeys, setTransferPaid };
}
