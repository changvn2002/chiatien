'use client';

import { useId } from 'react';
import type { Session, Transfer } from '@/lib/types';
import { GhostButton, PrimaryButton } from './ui-bits';
import { completionStatusLine, formatSealTime, type SealMark } from './phieu';
import { SlipGrid } from './slip-card';

/**
 * THẺ HOÀN TẤT (§1.3/§2/§6) — HƯỚNG A «GIẤY THẬT» (REDESIGN R2):
 * hiện tại điểm Copy/Chia sẻ thành công, ngay dưới CompletionMark
 * trong SettlementPanel, CHỈ khi lớp phiếu được tổ chức bật cho phiên
 * này (opt-in theo phiên, mặc định TẮT).
 *
 * Trình bày: dòng trạng thái nằm trên một TỜ GIẤY (hạt giấy + bóng
 * nhiều lớp) mang TEM TRÒN LỚN mực cam; các phiếu đóng nằm trên MẶT
 * BÀN xám trung tính sạch bên dưới. Sửa bắt buộc R1 #1: tem tròn nằm
 * gọn trong VÙNG GIẤY TRỐNG ở góc phải tờ — dòng trạng thái chừa đúng
 * khoảng đó (padding phải), tem không chạm/đè bất kỳ chữ nào.
 *
 * Trên thẻ, không cần mở phiếu cũng thấy ngay: dấu chốt «chốt lúc
 * HH:MM · bản N» + tổng + số lần chuyển dạng chữ. Mỗi thành viên MỘT
 * phiếu ĐÓNG (theo NGƯỜI — gồm cả thành viên số dư 0). Hai nút: «Xem
 * bảng chia đầy đủ» và «Tới VietQR».
 *
 * Trần Neutral-First F-1 của bề mặt mở rộng: accent-solid ≤10,3% —
 * giấy trắng + kẻ mực Grey; seed chỉ ở tem, đoạn kẻ đầu phiếu, vòng
 * dấu phiếu và cạnh phiếu đang chọn.
 */

/**
 * Tem tròn lớn của thẻ hoàn tất: vòng kép mực cam mép gồ (đóng tay,
 * xoay lệch −9° như mock A), chữ chạy vòng «CHIA TIỀN / ĐÃ CHỐT» và
 * giờ chốt ở tâm — giờ lấy từ CHÍNH dấu bản đang hiển thị (seal), tem
 * trang trí thuần (aria-hidden), sự thật nằm ở dòng trạng thái.
 * R10 (việc 5): tem thu 104→96px + vòng ngoài r 55→51 + displacement
 * 3.2→2.6 để tem nằm TRỌN trong tờ giấy của thẻ (panel R9 bắt tem
 * tràn mép thẻ); dòng trạng thái chừa pr-[100px] tương ứng.
 */
function CompletionStamp({ seal }: { seal: SealMark }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg
      aria-hidden
      width="96"
      height="96"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute top-3 right-3 opacity-[0.92] mix-blend-multiply"
      style={{ transform: 'rotate(-9deg)' }}
    >
      <defs>
        <filter id={`cink-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.055"
            numOctaves="3"
            seed="66"
            result="n"
          />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
        </filter>
        <path
          id={`ctp-${uid}`}
          d="M60,60 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0"
          fill="none"
        />
        <path
          id={`cbp-${uid}`}
          d="M60,60 m-41,0 a41,41 0 1,0 82,0 a41,41 0 1,0 -82,0"
          fill="none"
        />
      </defs>
      <g filter={`url(#cink-${uid})`} fill="none" stroke="#FF5722">
        <circle cx="60" cy="60" r="51" strokeWidth="3.4" />
        <circle cx="60" cy="60" r="33" strokeWidth="1.6" />
        <text
          fontFamily="'Be Vietnam Pro', sans-serif"
          fontSize="12.5"
          fontWeight="700"
          letterSpacing="2.5"
          fill="#FF5722"
          stroke="none"
        >
          <textPath href={`#ctp-${uid}`} startOffset="2%">
            ✳ CHIA TIỀN ✳
          </textPath>
        </text>
        <text
          fontFamily="'Be Vietnam Pro', sans-serif"
          fontSize="11.5"
          fontWeight="700"
          letterSpacing="2.5"
          fill="#FF5722"
          stroke="none"
        >
          <textPath href={`#cbp-${uid}`} startOffset="4%">
            ĐÃ CHỐT
          </textPath>
        </text>
        <text
          x="60"
          y="67"
          textAnchor="middle"
          fontFamily="'Be Vietnam Pro', sans-serif"
          fontSize="17"
          fontWeight="800"
          fill="#FF5722"
          stroke="none"
        >
          {formatSealTime(seal.sealedAt)}
        </text>
      </g>
    </svg>
  );
}

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
    <div
      data-completion-card
      // R3 (mục 5): scroll-margin trên để khi thẻ được cuộn tới, đầu thẻ
      // (và CompletionMark ngay phía trên trong panel) không bị mép
      // vùng cuộn cắt mất nửa trên.
      // R11 (việc 2): snap-start KHÔNG còn ở gốc thẻ — thẻ cao ~791px
      // > snapport ~460px nên một snap area quá khổ cho Chrome cấp
      // cả một DẢI NGHỈ TỰ DO bên trong thẻ (điểm nghỉ sweep-1141
      // của R10 rơi giữa thân hai phiếu). Snap dời xuống KHỐI GIẤY
      // TRẠNG THÁI (con đầu tiên, dưới đây): các điểm nghỉ trong
      // vùng thẻ do khối giấy + snap-start sẵn có của từng phiếu
      // gánh; scrollIntoView tới gốc thẻ nay neo tiếp vào điểm snap
      // của khối giấy (snap mandatory kéo landing về đó).
      className="grid scroll-mt-8 gap-3 border-t border-line-strong pt-3"
    >
      {/* Tờ giấy hoàn tất: dòng trạng thái chừa vùng trống bên phải cho
          tem tròn — tem không bao giờ chạm chữ (sửa bắt buộc R1 #1).
          R11 (việc 2): khối giấy này mang snap-start thay gốc thẻ. */}
      <div className="paper-grain sheet-shadow relative snap-start rounded-[4px] bg-card px-4 py-4">
        <CompletionStamp seal={seal} />
        <p className="min-h-[92px] pr-[100px] text-base font-semibold text-ink">
          {completionStatusLine(session, transfers, seal)}
        </p>
      </div>
      {/* Mặt bàn xám trung tính sạch nâng các tờ phiếu. R3 (mục 1):
          lưới không cuộn nội bộ nữa; ở desktop ≥1024 (bề mặt đã-chốt
          dùng bề rộng nội dung chính — xem SessionView) dàn 4 cột,
          mỗi phiếu cap 300px giữ tỉ lệ giấy. */}
      <div className="desk rounded-[4px] p-3">
        <SlipGrid
          session={session}
          balances={balances}
          transfers={transfers}
          onOpenQr={onOpenSlipQr}
          wideCols
        />
      </div>
      {/* Cụm hành động dàn ngang theo hàng (sửa bắt buộc R1 #7). */}
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
