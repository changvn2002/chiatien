// Màn THIẾT LẬP GỘP (FIX-UX-GAME, sau chơi thử live 2026-10-25): toàn bộ
// luồng trước ván chạy NÉN còn ĐÚNG MỘT màn — thay chuỗi M1→M2→M3→M3B→
// M4→M5 (7 màn, 25 thao tác đo được). Nguyên tắc của đợt:
// - Tổng tiền TỰ ĐIỀN từ tổng phiên (vẫn sửa được), kiểm trần tại chỗ.
// - Chọn trò ngay tại màn; mặc định «Mâm cơm xoay» (G2, VÁN NHANH) đã
//   chọn sẵn — không bấm cũng chơi được.
// - Người chơi mặc định CẢ BÀN, nhân vật mặc định ĐÃ GÁN SẴN; chỉ khi
//   muốn đổi mới mở panel nhúng «Đổi người chơi» / «Đổi nhân vật»
//   (M3/M3B ở chế độ embedded) — không còn màn bắt buộc riêng.
// - QR là TUỲ CHỌN: không có QR vẫn bắt đầu được («Chơi không cần QR»);
//   QR không giải mã được → cảnh báo 1 dòng tại chỗ, KHÔNG sinh màn đối
//   chiếu riêng; QR đọc được → đối chiếu gọn bằng 3 ô chọn ngay tại màn
//   (giữ giao thức R2-3: người đối chiếu ≠ người cung cấp, nguồn yếu
//   nhất một mình không đủ, lệch số tiền ghi sẵn thì chặn).
// - Đồng thuận nằm CÙNG màn: cặp số tiền gọn + ô Số chung nằm TRÊN nút
//   Bắt đầu; nút mờ thì có dòng lý do NGAY CẠNH nút (bẫy F4).
// - Mỗi khối tối đa 1 dòng mô tả; C1/seed/kỹ thuật vào mục «Chi tiết
//   ván» thu gọn mặc định.

'use client';

import { useMemo, useState } from 'react';
import { checkCaps, createCommitment } from '../engine';
import type { MatchParams } from '../engine/types';
import {
  equalSharesFor,
  formatMoney,
  formatMoneyGrouped,
  nameKeyOf,
  parseMoneyInput,
} from '../adapter';
import type { GameSessionInput } from '../adapter';
import { unlockAudio } from '../audio/sound';
import { QR_RESPONSIBILITY_SHORT, QR_SOURCES } from '../copy';
import type { QrSourceId } from '../copy';
import { EMPTY_QR_DRAFT } from '../state';
import type { GameDraft } from '../state';
import type { AvatarPhotoMap } from '../assets/avatar-store';
import { bankDisplayOf } from './m2-qr-screen';
import type { ConsentReady } from './m5-consent-screen';
import { M3PlayersScreen } from './m3-players-screen';
import { M3BCharacterScreen } from './m3b-character-screen';
import { QrCaptureBlock } from './qr-capture';
import { GroupedTechString, RedAlert, ScreenTitle, SplitEvenButton, YellowAlert } from './shared';

