'use client';

import type { RefObject } from 'react';
import { formatVNDDisplay } from '@/lib/money';
import type { Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLink,
  IconPlus,
  IconSettleGlyph,
  IconUsers,
} from './icons';
import { PrimaryButton, StatusLine, type OnlineStatus } from './ui-bits';
import { titleForcesStatic } from './phieu';
import { SettlementPanel, type SettlementPanelProps } from './settlement';
import { useSettleLock } from './session-view-hooks';

/**
 * Dải quyết toán mobile của Màn B (ARC-11): phần tóm tắt luôn nhìn
 * thấy (tổng + lệnh chuyển đầu), panel quyết toán mở rộng tại chỗ và
 * DOCK neo đáy (StatusLine + nút tóm tắt + Action Deck). Cột quyết
 * toán desktop dùng cùng SettlementPanel qua panelProps.
 *
 * REDESIGN-V3:
 * - Hàng lệnh đầu theo D4-CT-1: lưới cột tên `minmax(72px, 1fr)` ở
 *   320px / `minmax(96px, 1fr)` từ 390px — CẤM min-width:0 trên ô tên
 *   (bản flex-1 + min-w-0 của Finding A bị thay bởi sàn lưới này);
 *   thứ tự hy sinh D4-CT-2: cụm «+N lệnh» biến mất khỏi hàng dưới
 *   360px trước tiên, số tiền (cột auto, nowrap) không bao giờ co.
 * - Ô số tổng mang C1 settle-lock (useSettleLock, 240ms --ease-lock).
 * - Kẻ đôi ở chân Strip (vị trí 2 của LK-22) CHỈ hiện khi hàng tổng
 *   ledger không cùng khung (doubleRuleYielded do SessionView cấp qua
 *   IntersectionObserver) và Strip đang thu gọn — ≤1 cụm/viewport;
 *   khi nhường, Strip giữ kẻ đơn border-t như cũ. Kẻ đôi tĩnh ở t=0,
 *   không animation riêng (C7).
 * - Ngân sách chrome: StatusLine 18 + tóm tắt 44 + Deck 44 + hairline
 *   = 107px ≤ 108 (AppBar 48 + dải thành viên 56 + Strip 108 ≤ 212).
 */
