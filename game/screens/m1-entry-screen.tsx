// M1 — Nhập liệu (SPEC §M1): tổng tiền + QR quán bằng 3 đường (camera /
// chọn ảnh / dán chuỗi). Kiểm trần kép NGAY tại M1 theo mặc định toàn bộ
// thành viên phiên (checkCaps của engine với phần chia đều của app qua
// adapter) — vượt trần thì chặn cứng, nêu đúng số, không cho đi tiếp.
// Ảnh QR chỉ xử lý trên máy (game/qr/decode.ts), không tải lên đâu.
//
// FIX-UX-GAME: khối đọc QR đã trích thành QrCaptureBlock dùng chung
// (game/screens/qr-capture.tsx) với màn thiết lập gộp — M1 giữ nguyên
// hành vi cũ (QR vẫn là điều kiện đi tiếp ở màn này) cho tới khi parent
// chốt bỏ hẳn luồng nhiều màn; luồng chính nay đi qua màn thiết lập gộp.

'use client';

import { useMemo, useState } from 'react';
import { checkCaps } from '../engine';
import { equalSharesFor, formatMoney, formatMoneyGrouped, parseMoneyInput } from '../adapter';
import type { GameSessionInput } from '../adapter';
import type { GameDraft } from '../state';
import { QrCaptureBlock } from './qr-capture';
import { RedAlert, ScreenTitle, SplitEvenButton } from './shared';

export function M1EntryScreen({
  input,
  draft,
  onDraft,
  onNext,
  onSplitEven,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  onNext: () => void;
  onSplitEven: () => void;
}) {
  const [totalText, setTotalText] = useState(() =>
    draft.totalVnd > 0 ? formatMoneyGrouped(draft.totalVnd) : '',
  );

  const totalVnd = parseMoneyInput(totalText);
  const allIds = useMemo(() => input.members.map((m) => m.id), [input]);
  // Trần kép tại M1: mặc định toàn bộ thành viên phiên (SPEC §M1).
  const caps = useMemo(() => {
    if (totalVnd <= 0 || allIds.length < 2) return null;
    const shares = allIds.map((id) => equalSharesFor(totalVnd, allIds)[id] ?? 0);
    return checkCaps(totalVnd, shares);
  }, [totalVnd, allIds]);

  const canContinue = totalVnd > 0 && caps !== null && caps.ok && Boolean(draft.qr.payload);
  const totalChangedVsSession =
    input.sessionTotalVnd > 0 && totalVnd > 0 && totalVnd !== input.sessionTotalVnd;

  return (
    <div>
      <ScreenTitle>Nhập tiền và QR của quán</ScreenTitle>
      <p className="mt-1 text-base text-ink-2">
        Tổng số tiền buổi hôm nay phải trả cho quán và mã QR của quán. Game chỉ dùng hai dữ kiện này
        để chọn người đãi — phép chia đều của phiên không đổi.
      </p>

      <label className="mt-5 mb-1.5 block text-base font-semibold text-ink" htmlFor="m1-total">
        Tổng hoá đơn hôm nay (VND)
      </label>
      <input
        id="m1-total"
        // F9 (audit PWA native-feel): ô tiền dùng bàn phím decimal.
        inputMode="decimal"
        className="w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-placeholder focus:border-brand-deep"
        placeholder="Ví dụ: 450.000"
        value={totalText}
        onChange={(e) => {
          const v = parseMoneyInput(e.target.value);
          setTotalText(v > 0 ? formatMoneyGrouped(v) : '');
          onDraft({ ...draft, totalVnd: v });
        }}
      />
      {totalChangedVsSession ? (
        <p className="mt-1.5 text-sm text-ink-2">
          Tổng này khác tổng hiện tại của phiên ({formatMoney(input.sessionTotalVnd)}). Trần của ván
          được kiểm theo đúng tổng vừa nhập.
        </p>
      ) : null}

      {caps && !caps.ok ? (
        <div className="mt-3">
          <RedAlert>
            <p className="font-bold">Số tiền này vượt trần của game nên chưa chơi được.</p>
            <ul className="mt-1 list-disc pl-5">
              {caps.violations.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p className="mt-1">
              Người được chọn sẽ gánh thêm tối đa {formatMoney(caps.maxExtra)} so với chia đều. Cách
              hợp lệ duy nhất là quay về chia đều như thường.
            </p>
          </RedAlert>
        </div>
      ) : null}

      <h3 className="mt-6 text-base font-semibold text-ink">QR của quán</h3>
      <p className="text-sm text-ink-2">
        Chọn một trong ba cách. Ảnh QR chỉ được xử lý ngay trên máy này.
      </p>

      <QrCaptureBlock
        draft={draft}
        onDraft={onDraft}
        totalVnd={totalVnd}
        texts={{
          parsedNote: 'Đã đọc được QR. Bước tiếp theo sẽ đối chiếu thông tin người nhận.',
          failedNote:
            'Đã nhận nội dung QR nhưng chưa giải mã được theo chuẩn VietQR. Nhóm vẫn có thể chơi tiếp — xem hướng dẫn ở bước sau.',
          hasPayloadText:
            'Đã có QR cho ván này. Bấm Tiếp tục để đối chiếu thông tin người nhận trước khi chơi.',
          emptyText: 'Cần có QR của quán (một trong ba cách trên) để sang bước đối chiếu.',
        }}
      />

      <button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed disabled:cursor-not-allowed disabled:bg-deck-sand disabled:text-ink"
      >
        Tiếp tục
      </button>
      <SplitEvenButton onClick={onSplitEven} />
    </div>
  );
}
