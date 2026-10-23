'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GhostButton } from './ui-bits';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Selector khớp MỌI panel của Sheet — Panel #04 (MINOR alertdialog):
 * ConfirmDialog nay render role="alertdialog" thay vì "dialog", nên mọi
 * phép kiểm «đang ở trong dialog» của máy ghi opener/focus (Finding G,
 * §9.6) phải khớp cả hai role, nếu không Esc/focus của dialog xác nhận
 * phá huỷ sẽ mù như trước đợt sửa Finding G.
 */
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

/**
 * Cửa sổ "còn tươi" của bản ghi kích hoạt pointerdown/click: một dialog
 * mở trong khoảng này sau cử chỉ kích hoạt gần nhất (và cử chỉ đó khác
 * phần tử đang focus) được coi là do chính cử chỉ đó mở. 5 giây đủ rộng
 * cho chuỗi sheet (bấm nút trong sheet trước -> ConfirmDialog mở ở
 * commit kế, bản ghi kích hoạt NGOÀI dialog vẫn là opener gốc) mà vẫn
 * ngắn hơn nhiều so với khoảng nghỉ thao tác thông thường.
 */
const ACTIVATION_FRESH_MS = 5000;

/** Thông tin phần tử đã mở sheet — ghi nhận MỘT LẦN ở chuyển mở. */
interface OpenerRecord {
  el: HTMLElement | null;
  /** Giá trị data-autofocus-target của opener (nếu nó khai) — khoá tìm lại node thay thế. */
  target: string | null;
  /** aria-label/title của opener — khoá dự phòng khi node bị thay. */
  label: string | null;
  /**
   * Accessible-name-via-text của opener (textContent đã chuẩn hoá) —
   * khoá dự phòng cho các nút CHỮ THƯỜNG (không aria-label/title, không
   * data-autofocus-target): hàng ledger, nút «Thêm khoản»… Khi node gốc
   * bị React thay giữa phiên mở, các khoá trên đều trượt và focus rơi về
   * BODY — Panel #03 Finding G đo 8/8 trên bản live.
   */
  text: string | null;
}

/** Ghi nhận một phần tử thành OpenerRecord với đủ các khoá tìm lại. */
function describeOpener(el: HTMLElement): OpenerRecord {
  const rawText = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
  return {
    el,
    target: el.getAttribute('data-autofocus-target') ?? null,
    label: el.getAttribute('aria-label') ?? el.getAttribute('title') ?? null,
    text: rawText && rawText.length <= 120 ? rawText : null,
  };
}

/**
 * Tìm phần tử thay thế cho opener đã rời document: ưu tiên node còn sống
 * mang cùng data-autofocus-target, rồi mọi node mang [data-sheet-opener],
 * cuối cùng là nút mang cùng aria-label/title (IconButton của app luôn
 * khai title -> aria-label nên node được React tạo lại vẫn khớp khoá này).
 */
function findFallbackOpener(record: OpenerRecord): HTMLElement | null {
  if (record.target) {
    const byTarget = Array.from(
      document.querySelectorAll<HTMLElement>('[data-autofocus-target]'),
    ).find((el) => el.getAttribute('data-autofocus-target') === record.target);
    if (byTarget) return byTarget;
  }
  const marked = document.querySelector<HTMLElement>('[data-sheet-opener]');
  if (marked) return marked;
  if (record.label) {
    const byLabel = Array.from(
      document.querySelectorAll<HTMLElement>('button, [role="button"]'),
    ).find(
      (el) =>
        el.getAttribute('aria-label') === record.label || el.getAttribute('title') === record.label,
    );
    if (byLabel) return byLabel;
  }
  if (record.text) {
    const byText = Array.from(
      document.querySelectorAll<HTMLElement>('button, [role="button"]'),
    ).find((el) => (el.textContent ?? '').trim().replace(/\s+/g, ' ') === record.text);
    if (byText) return byText;
  }
  return null;
}

