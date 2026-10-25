// Sheet «Luật chơi & chi tiết» (SPEC §M4/§8.5, phân xử D6 mục 8):
// UIUX-GAME-V2 (2026-10-25) — đây là CHỖ DUY NHẤT chứa giải thích dài
// của toàn game mode, mở bằng nút «?» ở đầu overlay; mọi màn khác chỉ
// còn chữ ≤1 dòng ngắn. Gồm: luật hoà/đột tử, ghi chú trong ván (tốc
// độ + màu danh tính — chuyển từ màn chơi), trách nhiệm QR nguyên văn
// và ghi chú offline (chuyển từ đầu màn thiết lập).

'use client';

import { QR_RESPONSIBILITY_LINE, RNG_HONESTY_LINE } from '../copy';
import { InfoBox, ScreenTitle } from './shared';

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <ScreenTitle>Luật chơi & chi tiết</ScreenTitle>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-ink">
        <section>
          <h3 className="font-bold">Đấu trường tự động — khi nào thì hoà?</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Mọi đòn đánh và lần ngã đều ghi theo nhịp (tick). Ngã trong cùng một nhịp là ngã cùng
              lúc.
            </li>
            <li>Nếu mọi người ngã cùng một nhịp và không còn ai đứng, họ vào ván phụ.</li>
            <li>
              Ván chính tối đa 40 giây. Còn từ 2 người đứng khi hết giờ thì vào đột tử 10 giây (có
              báo trước): mỗi người ngã ở đòn trúng đầu tiên, không tính sức khoẻ tích luỹ.
            </li>
            <li>
              Sau đột tử vẫn chưa phân định được thì có đúng một ván phụ 10 giây cho người đồng
              hạng, theo luật đột tử. Không có ván phụ thứ hai.
            </li>
            <li>
              Sau ván phụ vẫn hoà, người đồng hạng cùng đãi: mỗi người trả một phần bằng nhau của
              hoá đơn (tổng chia số người đồng hạng) bằng QR của quán ở màn kết quả. Người còn lại
              không phải trả. Cùng đãi là kết quả của game — khác chia đều cả nhóm.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold">Mâm cơm xoay — không có hoà</h3>
          <p className="mt-1">
            Mỗi người một vị trí quanh mâm. Đũa luôn dừng giữa một ô duy nhất, không dừng ở biên —
            nên không có hoà, không có ván phụ. Chỉ quay 1 vòng.
          </p>
        </section>
        <section>
          <h3 className="font-bold">Trong ván</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Tua nhanh, quay nhanh / đánh nhanh chỉ đổi tốc độ — kết quả đã chốt từ seed, không
              đổi.
            </li>
            <li>
              Chấm màu cạnh tên là màu danh tính của mỗi người — khớp vòng/plate trên sân và badge ở
              các màn khác.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold">Trách nhiệm QR</h3>
          <p className="mt-1">{QR_RESPONSIBILITY_LINE}</p>
        </section>
        <section>
          <h3 className="font-bold">Về mã ván và seed</h3>
          <div className="mt-1">
            <InfoBox>{RNG_HONESTY_LINE}</InfoBox>
          </div>
        </section>
        <section>
          <h3 className="font-bold">Chạy offline</h3>
          <p className="mt-1">
            Game chạy offline sau lần mở đầu có mạng. Lần đầu mở không có mạng thì game không khả
            dụng — app chính không ảnh hưởng.
          </p>
        </section>
        <section>
          <h3 className="text-sm font-bold text-ink-2">Nguồn hình ảnh</h3>
          <p className="mt-1 text-sm text-ink-2">
            Bộ nhân vật Phiêu Lưu và Xương Khô — KayKit của Kay Lousberg (CC0). Bộ Bạn Khối và món
            ăn — Kenney (CC0).
          </p>
        </section>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
      >
        Đã hiểu — Quay lại
      </button>
    </div>
  );
}
