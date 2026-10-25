// M7 — Kết quả + QR (SPEC §M7). Danh hiệu «nhà vô địch đãi» CHỈ xuất hiện
// từ màn này. Thứ tự hành động chốt cứng: (i) hành động chính hoàn tất;
// (ii) «Chia đều cho lành» với xác nhận trung tính 1 bước; (iii) «Xem lại
// ván này» (chỉ G1); (iv) «Chơi lại» — nút phụ nhỏ nhất, không nhấp nháy,
// không đếm ngược, đi đúng 3 bước của SPEC qua entry.
// QR: chỉ hiện payload ĐÃ KHOÁ vào ván — payload sống ở bộ nhớ phiên game;
// nếu app đã đóng/mở lại thì phải nhập lại QR và đối chiếu hash đã khoá,
// khớp mới hiện (ARCH §8). Bản ghi ván không chứa payload QR thô.
//
// Bố cục kết quả theo thư viện reference (đợt REBUILD-C, lane D):
// - Pattern 10 (Splitwise 3.3/3.4): khối chính đọc thành một câu
//   «ai → ai» — badge người đãi lớn → mũi tên → đích đến (QR quán),
//   kèm câu chữ đầy đủ «[Tên] đãi cả bàn [T] ₫»; danh sách phụ viết
//   dạng câu thay cho bảng số khô.
// - Pattern 8 (ZaloPay 2.3): mã QR + tên quán/chủ mã + số tiền phải trả
//   nằm ĐỒNG THỜI trong một khung — không tách trang.
// - Pattern 9 (Tricount 3.5 / Splitwise 3.1–3.2): hàng người–tiền kỷ
//   luật (badge trái, tên + câu giữa, số căn phải), trạng thái bằng
//   dấu + màu + nhãn chữ; đúng MỘT CTA đặc («Hoàn tất»), lối phụ là
//   nút viền. Số tiền là trung tâm thị giác lớn nhất khối kết quả
//   (pattern 7, ZaloPay 2.4).

'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { fnv1a64, pickHighlights } from '../engine';
import type { Highlight } from '../engine/types';
import { formatMoney } from '../adapter';
import type { GameSessionInput } from '../adapter';
import { buildIdentityMapCovering } from '../assets/identity';
import { QR_FINAL_CHECK_LINE, QR_NO_NAME_WARNING } from '../copy';
import type { GameRecord } from '../store';
import type { GameDraft } from '../state';
import { playSfx } from '../audio/sound';
import type { AvatarPhotoMap } from '../assets/avatar-store';
import { PlayerAvatar, ScreenTitle, YellowAlert } from './shared';

/**
 * Badge người đãi ở M7 — PlayerAvatar dùng chung toàn game (FIX-V3
 * P0.4 + N3): người có ẢNH CHỤP trên máy thì hiện ảnh tròn (tra kho
 * ảnh riêng theo member id tại lúc hiển thị), không có ảnh thì
 * GameBadge DiceBear initials như cũ — nền theo colorIndex, glyph =
 * initialsOf của lib. colorIndex tra từ identity map duy nhất
 * (game/assets/identity.ts) dựng trên roster đầy đủ của phiên — M7
 * không tự sinh badge bằng tham số DiceBear riêng, không gán màu
 * theo danh sách người chơi của ván.
 */
function PayerBadge({
  name,
  colorIndex,
  size,
  photoDataUrl,
  ringHex,
}: {
  name: string;
  colorIndex: number;
  size: number;
  photoDataUrl?: string;
  /** Viền màu danh tính quanh ẢNH CHỤP (FIX-V4 D2) — chỉ truyền ở vị trí vinh danh. */
  ringHex?: string;
}) {
  return (
    <PlayerAvatar
      name={name}
      colorIndex={colorIndex}
      size={size}
      photoDataUrl={photoDataUrl}
      ringHex={ringHex}
    />
  );
}