export function SetupScreen({
  input,
  draft,
  onDraft,
  abandonedCount,
  onStart,
  onOpenRules,
  onSplitEven,
  photos,
  onPhotosChanged,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  /** Số cam kết đã bị bỏ trong phiên — hiện tối thiểu khi > 0 (SPEC §M6). */
  abandonedCount: number;
  onStart: (ready: ConsentReady) => void;
  onOpenRules: () => void;
  onSplitEven: () => void;
  photos: AvatarPhotoMap;
  onPhotosChanged: (next: Map<string, string>) => void;
}) {
  const [totalText, setTotalText] = useState(() =>
    draft.totalVnd > 0 ? formatMoneyGrouped(draft.totalVnd) : '',
  );
  const [chung, setChung] = useState('');
  const [twoConfirmed, setTwoConfirmed] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showQr, setShowQr] = useState(() => Boolean(draft.qr.payload));
  const [detailsOpen, setDetailsOpen] = useState(false);

  const totalVnd = parseMoneyInput(totalText);
  const players = useMemo(
    () =>
      draft.selectedPlayerIds
        .map((id) => input.members.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .map((m) => ({ id: m.id, name: m.displayName })),
    [draft.selectedPlayerIds, input],
  );
  const n = players.length;
  const playersValid = n >= 2 && n <= 12;
  const game = draft.game ?? 'g2';
  const params: MatchParams = useMemo(
    () => ({ game, players, totalVnd }),
    [game, players, totalVnd],
  );

  // Trần kép theo đúng tập người chơi của ván.
  const caps = useMemo(() => {
    if (totalVnd <= 0 || draft.selectedPlayerIds.length < 2) return null;
    const shares = draft.selectedPlayerIds.map(
      (id) => equalSharesFor(totalVnd, draft.selectedPlayerIds)[id] ?? 0,
    );
    return checkCaps(totalVnd, shares);
  }, [totalVnd, draft.selectedPlayerIds]);

  const shares = useMemo(
    () => equalSharesFor(totalVnd, draft.selectedPlayerIds),
    [totalVnd, draft.selectedPlayerIds],
  );
  const shareValues = draft.selectedPlayerIds.map((id) => shares[id] ?? 0);
  const minShare = shareValues.length ? Math.min(...shareValues) : 0;
  const maxShare = shareValues.length ? Math.max(...shareValues) : 0;
  const extra = totalVnd - minShare;

  // Cam kết hai giai đoạn (SPEC §5): seed_device + C1 suy từ params
  // HIỆN TẠI — params đổi (tiền/người/trò) thì C1 đổi theo, và C1 luôn
  // có sẵn để xem TRƯỚC khi số chung được nhập (trong «Chi tiết ván»).
  const commit = useMemo(() => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const seedDevice = buf[0] >>> 0;
    const { c1, paramsHash } = createCommitment(seedDevice, params);
    return { seedDevice, c1, paramsHash };
  }, [params]);

  /* ---------------- QR tuỳ chọn + đối chiếu gọn ---------------- */
  const qr = draft.qr;
  const parsed = qr.parsed;
  const amountMismatch =
    parsed?.amountVnd !== null && parsed?.amountVnd !== undefined && parsed.amountVnd !== totalVnd;
  const matchedMember = useMemo(() => {
    if (!parsed?.accountName) return null;
    const key = nameKeyOf(parsed.accountName);
    return input.members.find((m) => nameKeyOf(m.displayName) === key) ?? null;
  }, [parsed, input]);
  const providerIsConfirmer = qr.providerId !== null && qr.providerId === qr.confirmerId;
  const sourceInfo = QR_SOURCES.find((s) => s.id === qr.source);
  const sourceTooWeak = sourceInfo ? !sourceInfo.strong : false;
  const qrNeedsConfirm = Boolean(qr.payload) && !qr.parseFailed && Boolean(parsed);
  const qrConfirmOk =
    !qrNeedsConfirm ||
    (Boolean(qr.providerId) &&
      Boolean(qr.confirmerId) &&
      !providerIsConfirmer &&
      Boolean(qr.source) &&
      !sourceTooWeak &&
      !amountMismatch);

  function setQr(patch: Partial<GameDraft['qr']>) {
    onDraft({ ...draft, qr: { ...draft.qr, ...patch } });
  }

  /* ---------------- Điều kiện bắt đầu + lý do cạnh nút ---------------- */
  const chungValid = /^\d{6,}$/.test(chung.trim());
  const canStart =
    totalVnd > 0 &&
    caps !== null &&
    caps.ok &&
    playersValid &&
    chungValid &&
    (n !== 2 || twoConfirmed) &&
    qrConfirmOk &&
    !amountMismatch;
  const startReason = canStart
    ? null
    : totalVnd <= 0
      ? 'Nhập tổng tiền để bắt đầu.'
      : caps && !caps.ok
        ? 'Tổng tiền đang vượt trần của game — giảm tổng hoặc chia đều.'
        : !playersValid
          ? n < 2
            ? 'Cần ít nhất 2 người chơi — mở «Đổi người chơi» để chọn thêm.'
            : 'Một ván tối đa 12 người chơi — mở «Đổi người chơi» để bỏ bớt.'
          : amountMismatch
            ? 'QR ghi sẵn số tiền khác tổng hoá đơn — kiểm lại QR hoặc tổng tiền.'
            : !qrConfirmOk
              ? 'Hãy đối chiếu QR ở mục QR phía trên: chọn người đưa QR, người đối chiếu và nguồn của quán.'
              : !chungValid
                ? 'Nhập số chung (ít nhất 6 chữ số) ở ô ngay phía trên để bắt đầu.'
                : 'Nhóm 2 người: tích ô xác nhận trong khối đồng thuận để bắt đầu.';

  const totalChangedVsSession =
    input.sessionTotalVnd > 0 && totalVnd > 0 && totalVnd !== input.sessionTotalVnd;

  return (
    <div>
      <ScreenTitle>Thiết lập ván</ScreenTitle>
      <p className="mt-1 text-base text-ink-2">
        Một người đãi cả bàn — app chọn ngẫu nhiên, cả nhóm cùng xem.
      </p>

      {/* --- Tổng tiền: tự điền từ phiên, sửa được --- */}
      <label className="mt-5 mb-1.5 block text-base font-semibold text-ink" htmlFor="setup-total">
        Tổng hoá đơn hôm nay (VND)
      </label>
      <input
        id="setup-total"
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
          Đang dùng tổng khác tổng phiên ({formatMoney(input.sessionTotalVnd)}).
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
          </RedAlert>
        </div>
      ) : null}

      {/* --- Chọn trò: ngay tại màn, G2 mặc định đã chọn --- */}
      <h3 className="mt-6 text-base font-semibold text-ink">Chọn trò</h3>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={game === 'g2'}
          onClick={() => onDraft({ ...draft, game: 'g2' })}
          className={`min-h-11 rounded-lg border-2 px-3 py-2.5 text-left ${
            game === 'g2' ? 'border-brand bg-brand-50' : 'border-line-strong bg-card'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="font-display text-base font-extrabold text-ink">Mâm cơm xoay</span>
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink-on-seed">
              VÁN NHANH
            </span>
            {game === 'g2' ? (
              <span className="text-sm font-semibold text-brand-deep">Đã chọn</span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-sm text-ink-2">
            Đũa dừng ở ai, người đó đãi · 8–12 giây
          </span>
        </button>
        <button
          type="button"
          aria-pressed={game === 'g1'}
          onClick={() => onDraft({ ...draft, game: 'g1' })}
          className={`min-h-11 rounded-lg border-2 px-3 py-2.5 text-left ${
            game === 'g1' ? 'border-brand bg-brand-50' : 'border-line-strong bg-card'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="font-display text-base font-extrabold text-ink">
              Đấu trường tự động
            </span>
            {game === 'g1' ? (
              <span className="text-sm font-semibold text-brand-deep">Đã chọn</span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-sm text-ink-2">
            Nhân vật tự đánh nhau, người đứng cuối đãi · {n === 2 ? '~20 giây' : '30–40 giây'}
          </span>
        </button>
      </div>

      {/* --- Người chơi + nhân vật: mặc định sẵn, đổi khi cần --- */}
      <div className="mt-4 rounded-lg border border-line bg-card px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-base text-ink">
            Người chơi: <strong>{n} người</strong>
            <span className="text-ink-2"> — {players.map((p) => p.name).join(', ')}</span>
          </p>
          <button
            type="button"
            aria-expanded={showPlayers}
            onClick={() => setShowPlayers(!showPlayers)}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            Đổi người chơi
          </button>
        </div>
        {showPlayers ? (
          <div className="mt-3 border-t border-line pt-3">
            <M3PlayersScreen
              embedded
              input={input}
              draft={draft}
              onDraft={onDraft}
              onNext={() => setShowPlayers(false)}
              onBack={() => setShowPlayers(false)}
              onSplitEven={onSplitEven}
              photos={photos}
            />
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <p className="min-w-0 flex-1 text-base text-ink">
            Nhân vật: <span className="text-ink-2">đã gán sẵn cho từng người</span>
          </p>
          <button
            type="button"
            aria-expanded={showCharacters}
            onClick={() => setShowCharacters(!showCharacters)}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            Đổi nhân vật
          </button>
        </div>
        {showCharacters ? (
          <div className="mt-3 border-t border-line pt-3">
            <M3BCharacterScreen
              embedded
              input={input}
              draft={draft}
              onDraft={onDraft}
              onNext={() => setShowCharacters(false)}
              onBack={() => setShowCharacters(false)}
              onSplitEven={onSplitEven}
              photos={photos}
              onPhotosChanged={onPhotosChanged}
            />
          </div>
        ) : null}
      </div>

      {/* --- QR của quán: TUỲ CHỌN --- */}
      <div className="mt-4 rounded-lg border border-line bg-card px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 text-base font-semibold text-ink">
            QR của quán <span className="font-normal text-ink-2">(tuỳ chọn)</span>
          </h3>
          {qr.payload ? (
            <button
              type="button"
              onClick={() => onDraft({ ...draft, qr: { ...EMPTY_QR_DRAFT } })}
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
            >
              Bỏ QR này
            </button>
          ) : (
            <button
              type="button"
              aria-expanded={showQr}
              onClick={() => setShowQr(!showQr)}
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
            >
              {showQr ? 'Chơi không cần QR' : 'Thêm QR'}
            </button>
          )}
        </div>
        {!qr.payload ? (
          <p className="mt-1 text-sm text-ink-2">
            Chưa có QR — vẫn chơi được, người đãi quét QR gốc tại quầy.
          </p>
        ) : null}
        {showQr && !qr.payload ? (
          <QrCaptureBlock
            draft={draft}
            onDraft={onDraft}
            totalVnd={totalVnd}
            texts={{
              parsedNote: 'Đã đọc được QR — đối chiếu nhanh ngay dưới đây.',
              failedNote: 'QR chưa đọc được — vẫn chơi được, người đãi quét QR gốc tại quầy.',
              hasPayloadText: 'Đã có QR cho ván này.',
              emptyText: 'Chưa có QR — vẫn chơi được, người đãi quét QR gốc tại quầy.',
            }}
          />
        ) : null}

        {qr.parseFailed ? (
          <div className="mt-3">
            <YellowAlert>
              QR chưa đọc được — vẫn chơi được; người đãi quét QR gốc tại quầy.
            </YellowAlert>
          </div>
        ) : null}

        {qrNeedsConfirm && parsed ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-base text-ink">
              QR: <strong>{parsed.accountName ?? 'Không ghi tên chủ tài khoản'}</strong> ·{' '}
              {bankDisplayOf(parsed)} · <span className="font-figure">{parsed.maskedAccount}</span>
            </p>
            {amountMismatch ? (
              <div className="mt-2">
                <RedAlert>
                  QR ghi sẵn {formatMoney(parsed.amountVnd ?? 0)}, khác tổng hoá đơn{' '}
                  {formatMoney(totalVnd)} — chưa chơi được, hãy kiểm lại tại bàn.
                </RedAlert>
              </div>
            ) : null}
            {matchedMember ? (
              <p className="mt-2 text-base text-debt-ink">
                Tên người nhận trùng thành viên {matchedMember.displayName} — bắt buộc đối chiếu
                bằng nguồn của quán (quầy / hoá đơn / nhân viên).
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Người đưa QR</span>
                <select
                  value={qr.providerId ?? ''}
                  onChange={(e) => setQr({ providerId: e.target.value || null })}
                  className="min-h-11 w-full rounded-lg border border-line-strong bg-card px-2 py-2 text-base text-ink"
                >
                  <option value="">Chọn người…</option>
                  {input.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  Người đối chiếu (khác người đưa)
                </span>
                <select
                  value={qr.confirmerId ?? ''}
                  onChange={(e) => setQr({ confirmerId: e.target.value || null })}
                  className="min-h-11 w-full rounded-lg border border-line-strong bg-card px-2 py-2 text-base text-ink"
                >
                  <option value="">Chọn người…</option>
                  {input.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Nguồn đối chiếu</span>
                <select
                  value={qr.source ?? ''}
                  onChange={(e) => setQr({ source: (e.target.value || null) as QrSourceId | null })}
                  className="min-h-11 w-full rounded-lg border border-line-strong bg-card px-2 py-2 text-base text-ink"
                >
                  <option value="">Chọn nguồn…</option>
                  {QR_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {providerIsConfirmer ? (
              <p className="mt-2 text-sm text-debt-ink">Người đối chiếu phải khác người đưa QR.</p>
            ) : null}
            {sourceTooWeak ? (
              <p className="mt-2 text-sm text-debt-ink">
                Lời cam đoan của người đưa QR một mình không đủ — hãy đối chiếu với quầy, hoá đơn
                hoặc nhân viên quán.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* --- Đồng thuận gọn + số chung (TRÊN nút Bắt đầu) --- */}
      <div className="mt-4 rounded-lg border border-line-strong bg-card px-4 py-4">
        <p className="text-base text-ink">
          Tổng{' '}
          <strong className="font-display text-[20px] font-extrabold">
            {formatMoney(totalVnd)}
          </strong>
          {' · '}chia đều mỗi người{' '}
          {minShare === maxShare
            ? formatMoney(minShare)
            : `${formatMoney(minShare)} – ${formatMoney(maxShare)}`}
        </p>
        <p className="mt-1 text-base text-ink">
          Nếu chơi: một người trả toàn bộ — <strong>gánh thêm tối đa {formatMoney(extra)}</strong>{' '}
          so với chia đều.
        </p>
        {n === 2 ? (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-warning-solid bg-warning-bg px-3 py-2.5">
            <input
              type="checkbox"
              checked={twoConfirmed}
              onChange={(e) => setTwoConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span className="text-base text-ink">
              Cả hai đều đã hiểu: một trong hai người sẽ trả toàn bộ hoá đơn này.
            </span>
          </label>
        ) : null}
        {draft.replayOf ? (
          <p className="mt-2 text-sm text-ink-2">
            Ván mới sẽ thay thế kết quả ván {draft.replayOf.code}; ván cũ vẫn nằm trong nhật ký
            phiên.
          </p>
        ) : null}
        {abandonedCount > 0 ? (
          <p className="mt-2 text-sm text-ink-2">
            Phiên này đã có {abandonedCount} cam kết bị bỏ — được ghi công khai trong nhật ký phiên.
          </p>
        ) : null}

        <label className="mt-4 mb-1.5 block text-base font-semibold text-ink" htmlFor="setup-chung">
          Số chung — một thành viên khác tự tay nhập (ít nhất 6 chữ số)
        </label>
        <input
          id="setup-chung"
          inputMode="numeric"
          style={{ outline: 'none' }}
          onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })}
          className="w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 font-figure text-base text-ink placeholder:text-placeholder focus:border-[#534946]"
          placeholder="Ví dụ: 483920"
          value={chung}
          onChange={(e) => setChung(e.target.value.replace(/\D/g, ''))}
        />
        {chung && !chungValid ? (
          <p className="mt-1 text-sm text-debt-ink">Số chung cần ít nhất 6 chữ số.</p>
        ) : null}
        <button
          type="button"
          onClick={onOpenRules}
          className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
        >
          Xem luật chơi
        </button>
      </div>

      {/* --- Chi tiết ván: kỹ thuật thu gọn mặc định --- */}
      <button
        type="button"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
      >
        {detailsOpen ? 'Thu gọn chi tiết ván' : 'Chi tiết ván (mã cam kết, luật hoà)'}
      </button>
      {detailsOpen ? (
        <div className="mt-2 space-y-2 rounded-lg border border-line bg-grey-50 px-3 py-3 text-sm text-ink">
          <p>
            Mã cam kết của máy (C1):{' '}
            <GroupedTechString value={commit.c1} className="font-mono font-bold" /> — máy tạo và
            hiện mã này trước khi số chung được nhập, để cả nhóm nhận diện đúng ván.
          </p>
          <p>
            Hoà: đấu trường hoà đến cùng thì những người đồng hạng cùng đãi, mỗi người một phần bằng
            nhau; mâm cơm xoay không có hoà. Ván chính tối đa 40 giây, có thể vào đột tử 10 giây rồi
            tối đa một ván phụ.
          </p>
          <p>{QR_RESPONSIBILITY_SHORT}</p>
        </div>
      ) : null}

      {/* --- Thanh Bắt đầu cố định: lý do NGAY CẠNH nút khi nút mờ (F4) --- */}
      <div className="sticky bottom-0 z-20 mt-5 bg-canvas/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {startReason ? (
          <p role="status" className="mb-2 text-sm font-semibold text-debt-ink">
            {startReason}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canStart}
          onClick={() => {
            unlockAudio();
            onStart({
              params,
              c1: commit.c1,
              paramsHash: commit.paramsHash,
              seedDevice: commit.seedDevice,
              chung: chung.trim(),
              // Đối chiếu QR chốt ngay tại nút Bắt đầu (màn gộp không
              // còn bước M2 riêng để ghi confirmedAt vào draft trước).
              qrConfirmedAt: qrNeedsConfirm ? Date.now() : draft.qr.confirmedAt,
            });
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed disabled:cursor-not-allowed disabled:bg-deck-sand disabled:text-ink"
        >
          Cả nhóm đồng ý — Bắt đầu
        </button>
        <SplitEvenButton onClick={onSplitEven} />
      </div>
    </div>
  );
}
