// M2 — Xác nhận QR quán (SPEC §M2, giao thức R2-3).
// Ba nhánh: 2a có tên chủ TK / 2b không tên / 2c không giải mã được.
// Tách vai trò bắt buộc: người xác nhận ≠ người cung cấp. Nguồn xác nhận
// mạnh → yếu; nguồn yếu nhất (lời cam đoan của người cung cấp) một mình
// KHÔNG đủ. Dòng trách nhiệm QR nguyên văn hiện ở màn này và lặp lại ở M7.

'use client';

import { useMemo } from 'react';
import { formatMoney, nameKeyOf } from '../adapter';
import type { GameSessionInput } from '../adapter';
import { buildIdentityMapFromSessionMembers } from '../assets/identity';
import { QR_RESPONSIBILITY_LINE, QR_NO_NAME_WARNING, QR_SOURCES } from '../copy';
import type { QrSourceId } from '../copy';
import type { GameDraft } from '../state';
import { GameBadge, InfoBox, RedAlert, ScreenTitle, SplitEvenButton, YellowAlert } from './shared';

export function bankDisplayOf(parsed: { bankName: string | null; bankShortName: string | null; bin: string } | null): string | null {
  if (!parsed) return null;
  // BIN không có trong bảng tra -> hiển thị mã BIN nguyên văn, cấm đoán tên ngân hàng (SPEC §M2).
  return parsed.bankName ? `${parsed.bankName} (${parsed.bankShortName ?? parsed.bin})` : `Mã ngân hàng (BIN): ${parsed.bin}`;
}

