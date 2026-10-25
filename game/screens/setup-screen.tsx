// Màn THIẾT LẬP GỘP (FIX-UX-GAME, sau chơi thử live 2026-10-25): toàn bộ
// luồng trước ván chạy NÉN còn ĐÚNG MỘT màn — thay chuỗi M1→M2→M3→M3B→
// M4→M5 (7 màn, 25 thao tác đo được). Nguyên tắc của đợt:
// - Tổng tiền TỰ ĐIỀN từ tổng phiên (vẫn sửa được), kiểm trần tại chỗ.
// - Chọn trò ngay tại màn; mặc định «Mâm cơm xoay» (G2, VÁN NHANH) đã
//   chọn sẵn — không bấm cũng chơi được.
// - Người chơi mặc định CẢ BÀN, nhân vật mặc định ĐÃ GÁN SẴN; chỉ khi
//   muốn đổi mới mở sheet «Đổi người chơi» / «Đổi nhân vật» (M3/M3B ở
//   chế độ embedded trong GameSheet — UI-SLIM BS-1 thay panel nhúng) —
//   không còn màn bắt buộc riêng.
// - QR là TUỲ CHỌN: không có QR vẫn bắt đầu được («Chơi không cần QR»);
//   QR không giải mã được → cảnh báo 1 dòng tại chỗ, KHÔNG sinh màn đối
//   chiếu riêng; QR đọc được → đối chiếu gọn bằng 3 ô chọn ngay tại màn
//   (giữ giao thức R2-3: người đối chiếu ≠ người cung cấp, nguồn yếu
//   nhất một mình không đủ, lệch số tiền ghi sẵn thì chặn).
// - Đồng thuận nằm CÙNG màn: cặp số tiền gọn + ô Số chung nằm TRÊN nút
//   Bắt đầu; nút mờ thì có dòng lý do NGAY CẠNH nút (bẫy F4).
// - Mỗi khối tối đa 1 dòng mô tả; C1/seed/kỹ thuật vào mục «Chi tiết
//   ván» thu gọn mặc định.
// UIUX-GAME-V2 (2026-10-25): nén trình bày để toàn màn lọt ≤1,2× khung
// 390×844 — tổng tiền thành hàng gọn 1 dòng (Sửa mới mở ô nhập), chọn
// trò thành 2 chip ngang, người chơi + nhân vật gộp 1 khối tóm tắt,
// cảnh báo rút ≤1 dòng; giải thích dài chỉ còn ở sheet «Luật chơi &
// chi tiết» (nút «?» ở entry).
// FLOW-3STEP (lệnh user 2026-10-25 ~22:37, gộp trong đợt UI-SLIM): màn
// này thành WIZARD 3 BƯỚC — 1 «Tiền & QR quán» (tổng + QR chụp camera)
// · 2 «Thêm người» (người chơi + nhân vật/avatar qua sheet) · 3 «Chọn
// game & chơi» (thẻ trò lớn + đồng thuận + số chung + nút Chơi). Mỗi
// bước ≤ ~1,2× khung 390. LUẬT VALIDATION: nút Tiếp/Chơi không bao giờ
// mờ vô cớ — bấm khi thiếu sẽ chuyển đúng bước, cuộn mượt tới trường
// thiếu đầu tiên, focus, viền đỏ + dòng lý do tại trường (firstBlocker
// là nguồn sự thật duy nhất cho cả lý do cạnh nút lẫn đích cuộn).

'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { QR_SOURCES } from '../copy';
import type { QrSourceId } from '../copy';
import { EMPTY_QR_DRAFT } from '../state';
import type { GameDraft } from '../state';
import type { AvatarPhotoMap } from '../assets/avatar-store';
import { bankDisplayOf } from './m2-qr-screen';
import type { ConsentReady } from './m5-consent-screen';
import { M3PlayersScreen } from './m3-players-screen';
import { M3BCharacterScreen } from './m3b-character-screen';
import { QrCaptureBlock } from './qr-capture';
import {
  GameSheet,
  GroupedTechString,
  RedAlert,
  ScreenTitle,
  SplitEvenButton,
  YellowAlert,
} from './shared';

/** Tên 3 bước của wizard FLOW-3STEP (chỉ báo bước + nút Tiếp). */
const STEP_NAMES = ['Tiền & QR quán', 'Thêm người', 'Chọn game & chơi'] as const;