/**
 * Trả focus về opener sau khi sheet đóng — BA NHỊP (Panel #03 Finding G):
 * đồng bộ ngay trong effect đóng (panel đã rời DOM ở commit đóng, trình
 * duyệt đã chốt việc reset focus về BODY trước khi effect chạy), một nhịp
 * requestAnimationFrame, và một nhịp setTimeout 150ms. Lý do cần cả ba:
 * cơ chế cũ chỉ có rAF — trong các harness đo CDP/trang nền,
 * requestAnimationFrame bị bóp hoặc không chạy trước lúc đọc
 * document.activeElement, và Panel #03 đo được 8/8 lượt rơi về BODY trên
 * bản live dù code D-7 đã có mặt. Mọi nhịp đều tự kiềm: nếu một dialog
 * KHÁC đang mở và đang giữ focus (sheet chuỗi — sheet sau mở cùng commit
 * sheet trước đóng), nhịp trả focus KHÔNG tranh; nếu focus đã nằm đúng
 * opener rồi thì focus() lại là vô hại.
 */
function restoreOpenerFocus(record: OpenerRecord) {
  const attempt = () => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && ae !== document.body && ae.closest?.(DIALOG_SELECTOR)) return;
    if (record.el?.isConnected) {
      record.el.focus();
      return;
    }
    findFallbackOpener(record)?.focus();
  };
  attempt();
  requestAnimationFrame(attempt);
  window.setTimeout(attempt, 150);
}

