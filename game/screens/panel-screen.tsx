// panel-screen.tsx — PANEL GAME trong mục «Ai trả ai» của S2
// (REDESIGN Pha 2, SPEC §C2 + DESIGN-DIRECTION §2 «Panel game»):
// thay toàn bộ wizard 3 bước của setup-screen cũ. Panel mở NGAY
// trong luồng S2 tại mục thanh toán — không overlay, không header
// wizard, không chỉ báo bước, không dock riêng. Cấu trúc:
//   dải ngữ cảnh 1 hàng (đĩa chồng + «N người · mỗi người X ₫»)
//   · tổng hoá đơn (kế thừa từ phiên, sửa tại chỗ)
//   · danh sách người hàng chọn/bỏ (đĩa + tên, KHÔNG sprite trên hàng)
//   · 2 thẻ trò nền trắng hairline (minh hoạ khung nhỏ)
//   · luật 1 dòng + «?» mở Sheet «Luật & chi tiết»
//   · hàng QR quán tuỳ chọn (Q3: đối chiếu 1 chạm)
//   · dòng xác nhận 2 người (chỉ khi đúng 2 người chơi)
//   · nút «Chơi» (CTA không-disabled — luật validation firstBlocker).
// Số chung TỰ SINH (Q2) — không ô nhập trên đường chính; xem/đổi
// trong «Chi tiết ván» của Sheet Luật & chi tiết trước khi chơi.
// Trạng thái chưa chọn trò là thật (game: null — giữ quyết định cũ).

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { checkCaps, createCommitment, finalizeSeed, matchCode } from '../engine';
import type { MatchParams } from '../engine/types';
import { equalSharesFor, formatMoney, formatMoneyGrouped, parseMoneyInput } from '../adapter';
import type { GameSessionInput } from '../adapter';
import { unlockAudio } from '../audio/sound';
import { EMPTY_QR_DRAFT } from '../state';
import type { ConsentReady, GameDraft } from '../state';
import type { AvatarPhotoMap } from '../assets/avatar-store';
import { buildIdentityMapFromSessionMembers } from '../assets/identity';
import { M3BCharacterScreen } from './m3b-character-screen';
import {
  FALLBACK_SETS,
  defaultAssignments,
  ensureAssignments,
  loadCharacterSetsDetailed,
  setById,
} from './character-sets';
import type { CharacterSetDef } from './character-sets';
import { formatAmountsInText, humanizeCapViolation } from './format-text';
import { QrCaptureBlock } from './qr-capture';
import { GameSheet, PlayerAvatar, RedAlert, bankDisplayOf } from './shared';
import { GameRulesSheet } from './game-rules-sheet';

/** Số chung tự sinh (SPEC Q2): 6 chữ số — cùng miền giá trị ô nhập tay cũ (6–12 chữ số). */
export function generateChung(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100_000 + (buf[0] % 900_000));
}

type FieldKey = 'total' | 'players' | 'game' | 'two';

const FIELD_ELEMENT_ID: Record<FieldKey, string> = {
  total: 'panel-total',
  players: 'panel-players-block',
  game: 'panel-game-group',
  two: 'panel-two-confirm',
};

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.01" />
    </svg>
  );
}