export function M7ResultScreen({
  input,
  record,
  draft,
  finalFrameUrl,
  onComplete,
  onDiscardToSplitEven,
  onReplayView,
  onPlayAgain,
  photos,
  ledgerRecorded = false,
  onRecordToLedger,
  onOpenRules,
}: {
  input: GameSessionInput;
  record: GameRecord;
  /** Bản nháp của phiên game đang mở — mang payload QR trong bộ nhớ (nếu còn). */
  draft: GameDraft;
  /** Ảnh avatar trên máy theo member id (FIX-V3 N3) — vòng vinh danh + badge phụ hiện ảnh tròn khi người có ảnh. */
  photos?: AvatarPhotoMap;
  /** Frame cuối của ván (CẢ G1 lẫn G2) chụp ở màn chơi — chỉ ở bộ nhớ phiên, có thể null (vd khôi phục ván). */
  finalFrameUrl?: string | null;
  onComplete: () => void;
  onDiscardToSplitEven: () => void;
  onReplayView: () => void;
  onPlayAgain: () => void;
  /**
   * FIX-UX-GAME (F6): kết quả game KHÔNG tự ghi vào sổ — màn này nói
   * rõ 1 dòng và, khi app chính cấp callback ghi sổ, hiện nút «Ghi
   * vào sổ» để người dùng chủ động ghi. ledgerRecorded = đã ghi rồi.
   */
  ledgerRecorded?: boolean;
  onRecordToLedger?: () => void;
  /** Mở màn luật đầy đủ (luật hoà/đột tử) — từ mục «Chi tiết ván». */
  onOpenRules?: () => void;
}) {
  const log = record.log;
  const total = log.params.totalVnd;
  const nameOf = (id: string) =>
    log.params.players.find((p) => p.id === id)?.name ??
    input.members.find((m) => m.id === id)?.displayName ??
    'Người chơi';

  const result = log.result;
  const coPayerShare =
    result.kind === 'co-payers' ? Math.floor(total / result.payerIds.length) : null;
  const payerIds = result.kind === 'single' ? [result.payerId] : result.payerIds;
  /** Số tiền MỘT người đãi phải trả thật: cả bàn nếu đãi một mình; T/k nếu cùng đãi. */
  const payAmount = result.kind === 'single' ? total : (coPayerShare ?? 0);
  // Danh tính từ identity map DUY NHẤT dựng trên roster đầy đủ của
  // phiên (không theo danh sách người chơi của ván) — badge M7 khớp
  // badge M2/M3 và vòng/plate trong game. buildIdentityMapCovering
  // chỉ nối thêm người chơi lạ của bản ghi khôi phục khác phiên.
  const identityMap = useMemo(
    () =>
      buildIdentityMapCovering(
        input.members.map((m) => ({ id: m.id, name: m.displayName })),
        log.params.players.map((p) => ({ id: p.id, name: p.name })),
      ),
    [input, log],
  );
  const colorIndexOf = (id: string) => identityMap.get(id)?.colorIndex ?? 0;
  const strongHexOf = (id: string) => identityMap.get(id)?.strongHex;
  const shopName = record.qr.accountName ?? 'QR của quán';

  const highlights = useMemo(
    () =>
      log.params.game === 'g1'
        ? // Tường thuật theo thời gian TĂNG DẦN theo tick gốc (PRES
          // vòng 2, mục 5d): pickHighlights trả theo thứ tự loại khoảnh
          // khắc (ngã đầu → ngã quyết định → chí mạng → né) nên một đòn
          // chí mạng sớm có thể bị kể SAU đòn ngã quyết định muộn hơn
          // (pack v2: «thứ 65» kể trước «thứ 51»). Sắp xếp lại tại đây,
          // không đổi dữ liệu engine.
          [...pickHighlights(log.events)].sort((a, b) => a.tick - b.tick)
        : [],
    [log],
  );
  const spinEvent = log.events.find((e) => e.type === 'spin');

  // QR hiển thị được: payload trong bộ nhớ khớp hash đã khoá vào ván.
  const inMemoryPayload =
    draft.qr.payload && record.qrHash && fnv1a64(draft.qr.payload) === record.qrHash
      ? draft.qr.payload
      : null;
  const [reentered, setReentered] = useState('');
  const [reenteredOk, setReenteredOk] = useState<boolean | null>(null);
  const shownPayload = inMemoryPayload ?? (reenteredOk ? reentered.trim() : null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (shownPayload) {
      QRCode.toDataURL(shownPayload, { width: 320, margin: 2 })
        .then((url) => {
          if (alive) setQrDataUrl(url);
        })
        .catch(() => {
          if (alive) setQrDataUrl(null);
        });
    } else {
      // Hoãn sang microtask: setState đồng bộ trong thân effect bị cấm bởi
      // react-hooks/set-state-in-effect (bài học lint v1.9.0/v1.9.1).
      void Promise.resolve().then(() => {
        if (alive) setQrDataUrl(draft.qr.imageDataUrl);
      });
    }
    return () => {
      alive = false;
    };
  }, [shownPayload, draft.qr.imageDataUrl]);

  const [seedOpen, setSeedOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // UIUX-GAME-V2: «Diễn biến đáng nhớ» THU GỌN mặc định — hiện 1 dòng
  // đầu, bấm «Xem thêm» mới mở hết.
  const [hlOpen, setHlOpen] = useState(false);

  // Kèn kết quả chỉ phát ở M7 (SPEC §7.5/§9) — một lần khi màn kết quả mở.
  useEffect(() => {
    playSfx('fanfare');
  }, []);

  const branch = record.qr.branch;
  const showQrSection = branch !== '2c' && record.qrHash !== null;

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-5">
      <div className="lg:col-span-2">
        <ScreenTitle>Kết quả ván {record.code}</ScreenTitle>
      </div>

      {/* Khối kết quả chính — đọc thành câu «ai → ai» (pattern 10):
          badge người đãi lớn → mũi tên → đích đến (QR quán), câu chữ
          đầy đủ, số tiền là trung tâm thị giác lớn nhất khối. Danh
          hiệu «nhà vô địch đãi» chỉ sống trong khối này của M7. */}
      {/* FIX-V4 D2 (mobile): đệm dọc của phiếu + các khoảng mt thu một
          mức (lg: khôi phục nguyên) để phiếu + TOÀN BỘ QR + CTA cùng
          nằm trong khung nhìn đầu 390×844 — panel v4 frame 09a/15a/33
          CTA sticky cắt mất phần dưới mã QR. Cấu trúc «ai → ai» +
          MỞ PHIẾU giữ nguyên. */}
      <div className="paper-grain sheet-shadow relative mt-2 rounded-[4px] border border-line-strong bg-card px-4 py-2 lg:col-start-1 lg:mt-4 lg:py-3">
        <span
          aria-hidden
          className="absolute top-3 right-3 -rotate-6 rounded border-2 border-brand px-1.5 py-0.5 text-[11px] font-extrabold tracking-widest text-brand-deep"
        >
          MỞ PHIẾU
        </span>
        {result.kind === 'single' ? (
          <>
            <p className="text-sm leading-snug font-semibold tracking-wide text-brand-deep uppercase">
              Nhà vô địch đãi
            </p>
            <div className="mt-2 flex items-center gap-3 lg:mt-3">
              <PayerBadge
                name={nameOf(result.payerId)}
                colorIndex={colorIndexOf(result.payerId)}
                size={56}
                photoDataUrl={photos?.get(result.payerId)}
                ringHex={strongHexOf(result.payerId)}
              />
              <span aria-hidden className="font-display text-[28px] font-extrabold text-ink">
                →
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-ink-2">Trả cho</p>
                <p className="font-display text-[20px] leading-tight font-extrabold break-words text-ink">
                  {shopName}
                </p>
              </div>
            </div>
            <p className="mt-2 text-base text-ink lg:mt-3">
              <strong>{nameOf(result.payerId)}</strong> đãi cả bàn {formatMoney(total)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm leading-snug font-semibold tracking-wide text-brand-deep uppercase">
              Cùng đãi ván này
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 lg:mt-3">
              <span className="flex items-center gap-2">
                {payerIds.map((id) => (
                  <PayerBadge
                    key={id}
                    name={nameOf(id)}
                    colorIndex={colorIndexOf(id)}
                    size={48}
                    photoDataUrl={photos?.get(id)}
                    ringHex={strongHexOf(id)}
                  />
                ))}
              </span>
              <span aria-hidden className="font-display text-[28px] font-extrabold text-ink">
                →
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-ink-2">Trả cho</p>
                <p className="font-display text-[20px] leading-tight font-extrabold break-words text-ink">
                  {shopName}
                </p>
              </div>
            </div>
            <p className="mt-2 text-base text-ink lg:mt-3">
              <strong>{payerIds.map(nameOf).join(' và ')}</strong> cùng đãi cả bàn{' '}
              {formatMoney(total)} — mỗi người trả {formatMoney(coPayerShare ?? 0)}.
            </p>
          </>
        )}
        {/* Mobile: nhãn + số tiền trên MỘT HÀNG (số vẫn là chữ lớn
            nhất khối); lg: khôi phục khối căn giữa hai dòng như cũ. */}
        <p className="mt-2 flex items-baseline justify-between gap-3 lg:mt-3 lg:block lg:text-center">
          <span className="block text-[13px] whitespace-nowrap text-ink-2 lg:text-sm lg:whitespace-normal">
            {result.kind === 'single' ? 'Số tiền người đãi trả' : 'Tổng hoá đơn cả bàn'}
          </span>
          <span className="font-display text-[26px] leading-tight font-extrabold text-ink lg:text-[30px]">
            {formatMoney(total)}
          </span>
        </p>
        {/* Đường xé phiếu — ngôn ngữ phiếu của app chính
            (slip-card.tsx: giấy phiếu paper-grain + đường xé đứt
            nét): đặt LÊN cấu trúc ai→ai, không đổi cấu trúc/nội dung. */}
        <div
          aria-hidden
          className="relative mt-2 border-t-2 border-dashed border-line-strong lg:mt-3"
        >
          <span className="absolute top-0 -left-[18px] h-3 w-3 -translate-y-1/2 rounded-full bg-canvas" />
          <span className="absolute top-0 -right-[18px] h-3 w-3 -translate-y-1/2 rounded-full bg-canvas" />
        </div>
      </div>
      {/* Danh sách phụ dạng câu/cây (pattern 10 + 9): chỉ ở nhánh cùng
          đãi — mỗi người một hàng badge trái, câu đầy đủ ở giữa, số
          tiền căn phải; trạng thái đọc bằng dấu ✓ + màu + nhãn chữ
          «Cùng đãi», không chỉ dựa vào màu. */}
      {result.kind === 'co-payers' ? (
        <ul className="mt-3 space-y-2 lg:col-start-1">
          {result.payerIds.map((id) => (
            <li
              key={id}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-card px-3 py-1.5 lg:py-2"
            >
              <PayerBadge
                name={nameOf(id)}
                colorIndex={colorIndexOf(id)}
                size={32}
                photoDataUrl={photos?.get(id)}
              />
              <span className="flex-1 text-base text-ink">
                <strong>{nameOf(id)}</strong> trả {formatMoney(coPayerShare ?? 0)}
                <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-brand-deep">
                  <span aria-hidden>✓</span> Cùng đãi
                </span>
              </span>
              <span className="font-display text-[20px] font-extrabold text-ink">
                {formatMoney(coPayerShare ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* FIX-UX-GAME (F6): nói rõ 1 dòng — game chỉ chọn người đãi,
          kết quả CHƯA tự ghi vào sổ của phiên; ghi hay không là chọn
          của nhóm qua nút ghi (app chính ghi khoản «Game đãi»). */}
      <div className="mt-3 lg:col-start-1">
        {ledgerRecorded ? (
          <p className="text-base font-semibold text-ink">
            ✓ Đã ghi vào sổ: {payerIds.map(nameOf).join(' và ')} đã trả {formatMoney(total)}.
          </p>
        ) : (
          <>
            <p className="text-base text-ink">Kết quả này chưa ghi vào sổ.</p>
            {onRecordToLedger ? (
              <button
                type="button"
                onClick={onRecordToLedger}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-brand bg-card px-4 py-2.5 text-base font-bold text-brand-deep"
              >
                Ghi vào sổ: {payerIds.map(nameOf).join(' và ')} đã trả {formatMoney(total)}
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* QR của quán */}
      {showQrSection ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-line-strong bg-card px-4 py-3 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:mt-4 lg:py-4">
          {/* Pattern 8: mã QR + tên quán/chủ mã + số tiền phải trả nằm
              ĐỒNG THỜI trong khung này — người đãi đối chiếu cả ba
              trước khi quét, không tách trang. FIX-V4 D2 (mobile):
              đệm/khoảng thu một mức + dòng chữ leading-snug + QR
              180px (đúng sàn ~180px quét được) để cả mã lọt khung đầu; lg:
              khôi phục nguyên (QR 256px, đệm cũ). */}
          <div className="-mx-4 -mt-3 mb-2 flex items-center justify-between bg-ink px-4 py-1 lg:-mt-4 lg:mb-3 lg:py-1.5">
            <span className="text-sm font-bold tracking-[0.2em] text-white">VietQR</span>
            <span className="text-xs text-white">Đối chiếu tên + số tiền trước khi quét</span>
          </div>
          <h3 className="text-base leading-snug font-semibold text-ink">
            VietQR của quán cho người đãi quét
          </h3>
          {record.qr.accountName ? (
            <p className="mt-1 text-base leading-snug text-ink lg:leading-normal">
              Tên quán / chủ tài khoản: <strong>{record.qr.accountName}</strong>
            </p>
          ) : (
            <p className="mt-1 text-base leading-snug text-ink lg:leading-normal">
              QR này không ghi tên quán / chủ tài khoản.
            </p>
          )}
          <p className="text-base leading-snug text-ink lg:leading-normal">
            Ngân hàng: {record.qr.bankDisplay} · Số tài khoản:{' '}
            <span className="font-figure">{record.qr.maskedAccount}</span>
          </p>
          <p className="mt-1 text-base text-ink lg:mt-2">
            Số tiền phải trả:{' '}
            <strong className="font-display text-[22px] font-extrabold lg:text-[24px]">
              {formatMoney(payAmount)}
            </strong>
            {result.kind === 'co-payers' ? (
              <span className="text-ink-2"> — mỗi người cùng đãi trả một phần như vậy</span>
            ) : null}
          </p>
          {branch === '2b' ? (
            <div className="mt-2">
              <YellowAlert>{QR_NO_NAME_WARNING}</YellowAlert>
            </div>
          ) : null}

          {shownPayload && qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR là data-URL sinh tại client từ payload của quán; next/image không áp dụng cho data-URL động
            <img
              src={qrDataUrl}
              alt="Mã QR của quán đã đối chiếu ở bước xác nhận"
              className="mx-auto mt-2 w-[180px] max-w-full lg:mt-3 lg:w-64"
            />
          ) : (
            <div className="mt-3">
              <p className="text-base text-ink">
                App đã mở lại — dán lại QR của quán để đối chiếu.
              </p>
              <textarea
                rows={3}
                // F3 (audit PWA native-feel): font-size ≥16px như mọi ô
                // nhập khác của game (trước đây text-sm 14px).
                className="mt-2 w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 font-mono text-base text-ink outline-none focus:border-brand-deep"
                placeholder="Dán nội dung QR của quán…"
                value={reentered}
                onChange={(e) => {
                  setReentered(e.target.value);
                  setReenteredOk(null);
                }}
              />
              <button
                type="button"
                className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
                onClick={() => {
                  const ok = record.qrHash !== null && fnv1a64(reentered.trim()) === record.qrHash;
                  setReenteredOk(ok);
                }}
              >
                Đối chiếu và hiển thị QR
              </button>
              {reenteredOk === false ? (
                <p className="mt-1.5 text-base text-debt-ink">
                  Không khớp mã đã khoá — dùng đúng QR của quán.
                </p>
              ) : null}
            </div>
          )}

          <p className="mt-3 text-base font-semibold text-ink">{QR_FINAL_CHECK_LINE}</p>
          {record.qr.nameMatchedMember && record.qr.confirmerName && record.qr.confirmedAt ? (
            <p className="mt-2 text-sm text-ink-2">
              QR trùng tên thành viên đã được {record.qr.confirmerName} xác nhận lúc{' '}
              {new Date(record.qr.confirmedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </p>
          ) : null}
          {/* UIUX-GAME-V2: InfoBox trách nhiệm QR rút gọn KHÔNG còn ở
              M7 — bản đầy đủ sống ở sheet «Luật chơi & chi tiết». */}
        </div>
      ) : (
        <div className="mt-5 lg:col-start-2 lg:row-start-2 lg:mt-4">
          <YellowAlert>
            {/* UIUX-GAME-V2: cảnh báo QR đúng 1 dòng — phân biệt «chơi
                không cần QR» (qrHash null) với «QR chưa giải mã được». */}
            {record.qrHash === null
              ? 'Không có QR — người đãi quét QR gốc tại quầy.'
              : 'QR chưa đọc được — người đãi quét QR gốc tại quầy.'}
          </YellowAlert>
        </div>
      )}

      {/* Tường thuật ván — thu gọn mặc định (UIUX-GAME-V2): tối đa 1
          dòng + «Xem thêm». */}
      {log.params.game === 'g1' && highlights.length > 0 ? (
        <div className="mt-4 lg:col-span-2">
          <h3 className="text-base font-semibold text-ink">Diễn biến đáng nhớ</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-ink">
            {(hlOpen ? highlights : highlights.slice(0, 1)).map((h, i) => (
              <li key={i}>{highlightText(h, nameOf)}</li>
            ))}
          </ul>
          {highlights.length > 1 ? (
            <button
              type="button"
              aria-expanded={hlOpen}
              onClick={() => setHlOpen(!hlOpen)}
              className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand-deep underline underline-offset-2"
            >
              {hlOpen ? 'Thu gọn' : 'Xem thêm'}
            </button>
          ) : null}
        </div>
      ) : null}
      {/* Frame kết ván (PRES vòng 2, mục 5): SPEC §M7 áp cho CẢ HAI
          game — stage chụp frame cuối cho cả G1 (xem stage.tsx), M7 có
          frame thì hiện ảnh + caption đúng sự thật theo từng game. G2
          không có frame (vd khôi phục ván) giữ đoạn chữ cũ. */}
      {finalFrameUrl ? (
        <figure className="mt-4 lg:col-span-2">
          {/* UIUX-GAME-V2: frame kết ván thành THUMBNAIL ≤180px — bằng
              chứng ván vẫn có, không còn chiếm khung đầu của M7. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- Frame cuối là data-URL PNG sinh tại client từ canvas Phaser; next/image không áp dụng cho data-URL động */}
          <img
            src={finalFrameUrl}
            alt={
              log.params.game === 'g2'
                ? 'Mâm cơm lúc dừng — ô của người được chọn đã được đánh dấu'
                : 'Khung hình cuối của đấu trường, chụp đúng lúc ván dừng ở màn chơi'
            }
            className="mx-auto h-[180px] w-[180px] rounded-lg border border-line-strong object-cover"
          />
          <figcaption className="mt-2 text-center text-sm text-ink-2">
            {log.params.game === 'g2'
              ? `Mâm dừng ở phần của ${nameOf(result.kind === 'single' ? result.payerId : '')}.`
              : 'Khung hình cuối của ván.'}
          </figcaption>
        </figure>
      ) : log.params.game === 'g2' && spinEvent && spinEvent.type === 'spin' ? (
        <p className="mt-4 text-base text-ink lg:col-span-2">
          Mâm đã dừng ở vị trí của {nameOf(result.kind === 'single' ? result.payerId : '')}.
        </p>
      ) : null}

      {/* Chi tiết ván — kỹ thuật + luật hoà/đột tử thu gọn mặc định
          (SPEC §M7/§5.2e; FIX-UX-GAME mục 3: thông tin kỹ thuật không
          phơi ra luồng chính, gom hết vào mục thu gọn này). */}
      <button
        type="button"
        aria-expanded={seedOpen}
        onClick={() => setSeedOpen(!seedOpen)}
        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink lg:col-span-2 lg:justify-self-start"
      >
        {seedOpen ? 'Thu gọn chi tiết ván' : 'Chi tiết ván'}
      </button>
      {seedOpen ? (
        <div className="mt-2 rounded-lg border border-line bg-grey-50 px-3 py-3 lg:col-span-2">
          <dl className="space-y-1 font-mono text-sm break-all text-ink">
            <div>Mã ván: {record.code}</div>
            <div>seed_device: {record.seedDevice}</div>
            <div>Số chung: {record.chung}</div>
            <div>Seed cuối: {record.seedFinal}</div>
            <div>Thuật toán: {record.algo}</div>
            <div>C1: {record.c1}</div>
            <div>logHash: {log.logHash}</div>
          </dl>
          {/* UIUX-GAME-V2: đoạn luật hoà KHÔNG còn lặp ở đây — luật
              đầy đủ ở sheet «Luật chơi & chi tiết» (nút dưới mở sheet). */}
          {onOpenRules ? (
            <button
              type="button"
              onClick={onOpenRules}
              className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
            >
              Xem luật đầy đủ
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Thứ tự hành động chốt cứng (SPEC §M7 / D5 màn 4).
          FIX-V3 P1.7: «Hoàn tất» neo CỐ ĐỊNH ở đáy màn (pattern 7). */}
      <div className="sticky bottom-0 z-20 mt-6 bg-canvas/95 py-2 backdrop-blur lg:col-span-2">
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
        >
          Hoàn tất
        </button>
      </div>

      {discardOpen ? (
        <div className="mt-3 rounded-lg border border-line-strong bg-card px-4 py-4 lg:col-span-2">
          <p className="text-base text-ink">Bỏ kết quả ván {record.code} và chia đều?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onDiscardToSplitEven}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
            >
              Chia đều
            </button>
            <button
              type="button"
              onClick={() => setDiscardOpen(false)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
            >
              Giữ kết quả
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDiscardOpen(true)}
          className="mt-1 inline-flex min-h-11 w-full items-center justify-center px-3 py-1.5 text-base font-semibold text-ink-2 underline underline-offset-2 lg:col-span-2"
        >
          Chia đều cho lành
        </button>
      )}

      {log.params.game === 'g1' ? (
        <button
          type="button"
          onClick={onReplayView}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-ink lg:col-span-2"
        >
          Xem lại ván này
        </button>
      ) : null}

      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-3 inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 underline lg:col-span-2 lg:justify-self-start"
      >
        Chơi lại
      </button>
    </div>
  );
}

/**
 * Quy đổi tick engine → giây hiển thị (PRES vòng 2, mục 5d).
 * Căn cứ: engine chạy 0,5 giây/tick (`tickSeconds: 0.5` trong
 * G1_PARAMS, game/engine/events-g1.ts — engine.spec khoá giá trị này),
 * tick đếm từ 0 nên giây hiển thị = tick × 0,5 là thời điểm tick bắt
 * đầu. Phần lẻ ,5 ghi theo kiểu Việt bằng dấu phẩy: tick 45 → «22,5»,
 * tick 44 → «22». KHÔNG dùng số thứ tự «khoảnh khắc thứ tick+1» nữa —
 * hai hệ đếm cạnh nhau từng làm mốc thời gian khó đối chiếu.
 */
function tickSecondsText(tick: number): string {
  const seconds = tick * 0.5;
  return Number.isInteger(seconds) ? `${seconds}` : `${Math.floor(seconds)},5`;
}

/** Dịch một khoảnh khắc cấu trúc của engine thành câu chữ thân thiện (SPEC §M7). */
export function highlightText(h: Highlight, nameOf: (id: string) => string): string {
  switch (h.kind) {
    case 'first-fall':
      return `${nameOf(h.playerId ?? '')} là người ngã đầu tiên, ở giây ${tickSecondsText(h.tick)}.`;
    case 'decisive-fall':
      return `Ở giây ${tickSecondsText(h.tick)}: ${nameOf(h.playerId ?? '')} ngã — đòn ngã quyết định của ván.`;
    case 'crit':
      return `${nameOf(h.attackerId ?? '')} tung đòn chí mạng ${h.damage ?? 0} sát thương vào ${nameOf(h.targetId ?? '')} ở giây ${tickSecondsText(h.tick)}.`;
    case 'dodge':
      return `${nameOf(h.targetId ?? '')} né được đòn của ${nameOf(h.attackerId ?? '')} ở giây ${tickSecondsText(h.tick)}.`;
    default:
      return `Ở giây ${tickSecondsText(h.tick)}.`;
  }
}
