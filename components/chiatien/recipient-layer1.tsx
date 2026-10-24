'use client';

import { useMemo } from 'react';
import { computeBalances } from '@/lib/split';
import { simplifyDebts } from '@/lib/settle';
import type { Session } from '@/lib/types';
import { GhostButton } from './ui-bits';
import { layer1SummaryLine, loadSeal, type SealMark } from './phieu';
import { SlipGrid } from './slip-card';

/**
 * LỚP 1 của link người nhận (§1.5/§2 — mô hình HIỆN MỌI PHIẾU):
 * tóm tắt trung tính (tên phiên, tổng, số lần chuyển, dấu bản của link)
 * + phiếu ĐÓNG của MỌI thành viên + nút «Bảng đầy đủ» (đúng 1 chạm ->
 * workspace/bảng cổ điển nguyên vẹn kèm QR như live).
 *
 * Đây là phân tầng TRÌNH DIỄN, không phải riêng tư: bất kỳ ai có link
 * cũng mở được mọi phiếu (payload đầy đủ vốn nằm trong link như live).
 * Không có bước định danh «Bạn là ai?» ở bất kỳ đâu.
 *
 * Ngân sách chạm: link (0) -> mở phiếu mình (1) -> nút QR trong phiếu (2).
 * Nút QR ở lớp 1 chuyển sang workspace kèm yêu cầu mở QR của đúng lệnh
 * đó (QR sheet sống ở workspace như live, nơi sổ ngân hàng local áp
 * được) — vẫn khép ở chạm thứ 2 từ lúc mở link.
 */
export function RecipientLayer1({
  session,
  seal,
  onShowFullTable,
  onOpenQr,
}: {
  session: Session;
  seal?: SealMark | null;
  onShowFullTable: () => void;
  onOpenQr: (transferIndex: number) => void;
}) {
  const balances = useMemo(() => computeBalances(session), [session]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const effectiveSeal: SealMark | null =
    seal ?? (typeof window !== 'undefined' ? loadSeal(session.id) : null);

  return (
    <section aria-label="Bản chốt của phiên" data-layer1 className="grid max-w-[640px] gap-4">
      <div>
        <h2 className="font-display text-[25px] font-extrabold text-ink">{session.title}</h2>
        {effectiveSeal ? (
          <p className="mt-1 text-base font-medium text-ink">
            {layer1SummaryLine(session, transfers, effectiveSeal)}
          </p>
        ) : (
          <p className="mt-1 text-base font-medium text-ink">
            Phiên “{session.title}” · {transfers.length} lần chuyển.
          </p>
        )}
        <p className="mt-1 text-base text-ink-2">
          Tìm phiếu mang tên bạn và chạm để mở phần của mình.
        </p>
      </div>

      <SlipGrid session={session} balances={balances} transfers={transfers} onOpenQr={onOpenQr} />

      <div className="flex flex-wrap gap-2">
        <GhostButton onClick={onShowFullTable}>Bảng đầy đủ</GhostButton>
      </div>
    </section>
  );
}
