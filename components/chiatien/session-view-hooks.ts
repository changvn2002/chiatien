'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Expense, Session } from '@/lib/types';

/**
 * C1 settle-lock (INTERFACE-SPEC §3, REDESIGN-V3): trả về `true` trong
 * cửa sổ 240ms của một lần khoá — nơi gọi gắn class `animate-settle-lock`
 * cho Ô SỐ quyết toán (Strip + hàng tổng) khi cờ này bật. Giá trị hiển
 * thị LUÔN cập nhật ngay theo dữ liệu (hook không giữ/giấu số); chỉ
 * ANIMATION mới được gộp debounce: thay đổi tới khi cửa sổ khoá trước
 * chưa đóng chỉ đánh dấu "còn nợ một lần khoá" — khi cửa sổ đóng, đúng
 * MỘT lần khoá nữa chạy ở giá trị cuối; animation không bao giờ bị khởi
 * động lại giữa chừng. Lần render đầu không khoá (chưa có thay đổi).
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
 * Các hook hạ tầng của Session View (ARC-11): tách khỏi
 * session-view.tsx, logic + thứ tự đăng ký effect giữ nguyên như bản
 * gốc (expansion → strip-height → keyboard, theo thứ tự SessionView
 * gọi ba hook này).
 */

export function useStripExpansion(startExpanded: boolean, expandedRef: RefObject<boolean>) {
  const [expanded, setExpandedState] = useState(startExpanded);
  // Mọi đường đổi trạng thái (expand/collapse/popstate) đều qua đây:
  // ref được cập nhật đồng bộ ngay tại thời điểm ra lệnh, nên ref luôn
  // khớp state trước mọi handler/effect tiếp theo — đúng bất biến của
  // bản gốc (ở bản gốc ref được đồng bộ lúc render; ở đây đồng bộ sớm
  // hơn, ngay trong handler, và lint react-hooks/refs không cho phép
  // gán ref lúc render khi state nằm trong hook).
  const setExpanded = (value: boolean) => {
    expandedRef.current = value;
    setExpandedState(value);
  };
  const pushedRef = useRef(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mount: startExpanded là điều kiện mở ban đầu của phiên vừa nhập
  }, []);

  return { expanded, expandStrip, collapseStrip };
}