/** Khoá trường cho luật validation cuộn-tới-trường-thiếu. */
type FieldKey =
  | 'total'
  | 'players'
  | 'qr-provider'
  | 'qr-confirmer'
  | 'qr-source'
  | 'qr-amount'
  | 'two'
  | 'chung';

/** Bước chứa mỗi trường — revealField chuyển bước trước khi cuộn/focus. */
const FIELD_STEP: Record<FieldKey, 1 | 2 | 3> = {
  total: 1,
  'qr-provider': 1,
  'qr-confirmer': 1,
  'qr-source': 1,
  'qr-amount': 1,
  players: 2,
  two: 3,
  chung: 3,
};

/** id DOM của phần tử nhận focus/cuộn cho mỗi khoá trường. */
const FIELD_ELEMENT_ID: Record<FieldKey, string> = {
  total: 'setup-total',
  players: 'setup-players-btn',
  'qr-provider': 'setup-qr-provider',
  'qr-confirmer': 'setup-qr-confirmer',
  'qr-source': 'setup-qr-source',
  'qr-amount': 'setup-qr-verify',
  two: 'setup-two-confirm',
  chung: 'setup-chung',
};

/** Minh hoạ SVG cho thẻ chọn trò ở bước 3 — mâm tròn nhìn từ trên. */
function GameArtTray() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
      <path d="M24 4a20 20 0 0 1 17.3 10L24 24Z" fill="#FF5722" opacity="0.85" />
      <circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M24 4v11M41.3 34 32.5 29M24 44V33M6.7 34l8.8-5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** Minh hoạ SVG cho thẻ chọn trò ở bước 3 — khiên đấu trường. */
function GameArtArena() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-ink"
    >
      <path
        d="M24 4 40 9.5V23c0 10-6.8 16.8-16 21C14.8 39.8 8 33 8 23V9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 13.5 26.6 20l6.9.8-5.1 4.7 1.4 6.8L24 29l-5.8 3.3 1.4-6.8-5.1-4.7 6.9-.8Z"
        fill="#FF5722"
        opacity="0.85"
      />
    </svg>
  );
}