export function M2QrScreen({
  input,
  draft,
  onDraft,
  totalVnd,
  onNext,
  onBack,
  onSplitEven,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  totalVnd: number;
  onNext: () => void;
  onBack: () => void;
  onSplitEven: () => void;
}) {
  const qr = draft.qr;
  const parsed = qr.parsed;
  // Badge danh tính: identity map DUY NHẤT của game (FIX-V3 P0.4),
  // dựng trên roster đầy đủ của phiên — cùng nguồn với M3/M7/Phaser.
  // Trước đây màn này tự gọi hàm gán màu của lib theo đường riêng
  // (lạc hệ với màu trong game); nay mọi màn đều tra map này.
  const identityMap = useMemo(() => buildIdentityMapFromSessionMembers(input.members), [input]);
  const colorIndexOf = (id: string) => identityMap.get(id)?.colorIndex ?? 0;

  // Trùng tên thành viên: so theo memberNameKey của lib (chuẩn hoá + hạ chữ thường).
  const matchedMember = useMemo(() => {
    if (!parsed?.accountName) return null;
    const key = nameKeyOf(parsed.accountName);
    return input.members.find((m) => nameKeyOf(m.displayName) === key) ?? null;
  }, [parsed, input]);

  const amountMismatch =
    parsed?.amountVnd !== null && parsed?.amountVnd !== undefined && parsed.amountVnd !== totalVnd;
  const providerIsConfirmer = qr.providerId !== null && qr.providerId === qr.confirmerId;
  const sourceInfo = QR_SOURCES.find((s) => s.id === qr.source);
  const sourceTooWeak = sourceInfo ? !sourceInfo.strong : false;
  // Nhánh 2a trùng tên: bắt buộc nguồn của quán (quầy/hoá đơn/nhân viên) —
  // cả ba nguồn mạnh đều là nguồn quán/nhân viên; lời cam đoan bị loại bởi sourceTooWeak.
  const canConfirm =
    !qr.parseFailed &&
    Boolean(qr.providerId) &&
    Boolean(qr.confirmerId) &&
    !providerIsConfirmer &&
    Boolean(qr.source) &&
    !sourceTooWeak &&
    !amountMismatch;

  const branch: '2a' | '2b' | '2c' = qr.parseFailed ? '2c' : parsed?.accountName ? '2a' : '2b';

  function setQr(patch: Partial<GameDraft['qr']>) {
    onDraft({ ...draft, qr: { ...draft.qr, ...patch } });
  }

  return (
    <div>
      <ScreenTitle>Đối chiếu QR của quán</ScreenTitle>

      {branch === '2c' ? (
        <div className="mt-4 space-y-3">
          <YellowAlert>
            <p className="font-bold">Chưa giải mã được QR này.</p>
            <p className="mt-1">
              Hãy thử lại: chụp gần hơn, đủ sáng, trọn 4 góc của mã; nếu đang dùng ảnh chụp màn hình, hãy
              quét trực tiếp bằng camera thay vì ảnh chụp màn hình.
            </p>
            <p className="mt-1">
              Nếu vẫn không đọc được, nhóm vẫn chơi để chọn người đãi, nhưng màn kết quả sẽ không hiển
              thị QR này — người đãi sẽ quét QR gốc tại quầy hoặc trên hoá đơn.
            </p>
          </YellowAlert>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
          >
            Quay lại nhập QR khác
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
          >
            Vẫn chơi để chọn người đãi
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-base text-ink-2">
            Thông tin dưới đây đọc nguyên văn từ mã QR do nhóm cung cấp. Hãy đối chiếu tên người nhận với
            nguồn của quán trước khi xác nhận.
          </p>

          <div className="mt-4 rounded-lg border border-line-strong bg-card px-4 py-4">
            {parsed?.accountName ? (
              <>
                <p className="text-sm text-ink-2">Tên chủ tài khoản (nguyên văn trong QR)</p>
                <p className="font-display text-[28px] leading-tight font-extrabold break-words text-ink">
                  {parsed.accountName}
                </p>
              </>
            ) : (
              <p className="text-base font-semibold text-ink">QR này không ghi tên chủ tài khoản.</p>
            )}
            <p className="mt-2 text-base text-ink">Ngân hàng: {bankDisplayOf(parsed)}</p>
            <p className="mt-1 text-base text-ink">
              Số tài khoản: <span className="font-figure">{parsed?.maskedAccount}</span>
            </p>
            {/* FIX-V3 P1.8 (pattern 7 — ZaloPay 2.4): người nhận ở
                trên, TỔNG TIỀN là chữ LỚN NHẤT khối xác nhận, chi
                tiết phụ phẳng ở dưới. */}
            <p className="mt-3 text-center">
              <span className="block text-sm text-ink-2">Tổng hoá đơn cần đối chiếu</span>
              <span className="font-display block text-[36px] leading-tight font-extrabold text-ink">
                {formatMoney(totalVnd)}
              </span>
            </p>
            {parsed?.amountVnd !== null && parsed?.amountVnd !== undefined ? (
              <p className="mt-1 text-base text-ink">QR có ghi sẵn số tiền: {formatMoney(parsed.amountVnd)}</p>
            ) : (
              <p className="mt-1 text-base text-ink">
                QR không ghi sẵn số tiền — người trả tự nhập đúng {formatMoney(totalVnd)} trong app ngân hàng.
              </p>
            )}
          </div>

          {amountMismatch ? (
            <div className="mt-3">
              <RedAlert>
                QR này ghi sẵn số tiền {formatMoney(parsed?.amountVnd ?? 0)}, khác tổng hoá đơn{' '}
                {formatMoney(totalVnd)}. Chưa thể xác nhận — nhóm cần làm rõ tại bàn: sai hoá đơn hay sai
                QR, rồi dùng đúng QR của quán.
              </RedAlert>
            </div>
          ) : null}

          {branch === '2b' ? (
            <div className="mt-3">
              <YellowAlert>{QR_NO_NAME_WARNING}</YellowAlert>
            </div>
          ) : null}

          {branch === '2a' && matchedMember ? (
            <div className="mt-3">
              <RedAlert>
                Tên người nhận trùng với tên của {matchedMember.displayName} trong nhóm. Bắt buộc đối
                chiếu bằng nguồn của quán (QR tại quầy, hoá đơn hoặc nhân viên quán) — lời giải thích của
                chính thành viên đó không đủ để xác nhận.
              </RedAlert>
            </div>
          ) : null}

          {branch === '2a' && !matchedMember && parsed?.accountName ? (
            <div className="mt-3">
              <YellowAlert>
                Nhiều quán nhỏ dùng tài khoản cá nhân của chủ quán, nên tên người nhận là tên cá nhân là
                chuyện thường gặp. Dù vậy, hãy đối chiếu tên này với QR tại quầy hoặc hoá đơn của quán.
                Nếu không đối chiếu được, hãy trả bằng QR tại quầy thay vì QR này.
              </YellowAlert>
            </div>
          ) : null}

          <fieldset className="mt-5">
            <legend className="text-base font-semibold text-ink">Ai là người cung cấp QR này?</legend>
            <div className="mt-2 space-y-2">
              {input.members.map((m) => (
                // F10 (audit PWA native-feel): hàng chọn là label full-row
                // min-h-12 (48px ≥ 44px vùng chạm); trạng thái chọn đọc
                // được bằng CẢ ba kênh — chấm radio lớn hơn + viền/nền
                // brand + nhãn chữ «Đã chọn» — không chỉ dựa vào chấm.
                <label
                  key={m.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                    qr.providerId === m.id ? 'border-brand bg-brand-50' : 'border-line bg-card'
                  }`}
                >
                  <input
                    type="radio"
                    name="qr-provider"
                    className="h-5 w-5 shrink-0 accent-brand"
                    checked={qr.providerId === m.id}
                    onChange={() => setQr({ providerId: m.id })}
                  />
                  <GameBadge name={m.displayName} colorIndex={colorIndexOf(m.id)} size={28} />
                  <span className="text-base text-ink">{m.displayName}</span>
                  {qr.providerId === m.id ? (
                    <span className="ml-auto text-sm font-semibold text-brand-deep">Đã chọn</span>
                  ) : null}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-base font-semibold text-ink">
              Ai đã đối chiếu tên người nhận với nguồn của quán? (phải khác người cung cấp)
            </legend>
            <div className="mt-2 space-y-2">
              {input.members.map((m) => (
                <label
                  key={m.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                    qr.confirmerId === m.id ? 'border-brand bg-brand-50' : 'border-line bg-card'
                  }`}
                >
                  <input
                    type="radio"
                    name="qr-confirmer"
                    className="h-5 w-5 shrink-0 accent-brand"
                    checked={qr.confirmerId === m.id}
                    onChange={() => setQr({ confirmerId: m.id })}
                  />
                  <GameBadge name={m.displayName} colorIndex={colorIndexOf(m.id)} size={28} />
                  <span className="text-base text-ink">{m.displayName}</span>
                  {qr.providerId === m.id ? (
                    <span className="text-sm text-debt-ink">Người cung cấp không tự xác nhận được</span>
                  ) : null}
                  {qr.confirmerId === m.id ? (
                    <span className="ml-auto text-sm font-semibold text-brand-deep">Đã chọn</span>
                  ) : null}
                </label>
              ))}
            </div>
            {providerIsConfirmer ? (
              <p className="mt-1.5 text-base text-debt-ink">
                Người xác nhận phải là một thành viên khác với người cung cấp QR — một người tự đưa QR rồi
                tự xác nhận thì không có bước đối chiếu nào cả.
              </p>
            ) : null}
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-base font-semibold text-ink">Nguồn đã đối chiếu</legend>
            <div className="mt-2 space-y-2">
              {QR_SOURCES.map((s) => (
                <label
                  key={s.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                    qr.source === s.id ? 'border-brand bg-brand-50' : 'border-line bg-card'
                  }`}
                >
                  <input
                    type="radio"
                    name="qr-source"
                    className="h-5 w-5 shrink-0 accent-brand"
                    checked={qr.source === (s.id as QrSourceId)}
                    onChange={() => setQr({ source: s.id as QrSourceId })}
                  />
                  <span className="text-base text-ink">{s.label}</span>
                  {qr.source === s.id ? (
                    <span className="ml-auto text-sm font-semibold text-brand-deep">Đã chọn</span>
                  ) : null}
                </label>
              ))}
            </div>
            {sourceTooWeak ? (
              <p className="mt-1.5 text-base text-debt-ink">
                Lời cam đoan của người cung cấp một mình không đủ để xác nhận. Hãy đối chiếu với QR tại
                quầy, hoá đơn/menu hoặc nhân viên quán.
              </p>
            ) : null}
          </fieldset>

          <div className="mt-5">
            <InfoBox>{QR_RESPONSIBILITY_LINE}</InfoBox>
          </div>

          {/* FIX-V3 P1.8 (pattern 7): CTA xác nhận NEO CỐ ĐỊNH ở
              đáy màn — không trôi theo nội dung đối chiếu dài. */}
          <div className="sticky bottom-0 z-20 mt-5 bg-canvas/95 py-3 backdrop-blur">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => {
                setQr({ confirmedAt: Date.now() });
                onNext();
              }}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed disabled:cursor-not-allowed disabled:bg-deck-sand disabled:text-ink"
            >
              Đã đối chiếu — Xác nhận QR này
            </button>
            <button
              type="button"
              onClick={onBack}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-ink"
            >
              Quay lại bước nhập
            </button>
          </div>
        </>
      )}
      <SplitEvenButton onClick={onSplitEven} />
    </div>
  );
}