/**
 * Vỏ chứa dùng chung cho mọi editor/sheet của app: bottom-sheet trên mobile,
 * dialog giữa màn hình trên desktop. Có focus trap tối thiểu (Tab vòng trong
 * panel), Esc đóng, khoá cuộn nền và trả focus về phần tử đã mở khi đóng —
 * theo A11Y-03/04 của spec redesign.
 *
 * D-7 (Panel-02, audit lại 2026-10-23) — vì sao bản cũ để focus rơi về BODY
 * dù đã có `previouslyFocused?.focus()` trong cleanup:
 *  1. Việc trả focus nằm trong cleanup của MỘT passive effect có deps
 *     [open, onClose], mà MỌI nơi gọi đều truyền onClose là arrow inline —
 *     nên cleanup chạy ở mọi lần parent re-render khi sheet đang mở, không
 *     chỉ khi đóng: focus bị kéo về opener giữa phiên làm việc, rồi effect
 *     chạy lại và GHI NHẬN LẠI document.activeElement làm "opener" mới.
 *  2. Thời điểm ghi nhận lại đó không kiểm chứng node còn sống hay không:
 *     các bề mặt dữ liệu của app re-render theo session mới ở mỗi lần ghi
 *     (use-sessions tạo mảng/object mới), node opener có thể đã bị React
 *     thay bằng node khác — cleanup lúc đóng gọi .focus() lên node ĐÃ RỜI
 *     document (detached) thì trình duyệt bỏ qua im lặng, và vì phần tử
 *     đang focus thật (trong panel) vừa bị unmount, activeElement mặc
 *     định rơi về BODY. Gọi .focus() lên detached node không throw nên
 *     lỗi hoàn toàn câm ở cả hai kênh.
 * Cách sửa ở tầng Sheet này (không đổi API):
 *  - Ghi nhận opener đúng MỘT LẦN ở chuyển đóng->mở (cờ wasOpen), kèm
 *    khoá tìm lại (data-autofocus-target / aria-label / title); effect
 *    chính chỉ phụ thuộc [open], onClose đi qua ref nên re-render không
 *    còn kích hoạt cleanup/re-capture nữa. Vì opener còn có thể bị thay
 *    node ngay trong commit mở (activeElement kịp rơi về BODY trước khi
 *    effect chạy), Sheet còn theo dõi phần tử ngoài dialog nhận focus
 *    gần nhất qua sự kiện focusin từ lúc mount làm nguồn ghi nhận dự
 *    phòng — bắt đầu theo dõi từ khi sheet còn đóng, không phải từ lúc mở.
 *  - Trả focus là một bước riêng, chạy bằng requestAnimationFrame SAU
 *    khi panel đã unmount hoàn toàn khỏi DOM (không còn đua với việc
 *    React gỡ panel và trình duyệt reset focus về BODY): opener còn
 *    trong document (isConnected) thì focus nó; đã bị thay node thì tìm
 *    node thay thế theo khoá đã ghi nhận.
 *
 * Panel #03 (Finding G) — D-7 vẫn bị đo 8/8 rơi về BODY trên bản live dù
 * cơ chế trên đã có mặt, nên đợt này tăng cường tiếp ở đúng tầng Sheet:
 * (a) restore chạy BA NHỊP (đồng bộ + rAF + setTimeout 150ms) thay vì
 * chỉ rAF — nhịp rAF đơn độc có thể bị bóp/không kịp trong harness đo
 * CDP và trang nền; (b) chuỗi khoá tìm node thay thế thêm accessible-name
 * dạng text cho các nút chữ thường (hàng ledger, nút deck) vốn không có
 * aria-label/title/data-autofocus-target; (c) mọi nhịp restore đều tự
 * kiềm trước dialog khác đang mở (sheet chuỗi) để không giật focus của
 * sheet sau. Xem restoreOpenerFocus.
 *
 * Bổ sung cùng Finding G (đo render thật bằng Chrome/CDP trên bản
 * production cục bộ, ma trận 9 dialog × {chuột, chạm, click lập trình}):
 * ba nhịp restore vẫn vô ích khi BẢN GHI opener trống/sai ngay từ đầu —
 * kích hoạt không kéo focus (chạm trên trình duyệt không focus nút,
 * click lập trình) cho 0/4 ô đúng (BODY ×3 + trả nhầm phần tử focus cũ
 * ×1) trong khi chuột/chạm-giả-lập-focus đạt 18/18. Nên Sheet ghi nhận
 * opener thêm từ pointerdown/click (mọi cử chỉ kích hoạt đều phát hai
 * sự kiện này, kể cả khi focus không đi theo) và hợp nhất theo mốc
 * thời gian ở điểm capture. Xem lastActivationRef + ACTIVATION_FRESH_MS.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
  tinted,
  role,
  ariaDescribedBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Dialog rộng 640px trên desktop (form khoản chi). */
  wide?: boolean;
  /** Nền editor tint — đánh dấu "đang sửa ở đây". */
  tinted?: boolean;
  /**
   * Override role của panel root — mặc định "dialog" như mọi Sheet
   * thường. ConfirmDialog truyền "alertdialog" (Panel #04 MINOR):
   * hộp thoại xác nhận phá huỷ phải mang ngữ nghĩa alert dialog để
   * screen reader tự đọc tên + đoạn hệ quả khi mở.
   */
  role?: 'dialog' | 'alertdialog';
  /** id của phần tử mô tả — truyền xuống aria-describedby của root. */
  ariaDescribedBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<OpenerRecord>({ el: null, target: null, label: null, text: null });
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  // Phần tử ngoài dialog nhận focus gần nhất — theo dõi LIÊN TỤC từ lúc
  // Sheet mount (kể cả khi đang đóng), vì tới lúc effect mở chạy thì
  // opener có thể đã bị thay node ngay trong chính commit mở sheet
  // (parent re-render theo state mở) và document.activeElement đã kịp
  // rơi về BODY — ghi nhận ở thời điểm mở như bản cũ là quá muộn.
  const lastFocusRef = useRef<OpenerRecord>({ el: null, target: null, label: null, text: null });

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.getAttribute !== 'function') return;
      if (target.closest(DIALOG_SELECTOR)) return;
      lastFocusRef.current = describeOpener(target);
    }
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, []);

  // Kích hoạt NGOÀI dialog gần nhất qua pointerdown/click, kèm mốc thời
  // gian — nguồn ghi nhận opener THỨ HAI (Panel #03 Finding G, lane đo
  // render thật 2026-10-23): bản ghi focusin + activeElement ở trên VẪN
  // mù trong hai tình huống có bằng chứng đo trên bản production cục bộ
  // (ma trận 9 dialog × chuột/chạm/click-lập-trình): (1) kích hoạt không
  // kéo focus — chạm trên trình duyệt không chuyển focus vào nút (điển
  // hình iOS Safari) hoặc click lập trình el.click(): không focusin nào
  // phát, activeElement lúc mở là BODY -> openerRef rỗng -> Esc rơi về
  // BODY (đo: Member/Share/Confirm-xoá-thành-viên đều BODY ở +100ms và
  // +600ms); (2) focus CŨ còn sót ở một phần tử khác hẳn opener thật
  // (mở sheet khoản chi bằng click lập trình khi focus đang ở chip thành
  // viên): bản cũ bắt activeElement làm opener và trả focus NHẦM sang
  // chip (đo thật, không phải BODY nhưng sai phần tử). pointerdown/click
  // thì LUÔN phát theo cử chỉ kích hoạt dù focus có đi theo hay không,
  // nên ghi nhận từ hai sự kiện này (capture, ngoài dialog, quy về tổ
  // tiên focusable gần nhất — chạm thường trúng span/icon CON của nút)
  // rồi hợp nhất ở điểm capture của effect mở: bản ghi kích hoạt còn
  // tươi (<= ACTIVATION_FRESH_MS) và khác phần tử đang focus thì THẮNG
  // activeElement; ngược lại giữ thứ tự cũ (activeElement -> focusin).
  const lastActivationRef = useRef<{ record: OpenerRecord; ts: number }>({
    record: { el: null, target: null, label: null, text: null },
    ts: 0,
  });

  useEffect(() => {
    function onActivation(event: Event) {
      const raw = event.target as Element | null;
      if (!raw || typeof raw.closest !== 'function') return;
      if (raw.closest(DIALOG_SELECTOR)) return;
      const cand = (raw.closest(
        'button, [role="button"], [href], input, select, textarea, [tabindex]',
      ) ?? raw) as HTMLElement;
      if (typeof cand.getAttribute !== 'function') return;
      // Scrim «Đóng» của sheet đang mở không phải opener: nó là nút
      // aria-label "Đóng" trần, là anh em của panel trong cùng lớp phủ —
      // ghi nó vào sẽ làm bẩn bản ghi của kích hoạt thật ngay trước.
      if (
        cand.getAttribute('aria-label') === 'Đóng' &&
        cand.parentElement?.querySelector(DIALOG_SELECTOR)
      ) {
        return;
      }
      lastActivationRef.current = { record: describeOpener(cand), ts: Date.now() };
    }
    document.addEventListener('pointerdown', onActivation, true);
    document.addEventListener('click', onActivation, true);
    return () => {
      document.removeEventListener('pointerdown', onActivation, true);
      document.removeEventListener('click', onActivation, true);
    };
  }, []);

  // onClose mới nhất đi qua ref để effect chính không phải chạy lại mỗi
  // khi nơi gọi re-render với arrow inline mới (một nửa nguyên nhân D-7).
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Sheet bị gỡ khỏi cây khi đang mở (nơi gọi unmount luôn cả sheet):
  // nhánh đóng trong effect chính không có cơ hội chạy, nên cleanup lúc
  // unmount tự trả focus theo cùng cơ chế ba nhịp của restoreOpenerFocus.
  useEffect(() => {
    return () => {
      if (!wasOpenRef.current) return;
      wasOpenRef.current = false;
      restoreOpenerFocus(openerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      if (!wasOpenRef.current) return;
      wasOpenRef.current = false;
      // Panel đã bị gỡ khỏi DOM ở commit này (Sheet trả về null) — việc
      // trả focus thuộc về restoreOpenerFocus (ba nhịp, có kiềm chế
      // sheet-chuỗi), KHÔNG đặt trong cleanup như bản D-7 đầu tiên (đó
      // chính là đường đua với unmount làm focus rơi về BODY).
      restoreOpenerFocus(openerRef.current);
      return;
    }

    // Chuyển đóng -> mở: ghi nhận opener MỘT LẦN (các lần effect chạy lại
    // trong cùng phiên mở không được ghi đè bằng phần tử trong panel).
    // Hợp nhất ba nguồn (xem ghi chú lastActivationRef): bản ghi kích
    // hoạt pointerdown/click còn tươi và KHÁC phần tử đang focus chứng
    // tỏ dialog vừa được mở bởi cử chỉ đó trong khi focus không đi theo
    // (hoặc focus cũ còn sót) -> bản ghi kích hoạt thắng. Ngoài trường
    // hợp đó: ưu tiên activeElement hiện tại; nếu nó đã rơi về BODY
    // (opener bị thay node ngay trong commit mở) thì dùng bản ghi kích
    // hoạt còn tươi, cuối cùng là bản ghi focusin gần nhất.
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      const active = document.activeElement as HTMLElement | null;
      const opener =
        active && active !== document.body && !active.closest(DIALOG_SELECTOR) ? active : null;
      const act = lastActivationRef.current;
      const freshActivation =
        act.record.el && Date.now() - act.ts <= ACTIVATION_FRESH_MS ? act.record : null;
      if (freshActivation && freshActivation.el !== opener) {
        openerRef.current = freshActivation;
      } else {
        openerRef.current = opener
          ? describeOpener(opener)
          : (freshActivation ?? lastFocusRef.current);
      }
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus vào ô nhập đầu tiên nếu có, không thì vào chính panel.
    const panel = panelRef.current;
    if (panel) {
      const firstInput = panel.querySelector<HTMLElement>('input, select, textarea');
      (firstInput ?? panel).focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const currentPanel = panelRef.current;
      if (!currentPanel) return;
      const items = Array.from(currentPanel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      // KHÔNG trả focus ở đây: cleanup này cũng chạy khi effect được
      // thiết lập lại — việc trả focus thuộc về nhánh đóng ở trên.
    };
  }, [open]);

  if (!open) return null;

  return (
    // Finding E (Panel #03): đáy của lớp phủ dừng ở đỉnh Settlement
    // Strip thay vì phủ kín màn hình — session-view xuất bản biến
    // --strip-h trên gốc Màn B = khoảng đáy viewport phải chừa (từ
    // đỉnh dock của Strip — StatusLine + tóm tắt + Action Deck — tới
    // đáy viewport, ĐÃ tính phần khung app-shell dưới gốc Màn B);
    // Sheet là hậu duệ trong cùng cây DOM nên kế thừa được biến đó;
    // ngoài Màn B (không có Strip) biến vắng mặt và fallback 0px giữ
    // nguyên hành vi phủ đầy. Nhờ vậy «Settlement in Sight» đứng cả
    // khi sheet mở: Strip vẫn nhìn thấy nguyên vẹn bên dưới sheet
    // (điều kiện chấm lại §9.7 của Panel #03).
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ bottom: 'var(--strip-h, 0px)' }}
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-ink/45"
      />
      <div
        ref={panelRef}
        role={role ?? 'dialog'}
        aria-modal="true"
        aria-label={title}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={cn(
          'animate-sheet-in relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl shadow-[var(--shadow-lift)] outline-none sm:rounded-2xl',
          wide ? 'sm:max-w-[640px]' : 'sm:max-w-lg',
          tinted ? 'bg-editor' : 'bg-card',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
          <h2 className="min-w-0 truncate font-display text-[19px] font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Đóng ${title}`}
            className="-mt-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-white/70 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 pb-5 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Hộp thoại xác nhận phá huỷ trong hệ thống thiết kế của app — thay cho
 * window.confirm() native (panel §7.10). Nút xác nhận là hành động nguy hiểm
 * nên mang màu Brick Red; việc xoá thật kèm toast Hoàn tác ở tầng app.
 *
 * Panel #04 (MINOR): vì MỌI call-site của component này đều là xác nhận
 * phá huỷ (xoá phiên / xoá thành viên / xoá khoản — kiểm kê ở A11Y-LOG),
 * nó render qua Sheet với role="alertdialog" và nối aria-describedby
 * tới đoạn message hệ quả, để screen reader tự đọc hệ quả khi dialog
 * mở (mẫu Alert Dialog của APG) thay vì chỉ đọc câu hỏi ở aria-label.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reactId = useId();
  const messageId = `confirm-message-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      role="alertdialog"
      ariaDescribedBy={messageId}
    >
      <p id={messageId} className="text-sm leading-relaxed text-ink">
        {message}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-debt px-4 py-2.5 font-display text-sm font-bold text-white transition hover:brightness-90 active:brightness-75"
        >
          {confirmLabel}
        </button>
        <GhostButton onClick={onCancel}>Huỷ</GhostButton>
      </div>
    </Sheet>
  );
}
