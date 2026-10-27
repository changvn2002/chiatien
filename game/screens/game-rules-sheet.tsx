// game-rules-sheet.tsx — Sheet «Luật chơi & chi tiết ván» CỦA GAME (REDESIGN
// Pha 2, SPEC §C2/D mục 6): màn rules-screen riêng đã CẮT — nội dung
// luật (bản chữ ngắn của đợt bước 2/3) sống trong sheet dùng chung
// GameSheet, mở từ nút «?» ở panel game + sân chơi + kết quả. Đây là
// CHỖ DUY NHẤT chứa giải thích dài của game mode (UIUX-GAME-V2).
// Mục «Chi tiết ván»: Mã ván (= record.code — D13 một tên một giá
// trị; trước khi chơi là mã ván dự kiến suy từ seed hiện tại), Mã cam
// kết (C1), Số chung tự sinh + nút «Đổi mã» TRƯỚC khi chơi (SPEC Q2),
// ghi chú offline.

'use client';

import { useState } from 'react';
import { QR_RESPONSIBILITY_SHORT, RNG_HONESTY_LINE } from '../copy';
import { AVATAR_PRIVACY_LINE } from './m3b-character-screen';
import { GameSheet, GroupedTechString, InfoBox } from './shared';

export interface RulesVanDetail {
  /** Mã ván — record.code sau khi chốt; trước khi chơi là mã dự kiến từ seed hiện tại. */
  code: string;
  /** Mã cam kết C1 (D13 — KHÔNG gọi là «Mã ván»). */
  c1: string;
  /** Số chung hiện tại của ván (tự sinh — SPEC Q2). */
  chung: string;
  /** Có mặt = ván chưa chơi: cho phép «Đổi mã» (đặt số chung riêng) ngay trong sheet. */
  onChungChange?: (next: string) => void;
}

