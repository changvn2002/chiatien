'use client';

import { useMemo } from 'react';
import { computeBalances } from '@/lib/split';
import { simplifyDebts } from '@/lib/settle';
import type { Session } from '@/lib/types';
import { GhostButton } from './ui-bits';
import { layer1SummaryLine, loadSeal, type SealMark } from './phieu';
import { SlipGrid, layer1DesktopCols } from './slip-card';

/* R9 (việc 5): bề rộng KHAY lớp 1 desktop ÔM ĐÚNG bề rộng lưới theo
   số cột thật (mỗi cột ≤340px + gap 20px + đệm khay 32px; riêng 4
   cột dùng trọn 1100px, phiếu ~252px/cột). Khay không còn là nền
   xám diện tích cố định kéo dài quá hàng phiếu cuối. */
const LAYER1_DESK_MAXW: Record<number, number> = { 1: 372, 2: 732, 3: 1032, 4: 1100 };

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
    <section aria-label="Bản chốt của phiên" data-layer1 className="grid gap-4">
      {/* Đầu lớp 1: mobile căn trái như cũ; desktop căn giữa trong
          khung 640px như mock A (trình diễn thuần, copy giữ nguyên —
          nhãn «bản N của link này» xuất hiện đúng 1 lần, không giờ,
          không «chốt lúc»: luật v1.8.1 / sửa bắt buộc R1 #8). */}
      <div className="max-w-[640px] min-[900px]:mx-auto min-[900px]:text-center">
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

      {/* Các tờ phiếu nằm trên mặt bàn xám trung tính sạch; desktop
          dàn cột theo bề ngang (sửa bắt buộc R1 #7). R3 (mục 2):
          mặt bàn bị cap 960px và căn giữa — phiếu không kéo bè ngang
          theo khung 1200px và không còn biển trống vô nghĩa hai bên;
          mỗi phiếu cũng tự cap 300px ở SlipCard.
          R8 (việc 5c): nới lưới lớp 1 desktop — mặt bàn ~1100px,
          lưới 3 cột, phiếu nới cap lên ~340px (roomyCols ở SlipGrid)
          để giảm khoảng trắng chết hai bên và trong lưới; mobile
          giữ nguyên lưới 2 cột như cũ. */}
      <div
        className="desk mx-auto w-full rounded-[4px] p-3 min-[900px]:p-4"
        style={{ maxWidth: LAYER1_DESK_MAXW[layer1DesktopCols(session.members.length)] }}
      >
        <SlipGrid
          session={session}
          balances={balances}
          transfers={transfers}
          onOpenQr={onOpenQr}
          wideCols
          roomyCols
        />
      </div>

      <div className="flex flex-wrap gap-2 min-[900px]:justify-center">
        <GhostButton onClick={onShowFullTable}>Bảng đầy đủ</GhostButton>
      </div>
    </section>
  );
}