/** Minh hoạ khung nhỏ cho thẻ trò — mâm tròn nhìn từ trên (glyph gốc). */
function GameArtTray({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

/** Minh hoạ khung nhỏ cho thẻ trò — khiên đấu trường (glyph gốc). */
function GameArtArena({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

export function GamePanelScreen({
  input,
  draft,
  onDraft,
  onStart,
  onSplitEven,
  onOpenMembers,
  onCommitmentShown,
  photos,
  onPhotosChanged,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  onStart: (ready: ConsentReady) => void;
  /** Đường thoát của entry — sheet nhân vật (M3B) vẫn yêu cầu prop này. */
  onSplitEven: () => void;
  /** Báo entry khi «Chi tiết ván» (C1 + số chung) đã hiển thị trong Sheet Luật — cho log cam kết bị bỏ nội bộ. */
  onCommitmentShown?: () => void;
  /**
   * D5: mở thẳng Sheet Người của PHIÊN (session-view nối sang sheet
   * thành viên sẵn có). Vắng prop này thì panel chỉ hiện dòng hướng
   * dẫn — TUYỆT ĐỐI không render nút «Thêm người» giả.
   */
  onOpenMembers?: () => void;
  photos: AvatarPhotoMap;
  onPhotosChanged: (next: Map<string, string>) => void;
}) {
  const [totalText, setTotalText] = useState(() =>
    draft.totalVnd > 0 ? formatMoneyGrouped(draft.totalVnd) : '',
  );
  const [totalOpen, setTotalOpen] = useState(false);
  // Số chung TỰ SINH lúc panel mở (Q2) — không ô nhập trên đường chính.
  const [chung, setChung] = useState(() => generateChung());
  const [twoConfirmed, setTwoConfirmed] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showQr, setShowQr] = useState(() => Boolean(draft.qr.payload));
  const [rulesOpen, setRulesOpen] = useState(false);
  const [fieldError, setFieldError] = useState<{ key: FieldKey; message: string } | null>(null);
  const [charSets, setCharSets] = useState<readonly CharacterSetDef[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadCharacterSetsDetailed().then((result) => {
      if (alive) setCharSets(result.sets);
    });
    return () => {
      alive = false;
    };
  }, []);

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
  const totalMembers = input.members.length;
  const identityMap = useMemo(() => buildIdentityMapFromSessionMembers(input.members), [input]);
  const game = draft.game;
  const params: MatchParams = useMemo(
    () => ({ game: game ? game : 'g2', players, totalVnd }),
    [game, players, totalVnd],
  );

  const activeCharSet = setById(charSets ?? FALLBACK_SETS, draft.characterSetId);
  const sheetAssignments = useMemo(
    () => ensureAssignments(draft.selectedPlayerIds, activeCharSet, draft.characterAssignments),
    [draft.selectedPlayerIds, activeCharSet, draft.characterAssignments],
  );

  function togglePlayer(id: string) {
    const selected = draft.selectedPlayerIds;
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    const ordered = input.members.map((m) => m.id).filter((mid) => next.includes(mid));
    onDraft({ ...draft, selectedPlayerIds: ordered });
  }

  // Trần kép giữ nguyên (SPEC §E): tổng ≤ 2.000.000 ₫ và gánh thêm ≤ 500.000 ₫/người.
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

  // Cam kết hai giai đoạn (engine KHÔNG đổi): C1 từ seed thiết bị +
  // params hiện tại; số chung tự sinh chỉ vào finalizeSeed lúc bắt đầu.
  const commit = useMemo(() => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const seedDevice = buf[0] >>> 0;
    const { c1, paramsHash } = createCommitment(seedDevice, params);
    return { seedDevice, c1, paramsHash };
  }, [params]);
  // Mã ván dự kiến (D13): đúng giá trị sẽ thành record.code khi bấm Chơi
  // với seed/số chung hiện tại — matchCode(finalizeSeed(...)) như entry.
  const prospectiveCode = useMemo(
    () => matchCode(finalizeSeed(commit.seedDevice, chung, commit.paramsHash)),
    [commit, chung],
  );

  /* ---------------- QR quán tuỳ chọn + đối chiếu 1 chạm (Q3) ---------------- */
  const qr = draft.qr;
  const parsed = qr.parsed;
  const amountMismatch = Boolean(
    parsed?.amountVnd !== null && parsed?.amountVnd !== undefined && parsed.amountVnd !== totalVnd,
  );
  const qrNeedsConfirm = Boolean(qr.payload) && !qr.parseFailed && Boolean(parsed);
  // QR dùng được cho ván: đã có người đối chiếu (khác người chụp) và số tiền khớp tổng.
  const qrUsable = qrNeedsConfirm ? Boolean(qr.confirmerId) && !amountMismatch : undefined;

  function setQr(patch: Partial<GameDraft['qr']>) {
    onDraft({ ...draft, qr: { ...draft.qr, ...patch } });
  }

  /** Đối chiếu 1 chạm: người KHÁC người chụp chạm vào đĩa/tên của mình để xác nhận. */
  const confirmQrBy = useCallback(
    (memberId: string) => {
      if (qr.providerId && qr.providerId === memberId) return;
      setQr({ confirmerId: memberId, confirmedAt: Date.now(), source: null });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setQr đóng gói draft hiện tại; deps đủ qua draft
    [qr.providerId, draft, onDraft],
  );

  /* ---------------- Validation: firstBlocker là nguồn sự thật duy nhất ---------------- */
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
            ? 'Cần ít nhất 2 người chơi — chọn thêm ngay trong danh sách phía dưới.'
            : 'Một ván tối đa 12 người chơi — bỏ bớt ngay trong danh sách phía dưới.',
      };
    // QR KHÔNG bao giờ là blocker của nút «Chơi» (Q3) — QR lệch/chưa
    // đối chiếu chỉ làm QR không được dùng cho ván, ván vẫn chơi.
    if (!game) return { key: 'game', message: 'Chưa chọn game' };
    if (n === 2 && !twoConfirmed)
      return { key: 'two', message: 'Nhóm 2 người: tích ô xác nhận phía trên.' };
    return null;
  }

  function revealField(key: FieldKey) {
    if (key === 'total') setTotalOpen(true);
    window.setTimeout(() => {
      const el = document.getElementById(FIELD_ELEMENT_ID[key]);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (key === 'game' || key === 'players') {
        el.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
        return;
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement || el.tabIndex >= 0) {
        el.focus({ preventScroll: true });
      }
    }, 90);
  }

  function handleStartAttempt() {
    const b = firstBlocker();
    if (b) {
      setFieldError(b);
      revealField(b.key);
      return;
    }
    unlockAudio();
    onStart({
      params,
      c1: commit.c1,
      paramsHash: commit.paramsHash,
      seedDevice: commit.seedDevice,
      chung,
      qrConfirmedAt: qr.confirmerId ? (draft.qr.confirmedAt ?? Date.now()) : draft.qr.confirmedAt,
      qrUsable,
    });
  }

  const blocker = firstBlocker();
  const dockReason =
    blocker?.key === 'players'
      ? n < 2
        ? 'Chưa đủ người chơi'
        : 'Quá 12 người chơi'
      : blocker?.key === 'game'
        ? 'Chưa chọn game'
        : blocker?.key === 'total'
          ? totalVnd <= 0
            ? 'Nhập tổng tiền'
            : 'Vượt trần — giảm tổng hoặc chia đều'
          : blocker?.key === 'two'
            ? 'Chưa xác nhận nhóm 2 người'
            : null;

  /* eslint-disable react-hooks/set-state-in-effect -- xoá cờ lỗi validation khi dữ liệu nguồn đổi (cùng mẫu setup-screen cũ) */
  useEffect(() => {
    setFieldError(null);
  }, [totalVnd, n, twoConfirmed, game]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalChangedVsSession =
    input.sessionTotalVnd > 0 && totalVnd > 0 && totalVnd !== input.sessionTotalVnd;

  return (
    <div data-game-panel>
      {/* Dải ngữ cảnh 1 hàng: đĩa chồng + «N người · mỗi người X ₫» */}
      <div className="flex h-12 items-center gap-3 rounded-xl bg-neutral-100 px-3">
        <span className="flex shrink-0 items-center" aria-hidden>
          {players.map((p, i) => {
            const discSize = n >= 6 ? 24 : 28;
            return (
              <span key={p.id} style={{ marginLeft: i === 0 ? 0 : n >= 6 ? -6 : -8 }}>
                <PlayerAvatar
                  name={p.name}
                  colorIndex={identityMap.get(p.id)?.colorIndex ?? 0}
                  size={discSize}
                  photoDataUrl={photos.get(p.id)}
                />
              </span>
            );
          })}
        </span>
        <p className="flex min-w-0 items-baseline gap-1 text-[14px] leading-[1.35] text-ink">
          <span className="truncate">{n} người · mỗi người</span>
          <span className="font-figure shrink-0 whitespace-nowrap">
            {minShare === maxShare
              ? formatMoney(minShare)
              : `${formatMoney(minShare)} – ${formatMoney(maxShare)}`}
          </span>
        </p>
      </div>
      {draft.replayOf ? (
        <p className="mt-2 text-[13px] leading-[1.35] text-neutral-700">
          Ván mới thay ván {draft.replayOf.code}; ván cũ vẫn trong nhật ký.
        </p>
      ) : null}

      {/* Tổng hoá đơn — kế thừa từ phiên, sửa tại chỗ */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 text-base text-ink">
          <span className="font-semibold text-ink-2">Tổng hoá đơn: </span>
          <strong className="font-display text-[19px] font-extrabold whitespace-nowrap">
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
            htmlFor="panel-total"
          >
            Tổng hoá đơn hôm nay (VND)
          </label>
          <input
            id="panel-total"
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
                <li key={v}>{formatAmountsInText(humanizeCapViolation(v))}</li>
              ))}
            </ul>
          </RedAlert>
        </div>
      ) : null}

      {/* Danh sách người — chọn/bỏ ngay trên hàng (đĩa + tên, không sprite) */}
      <div className="mt-4 flex h-5 items-baseline justify-between">
        <h3 className="text-[12px] leading-[1.2] font-semibold tracking-[0.06em] text-neutral-700">
          NGƯỜI CHƠI
        </h3>
        <p className="font-figure text-[12px] leading-[1.2] font-medium text-neutral-700">
          Đã chọn {n}/{totalMembers}
        </p>
      </div>
      <div
        id="panel-players-block"
        tabIndex={-1}
        className={`mt-2 divide-y divide-line overflow-hidden rounded-xl border bg-card outline-none ${
          fieldError?.key === 'players' ? 'border-debt-solid' : 'border-neutral-300'
        }`}
      >
        {totalMembers === 0 ? (
          <p className="px-4 py-3 text-[13px] leading-[1.35] text-neutral-700">
            Chưa có người chơi nào
          </p>
        ) : (
          input.members.map((m) => {
            const on = draft.selectedPlayerIds.includes(m.id);
            const identity = identityMap.get(m.id);
            return (
              <button
                key={m.id}
                type="button"
                data-player-row
                aria-pressed={on}
                onClick={() => togglePlayer(m.id)}
                className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left"
              >
                <PlayerAvatar
                  name={m.displayName}
                  colorIndex={identity?.colorIndex ?? 0}
                  size={32}
                  photoDataUrl={photos.get(m.id)}
                />
                <span className="min-w-0 flex-1 truncate text-[16px] leading-[1.2] font-semibold text-ink">
                  {m.displayName}
                </span>
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    on
                      ? 'border-2 border-brand-500 bg-card text-brand-950'
                      : 'border-2 border-neutral-400 bg-white'
                  }`}
                >
                  {on ? <CheckIcon size={14} /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>
      {fieldError?.key === 'players' ? (
        <p role="alert" className="mt-2 text-[13px] leading-[1.35] font-semibold text-debt-ink">
          {fieldError.message}
        </p>
      ) : null}
      {/* D5: thiếu người -> hướng dẫn + nút mở THẲNG Sheet Người của phiên (không nút giả) */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[13px] leading-[1.35] text-neutral-700">
          Người chơi là các thành viên trong phiên — chạm vào tên để chọn hoặc bỏ chọn.
        </p>
        {onOpenMembers ? (
          <button
            type="button"
            id="panel-add-member"
            onClick={onOpenMembers}
            className="inline-flex min-h-11 items-center text-[14px] leading-[1.2] font-semibold text-ink underline underline-offset-4"
          >
            Thêm người vào phiên
          </button>
        ) : null}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={showCharacters}
          onClick={() => setShowCharacters(true)}
          className="ml-auto inline-flex min-h-11 items-center rounded-xl border border-neutral-300 bg-card px-4 text-[14px] leading-[1.2] font-semibold text-ink transition duration-100 ease-[var(--ease-lock)]"
        >
          Đổi nhân vật
        </button>
      </div>

      {/* 2 thẻ trò — nền trắng hairline, minh hoạ khung nhỏ (thay thẻ tint pastel 173×200) */}
      <h3 className="mt-4 text-[12px] leading-[1.2] font-semibold tracking-[0.06em] text-neutral-700">
        CHỌN TRÒ
      </h3>
      <div
        id="panel-game-group"
        className="mt-2 grid grid-cols-2 gap-3"
        role="group"
        aria-label="Chọn trò"
      >
        {[
          {
            kind: 'g2' as const,
            name: 'Mâm cơm xoay',
            desc: 'Đũa chỉ ai, người đó đãi',
            duration: '8–12 giây',
            art: <GameArtTray size={44} />,
          },
          {
            kind: 'g1' as const,
            name: 'Đấu trường tự động',
            desc: 'Người cuối cùng đãi',
            duration: '30–40 giây',
            art: <GameArtArena size={44} />,
          },
        ].map((card) => {
          const selected = game === card.kind;
          return (
            <button
              key={card.kind}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (selected) return;
                onDraft({ ...draft, game: card.kind });
              }}
              className={`flex w-full flex-col overflow-hidden rounded-xl bg-card text-left transition duration-100 ease-[var(--ease-lock)] ${
                selected ? 'border-2 border-brand-500' : 'border border-neutral-300'
              }`}
            >
              <span className="relative flex h-20 w-full shrink-0 items-center justify-center bg-neutral-100">
                {card.art}
                <span
                  aria-hidden
                  className={`absolute top-2 left-2 flex h-[22px] w-[22px] items-center justify-center rounded-full ${
                    selected ? 'bg-brand-500 text-white' : 'border-2 border-neutral-400 bg-white'
                  }`}
                >
                  {selected ? <CheckIcon size={12} /> : null}
                </span>
                <span className="absolute top-2 right-2 flex h-[22px] items-center rounded-full bg-neutral-900 px-2 text-[12px] leading-[1.2] font-semibold text-white">
                  {card.duration}
                </span>
              </span>
              <span className="block w-full px-2 py-2">
                <span className="block text-[16px] leading-[1.2] font-bold text-ink">
                  {card.name}
                </span>
                <span className="block truncate text-[12px] leading-[1.35] text-neutral-700">
                  {card.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {fieldError?.key === 'game' ? (
        <p role="alert" className="mt-2 text-[13px] leading-[1.35] font-semibold text-debt-ink">
          {fieldError.message}
        </p>
      ) : null}

      {/* Luật 1 dòng + «?» mở Sheet Luật & chi tiết */}
      <div className="mt-3 flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[13px] leading-[1.35] text-neutral-700">
          {game === 'g2'
            ? 'Đũa chỉ vào ai, người đó đãi cả bàn.'
            : game === 'g1'
              ? 'Người còn lại cuối cùng đãi cả bàn; hoà thì người đồng hạng cùng đãi.'
              : 'Người được chọn đãi cả bàn; Đấu trường hoà thì người đồng hạng cùng đãi.'}
        </p>
        <button
          type="button"
          aria-label="Luật chơi & chi tiết ván"
          onClick={() => {
            onCommitmentShown?.();
            setRulesOpen(true);
          }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-base font-bold text-ink"
        >
          ?
        </button>
      </div>

      {/* QR quán — 1 hàng tuỳ chọn (Q3) */}
      <div className="mt-3 rounded-lg border border-line bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 flex-1 text-base font-semibold text-ink">QR quán — tuỳ chọn</h3>
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
              parsedNote: 'Đã đọc được QR — đối chiếu 1 chạm ngay dưới đây.',
              failedNote: 'QR chưa đọc được — vẫn chơi được, người đãi quét QR gốc tại quầy.',
              hasPayloadText: 'Đã có QR cho ván này.',
              emptyText: 'Chưa có QR — vẫn chơi được, người đãi quét QR gốc tại quầy.',
            }}
          />
        ) : null}
        {/* D6: cảnh báo QR đọc-không-được chỉ còn ĐÚNG 1 dòng — chính là
            dòng trạng thái của QrCaptureBlock ở trên, không lặp YellowAlert. */}
        {qrNeedsConfirm && parsed ? (
          <div id="panel-qr-verify" className="mt-3 border-t border-line pt-3">
            <p className="text-base text-ink">
              QR: <strong>{parsed.accountName ?? 'Không ghi tên chủ tài khoản'}</strong> ·{' '}
              {bankDisplayOf(parsed)} · <span className="font-figure">{parsed.maskedAccount}</span>
              {parsed.amountVnd !== null && parsed.amountVnd !== undefined ? (
                <>
                  {' · '}
                  <span className="font-figure">{formatMoney(parsed.amountVnd)}</span>
                </>
              ) : null}
            </p>
            {amountMismatch ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-debt-ink">
                Số tiền trong QR khác tổng ván — QR này không dùng cho ván, ván vẫn chơi được.
              </p>
            ) : (
              <>
                {/* B2 (Addendum §2): «Người đưa QR» phải được CHỌN THẬT
                    trước khi đối chiếu mở — trước đây providerId không
                    được ghi ở đâu nên chốt chặn tự-đối-chiếu là mã chết. */}
                <p className="mt-3 text-sm font-semibold text-ink">
                  Người đưa QR — người đã chụp hoặc chia sẻ mã này:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {input.members.map((m) => {
                    const isProvider = qr.providerId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={isProvider}
                        onClick={() =>
                          onDraft({
                            ...draft,
                            qr: {
                              ...qr,
                              providerId: m.id,
                              confirmerId: qr.confirmerId === m.id ? null : qr.confirmerId,
                            },
                          })
                        }
                        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold text-ink ${
                          isProvider ? 'border-2 border-brand-500 bg-card' : 'border-line bg-card'
                        }`}
                      >
                        <PlayerAvatar
                          name={m.displayName}
                          colorIndex={identityMap.get(m.id)?.colorIndex ?? 0}
                          size={24}
                          photoDataUrl={photos.get(m.id)}
                        />
                        {m.displayName}
                        {isProvider ? ' · Người đưa QR' : ''}
                      </button>
                    );
                  })}
                </div>
                {!qr.providerId ? (
                  <p className="mt-2 text-sm text-ink-2">
                    Chọn người đưa QR trước — rồi một người khác chạm tên mình để đối chiếu.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-semibold text-ink">
                      Người đối chiếu — một người khác người đưa QR chạm vào tên mình:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {input.members.map((m) => {
                        const isConfirmer = qr.confirmerId === m.id;
                        const isProvider = qr.providerId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            aria-pressed={isConfirmer}
                            aria-disabled={isProvider || undefined}
                            onClick={() => confirmQrBy(m.id)}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold text-ink ${
                              isConfirmer
                                ? 'border-2 border-brand-500 bg-card'
                                : 'border-line bg-card'
                            } ${isProvider ? 'text-ink-2 opacity-60' : ''}`}
                          >
                            <PlayerAvatar
                              name={m.displayName}
                              colorIndex={identityMap.get(m.id)?.colorIndex ?? 0}
                              size={24}
                              photoDataUrl={photos.get(m.id)}
                            />
                            {m.displayName}
                            {isConfirmer ? ' · Đã đối chiếu' : ''}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-sm text-ink-2">Người đưa QR không tự đối chiếu được.</p>
                  </>
                )}
                {/* F-06: QR khớp tổng nhưng CHƯA được đối chiếu → ván
                    vẫn chơi được mà không dùng QR — nói rõ 1 dòng thay
                    vì loại lặng lẽ. Chỉ hiện ở nhánh này (không lệch
                    tổng); QR đã đối chiếu (usable) thì không hiện. */}
                {!qr.confirmerId ? (
                  <p className="mt-2 text-sm text-ink-2">
                    QR chưa được đối chiếu nên ván này không dùng QR — người đãi quét QR gốc tại
                    quầy khi trả.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Xác nhận nhóm đúng 2 người — ngay trên nút Chơi */}
      {n === 2 ? (
        <label
          className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border bg-warning-bg px-3 py-2.5 ${
            fieldError?.key === 'two' ? 'border-debt-solid' : 'border-warning-solid'
          }`}
        >
          <input
            id="panel-two-confirm"
            type="checkbox"
            checked={twoConfirmed}
            onChange={(e) => setTwoConfirmed(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span className="text-[14px] leading-[1.35] text-ink">
            Cả hai đã hiểu: một người trả toàn bộ.
          </span>
        </label>
      ) : null}
      {fieldError?.key === 'two' ? (
        <p role="alert" className="mt-2 text-[13px] leading-[1.35] font-semibold text-debt-ink">
          {fieldError.message}
        </p>
      ) : null}

      {/* CTA «Chơi» — KHÔNG disabled: thiếu thì lý do 1 dòng phía trên + firstBlocker trỏ trường */}
      <div className="mt-4">
        {blocker ? (
          <p
            id="panel-play-reason"
            role="status"
            className="mb-[6px] flex h-[18px] items-center gap-1.5 text-[13px] leading-[1.35] text-neutral-700"
          >
            <InfoIcon />
            <span>{dockReason}</span>
          </p>
        ) : null}
        <button
          type="button"
          aria-disabled={blocker ? true : undefined}
          aria-describedby={blocker ? 'panel-play-reason' : undefined}
          onClick={handleStartAttempt}
          className={`inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-[16px] leading-[1.2] font-bold transition duration-100 ease-[var(--ease-lock)] ${
            blocker
              ? 'border border-neutral-300 bg-neutral-200 text-neutral-700'
              : 'bg-brand-500 text-ink-on-seed hover:bg-brand-600 active:bg-brand-600'
          }`}
        >
          Chơi
        </button>
      </div>

      {/* Sheet «Luật & chi tiết» của game — kèm «Chi tiết ván» + Đổi mã trước khi chơi */}
      <GameRulesSheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        detail={{
          code: prospectiveCode,
          c1: commit.c1,
          chung,
          onChungChange: setChung,
        }}
      />

      {/* Sheet nhân vật — giữ nguyên bản rút gọn đợt cũ (compactHeader/footer, thân ≤716px) */}
      <GameSheet
        open={showCharacters}
        onClose={() => setShowCharacters(false)}
        title="Đổi nhân vật"
        compactHeader
        footer={
          <div className="flex min-h-[72px] items-center justify-between border-t border-grey-200 bg-card px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => {
                onDraft({
                  ...draft,
                  characterSetId: activeCharSet.setId,
                  characterAssignments: defaultAssignments(draft.selectedPlayerIds, activeCharSet),
                });
                setShowCharacters(false);
              }}
              className="inline-flex min-h-11 items-center px-1 text-[14px] leading-[1.2] font-semibold text-ink underline underline-offset-4"
            >
              Tự chọn
            </button>
            <button
              type="button"
              onClick={() => {
                onDraft({
                  ...draft,
                  characterSetId: activeCharSet.setId,
                  characterAssignments: sheetAssignments,
                });
                setShowCharacters(false);
              }}
              className="inline-flex h-12 w-[160px] items-center justify-center rounded-xl bg-brand-500 text-[16px] leading-[1.2] font-bold text-ink-on-seed transition hover:bg-brand-600 active:bg-brand-600"
            >
              Xong
            </button>
          </div>
        }
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