export function SessionSettlementStrip({
  session,
  expanded,
  total,
  discrepancy,
  allSettled,
  firstTransfer,
  transfers,
  nameOf,
  panelProps,
  online,
  deckNotice,
  dockRef,
  doubleRuleYielded,
  onCollapse,
  onToggle,
  onAddExpense,
  onOpenShare,
  onFocusMembers,
}: {
  session: Session;
  expanded: boolean;
  total: number;
  discrepancy: number;
  allSettled: boolean;
  firstTransfer: Transfer | undefined;
  transfers: Transfer[];
  nameOf: (id: string) => string;
  panelProps: SettlementPanelProps;
  online: OnlineStatus;
  deckNotice: string;
  dockRef: RefObject<HTMLDivElement | null>;
  /** Hàng tổng ledger đang cùng khung → Strip nhường kẻ đôi (LK-22). */
  doubleRuleYielded: boolean;
  onCollapse: () => void;
  onToggle: () => void;
  onAddExpense: () => void;
  onOpenShare: () => void;
  onFocusMembers: () => void;
}) {
  const totalLocking = useSettleLock(total);
  const stripSummaryContent = (
    <>
      <span className="flex w-full items-center gap-x-2">
        <span className="shrink-0 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
          Tổng
        </span>
        <span
          className={cn(
            'font-figure shrink-0 text-[19px] leading-none font-bold whitespace-nowrap text-ink',
            totalLocking && 'animate-settle-lock',
          )}
        >
          {formatVNDDisplay(total)}
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-base font-semibold text-brand-deep">
          <IconSettleGlyph size={15} className="shrink-0 text-ink" aria-hidden />
          Quyết toán
          {discrepancy !== 0 && (
            <span
              aria-label="Có cảnh báo lệch số dư"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-debt-solid text-[12px] font-bold text-white"
            >
              !
            </span>
          )}
          {expanded ? (
            <IconChevronDown size={15} aria-hidden />
          ) : (
            <IconChevronUp size={15} aria-hidden />
          )}
        </span>
      </span>
      {session.members.length === 0 ? (
        <span className="w-full min-w-0 truncate text-base text-ink-2">Chưa có khoản chi nào</span>
      ) : session.expenses.length === 0 ? (
        <span className="w-full min-w-0 truncate text-base text-ink-2">
          Chưa có gì để quyết toán
        </span>
      ) : allSettled ? (
        <span className="flex w-full min-w-0 items-center gap-1.5 text-base font-medium text-ink">
          <IconCheck size={15} className="shrink-0 text-credit-solid" aria-hidden />
          <span className="truncate">Đã cân hết — không ai nợ ai</span>
        </span>
      ) : firstTransfer ? (
        // R3 (mục 3): cụm «+N lệnh» CẤM quấn 2 dòng — nowrap + chữ phụ
        // co xuống 13px, khoảng cột và số tiền co nhẹ để tổng bề ngang
        // vừa 390px với dataset chuẩn (R2: «+2 / lệnh» gãy vụn).
        <span className="grid w-full grid-cols-[minmax(72px,1fr)_auto_minmax(72px,1fr)_auto_auto] items-center gap-x-1 text-base text-ink min-[390px]:grid-cols-[minmax(96px,1fr)_auto_minmax(96px,1fr)_auto_auto]">
          <span className="truncate">{nameOf(firstTransfer.fromId)}</span>
          <IconSettleGlyph size={13} className="shrink-0 text-ink" aria-hidden />
          <span className="truncate">{nameOf(firstTransfer.toId)}</span>
          <span className="font-figure shrink-0 text-[15px] font-semibold whitespace-nowrap">
            {formatVNDDisplay(firstTransfer.amount)}
          </span>
          {transfers.length > 1 && (
            <span className="hidden shrink-0 text-[13px] whitespace-nowrap text-grey-700 min-[360px]:inline">
              +{transfers.length - 1} lệnh
            </span>
          )}
        </span>
      ) : null}
    </>
  );

  // Settlement Strip mobile — layout thật dính đáy của cột flex. Phân
  // tầng bằng hairline border-t (bóng tĩnh = 0, LK-32 — class
  // .strip-shadow của V2 đã xoá hẳn).
  return (
    // R4 (mục 1 — GỐC RỄ): section KHÔNG còn shrink-0. Nó là một cột
    // flex co được (shrink + min-h-0): khi panel mở rộng có nội dung
    // dài, section tự co trong chiều cao gốc cố định của SessionView
    // và panel cuộn nội bộ — thay cho bản R3 (section shrink-0 +
    // panel max-h-70dvh: tổng section 706px @844 ép lưới workspace
    // về 0px, cột trái tràn ra và bị section z-20 nền đặc sơn đè,
    // chip thành viên bị cắt nửa + mờ bởi scrim; đo ở diag-r4).
    // R8 (việc 1 — PANEL THÀNH SHEET CÓ BỀ MẶT RIÊNG): khi MỞ RỘNG,
    // section là một SHEET trắng riêng đứng trên nền bàn xám của vùng
    // dải thành viên (xem session-member-strip): bo góc trên 16px +
    // border-top rõ + BÓNG ĐỔ LÊN — bóng đổ LÊN TRÊN nền bàn phía
    // trên sheet, không phủ lên nội dung nào (nội dung nằm TRONG
    // sheet, dưới mép trên), khác hẳn dải bóng rửa chữ ở mép dock mà
    // R7 đã xoá (bóng đó nằm trên đường cắt của vùng cuộn). Cấu trúc
    // cột: AppBar / workspace (bàn xám) / sheet (cuộn nội bộ, kết
    // thúc TRÊN dock) / dock. Khi THU GỌN không có sheet: section
    // quay về dock phẳng R7 (border-t + nền đặc, bóng = none).
    <section
      data-strip
      data-sheet={expanded || undefined}
      aria-label="Quyết toán"
      className={cn(
        'relative z-20 -mx-4 flex min-h-0 shrink flex-col border-t border-line-strong bg-strip px-4 sm:-mx-6 sm:px-6 min-[900px]:hidden',
        // R9 (việc 1 — LÀM LẠI HÌNH HỌC MÉP SHEET): panel R8 phán
        // bóng đổ lên blur 28px loãng tới biến mất trên nền xám
        // sáng và bo góc nằm ở hai góc xa nên «tờ» không đọc ra.
        // Nay: (a) sheet CHỒNG ÂM −12px lên vùng bàn xám của dải
        // thành viên — hai góc bo 16px lộ nền xám ở góc, đọc ngay
        // là «một tờ đè lên mặt bàn»; (b) bóng quanh mép trên ĐẬM
        // và CHẶT (hai lớp 0,38/0,28, blur ngắn) để thấy rõ trên
        // ảnh tĩnh 100%; (c) biên trên lên grey-400 (#BDBDBD) thay
        // line-strong #E0E0E0 gần như vô hình trên trắng.
        expanded &&
          '-mt-3 rounded-t-[16px] border-grey-400 shadow-[0_-10px_28px_rgba(23,24,28,0.38),0_-3px_8px_rgba(23,24,28,0.28)]',
      )}
    >
      {expanded && (
        // R4 (mục 2): ĐỆM ĐÁY TUYỆT ĐỐI — cuộn tới đáy tuyệt đối,
        // hàng cuối (số dư cuối, phiếu cuối, nút cuối) luôn nguyên
        // vẹn phía trên dock. Gutter stable giữ cột số mép phải khỏi
        // thanh cuộn overlay (R3 mục 6). R11 (việc 1): cơ chế đệm
        // ĐỔI — công thức --strip-h + 24 (191px, hằng số theo dock)
        // không bảo vệ được điểm dừng đáy (xem ghi chú neo đệm cuối
        // trong panel dưới đây + IMPL-R11-LOG); đệm nay là neo
        // .sheet-end-spacer theo % chiều cao panel, pb panel = 0.
        // R6 (mục 3 + 5): bỏ hẳn .scroll-fade-y (mask-image) — nó vừa
        // làm chữ tiền tan mờ ngay trên dock (đọc như hiện xuyên qua
        // dock, panel R5 kết tội), vừa là containing block kẹt Sheet
        // VietQR fixed trong vùng cuộn làm đỉnh QR bị cắt. Mép vùng
        // cuộn nay cắt SẮC như vùng cuộn bình thường; phân tầng do
        // dock đặc (nền đặc + biên trên 1px, R7 bỏ hẳn bóng) gánh.
        // R8 (việc 1): vùng cuộn này là LÒNG SHEET — nó là phần tử
        // flex-1 duy nhất của section và dock là anh em PHÍA DƯỚI nó,
        // nên nội dung cuộn KHÔNG BAO GIỜ chui xuống dưới dock:
        // đường cắt nội dung xảy ra tại đúng mép trên của sheet (có
        // biên + bóng) và tại biên trên của dock.
        // R10 (việc 1 — MÉP SHEET: SNAP + VÀNH CỐ ĐỊNH): hai dải
        // fade trắng 18px của R9 XOÁ HẲN — panel R9 phán chúng tạo
        // GHOST xuyên lớp (nội dung bị cắt kèm hình mờ của chính nó
        // bên dưới fade) và điểm nghỉ cuộn vẫn rơi giữa thân ký tự.
        // Sửa tận gốc theo trạng thái nghỉ: (a) wrapper thành CỘT
        // FLEX mà con đầu tiên là VÀNH SHEET CỐ ĐỊNH không cuộn
        // (rim 12px, nền strip đặc + border-b grey-300 + bóng đổ
        // XUỐNG lòng sheet) — mép vật lý của «tờ» luôn sắc và đứng
        // yên; (b) panel dưới vành mang scroll-snap MANDATORY và
        // mọi khối/hàng trong panel mang snap-start (settlement.tsx
        // / completion-card / slip-card), nên MỌI điểm nghỉ cuộn đều
        // rơi vào KHE giữa các khối — không ký tự/avatar nào bị cắt
        // giữa thân ở biên trên, không lớp mờ nào chồng lên nội
        // dung. scroll-padding-top = 0px (LỆCH kê đơn ban đầu 10px,
        // có lý do đo được: padding 10px tạo một BĂNG LÓ 10px ở
        // biên trên — tại điểm nghỉ của hàng lệnh thứ hai, đáy hàng
        // thứ nhất hiện đúng 10px trong băng đó và nút VietQR bị xẻ
        // mất ~3px đáy, ảnh sweep vòng này bản đầu; padding 0 cho
        // đáy phần tử liền trước TRÙNG KHÍT mép panel ở mọi điểm
        // nghỉ top-aligned, 0px ló).
        <div className="flex min-h-0 flex-[1_1_auto] flex-col">
          <div
            aria-hidden
            data-sheet-rim
            className="relative z-10 h-3 shrink-0 border-b border-grey-300 bg-strip shadow-[0_12px_16px_-10px_rgba(23,24,28,0.40)]"
          />
          <div
            data-sheet-panel
            className="animate-step-in min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto px-1 pt-3 pb-0 [scroll-padding-top:0px] [scrollbar-gutter:stable]"
          >
            <div className="mb-2 flex snap-start items-center justify-between gap-2">
              <h2 className="font-display text-[25px] font-extrabold text-ink">Quyết toán</h2>
              <button
                type="button"
                onClick={onCollapse}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-base font-semibold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
              >
                Thu gọn <IconChevronDown size={15} aria-hidden />
              </button>
            </div>
            <SettlementPanel {...panelProps} variant="row" />
            {/* R11 (việc 1 — BẢO VỆ ĐIỂM DỪNG ĐÁY TUYỆT ĐỐI): panel
                R10 đóng băng ở mọi điểm snap nhưng ĐÁY TUYỆT ĐỐI
                (scrollTop = maxScroll) cắt giữa thân ký tự — lưới
                snap kết thúc ở CTA, mà vị trí snap của CTA nằm ngoài
                tầm với (đệm đáy cũ var(--strip-h)+24 = 191px không
                đủ để maxScroll chạm snap của CTA cũng không chạm
                snap nào khác: đoạn đuôi (snap cuối, maxScroll]
                không được bảo vệ). Đệm đáy nay do NEO ĐỆM CUỐI này
                gánh (class .sheet-end-spacer trong globals.css,
                pb của panel = 0): chiều cao neo = 100% chiều cao
                hộp nội dung của panel TRỪ một hằng số đuôi, sao cho
                maxScroll TRÙNG một biên hàng đã thiết kế trong MỌI
                trạng thái panel (số đo ở IMPL-R11-LOG):
                - không thẻ hoàn tất: maxScroll = đỉnh hàng số dư
                  «Chi» — từ đỉnh hàng Chi tới cuối nội dung là
                  290px bất biến (Chi + Dũng + tổng + CTA);
                - có thẻ hoàn tất (:has [data-completion-card]):
                  maxScroll = đỉnh HÀNG PHIẾU CUỐI của thẻ — từ đó
                  tới cuối nội dung là 406px bất biến (hàng phiếu +
                  nút thẻ + CTA). Hàng cuối + CTA vẫn nguyên vẹn
                  phía trên dock ở đáy tuyệt đối (đệm thật = chiều
                  cao neo: 170px không thẻ / 54–102px có thẻ). */}
            <div aria-hidden data-sheet-end-spacer className="sheet-end-spacer" />
          </div>
        </div>
      )}
      {/* DOCK — phần neo luôn nhìn thấy của Strip (Finding E): Sheet
        neo đáy theo chiều cao khối này qua --strip-h.
        R6 (mục 3): dock ĐẶC HOÀN TOÀN — nền bg-strip đặc 100% ngay
        trên chính khối dock (không translucency, không backdrop-blur
        ở bất kỳ lớp nào của Strip).
        R7 (mục 3): MÉP DOCK SẮC TUYỆT ĐỐI — bỏ HẲN bóng đổ hướng
        lên của bản R6 (dù đã giảm, dải bóng 6–14px trên mép dock
        vẫn rửa nhoà dòng chữ cuối của vùng cuộn ở trạng thái lưng
        chừng, panel R6 4/5 ghế + coordinator tự xác nhận; phương
        án dự phòng «bỏ bóng, chỉ giữ border» mà worker R6 tự ghi
        ở §8.6 nay thành phương án chính). Phân tầng CHỈ còn:
        border-top 1px + nền đặc. Chữ trong vùng cuộn đi qua mép
        dock cắt SẮC ở độ đậm đầy đủ hoặc khuất hẳn sau dock đặc —
        không còn trạng thái mờ lưng chừng nào. */}
      {/* R8 (việc 1): dock có KHOẢNG THỞ riêng — đệm trên 8px +
          đệm dưới 4px để microtext («Đã lưu trên máy này»…) không
          va chạm dòng nội dung cuối của sheet phía trên biên dock;
          microtext của dock mang tương phản ≥ grey-700 (StatusLine
          đã nâng ở ui-bits, deckNotice nâng ngay tại đây). Chiều cao
          dock đổi → --strip-h tự xuất bản lại (hook ở SessionView)
          nên đệm đáy của sheet giữ nguyên số đo tương đối. */}
      <div
        ref={dockRef}
        className={cn('bg-strip pt-2 pb-1', expanded && 'border-t border-line-strong')}
      >
        <StatusLine status={online} className="leading-[18px]" />
        <button
          type="button"
          data-strip-summary
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex min-h-11 w-full flex-col gap-y-0.5 py-0 text-left"
        >
          {stripSummaryContent}
        </button>
        {deckNotice && (
          <p role="status" className="pb-1 text-xs text-grey-700">
            {deckNotice}
          </p>
        )}
        {/* Action Deck — phẳng trên cùng bề mặt Strip (hết hộp-trong-hộp). */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 [&>*]:w-full">
            <PrimaryButton
              disabledReason={
                session.members.length === 0 ? 'Thêm ít nhất 1 người để ghi khoản chi' : undefined
              }
              onClick={onAddExpense}
              // R3 (mục 13): phiên nhạy cảm dạng tĩnh (giỗ/phúng điếu…)
              // giảm chói accent ở nút deck — xám đậm trung tính thay
              // cam bão hoà; phiên thường giữ nguyên.
              className={
                titleForcesStatic(session.title)
                  ? // R4 (mục 5): tĩnh nhạy cảm — nút về MỰC ĐẬM ĐẶC
                    // (grey-900 = ink, tương phản trắng 16:1) thay xám
                    // 700 nhạt đọc như bị khoá; vẫn 0 cam chói.
                    'w-full bg-grey-900 text-base text-white hover:bg-grey-800 active:bg-grey-800'
                  : 'w-full text-base'
              }
            >
              <IconPlus size={16} aria-hidden /> Thêm khoản
            </PrimaryButton>
          </div>
          <button
            type="button"
            aria-label="Chia sẻ link"
            aria-disabled={session.expenses.length === 0 || undefined}
            onClick={onOpenShare}
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep',
              session.expenses.length === 0 && 'cursor-not-allowed text-ink-2',
            )}
          >
            <IconLink size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Thành viên"
            onClick={onFocusMembers}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep"
          >
            <IconUsers size={18} aria-hidden />
          </button>
        </div>
      </div>
      {/* Kẻ đôi chân Strip — chỉ khi không cụm nào khác cùng khung. */}
      {!expanded && !doubleRuleYielded && <div className="double-rule" aria-hidden />}
    </section>
  );
}
