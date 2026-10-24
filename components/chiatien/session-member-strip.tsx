'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { IconPlus } from './icons';
import { hasBank } from '@/lib/vietqr';
import type { Member } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from './ui-bits';

/**
 * Rail thành viên ngang của Màn B (ARC-11): chip avatar + chấm trạng
 * thái ngân hàng (có QR / chưa có QR) + nút Thêm. Bấm chip = sửa
 * thành viên đó (handler thuộc SessionView).
 */
export function SessionMemberStrip({
  members,
  colors,
  stripRef,
  flash,
  onOpenMember,
  onAddMember,
}: {
  members: Member[];
  colors: number[];
  stripRef: RefObject<HTMLDivElement | null>;
  flash: boolean;
  onOpenMember: (member: Member) => void;
  onAddMember: () => void;
}) {
  // R3 (mục 4): với ≤5 thành viên, hàng chip WRAP gọn sang hàng hai
  // thay vì cuộn ngang cắt tên ở mép («C Cl» ở pack R2) — tên không
  // bao giờ bị cắt với dataset chuẩn 4 người + «+ Thêm». Nhóm đông
  // hơn giữ cuộn ngang như cũ.
  const wrapMode = members.length <= 5;

  const chip = (m: Member, idx: number) => (
    <button
      key={m.id}
      type="button"
      data-member-chip
      aria-label={m.name}
      title={m.name}
      onClick={() => onOpenMember(m)}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-card pl-1 transition duration-100 ease-[var(--ease-lock)] hover:border-line-strong',
        // R5 (mục 4): nhóm đông (cuộn ngang) — chip GỌN lại (khoảng
        // trong 6px thay 8px, đệm phải 10px thay 12px, tên tối đa
        // 80px) để ở bề rộng 390px luôn có một chip bị mép phải cắt
        // dở ngay tại cuộn = 0 (xem tính hình học trong thân hàm).
        wrapMode ? 'gap-2 pr-3' : 'gap-1.5 pr-2.5',
      )}
    >
      <Avatar name={m.name} colorIndex={colors[idx] ?? 0} size={members.length > 8 ? 24 : 28} />
      <span
        className={cn(
          'truncate text-base leading-5 font-semibold text-ink',
          wrapMode ? 'max-w-[96px]' : 'max-w-[80px]',
        )}
      >
        {m.name}
      </span>
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          hasBank(m) ? 'bg-credit-solid' : 'border border-line-strong bg-transparent',
        )}
      />
      <span className="sr-only">{hasBank(m) ? 'Có QR' : 'Chưa có QR'}</span>
    </button>
  );

  const addButton = (
    <button
      type="button"
      onClick={onAddMember}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-base font-semibold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
    >
      <IconPlus size={16} aria-hidden /> Thêm
    </button>
  );

  return (
    // R4 (mục 1): dải thành viên giữ z-20 (nổi trên panel, như
    // AppBar) — chip giữ mực đầy đủ khi panel quyết toán mở.
    // R5 (mục 3): scrim phủ workspace đã xoá hẳn ở SessionView.
    <div
      ref={stripRef}
      tabIndex={-1}
      aria-label="Thành viên"
      className={cn(
        // R10 (việc 1): z-20 → z-30 — dải thành viên là CHROME ĐỤC
        // 100%: pill không bao giờ bị sheet hay bóng của sheet sơn
        // đè (panel R9 bắt vệt mờ tan nửa dưới pill trong chính dải).
        'relative z-30 flex shrink-0 items-center gap-2 outline-none',
        // R8 (việc 1): vùng DẢI THÀNH VIÊN mang nền BÀN xám trung
        // tính trên mobile (tràn mép như section sheet ở dưới, đệm
        // ngang trả lại đúng vị trí chip cũ) — cấu trúc cột đọc
        // thành AppBar / workspace-bàn-xám / sheet trắng / dock:
        // sheet trắng bo góc + bóng đổ lên nổi rõ trên nền bàn này.
        // Desktop ≥900px: trả về trong suốt, không tràn mép (cột
        // trái của lưới desktop giữ nguyên như R2–R7).
        '-mx-4 bg-[#e8e8e9] px-4 sm:-mx-6 sm:px-6 min-[900px]:mx-0 min-[900px]:bg-transparent min-[900px]:px-0',
        wrapMode ? 'min-h-14' : 'h-14',
        flash && 'rounded-lg outline-2 outline-brand-deep',
      )}
    >
      {wrapMode ? (
        <>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-1">
            {members.map(chip)}
          </div>
          {addButton}
        </>
      ) : (
        /* R5 (mục 4): nhóm đông — MỘT hàng cuộn ngang, nút «+ Thêm»
           nằm Ở CUỐI HÀNG CUỘN (sau chip cuối). R10 (việc 2): panel
           R4–R9 liên tiếp đọc chip thứ ba bị CẮT DỞ là LỖI TRÀN dù
           đó là tín hiệu cuộn có chủ ý — nay tín hiệu chính là CHIP
           «+N» ĐỤC ở mép phải (MemberScrollRow): N = số chip chưa
           hiện TRỌN ở phía phải vị trí cuộn hiện tại, đo bằng rect
           thật; bấm chip cuộn tiếp 85% bề rộng. Fade-x giữ nguyên
           làm lớp phụ. */
        <MemberScrollRow members={members} renderChip={chip} addButton={addButton} />
      )}
    </div>
  );
}

/**
 * R10 (việc 2): hàng chip cuộn ngang (nhánh >5 người) + CHIP «+N»
 * affordance chính ở mép phải. hiddenCount = số chip thành viên
 * (nút mang data-member-chip; nút «+ Thêm» cuối hàng KHÔNG tính)
 * mà mép phải của rect còn nằm NGOÀI mép phải của scroller ở vị
 * trí cuộn hiện tại — tức chưa hiện trọn ở phía phải. Cập nhật khi
 * mount / scroll / resize (ResizeObserver) / members đổi; ẩn chip
 * khi không còn ai bị khuất (cuộn tới cuối: «+ Thêm» hiện trọn,
 * đủ mọi thành viên truy cập được). Bấm chip: cuộn tiếp 85% bề
 * rộng scroller, mượt.
 */
function MemberScrollRow({
  members,
  renderChip,
  addButton,
}: {
  members: Member[];
  renderChip: (m: Member, idx: number) => ReactNode;
  addButton: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const measure = () => {
      const sr = el.getBoundingClientRect();
      let n = 0;
      el.querySelectorAll('[data-member-chip]').forEach((c) => {
        if (c.getBoundingClientRect().right > sr.right + 1) n += 1;
      });
      setHiddenCount(n);
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [members]);

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={scrollerRef}
        data-member-scroll
        className="strip-fade-x flex min-w-0 items-center gap-2 overflow-x-auto py-1"
      >
        {members.map(renderChip)}
        {addButton}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          aria-label={`Còn ${hiddenCount} thành viên nữa`}
          onClick={() => {
            const el = scrollerRef.current;
            if (el) el.scrollBy({ left: el.clientWidth * 0.85, behavior: 'smooth' });
          }}
          className="absolute top-1/2 right-0 z-10 inline-flex min-h-11 -translate-y-1/2 items-center rounded-full bg-grey-900 px-3 text-sm font-bold text-white shadow-[0_2px_8px_rgba(23,24,28,0.35)]"
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
}
