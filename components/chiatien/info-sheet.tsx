'use client';

import { IconChevronDown } from './icons';
import { FAQ_ITEMS } from '@/lib/site';
import { Sheet } from './sheet';

/**
 * Sheet 5 — «Hướng dẫn & dữ liệu» (Addendum §6 đổi tên từ «Luật &
 * chi tiết»): ngôi nhà DUY NHẤT của mọi chữ dài của app shell — FAQ
 * rút gọn (chuyển từ accordion ở chân app.tsx) và ghi chú dữ liệu /
 * ngoại tuyến. Mở từ nút «?» dùng chung ở S1 và S2.
 *
 * Luật game KHÔNG còn ở đây: luật chỉ sống ở sheet của game
 * (game/screens/game-rules-sheet.tsx) — khối tóm tắt cũ đã xoá theo
 * Addendum §6.
 */
export function InfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Hướng dẫn & dữ liệu">
      <div className="grid gap-2">
        <details className="group rounded-lg border border-line px-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Câu hỏi thường gặp
            <IconChevronDown
              size={14}
              aria-hidden
              className="shrink-0 text-muted transition-transform duration-100 ease-[var(--ease-lock)] group-open:rotate-180"
            />
          </summary>
          <div className="grid gap-3 pb-3">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question}>
                <h3 className="text-sm font-bold text-ink">{item.question}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{item.answer}</p>
              </div>
            ))}
          </div>
        </details>

        <details className="group rounded-lg border border-line px-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Dữ liệu & ngoại tuyến
            <IconChevronDown
              size={14}
              aria-hidden
              className="shrink-0 text-muted transition-transform duration-100 ease-[var(--ease-lock)] group-open:rotate-180"
            />
          </summary>
          <div className="grid gap-2 pb-3 text-sm leading-relaxed text-ink-2">
            <p>
              Mọi cuộc chia chỉ lưu trên máy của bạn. Không cần tài khoản, app cũng không có máy chủ
              để gửi dữ liệu đi.
            </p>
            <p>
              Không có mạng vẫn dùng bình thường: ghi khoản chi, tính ai trả ai và tạo VietQR đều
              chạy ngay trên máy.
            </p>
            <p>
              Thông tin ngân hàng và mã QR chỉ ở trên máy của bạn, không rời máy và không nằm trong
              link chia sẻ. Link chỉ gồm tên thành viên và các khoản chi, nên người nhận link không
              thấy tài khoản của ai. Đánh dấu «đã trả» cũng chỉ lưu trên máy này.
            </p>
          </div>
        </details>
      </div>
    </Sheet>
  );
}