export function RulesContent({ detail }: { detail?: RulesVanDetail }) {
  const [editingCode, setEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [codeError, setCodeError] = useState('');
  const chungValid = /^\d{6,12}$/.test(codeDraft.trim());

  function commitChung() {
    if (!detail?.onChungChange) return;
    if (!chungValid) {
      setCodeError('Số chung cần 6–12 chữ số.');
      return;
    }
    detail.onChungChange(codeDraft.trim());
    setEditingCode(false);
    setCodeError('');
  }

  return (
    <div className="space-y-4 text-base leading-relaxed text-ink">
      {detail ? (
        <section>
          <h3 className="font-bold">Chi tiết ván</h3>
          <dl className="mt-1 space-y-1.5 text-sm">
            <div>
              <dt className="font-semibold text-ink">Mã ván</dt>
              <dd className="font-mono break-all text-ink-2">{detail.code}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Mã cam kết</dt>
              <dd className="font-mono text-ink-2">
                <GroupedTechString value={detail.c1} />
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Số chung</dt>
              <dd className="font-mono text-ink-2">{detail.chung}</dd>
            </div>
          </dl>
          {detail.onChungChange ? (
            editingCode ? (
              <div className="mt-2">
                <label
                  className="mb-1.5 block text-sm font-semibold text-ink"
                  htmlFor="rules-chung-input"
                >
                  Số chung riêng của nhóm (6–12 chữ số)
                </label>
                <input
                  id="rules-chung-input"
                  inputMode="numeric"
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value.replace(/\D/g, ''))}
                  className="h-[52px] w-full rounded-xl border border-neutral-300 bg-card px-3 font-figure text-[16px] text-ink placeholder:text-placeholder"
                  placeholder="483920"
                />
                {codeError ? (
                  <p role="alert" className="mt-1 text-sm font-semibold text-debt-ink">
                    {codeError}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={commitChung}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
                  >
                    Đổi mã
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCode(false);
                      setCodeError('');
                    }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCodeDraft(detail.chung);
                  setEditingCode(true);
                }}
                className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Đổi mã
              </button>
            )
          ) : null}
          <p className="mt-2 text-sm text-ink-2">
            Số chung tự sinh cho giao thức công bằng; nhóm muốn dùng số riêng thì bấm «Đổi mã» trước
            khi chơi.
          </p>
        </section>
      ) : null}
      <section>
        <h3 className="font-bold">Đấu trường tự động — khi nào thì hoà?</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Mọi đòn đánh và lần ngã đều ghi theo nhịp. Ngã trong cùng một nhịp là ngã cùng lúc.
          </li>
          <li>Nếu mọi người ngã cùng một nhịp và không còn ai đứng, họ vào ván phụ.</li>
          <li>
            Ván chính tối đa 40 giây. Còn từ 2 người đứng khi hết giờ thì vào đột tử 10 giây (có báo
            trước): mỗi người ngã ở đòn trúng đầu tiên, không tính sức khoẻ tích luỹ.
          </li>
          <li>
            Sau đột tử vẫn chưa phân định được thì có đúng một ván phụ 10 giây cho người đồng hạng,
            theo luật đột tử. Không có ván phụ thứ hai.
          </li>
          <li>
            Sau ván phụ vẫn hoà, người đồng hạng cùng đãi: mỗi người trả một phần bằng nhau của hoá
            đơn (tổng chia số người đồng hạng) bằng QR của quán ở màn kết quả. Người còn lại không
            phải trả. Cùng đãi là kết quả của game — khác chia đều cả nhóm.
          </li>
        </ul>
      </section>
      <section>
        <h3 className="font-bold">Mâm cơm xoay — không có hoà</h3>
        <p className="mt-1">
          Mỗi người một vị trí quanh mâm. Đũa luôn dừng giữa một ô duy nhất, không dừng ở biên — nên
          không có hoà, không có ván phụ. Chỉ quay 1 vòng.
        </p>
      </section>
      <section>
        <h3 className="font-bold">Trong ván</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Tua nhanh, quay nhanh / đánh nhanh chỉ đổi tốc độ — kết quả đã chốt từ seed, không đổi.
          </li>
          <li>
            Chấm màu cạnh tên là màu danh tính của mỗi người — khớp vòng/plate trên sân và badge ở
            các màn khác.
          </li>
        </ul>
      </section>
      <section>
        <h3 className="font-bold">Trách nhiệm QR</h3>
        <p className="mt-1">{QR_RESPONSIBILITY_SHORT}</p>
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
          Game chạy offline sau lần mở đầu có mạng. Lần đầu mở không có mạng thì game không khả dụng
          — app chính không ảnh hưởng.
        </p>
      </section>
      <section>
        <h3 className="text-sm font-bold text-ink-2">Ảnh đại diện</h3>
        <p className="mt-1 text-[13px] leading-[1.35] text-ink-2">{AVATAR_PRIVACY_LINE}</p>
      </section>
      <section>
        <h3 className="text-sm font-bold text-ink-2">Nguồn hình ảnh</h3>
        <p className="mt-1 text-sm text-ink-2">
          Bộ nhân vật Phiêu Lưu và Xương Khô — KayKit của Kay Lousberg (CC0). Bộ Bạn Khối và món ăn
          — Kenney (CC0).
        </p>
      </section>
    </div>
  );
}

/** Sheet «Luật chơi & chi tiết ván» của game — GameSheet dùng chung, mở từ «?» ở mọi bề mặt game. Mục «Chi tiết ván» (Số chung + Đổi mã) đứng TRƯỚC phần luật dài (Seat 1 N-6) vì đổi mã phải làm trước khi chơi. */
export function GameRulesSheet({
  open,
  onClose,
  detail,
}: {
  open: boolean;
  onClose: () => void;
  detail?: RulesVanDetail;
}) {
  return (
    <GameSheet open={open} onClose={onClose} title="Luật chơi & chi tiết ván">
      <RulesContent detail={detail} />
    </GameSheet>
  );
}
