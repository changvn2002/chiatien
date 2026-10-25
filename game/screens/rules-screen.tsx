// Màn «Luật hoà» tĩnh (SPEC §M4/§8.5, phân xử D6 mục 8): mở được từ màn
// chọn game và màn đồng thuận. Nội dung là LUẬT dạng chữ dễ đọc, kèm câu
// trung thực bắt buộc về RNG (nguyên văn SPEC §2) ở màn luật chơi.

'use client';

import { RNG_HONESTY_LINE } from '../copy';
import { InfoBox, ScreenTitle } from './shared';

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <ScreenTitle>Luật hoà và luật chơi</ScreenTitle>
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
          <h3 className="font-bold">Về mã ván và seed</h3>
          <div className="mt-1">
            <InfoBox>{RNG_HONESTY_LINE}</InfoBox>
          </div>
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
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
      >
        Đã hiểu — Quay lại
      </button>
    </div>
  );
}
