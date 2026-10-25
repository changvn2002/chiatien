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
              Mọi đòn đánh và lần ngã đều được ghi theo từng nhịp (tick) của ván. Hai người được coi
              là ngã cùng lúc khi họ ngã trong cùng một nhịp của bản ghi.
            </li>
            <li>
              Nếu mọi người ngã trong cùng một nhịp và không còn ai đứng, những người ngã ở nhịp đó
              sẽ vào ván phụ.
            </li>
            <li>
              Ván chính tối đa 40 giây. Hết giờ mà còn từ 2 người đứng trở lên thì vào đột tử 10
              giây: màn hình báo trước một dòng — trong đột tử, mỗi người ngã ở đòn trúng đầu tiên
              trúng vào chính mình, không tính sức khoẻ tích luỹ trước đó.
            </li>
            <li>
              Sau đột tử vẫn chưa phân định được thì chỉ có đúng một ván phụ 10 giây dành cho những
              người đang đồng hạng, theo cùng luật đột tử. Không có ván phụ thứ hai.
            </li>
            <li>
              Sau ván phụ mà vẫn hoà, những người đồng hạng sẽ cùng đãi: mỗi người trả một phần bằng
              nhau của hoá đơn (tổng chia cho số người đồng hạng) bằng cùng mã QR của quán ở màn kết
              quả. Những người còn lại không phải trả. Cùng đãi là kết quả của game — khác với chia
              đều cho cả nhóm.
            </li>
          </ul>
        </section>
        <section>
          <h3 className="font-bold">Mâm cơm xoay — không có hoà</h3>
          <p className="mt-1">
            Mỗi người ngồi đúng một vị trí quanh mâm. Kết quả được chốt một ô duy nhất và đôi đũa
            luôn dừng ở phần giữa của ô đó, không dừng ở biên giữa hai ô — nên mâm cơm xoay không có
            kết quả hoà và không có ván phụ. Chỉ quay đúng 1 vòng.
          </p>
        </section>
        <section>
          <h3 className="font-bold">Trong ván</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              Tua nhanh và quay nhanh / đánh nhanh chỉ đổi tốc độ diễn — kết quả của ván đã được
              chốt từ seed và không đổi.
            </li>
            <li>
              Chấm màu cạnh tên là màu danh tính của từng người trong ván — cùng màu với vòng/plate
              trên sân và badge ở các màn khác.
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
            Game mode đảm bảo chạy offline sau lần mở đầu tiên có mạng; nếu lần đầu tiên mở mà không
            có mạng, game mode không khả dụng — app chính không bị ảnh hưởng.
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
