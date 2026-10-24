'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { assignIdentityColors } from '@/lib/identity';
import { formatVND } from '@/lib/money';
import type { Member, Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from './ui-bits';
import { loadOpenedSlips, saveOpenedSlips, SLIP_GRID_ANIMATED_MAX } from './phieu';

/**
 * PHIẾU GẤP (vật đã qua kiểm mù — mock-slip.png): một trang sổ của app
 * gấp lại. Giấy trắng/Grey Material, nếp gấp NGANG giữa phiếu, kẻ đôi
 * ngang ở đầu phiếu + chân phiếu. Seed #FF5722 CHỈ ở: (i) đoạn seed
 * ngắn trên kẻ đôi đầu phiếu, (ii) vòng dấu chốt (stroke seed 3px),
 * (iii) cạnh phiếu đang chọn. TUYỆT ĐỐI không yếu tố phong bì (không
 * nắp, không seam chéo, không miệng bì).
 *
 * Mở phiếu (§1.4/§5): 1 chạm, 240ms khoá cứng, --ease-lock, overshoot 0,
 * không xoay; nội dung (tên + lệnh mũi tên + số chính xác + nút VietQR
 * từng lệnh) có trong DOM và hiển thị từ frame đầu — lớp gấp chỉ là
 * một vệt sáng gấp giấy chạy trên bề mặt, chạm lần nữa -> frame cuối
 * ngay; reduced-motion -> hiện thẳng tĩnh. Avatar TĨNH tuyệt đối (C8):
 * chỉ phiếu/vệt gấp chuyển động, avatar không mang class chuyển động nào.
 */

export type SlipQrRequest = { transferIndex: number };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Kẻ đôi đầu phiếu: đoạn seed ngắn (i) nằm trên vệt đầu, vệt thứ hai xám thuần. */
function SlipTopRule() {
  return (
    <div aria-hidden className="mb-3">
      <div className="flex items-center">
        <span className="h-[3px] w-8 shrink-0 bg-brand-500" />
        <span className="h-px flex-1 bg-grey-400" />
      </div>
      <div className="mt-[3px] h-px bg-grey-400" />
    </div>
  );
}

/** Kẻ đôi chân phiếu: hai vệt xám, không seed. */
function SlipBottomRule() {
  return (
    <div aria-hidden className="mt-3">
      <div className="h-px bg-grey-400" />
      <div className="mt-[3px] h-px bg-grey-400" />
    </div>
  );
}

/** Vòng dấu chốt (ii): stroke seed 3px ở góc đầu phiếu. */
function SealRing() {
  return (
    <span
      aria-hidden
      className="absolute top-3 right-3 h-6 w-6 rounded-full border-[3px] border-brand-500"
    />
  );
}

export function SlipCard({
  session,
  member,
  colorIndex,
  balances,
  transfers,
  open,
  opening,
  staticMode,
  onToggle,
  onOpenQr,
}: {
  session: Session;
  member: Member;
  colorIndex: number;
  balances: Record<string, number>;
  transfers: Transfer[];
  open: boolean;
  opening: boolean;
  /** Chế độ tĩnh (nhóm đông vượt ngưỡng / reduced-motion): không lớp gấp. */
  staticMode: boolean;
  onToggle: () => void;
  onOpenQr: (transferIndex: number) => void;
}) {
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const balance = balances[member.id] ?? 0;
  const outgoing = transfers
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => t.fromId === member.id);
  const incoming = transfers.filter((t) => t.toId === member.id);

  return (
    <div
      data-slip={member.id}
      data-slip-open={open || undefined}
      className={cn(
        'relative overflow-hidden border bg-card px-3 pt-3 pb-3',
        open ? 'border-2 border-brand-500' : 'border-line-strong',
      )}
    >
      {/* Nếp gấp NGANG giữa phiếu — một vệt ngang duy nhất, không chéo. */}
      <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-grey-300" />
      <div aria-hidden className="absolute inset-x-0 top-1/2 h-1 bg-grey-100/70" />
      {/* Lớp gấp trình diễn 240ms: vệt gấp chạy trên bề mặt, nội dung
          bên dưới đã hiển thị từ frame đầu (không cổng nội dung). */}
      {opening && !staticMode && (
        <div
          aria-hidden
          className="phieu-fold-band pointer-events-none absolute inset-x-0 top-0 z-10"
        />
      )}
      <SealRing />
      <SlipTopRule />
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Phần của ${member.name}`}
        onClick={onToggle}
        className="relative z-[1] flex min-h-11 w-full items-center gap-2.5 text-left"
      >
        <Avatar name={member.name} colorIndex={colorIndex} size={36} />
        <span className="min-w-0">
          {/* Tên KHÔNG truncate: mặt phiếu là bề mặt định danh — tên dài
              wrap xuống dòng thay vì bị cụt (đo render 390: «Phần của
              Bình» bị cụt thành «Phần của B…» ở lưới 2 cột). */}
          <span className="block text-base leading-snug font-semibold break-words text-ink">
            Phần của {member.name}
          </span>
          {!open && <span className="block text-xs text-ink-2">Chạm để xem phần của bạn</span>}
        </span>
      </button>

      {/* Nội dung phiếu: LUÔN có trong DOM khi phiếu đã mở, hiển thị từ
          frame đầu của trạng thái mở (kể cả trong lúc vệt gấp chạy). */}
      {open && (
        <div className="relative z-[1] mt-3 grid gap-2">
          {balance === 0 && outgoing.length === 0 && incoming.length === 0 ? (
            <p className="text-base text-ink">{member.name} đã gọn phần của mình.</p>
          ) : (
            <>
              {outgoing.map(({ t, index }) => (
                <div key={`${t.fromId}-${t.toId}-${index}`} className="grid gap-1.5">
                  <p className="text-base font-medium text-ink">
                    {nameOf(t.fromId)} → {nameOf(t.toId)}:{' '}
                    <span className="font-figure font-bold">{formatVND(t.amount)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenQr(index)}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-3 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600"
                  >
                    Mã QR của lệnh này
                  </button>
                </div>
              ))}
              {incoming.length > 0 && (
                <div>
                  <p className="text-base font-medium text-ink">{member.name} nhận từ:</p>
                  <ul className="mt-1 grid gap-0.5">
                    {incoming.map((t, i) => (
                      <li key={`${t.fromId}-${t.toId}-${i}`} className="text-base text-ink">
                        {nameOf(t.fromId)}:{' '}
                        <span className="font-figure font-bold">{formatVND(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <p className="relative z-[1] mt-3 text-xs text-ink-2">Chia Tiền</p>
      <SlipBottomRule />
    </div>
  );
}

/**
 * Lưới phiếu dùng chung cho thẻ hoàn tất + lớp 1 người nhận:
 * - Mặt rút gọn (avatar + tên) cho phiếu chưa mở; lưới 2 cột.
 * - Trạng thái đã mở lưu local theo sessionId (khoá riêng, không vào link).
 * - Nhóm đông: trên SLIP_GRID_ANIMATED_MAX phiếu -> danh sách phiếu TĨNH
 *   (cùng nội dung, không lớp gấp) — ngưỡng chốt ở MODE-PHIEU-IMPL-STATE.
 * - Lưới cuộn trong thẻ (max-h + overflow) khi thẻ nằm ở bề mặt chốt.
 */
export function SlipGrid({
  session,
  balances,
  transfers,
  onOpenQr,
  scrollInCard = false,
}: {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
  onOpenQr: (transferIndex: number) => void;
  scrollInCard?: boolean;
}) {
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const [openedIds, setOpenedIds] = useState<string[]>(() => loadOpenedSlips(session.id));
  const [openingId, setOpeningId] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const staticMode = session.members.length > SLIP_GRID_ANIMATED_MAX || prefersReducedMotion();

  function toggle(memberId: string) {
    if (openedIds.includes(memberId)) {
      // Chạm vào phiếu đang mở (kể cả lúc vệt gấp đang chạy) -> frame
      // cuối ngay: huỷ timer, giữ trạng thái đã mở tĩnh.
      window.clearTimeout(timerRef.current);
      setOpeningId(null);
      return;
    }
    const next = [...openedIds, memberId];
    setOpenedIds(next);
    saveOpenedSlips(session.id, next);
    if (staticMode) {
      setOpeningId(null);
      return;
    }
    setOpeningId(memberId);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpeningId(null), 240);
  }

  return (
    <div
      data-slip-grid
      data-slip-static={staticMode || undefined}
      className={cn(
        // Sàn hàng 108px (= chiều cao tự nhiên của mặt phiếu đóng):
        // thiếu sàn này, lưới bị container max-h ép co mọi hàng xuống
        // dưới chiều cao nội dung khi tổng hàng vượt 430px (đo render
        // 12/16 phiếu: mặt phiếu bị nén còn ~52px, tên bị clip bởi
        // overflow-hidden). Có sàn, lưới CUỘN trong thẻ đúng §6 thay
        // vì nén.
        'grid grid-cols-2 gap-2 [grid-auto-rows:minmax(108px,auto)]',
        scrollInCard && 'max-h-[430px] overflow-y-auto pr-0.5',
      )}
    >
      {session.members.map((m, idx) => (
        <SlipCard
          key={m.id}
          session={session}
          member={m}
          colorIndex={colors[idx] ?? 0}
          balances={balances}
          transfers={transfers}
          open={openedIds.includes(m.id)}
          opening={openingId === m.id}
          staticMode={staticMode}
          onToggle={() => toggle(m.id)}
          onOpenQr={onOpenQr}
        />
      ))}
    </div>
  );
}