export function SetupScreen({
  input,
  draft,
  onDraft,
  initialStep,
  onStepChange,
  abandonedCount,
  onStart,
  onSplitEven,
  photos,
  onPhotosChanged,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  /**
   * Bước wizard khởi tạo (TEAM 2F W2): entry truyền bước khôi phục từ
   * draft thiết lập bền — vào lại game là đứng đúng bước đang dở.
   * Vắng prop này thì bắt đầu ở bước 1 như trước.
   */
  initialStep?: 1 | 2 | 3;
  /** Báo mỗi lần bước đổi lên entry để ghi vào draft bền. */
  onStepChange?: (step: 1 | 2 | 3) => void;
  /** Số cam kết đã bị bỏ trong phiên — hiện tối thiểu khi > 0 (SPEC §M6). */
  abandonedCount: number;
  onStart: (ready: ConsentReady) => void;
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
  // FLOW-3STEP (lệnh user 2026-10-25 ~22:37): màn thiết lập là WIZARD
  // 3 bước — 1 «Tiền & QR quán» · 2 «Thêm người» · 3 «Chọn game &
  // chơi». `fieldError` là trường thiếu đầu tiên theo LUẬT VALIDATION:
  // bấm Tiếp/Chơi khi thiếu -> chuyển đúng bước, cuộn mượt tới trường,
  // focus, viền đỏ + dòng lý do ngay dưới trường; nút KHÔNG còn bị mờ
  // không lý do (bẫy F4 của v2.0.0 không tái diễn).
  const [step, setStep] = useState<1 | 2 | 3>(() => initialStep ?? 1);
  // TEAM 2F W2: báo bước hiện tại lên entry (chỉ khi entry có nhận) để
  // vị trí wizard đi vào draft bền cùng các trường thiết lập khác.
  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);
  const [fieldError, setFieldError] = useState<{ key: FieldKey; message: string } | null>(null);
  // UIUX-GAME-V2: tổng tiền mặc định là HÀNG GỌN 1 dòng (nhãn + số +
  // nút «Sửa»); ô nhập chỉ mở khi sửa hoặc khi chưa có tổng hợp lệ.
  const [totalOpen, setTotalOpen] = useState(false);

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

  /* ------------- Điều kiện bắt đầu + LUẬT VALIDATION ------------- */
  const chungValid = /^\d{6,}$/.test(chung.trim());

  /**
   * Trường thiếu ĐẦU TIÊN theo thứ tự đọc của wizard (bước 1 -> 2 ->
   * 3, trong bước theo chiều dọc). Nguồn sự thật duy nhất cho: dòng lý
   * do cạnh nút Chơi, viền đỏ + lý do tại trường, và đích cuộn/focus
   * khi bấm Tiếp/Chơi lúc chưa đủ điều kiện.
   */
  function firstBlocker(): { key: FieldKey; message: string } | null {
    if (totalVnd <= 0) return { key: 'total', message: 'Nhập tổng tiền để bắt đầu.' };
    if (caps && !caps.ok)
      return {
        key: 'total',
        message: 'Tổng tiền đang vượt trần của game — giảm tổng hoặc chia đều.',
      };
    if (!playersValid)
      return {
        key: 'players',
        message:
          n < 2
            ? 'Cần ít nhất 2 người chơi — bấm «Đổi người chơi» ở bước 2 để chọn thêm.'
            : 'Một ván tối đa 12 người chơi — bỏ bớt ở bước 2.',
      };
    if (amountMismatch)
      return { key: 'qr-amount', message: 'Số tiền trong QR khác tổng — kiểm lại ở bước 1.' };
    if (!qrConfirmOk) {
      if (!qr.providerId)
        return { key: 'qr-provider', message: 'Chọn người đưa QR ở bước 1 để bắt đầu.' };
      if (!qr.confirmerId || providerIsConfirmer)
        return {
          key: 'qr-confirmer',
          message: 'Chọn người đối chiếu (khác người đưa QR) ở bước 1.',
        };
      return { key: 'qr-source', message: 'Chọn nguồn đối chiếu đủ mạnh ở bước 1.' };
    }
    if (n === 2 && !twoConfirmed)
      return { key: 'two', message: 'Nhóm 2 người: tích ô xác nhận phía trên.' };
    if (!chungValid) return { key: 'chung', message: 'Nhập số chung ở ô phía trên để bắt đầu.' };
    return null;
  }
  const blocker = firstBlocker();
  const startReason = blocker?.message ?? null;

  /**
   * Đưa người dùng tới trường thiếu: chuyển đúng bước, mở sẵn ô nhập
   * tổng nếu cần, rồi cuộn MƯỢT tới giữa khung + focus. Chạy sau một
   * nhịp render để nội dung bước đích đã mount.
   */
  function revealField(key: FieldKey) {
    if (key === 'total') setTotalOpen(true);
    setStep(FIELD_STEP[key]);
    window.setTimeout(() => {
      const el = document.getElementById(FIELD_ELEMENT_ID[key]);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLButtonElement
      ) {
        el.focus({ preventScroll: true });
      }
    }, 90);
  }

  /** Bấm Tiếp/Chơi khi thiếu: ghi lỗi + đi tới trường thiếu đầu tiên. */
  function flagAndReveal(b: { key: FieldKey; message: string }) {
    setFieldError(b);
    revealField(b.key);
  }

  function scrollToWizardTop() {
    window.setTimeout(() => {
      document.getElementById('setup-root')?.scrollIntoView({ block: 'start' });
    }, 60);
  }

  function handleNextFromStep1() {
    if (totalVnd <= 0) {
      flagAndReveal({ key: 'total', message: 'Nhập tổng tiền để tiếp tục.' });
      return;
    }
    setStep(2);
    scrollToWizardTop();
  }

  function handleNextFromStep2() {
    if (!playersValid) {
      flagAndReveal({
        key: 'players',
        message:
          n < 2
            ? 'Cần ít nhất 2 người chơi — bấm «Đổi người chơi» để chọn thêm.'
            : 'Một ván tối đa 12 người chơi — bấm «Đổi người chơi» để bỏ bớt.',
      });
      return;
    }
    setStep(3);
    scrollToWizardTop();
  }

  // Người dùng sửa bất kỳ trường liên quan nào -> hết đánh dấu lỗi cũ
  // (dòng lý do cạnh nút Chơi vẫn phản ánh blocker hiện tại theo thời
  // gian thực nên không mất thông tin). Đây là đồng bộ cờ lỗi với dữ
  // liệu nguồn bên ngoài (draft do entry giữ) — cùng mẫu eslint-disable
  // có lý do như cơ chế exit của Sheet ở app chính.
  /* eslint-disable react-hooks/set-state-in-effect -- xoá cờ lỗi validation khi dữ liệu nguồn đổi là đầu ra của thay đổi dữ liệu, không phải vòng lặp render */
  useEffect(() => {
    setFieldError(null);
  }, [totalVnd, n, chung, twoConfirmed, qr.providerId, qr.confirmerId, qr.source]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalChangedVsSession =
    input.sessionTotalVnd > 0 && totalVnd > 0 && totalVnd !== input.sessionTotalVnd;

  return (
    <div id="setup-root">
      <ScreenTitle>Thiết lập ván</ScreenTitle>
      <p className="mt-1 text-base text-ink-2">Một người đãi cả bàn.</p>

      {/* --- Chỉ báo bước (FLOW-3STEP): 3 đoạn tiến trình + nhãn bước.
          Điều hướng bằng nút Tiếp ở chân mỗi bước và «Quay lại» ở đầu
          bước 2/3 — chỉ báo này chỉ để ĐỌC vị trí, không bấm được. --- */}
      <div className="mt-3" aria-label={`Bước ${step} trên 3: ${STEP_NAMES[step - 1]}`}>
        <div className="flex gap-1.5" aria-hidden>
          {STEP_NAMES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-brand' : 'bg-line'}`}
            />
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-ink">
          Bước {step}/3 · {STEP_NAMES[step - 1]}
        </p>
      </div>
      {step > 1 ? (
        <button
          type="button"
          onClick={() => {
            setStep((step - 1) as 1 | 2);
            scrollToWizardTop();
          }}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-semibold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
        >
          ← Quay lại bước {step - 1}
        </button>
      ) : null}

      {step === 1 ? (
        <>
          {/* --- Tổng tiền: HÀNG GỌN 1 dòng (UIUX-GAME-V2) — nhãn + số +
          nút «Sửa»; ô nhập chỉ mở khi bấm Sửa hoặc chưa có tổng. --- */}
          <div id="setup-total-row" className="mt-4 flex items-center justify-between gap-3">
            <p className="min-w-0 text-base text-ink">
              <span className="font-semibold text-ink-2">Tổng hoá đơn: </span>
              <strong className="font-display text-[20px] font-extrabold whitespace-nowrap">
                {formatMoney(totalVnd)}
              </strong>
            </p>
            <button
              type="button"
              aria-expanded={totalOpen || totalVnd <= 0}
              onClick={() => setTotalOpen(!totalOpen)}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
            >
              {totalOpen ? 'Xong' : 'Sửa'}
            </button>
          </div>
          {totalOpen || totalVnd <= 0 ? (
            <>
              <label
                className="mt-3 mb-1.5 block text-base font-semibold text-ink"
                htmlFor="setup-total"
              >
                Tổng hoá đơn hôm nay (VND)
              </label>
              <input
                id="setup-total"
                inputMode="decimal"
                aria-invalid={fieldError?.key === 'total' || undefined}
                className={`w-full rounded-lg border bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-placeholder focus:border-brand-deep ${
                  fieldError?.key === 'total' ? 'border-debt-solid' : 'border-line-strong'
                }`}
                placeholder="Ví dụ: 450.000"
                value={totalText}
                onChange={(e) => {
                  const v = parseMoneyInput(e.target.value);
                  setTotalText(v > 0 ? formatMoneyGrouped(v) : '');
                  onDraft({ ...draft, totalVnd: v });
                }}
              />
            </>
          ) : null}
          {fieldError?.key === 'total' ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-debt-ink">
              {fieldError.message}
            </p>
          ) : null}
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
        </>
      ) : null}

      {/* --- BƯỚC 3 · Chọn trò: THẺ LỚN (FLOW-3STEP thay 2 chip gọn
          của UIUX-GAME-V2) — minh hoạ SVG + tên + 1 dòng mô tả; trạng
          thái chọn bằng viền + nền + chấm radio + aria-pressed. G2 mặc
          định đã chọn. --- */}
      {step === 3 ? (
        <>
          <h3 className="sr-only">Chọn trò</h3>
          <div className="mt-4 grid gap-2" role="group" aria-label="Chọn trò">
            <button
              type="button"
              aria-pressed={game === 'g2'}
              onClick={() => onDraft({ ...draft, game: 'g2' })}
              className={`flex min-h-11 items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition duration-100 ease-[var(--ease-lock)] ${
                game === 'g2' ? 'border-brand bg-brand-50' : 'border-line-strong bg-card'
              }`}
            >
              <GameArtTray />
              <span className="min-w-0 flex-1">
                <span className="font-display block text-base font-extrabold text-ink">
                  Mâm cơm xoay
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-2">
                  Ván nhanh — đũa dừng ở ai, người đó đãi · 8–12 giây
                </span>
              </span>
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  game === 'g2' ? 'border-brand' : 'border-line-strong'
                }`}
              >
                {game === 'g2' ? <span className="h-3 w-3 rounded-full bg-brand" /> : null}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={game === 'g1'}
              onClick={() => onDraft({ ...draft, game: 'g1' })}
              className={`flex min-h-11 items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition duration-100 ease-[var(--ease-lock)] ${
                game === 'g1' ? 'border-brand bg-brand-50' : 'border-line-strong bg-card'
              }`}
            >
              <GameArtArena />
              <span className="min-w-0 flex-1">
                <span className="font-display block text-base font-extrabold text-ink">
                  Đấu trường tự động
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-2">
                  Tự đánh nhau · người cuối đãi · {n === 2 ? '~20 giây' : '30–40 giây'}
                </span>
              </span>
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  game === 'g1' ? 'border-brand' : 'border-line-strong'
                }`}
              >
                {game === 'g1' ? <span className="h-3 w-3 rounded-full bg-brand" /> : null}
              </span>
            </button>
          </div>
        </>
      ) : null}

      {/* --- BƯỚC 2 · Thêm người: khối tóm tắt + 2 nút mở sheet
          (UIUX-GAME-V2 gộp khối; UI-SLIM BS-1: sheet thay panel nhúng;
          FLOW-3STEP: khối này là toàn bộ nội dung bước 2). --- */}
      {step === 2 ? (
        <>
          <div
            id="setup-players-block"
            className={`mt-3 rounded-lg border bg-card px-3 py-2.5 ${
              fieldError?.key === 'players' ? 'border-debt-solid' : 'border-line'
            }`}
          >
            <p className="text-base text-ink">
              <strong>{n} người chơi</strong>
              <span className="text-ink-2"> — {players.map((p) => p.name).join(', ')}</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-2">Nhân vật đã gán sẵn cho từng người.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                id="setup-players-btn"
                aria-haspopup="dialog"
                aria-expanded={showPlayers}
                onClick={() => setShowPlayers(true)}
                className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep"
              >
                Đổi người chơi
              </button>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={showCharacters}
                onClick={() => setShowCharacters(true)}
                className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep"
              >
                Đổi nhân vật
              </button>
            </div>
            {fieldError?.key === 'players' ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-debt-ink">
                {fieldError.message}
              </p>
            ) : null}
          </div>

          {/* Chân bước 2: Tiếp luôn bấm được — thiếu người thì luật
              validation chỉ tới nút «Đổi người chơi» ngay tại bước này. */}
          <div className="sticky bottom-0 z-20 mt-4 bg-canvas/95 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <button
              type="button"
              onClick={handleNextFromStep2}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
            >
              Tiếp — Chọn game &amp; chơi
            </button>
          </div>
        </>
      ) : null}

      {/* --- BƯỚC 1 (tiếp) · QR của quán: TUỲ CHỌN — đúng 1 hàng khi
          chưa có QR (UIUX-GAME-V2); chụp bằng camera là đường đầu
          tiên trong QrCaptureBlock; giải mã client-side 100%. --- */}
      {step === 1 ? (
        <>
          <div className="mt-3 rounded-lg border border-line bg-card px-3 py-2">
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
              <div id="setup-qr-verify" className="mt-3 border-t border-line pt-3">
                <p className="text-base text-ink">
                  QR: <strong>{parsed.accountName ?? 'Không ghi tên chủ tài khoản'}</strong> ·{' '}
                  {bankDisplayOf(parsed)} ·{' '}
                  <span className="font-figure">{parsed.maskedAccount}</span>
                </p>
                {amountMismatch ? (
                  <div className="mt-2">
                    <RedAlert>Số tiền trong QR khác tổng hoá đơn — kiểm lại tại bàn.</RedAlert>
                  </div>
                ) : null}
                {matchedMember ? (
                  <p className="mt-2 text-base text-debt-ink">
                    Tên trùng thành viên {matchedMember.displayName} — phải đối chiếu ở quầy.
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-ink">
                      Người đưa QR
                    </span>
                    <select
                      id="setup-qr-provider"
                      value={qr.providerId ?? ''}
                      aria-invalid={fieldError?.key === 'qr-provider' || undefined}
                      onChange={(e) => setQr({ providerId: e.target.value || null })}
                      className={`min-h-11 w-full rounded-lg border bg-card px-2 py-2 text-base text-ink ${
                        fieldError?.key === 'qr-provider'
                          ? 'border-debt-solid'
                          : 'border-line-strong'
                      }`}
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
                      id="setup-qr-confirmer"
                      value={qr.confirmerId ?? ''}
                      aria-invalid={fieldError?.key === 'qr-confirmer' || undefined}
                      onChange={(e) => setQr({ confirmerId: e.target.value || null })}
                      className={`min-h-11 w-full rounded-lg border bg-card px-2 py-2 text-base text-ink ${
                        fieldError?.key === 'qr-confirmer'
                          ? 'border-debt-solid'
                          : 'border-line-strong'
                      }`}
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
                      Nguồn đối chiếu
                    </span>
                    <select
                      id="setup-qr-source"
                      value={qr.source ?? ''}
                      aria-invalid={fieldError?.key === 'qr-source' || undefined}
                      onChange={(e) =>
                        setQr({ source: (e.target.value || null) as QrSourceId | null })
                      }
                      className={`min-h-11 w-full rounded-lg border bg-card px-2 py-2 text-base text-ink ${
                        fieldError?.key === 'qr-source' ? 'border-debt-solid' : 'border-line-strong'
                      }`}
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
                  <p className="mt-2 text-sm text-debt-ink">
                    Người đối chiếu phải khác người đưa QR.
                  </p>
                ) : null}
                {sourceTooWeak ? (
                  <p className="mt-2 text-sm text-debt-ink">
                    Nguồn này chưa đủ mạnh — đối chiếu thêm ở quầy.
                  </p>
                ) : null}
                {fieldError && fieldError.key.startsWith('qr') ? (
                  <p role="alert" className="mt-2 text-sm font-semibold text-debt-ink">
                    {fieldError.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Chân bước 1: Tiếp luôn bấm được — thiếu tổng thì luật
          validation mở ô nhập + focus ngay tại bước này. */}
          <div className="sticky bottom-0 z-20 mt-4 bg-canvas/95 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
            >
              Tiếp — Thêm người
            </button>
          </div>
        </>
      ) : null}

      {/* --- BƯỚC 3 (tiếp) · Đồng thuận gọn + số chung (TRÊN nút Chơi) --- */}
      {step === 3 ? (
        <>
          <div className="mt-3 rounded-lg border border-line-strong bg-card px-4 py-3">
            {/* UI-SLIM T8: dòng này từng mở đầu bằng «Tổng {tổng}» — trùng
            đúng số ở hàng «Tổng hoá đơn» ngay phía trên cùng viewport.
            Nay chỉ còn phần chia mỗi người; tổng xuất hiện MỘT lần ở
            hàng tổng. */}
            <p className="text-[15px] text-ink">
              Mỗi người{' '}
              {minShare === maxShare
                ? formatMoney(minShare)
                : `${formatMoney(minShare)} – ${formatMoney(maxShare)}`}
            </p>
            <p className="mt-1 text-base text-ink">
              Một người trả hết — <strong>gánh thêm tối đa {formatMoney(extra)}</strong>.
            </p>
            {n === 2 ? (
              <label
                className={`mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border bg-warning-bg px-3 py-2.5 ${
                  fieldError?.key === 'two' ? 'border-debt-solid' : 'border-warning-solid'
                }`}
              >
                <input
                  id="setup-two-confirm"
                  type="checkbox"
                  checked={twoConfirmed}
                  onChange={(e) => setTwoConfirmed(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span className="text-base text-ink">Cả hai đã hiểu: một người trả toàn bộ.</span>
              </label>
            ) : null}
            {fieldError?.key === 'two' ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-debt-ink">
                {fieldError.message}
              </p>
            ) : null}
            {draft.replayOf ? (
              <p className="mt-2 text-sm text-ink-2">
                Ván mới thay ván {draft.replayOf.code}; ván cũ vẫn trong nhật ký.
              </p>
            ) : null}
            {abandonedCount > 0 ? (
              <p className="mt-2 text-sm text-ink-2">
                Đã có {abandonedCount} cam kết bị bỏ (ghi trong nhật ký phiên).
              </p>
            ) : null}

            <label
              className="mt-3 mb-1.5 block text-sm font-semibold text-ink"
              htmlFor="setup-chung"
            >
              Số chung — người khác nhập (ít nhất 6 chữ số)
            </label>
            <input
              id="setup-chung"
              inputMode="numeric"
              style={{ outline: 'none' }}
              aria-invalid={fieldError?.key === 'chung' || undefined}
              onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })}
              className={`w-full rounded-lg border bg-card px-3 py-2.5 font-figure text-base text-ink placeholder:text-placeholder focus:border-[#534946] ${
                fieldError?.key === 'chung' ? 'border-debt-solid' : 'border-line-strong'
              }`}
              placeholder="Ví dụ: 483920"
              value={chung}
              onChange={(e) => setChung(e.target.value.replace(/\D/g, ''))}
            />
            {fieldError?.key === 'chung' ? (
              <p role="alert" className="mt-1 text-sm font-semibold text-debt-ink">
                {fieldError.message}
              </p>
            ) : chung && !chungValid ? (
              <p className="mt-1 text-sm text-debt-ink">Số chung cần ít nhất 6 chữ số.</p>
            ) : null}
            {/* UIUX-GAME-V2: nút «Xem luật chơi» trong khối này đã bỏ —
            luật mở bằng nút «?» ở đầu overlay (1 cổng duy nhất). */}
          </div>

          {/* --- Chi tiết ván: kỹ thuật thu gọn mặc định. UIUX-GAME-V2:
          chỉ còn C1 của ván này + 1 dòng offline ngắn; luật hoà và
          trách nhiệm QR đầy đủ sống ở sheet «Luật chơi & chi tiết». --- */}
          <button
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            {detailsOpen ? 'Thu gọn chi tiết ván' : 'Chi tiết ván'}
          </button>
          {detailsOpen ? (
            <div className="mt-2 space-y-2 rounded-lg border border-line bg-grey-50 px-3 py-3 text-sm text-ink">
              <p>
                Mã cam kết của máy (C1):{' '}
                <GroupedTechString value={commit.c1} className="font-mono font-bold" /> — hiện trước
                khi nhập số chung để cả nhóm nhận diện ván.
              </p>
              <p>Game chạy offline sau lần mở đầu có mạng.</p>
            </div>
          ) : null}

          {/* --- Thanh Chơi cố định (bước 3): nút LUÔN bấm được theo luật
          validation — còn thiếu thì cuộn tới trường thiếu đầu tiên +
          focus + viền đỏ + lý do (dòng lý do cạnh nút giữ từ F4, nay
          lấy từ firstBlocker — cùng một nguồn sự thật). --- */}
          <div className="sticky bottom-0 z-20 mt-4 bg-canvas/95 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            {startReason ? (
              <p role="status" className="mb-2 text-sm font-semibold text-debt-ink">
                {startReason}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const b = firstBlocker();
                if (b) {
                  flagAndReveal(b);
                  return;
                }
                unlockAudio();
                onStart({
                  params,
                  c1: commit.c1,
                  paramsHash: commit.paramsHash,
                  seedDevice: commit.seedDevice,
                  chung: chung.trim(),
                  // Đối chiếu QR chốt ngay tại nút Chơi (wizard không còn
                  // bước M2 riêng để ghi confirmedAt vào draft trước).
                  qrConfirmedAt: qrNeedsConfirm ? Date.now() : draft.qr.confirmedAt,
                });
              }}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
            >
              Chơi — cả nhóm đồng ý
            </button>
            <SplitEvenButton onClick={onSplitEven} />
          </div>
        </>
      ) : null}

      {/* Sheet Đổi người chơi / Đổi nhân vật (BS-1) — render ở cuối
          gốc wizard, NGOÀI các khối bước, để không unmount khi chuyển
          bước; portal của GameSheet lo phần hiển thị. */}
      <GameSheet open={showPlayers} onClose={() => setShowPlayers(false)} title="Đổi người chơi">
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
      </GameSheet>
      <GameSheet
        open={showCharacters}
        onClose={() => setShowCharacters(false)}
        title="Đổi nhân vật"
      >
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
      </GameSheet>
    </div>
  );
}