export function useStripHeightPublisher(
  rootRef: RefObject<HTMLDivElement | null>,
  dockRef: RefObject<HTMLDivElement | null>,
) {
  // Finding E: xuất bản --strip-h trên div gốc để Sheet neo đáy ở đúng
  // đỉnh DOCK của Strip và không che nó. Dock = StatusLine + nút tóm
  // tắt + Action Deck (phần neo cố định ở đáy section Strip).
  //
  // GIÁ TRỊ xuất bản là KHOẢNG ĐÁY VIEWPORT phải chừa — tức khoảng cách
  // từ ĐỈNH dock tới ĐÁY viewport — KHÔNG phải chiều cao của dock:
  // gốc Màn B cao calc(100dvh-104px) nên đáy Strip không chạm đáy
  // viewport (chừa ~40px cho khung app-shell). Bản đầu của đợt này
  // xuất chiều cao dock (142,5px) trong khi Strip chiếm 183px tính từ
  // đáy viewport -> sheet phủ đúng 41px trên cùng của Strip (harness
  // scripts/geometry-stress.mjs đo wrapBottom=702 > stripTop=661 ở
  // 390px). Đo theo đỉnh dock thì sheet dừng đúng đỉnh Strip ở mọi
  // trạng thái: thu gọn (neo tại cạnh trên section — xem D4-CT-6 ở
  // publish) lẫn mở rộng (neo tại đỉnh dock — panel phía trên dock là
  // bề mặt sheet mở từ đó, dock là phần Strip phải luôn lộ).
  useEffect(() => {
    const dock = dockRef.current;
    const root = rootRef.current;
    if (!dock || !root) return;
    const section = dock.parentElement;
    let lastPublished = '';
    const publish = () => {
      const rect = dock.getBoundingClientRect();
      // D4-CT-6 (sửa W3 theo Verifier B): neo phải dừng tại CẠNH TRÊN
      // của Strip SECTION, không phải đỉnh dock — section còn border-t
      // 1px nằm trên dock, đo từ dock làm sheet phủ đúng 1,0px hairline
      // ở mọi ca. Khi Strip THU GỌN, cạnh trên section là mốc neo. Khi
      // Strip MỞ RỘNG, phần panel phía trên dock là bề mặt sheet được
      // mở từ đó (sheet QR) — mốc neo giữ ở đỉnh dock để dock luôn lộ
      // và panel sheet không bị bóp vào phần panel mở rộng.
      const secRect = section ? section.getBoundingClientRect() : null;
      const stripExpanded =
        section?.querySelector('[data-strip-summary]')?.getAttribute('aria-expanded') === 'true';
      const anchorTop = !stripExpanded && secRect && secRect.height > 0 ? secRect.top : rect.top;
      // Strip ẩn (desktop — rail thay thế): không chừa đáy.
      const next = rect.height === 0 ? '0px' : `${Math.max(0, window.innerHeight - anchorTop)}px`;
      if (next === lastPublished) return;
      lastPublished = next;
      root.style.setProperty('--strip-h', next);
    };
    publish();
    // Section đổi chiều cao khi: panel mở rộng/thu gọn, deckNotice
    // xuất hiện, nội dung dock đổi — mọi đường đều làm đỉnh dock dịch.
    // ResizeObserver trên section + resize viewport phủ cả ba.
    //
    // LÀM CỨNG (2026-10-23, Lane QA stress-frame): bộ ba trên vẫn lọt
    // một ca chập chờn đo được — publish chạy khi Strip còn ở đáy
    // viewport, sau đó layout dịch Strip lên ~40px THUẦN VỊ TRÍ (kích
    // thước section và viewport đều không đổi -> không observer/resize
    // nào bắn) -> --strip-h kẹt ở giá trị cũ (142,5px thay vì 182,5px)
    // và sheet phủ 41px đỉnh Strip (harness lượt 1 FAIL, lượt 2 PASS
    // trên cùng một build). Bổ sung ba lớp bắt dịch-vị-trí:
    // (a) MutationObserver trên cây con của gốc — sheet mount vào DOM
    // và mọi thay đổi nội dung (deckNotice, dòng trạng thái) đều là
    // childList mutation -> publish lại đúng thời điểm quyết định là
    // lúc sheet mở; (b) ResizeObserver trên cả gốc (100dvh đổi khi
    // thanh địa chỉ mobile co/giãn); (c) các nhịp publish trễ sau
    // mount (rAF + 250ms + 1000ms) để layout/font ổn định xong thì
    // giá trị chốt là giá trị đúng. publish() chỉ set style khi giá
    // trị thay đổi nên các lớp này không gây vòng lặp.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish);
    if (observer && section) observer.observe(section);
    if (observer) observer.observe(root);
    const mo =
      typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => publish());
    if (mo) mo.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', publish);
    window.visualViewport?.addEventListener('resize', publish);
    const raf = requestAnimationFrame(publish);
    const t1 = window.setTimeout(publish, 250);
    const t2 = window.setTimeout(publish, 1000);
    return () => {
      observer?.disconnect();
      mo?.disconnect();
      window.removeEventListener('resize', publish);
      window.visualViewport?.removeEventListener('resize', publish);
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // rootRef/dockRef là RefObject từ useRef ở SessionView — danh tính
    // không bao giờ đổi nên effect vẫn chỉ chạy một lần như bản gốc.
  }, [rootRef, dockRef]);
}

export function useSessionKeyboard({
  session,
  focusedExpenseId,
  onBack,
  expandedRef,
  collapseStrip,
  onOpenExpenseAction,
  onNewExpense,
  onNewMember,
  onCopySettlement,
}: {
  session: Session;
  focusedExpenseId: string | null;
  onBack: () => void;
  expandedRef: RefObject<boolean>;
  collapseStrip: (fromPopState?: boolean) => void;
  onOpenExpenseAction: (expense: Expense) => void;
  onNewExpense: () => void;
  onNewMember: () => void;
  onCopySettlement: () => Promise<void>;
}) {
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
        if (expense) onOpenExpenseAction(expense);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'n' || event.key === 'N') {
        if (session.members.length > 0) onNewExpense();
      } else if (event.key === 'm' || event.key === 'M') {
        onNewMember();
      } else if (event.key === 'c' || event.key === 'C') {
        if (expandedRef.current) void onCopySettlement();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // onCopySettlement/onBack/collapseStrip đọc state qua ref/setter ổn
    // định; deps theo các giá trị dữ liệu mà handler thật sự dùng.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handler đọc state qua ref/setter ổn định; deps giữ đúng các giá trị dữ liệu handler dùng thật (session, focusedExpenseId, onBack)
  }, [session, focusedExpenseId, onBack]);
}
