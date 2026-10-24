'use client';

import type { Session, Transfer } from '@/lib/types';
import { GhostButton, PrimaryButton } from './ui-bits';
import { completionStatusLine, type SealMark } from './phieu';
import { SlipGrid } from './slip-card';

/**
 * THẺ HOÀN TẤT (§1.3/§2/§6) — hiện tại điểm Copy/Chia sẻ thành công,
 * ngay dưới CompletionMark trong SettlementPanel, CHỈ khi lớp phiếu
 * được tổ chức bật cho phiên này (opt-in theo phiên, mặc định TẮT).
 *
 * Trên thẻ, không cần mở phiếu cũng thấy ngay: dấu chốt «chốt lúc
 * HH:MM · bản N» + tổng + số lần chuyển dạng chữ. Mỗi thành viên MỘT
 * phiếu ĐÓNG (theo NGƯỜI — gồm cả thành viên số dư 0). Hai nút:
 * «Xem bảng chia đầy đủ» (bảng cổ điển vốn đang ở ngay panel này —
 * bấm là thẻ rút, bảng ở nguyên vị trí) và «Tới VietQR» (mở QR của
 * lệnh đầu tiên có ngân hàng đã lưu trên máy này; không lệnh nào có
 * thì nút ở trạng thái disabled-có-lý-do như kỷ luật D-5).
 *
 * Trần Neutral-First F-1 của bề mặt mở rộng: accent-solid ≤10,3% —
 * phiếu là giấy trắng + kẻ mực Grey; seed chỉ ở đoạn kẻ đầu phiếu,
 * vòng dấu chốt 3px và cạnh phiếu đang chọn (đo ở MODE-PHIEU-W1-LOG).
 */
export function CompletionCard({
  session,
  balances,
  transfers,
  seal,
  onShowFullTable,
  onGoToQr,
  onOpenSlipQr,
  qrAvailable,
}: {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
  seal: SealMark;
  onShowFullTable: () => void;
  onGoToQr: () => void;
  /** Mở QR sheet của ĐÚNG lệnh trong phiếu (chỉ số trong transfers). */
  onOpenSlipQr: (transferIndex: number) => void;
  qrAvailable: boolean;
}) {
  return (
    <div data-completion-card className="grid gap-3 border-t border-line-strong pt-3">
      <p className="text-base font-semibold text-ink">
        {completionStatusLine(session, transfers, seal)}
      </p>
      <SlipGrid
        session={session}
        balances={balances}
        transfers={transfers}
        onOpenQr={onOpenSlipQr}
        scrollInCard
      />
      <div className="flex flex-wrap gap-2">
        <GhostButton onClick={onShowFullTable}>Xem bảng chia đầy đủ</GhostButton>
        <PrimaryButton
          onClick={onGoToQr}
          disabledReason={qrAvailable ? undefined : 'Chưa có mã QR trên máy này cho lệnh nào'}
        >
          Tới VietQR
        </PrimaryButton>
      </div>
    </div>
  );
}
