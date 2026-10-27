'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Expense, Session } from '@/lib/types';

/**
 * C1 settle-lock (INTERFACE-SPEC §3, REDESIGN-V3): trả về `true` trong
 * cửa sổ 240ms của một lần khoá — nơi gọi gắn class `animate-settle-lock`
 * cho Ô SỐ quyết toán khi cờ này bật. Giá trị hiển thị LUÔN cập nhật
 * ngay theo dữ liệu (hook không giữ/giấu số); chỉ ANIMATION mới được
 * gộp debounce. Lần render đầu không khoá (chưa có thay đổi).
 * Cấm count-up tuyệt đối (C9): số không bao giờ chạy qua giá trị dở.
 */
export function useSettleLock(value: number): boolean {
  const [locking, setLocking] = useState(false);
  const stateRef = useRef({ seen: false, animating: false, pending: false });
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const st = stateRef.current;
    if (!st.seen) {
      st.seen = true;
      return;
    }
    if (st.animating) {
      st.pending = true;
      return;
    }
    const start = () => {
      st.animating = true;
      setLocking(true);
      timerRef.current = window.setTimeout(() => {
        st.animating = false;
        setLocking(false);
        if (st.pending) {
          st.pending = false;
          start();
        }
      }, 240);
    };
    start();
  }, [value]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return locking;
}

/**
 * Xuất bản --strip-h cho Sheet (Finding E): sheet neo đáy tại đỉnh
 * DOCK của S2 để dock (tóm tắt + CTA chính) luôn lộ diện khi sheet mở.
 *
 * REDESIGN Pha 1: strip thu/mở đã chết — mốc neo nay là ĐỈNH DOCK
 * dính đáy. Giá trị xuất bản = khoảng từ đỉnh dock tới đáy viewport.
 * Dock là sticky bottom-0 nên khi trang cuộn, đỉnh dock bám đáy
 * viewport; publish chạy lại theo ResizeObserver trên gốc + resize +
 * scroll + mutation (sheet mount) để giá trị luôn là số đo mới nhất.
 * Sheet render qua portal ra document.body nên biến đồng thời xuất
 * bản lên documentElement; cleanup gỡ khi rời S2.
 */
export function useStripHeightPublisher(
  rootRef: RefObject<HTMLDivElement | null>,
  dockRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const dock = dockRef.current;
    const root = rootRef.current;
    if (!dock || !root) return;
    let lastPublished = '';
    const publish = () => {
      const rect = dock.getBoundingClientRect();
      const next = rect.height === 0 ? '0px' : `${Math.max(0, window.innerHeight - rect.top)}px`;
      if (next === lastPublished) return;
      lastPublished = next;
      root.style.setProperty('--strip-h', next);
      document.documentElement.style.setProperty('--strip-h', next);
    };
    publish();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    if (observer) observer.observe(root);
    const mo =
      typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => publish());
    if (mo) mo.observe(root, { childList: true, subtree: true });
    if (mo && document.body) mo.observe(document.body, { childList: true });
    window.addEventListener('resize', publish);
    window.addEventListener('scroll', publish, { passive: true });
    window.visualViewport?.addEventListener('resize', publish);
    const raf = requestAnimationFrame(publish);
    const t1 = window.setTimeout(publish, 250);
    const t2 = window.setTimeout(publish, 1000);
    return () => {
      observer?.disconnect();
      mo?.disconnect();
      document.documentElement.style.removeProperty('--strip-h');
      window.removeEventListener('resize', publish);
      window.removeEventListener('scroll', publish);
      window.visualViewport?.removeEventListener('resize', publish);
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [rootRef, dockRef]);
}

export function useSessionKeyboard({
  session,
  focusedExpenseId,
  onBack,
  onOpenExpenseAction,
  onNewExpense,
  onNewMember,
}: {
  session: Session;
  focusedExpenseId: string | null;
  onBack: () => void;
  onOpenExpenseAction: (expense: Expense) => void;
  onNewExpense: () => void;
  onNewMember: () => void;
}) {
  // Phím desktop (LAYOUT-SPEC §7) + Esc lùi lớp. Sheet tự xử lý Esc của
  // nó bằng listener capture + stopPropagation, nên handler này (bubble)
  // chỉ nhận Esc khi KHÔNG có sheet nào mở -> Esc ở S2 = về danh sách.
  // REDESIGN Pha 1: phím «C copy quyết toán» đã gỡ cùng các nút sao
  // chép rải rác (sao chép chỉ còn ở Sheet 3/Sheet 4).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onBack();
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
        if (expense) onOpenExpenseAction(expense);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'n' || event.key === 'N') {
        if (session.members.length > 0) onNewExpense();
      } else if (event.key === 'm' || event.key === 'M') {
        onNewMember();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // Handler đọc state qua setter ổn định; deps giữ đúng dữ liệu handler dùng.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handler đọc state qua ref/setter ổn định; deps giữ đúng các giá trị dữ liệu handler dùng thật (session, focusedExpenseId, onBack)
  }, [session, focusedExpenseId, onBack]);
}
