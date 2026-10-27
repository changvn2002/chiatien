// entry.tsx — Cổng game mode «Ai Đãi» (ARCHITECTURE §1.1/§1.2, §2).
// Component client duy nhất được app chính nạp bằng next/dynamic
// ssr:false (xem điểm chạm trong components/chiatien/session-view.tsx).
// File này và các màn của lane P-CORE KHÔNG import phaser — Phaser chỉ
// vào qua GameStage của lane P-STAGE (game/phaser/stage.tsx), đến lượt nó
// cũng chỉ import('phaser') động trong effect.
//
// REDESIGN Pha 2 (SPEC §C2): entry TÁCH PHA — pha thiết lập render
// dạng PANEL inline ngay trong mục «Ai trả ai» của S2 (session-view
// mount qua slot của settlement, không overlay/không chrome riêng);
// khi ván bắt đầu («Chơi» thành công) mới chuyển sang overlay
// full-screen cho sân chơi + kết quả. Luật & chi tiết là SHEET dùng
// chung (game-rules-sheet) mở từ «?» — không còn màn rules riêng.
// Vòng đời overlay: unmount/thoát → cleanup §1.2 phía React: GameStage
// tự dừng scene + destroy khi unmount (P-STAGE), entry dừng + unload
// toàn bộ audio Howler rồi mới đóng overlay.
// Khôi phục: khi vào mode mà có bản ghi đang chơi thật (dang-do +
// phase playing) → đi thẳng M6 diễn lại từ log, không sinh ván mới;
// bản ghi phase result KHÔNG BAO GIỜ chiếm cổng vào (SPEC C1, Pha 0).

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { finalizeSeed, fnv1a64, matchCode, runG1, runG2 } from './engine';
import type { GameSessionInput } from './adapter';
import { buildIdentityMapCovering, buildIdentityMapFromSessionMembers } from './assets/identity';
import { loadAvatarPhotos } from './assets/avatar-store';
import { FALLBACK_SET } from './screens/character-sets';
import { GameSheet, bankDisplayOf } from './screens/shared';
import {
  isGameMuted,
  setGameMuted,
  startBgm,
  stopAllAudio,
  stopBgm,
  unlockAudio,
} from './audio/sound';
import type { ConsentReady, GameDraft, PlayerView, ScreenId } from './state';
import { EMPTY_DRAFT } from './state';
import {
  clearGameDraft,
  filterRestoredPlayerIds,
  findInProgressRecord,
  incrementAbandonedCommitments,
  loadGameDraft,
  patchRecord,
  saveGameDraft,
  upsertRecord,
} from './store';
import type { GameRecord, PersistedGameDraft } from './store';
import { nameKeyOf } from './adapter';
import { GamePanelScreen } from './screens/panel-screen';
import { PlayScreen } from './screens/play-screen';
import { M7ResultScreen } from './screens/m7-result-screen';
import { GameRulesSheet } from './screens/game-rules-sheet';

export function GameEntry({
  input,
  onExit,
  onRecordLedgerPayments,
  onOpenMembers,
}: {
  input: GameSessionInput;
  /** Rời game mode về app chính (chia đều bình thường / hoàn tất). */
  onExit: () => void;
  /**
   * FIX-UX-GAME (F6): ghi kết quả ván vào SỔ của phiên qua API phiên
   * hiện hữu của app chính (session-view tự dựng khoản chi) — game chỉ
   * BÁO khoản cần ghi (người đãi + số tiền), không tự ghi gì vào phiên
   * và không đụng lib. Vắng prop này thì M7 chỉ có CTA «Xong».
   */
  onRecordLedgerPayments?: (
    payments: { payerId: string; amountVnd: number }[],
    matchCode: string,
  ) => void;
  /**
   * D5 (Pha 2): mở thẳng Sheet Người của phiên từ panel game —
   * session-view nối sang sheet thành viên sẵn có của nó. Panel vẫn
   * mount nguyên vẹn phía dưới sheet nên draft không mất (draft bền
   * theo phiên là lớp bảo hiểm thứ hai, Pha 0).
   */
  onOpenMembers?: () => void;
}) {
  const [recovered] = useState<GameRecord | null>(() => findInProgressRecord());
  const [screen, setScreen] = useState<ScreenId>(() => (recovered ? 'm6' : 'setup'));
  // Vân tay phiên cho draft thiết lập bền — băm tiêu đề + danh sách id
  // thành viên của PHIÊN NÀY. Draft lưu trên máy chỉ được khôi phục
  // khi vân tay khớp (bản đồ draft theo sessionKey — Pha 0/SPEC C2).
  const sessionKey = fnv1a64(`${input.sessionTitle}|${input.members.map((m) => m.id).join(',')}`);
  const [restoredDraft] = useState<PersistedGameDraft | null>(() => {
    if (recovered) return null;
    const saved = loadGameDraft(undefined, sessionKey);
    return saved && saved.sessionKey === sessionKey ? saved : null;
  });
  const [draft, setDraft] = useState<GameDraft>(() => {
    if (restoredDraft) {
      const memberIds = input.members.map((m) => m.id);
      const memberSet = new Set(memberIds);
      return {
        ...EMPTY_DRAFT,
        totalVnd: restoredDraft.totalVnd,
        game: restoredDraft.game,
        selectedPlayerIds: filterRestoredPlayerIds(restoredDraft.selectedPlayerIds, memberIds),
        characterSetId: restoredDraft.characterSetId,
        characterAssignments: Object.fromEntries(
          Object.entries(restoredDraft.characterAssignments).filter(([id]) => memberSet.has(id)),
        ),
      };
    }
    return {
      ...EMPTY_DRAFT,
      // Tổng tiền TỰ ĐIỀN từ tổng phiên + trò CHƯA chọn (game: null là
      // trạng thái thật — giữ quyết định đợt bước 2/3).
      totalVnd: input.sessionTotalVnd,
      game: null,
      selectedPlayerIds: input.members.map((m) => m.id),
    };
  });
  // Mốc so «đã sửa gì so với lúc mount chưa»: chỉ ghi draft bền khi
  // người dùng THỰC SỰ đổi thiết lập.
  const draftSaveStateRef = useRef<{ initial: string | null; saved: boolean }>({
    initial: null,
    saved: false,
  });

  const [ledgerRecordedCode, setLedgerRecordedCode] = useState<string | null>(null);
  const [record, setRecord] = useState<GameRecord | null>(recovered);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Ghi draft thiết lập bền mỗi khi draft đổi ở pha panel (chưa có ván
  // chốt). CHỈ các trường an toàn của PersistedGameDraft — draft.qr và
  // số chung không bao giờ xuống storage (kỷ luật ở game/store.ts).
  // Panel không còn bước wizard: `step` ghi hằng 1 (schema đóng cũ).
  useEffect(() => {
    if (record || screen !== 'setup') return;
    const persistable: PersistedGameDraft = {
      sessionKey,
      totalVnd: draft.totalVnd,
      selectedPlayerIds: draft.selectedPlayerIds,
      game: draft.game,
      characterSetId: draft.characterSetId,
      characterAssignments: draft.characterAssignments,
      step: 1,
      savedAt: Date.now(),
    };
    const snapshot = JSON.stringify({ ...persistable, savedAt: 0 });
    const state = draftSaveStateRef.current;
    if (state.initial === null) {
      state.initial = snapshot;
      return;
    }
    if (snapshot === state.initial && !state.saved) return;
    saveGameDraft(persistable);
    state.saved = true;
  }, [draft, screen, record, sessionKey]);

  const [photos, setPhotos] = useState<Map<string, string>>(() => loadAvatarPhotos());
  const [finalFrame, setFinalFrame] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => isGameMuted());
  // C1 đã hiển thị trong lần đồng thuận này hay chưa (panel hiện C1
  // trong «Chi tiết ván» của Sheet Luật & chi tiết — mở sheet = đã
  // hiển thị): rời mode sau đó thì ghi 1 cam kết bị bỏ vào LOG NỘI BỘ
  // (D7: bộ đếm KHÔNG hiện lên UI nữa, store giữ nguyên).
  const consentShownRef = useRef(false);
  const [exitMatchOpen, setExitMatchOpen] = useState(false);
  const gameStatePushedRef = useRef(false);

  const exitCleanup = useCallback(() => {
    stopAllAudio();
    onExit();
  }, [onExit]);

  /** Thoát sau khi C1 đã hiển thị: ghi cam kết bị bỏ (log nội bộ) rồi thoát. */
  const splitEvenAtConsent = useCallback(() => {
    if (consentShownRef.current) {
      incrementAbandonedCommitments();
      consentShownRef.current = false;
    }
    exitCleanup();
  }, [exitCleanup]);

  const publicCancelMatch = useCallback(() => {
    if (!record) return;
    patchRecord(record.code, {
      status: 'da-huy-cong-khai',
      phase: 'result',
      finishedAt: Date.now(),
    });
    setExitMatchOpen(false);
    exitCleanup();
  }, [record, exitCleanup]);

  /**
   * ĐÓNG STATUS của ván đã có kết quả (SPEC C1.1, Pha 0): mọi đường
   * rời M7 đều chốt bản ghi như «Hoàn tất» (`hoan-tat`), không để
   * `dang-do` + phase `result` nằm lại thành ván ma. Gọi lặp vô hại.
   */
  const closeResultRecord = useCallback((rec: GameRecord | null) => {
    if (rec && rec.status === 'dang-do' && rec.phase === 'result') {
      patchRecord(rec.code, { status: 'hoan-tat', finishedAt: Date.now() });
    }
  }, []);

  const latestRecordRef = useRef<GameRecord | null>(null);
  useEffect(() => {
    latestRecordRef.current = record;
  }, [record]);
  useEffect(() => {
    return () => {
      closeResultRecord(latestRecordRef.current);
      // Panel bị gỡ (đổi nhánh quyết toán / rời phiên) sau khi C1 đã
      // hiển thị trong Sheet Luật: ghi cam kết bị bỏ vào log nội bộ.
      if (consentShownRef.current) incrementAbandonedCommitments();
    };
  }, [closeResultRecord]);

  const discardRecoveredAndNew = useCallback(() => {
    if (!record) return;
    patchRecord(record.code, {
      status: 'da-huy-cong-khai',
      phase: 'result',
      finishedAt: Date.now(),
    });
    setExitMatchOpen(false);
    setFinalFrame(null);
    setRecord(null);
    setDraft({
      ...EMPTY_DRAFT,
      totalVnd: input.sessionTotalVnd,
      game: null,
      selectedPlayerIds: input.members.map((m) => m.id),
    });
    setScreen('setup');
  }, [record, input]);

  // Back của trình duyệt/hệ điều hành:
  // - Pha panel (setup): KHÔNG can thiệp — panel nằm trong luồng S2,
  //   Back là của app chính.
  // - Pha overlay (m6/m7): push MỘT state riêng { ctGame: true } khi
  //   vào overlay; Back ở m6 mở hộp xác nhận thoát ván (không huỷ im
  //   lặng); Back khi sheet luật đang mở thì đóng sheet; Back ở m7
  //   đóng status bản ghi rồi thoát (đường này từng sinh ván ma).
  const backRef = useRef({
    screen,
    record,
    rulesOpen,
    publicCancelMatch,
    exitCleanup,
    closeResultRecord,
  });
  useEffect(() => {
    backRef.current = {
      screen,
      record,
      rulesOpen,
      publicCancelMatch,
      exitCleanup,
      closeResultRecord,
    };
  });

  useEffect(() => {
    if (screen === 'setup') {
      gameStatePushedRef.current = false;
      return;
    }
    if (!gameStatePushedRef.current) {
      window.history.pushState({ ctGame: true }, '', window.location.href);
      gameStatePushedRef.current = true;
    }
  }, [screen]);

  useEffect(() => {
    const onPopState = () => {
      const cur = backRef.current;
      if (cur.screen === 'setup') return;
      const pushGameState = () =>
        window.history.pushState({ ctGame: true }, '', window.location.href);
      if (cur.rulesOpen) {
        setRulesOpen(false);
        pushGameState();
        return;
      }
      if (cur.screen === 'm6') {
        setExitMatchOpen(true);
        pushGameState();
        return;
      }
      // m7: state game đã bị pop — đóng overlay, không push lại.
      gameStatePushedRef.current = false;
      cur.closeResultRecord(cur.record);
      cur.exitCleanup();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const viewFieldsFor = useCallback(
    (id: string, index: number) => ({
      setId: draft.characterSetId ?? FALLBACK_SET.setId,
      characterKey:
        draft.characterAssignments[id] ??
        FALLBACK_SET.characters[index % FALLBACK_SET.characters.length]?.characterKey,
      photoDataUrl: photos.get(id),
    }),
    [draft.characterSetId, draft.characterAssignments, photos],
  );

  const playersForRecord = useCallback(
    (rec: GameRecord): PlayerView[] => {
      const identityMap = buildIdentityMapCovering(
        input.members.map((m) => ({ id: m.id, name: m.displayName })),
        rec.log.params.players.map((p) => ({ id: p.id, name: p.name })),
      );
      return rec.log.params.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        colorHex: identityMap.get(p.id)?.strongHex ?? '#212121',
        diceBearSeed: p.id,
        ...viewFieldsFor(p.id, i),
      }));
    },
    [input, viewFieldsFor],
  );

  const currentPlayers = useMemo<PlayerView[]>(() => {
    if (record) return playersForRecord(record);
    const identityMap = buildIdentityMapFromSessionMembers(input.members);
    return draft.selectedPlayerIds
      .map((id) => input.members.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((m, i) => ({
        id: m.id,
        name: m.displayName,
        colorHex: identityMap.get(m.id)?.strongHex ?? '#212121',
        diceBearSeed: m.id,
        ...viewFieldsFor(m.id, i),
      }));
  }, [record, draft, input, playersForRecord, viewFieldsFor]);

  /** Bấm «Chơi» ở panel: chốt bản ghi ván + chạy engine THUẦN ngay, lưu bền, rồi sang M6 diễn lại từ log. */
  const handleStart = useCallback(
    (ready: ConsentReady) => {
      const seedFinal = finalizeSeed(ready.seedDevice, ready.chung, ready.paramsHash);
      const code = matchCode(seedFinal);
      const log =
        ready.params.game === 'g2'
          ? runG2(seedFinal, ready.params)
          : runG1(seedFinal, ready.params);
      const qr = draft.qr;
      // Q3 (Pha 2): QR đọc được nhưng lệch tổng hoặc chưa có người đối
      // chiếu => QR bị đánh dấu KHÔNG hợp lệ cho ván (không dùng QR
      // này) — ván vẫn bắt đầu bình thường, QR không chặn «Chơi».
      const qrUsable = ready.qrUsable !== false;
      const parsed = qrUsable ? qr.parsed : null;
      const qrPayload = qrUsable ? qr.payload : null;
      const matchedMember = parsed?.accountName
        ? (input.members.find(
            (m) => nameKeyOf(m.displayName) === nameKeyOf(parsed.accountName ?? ''),
          ) ?? null)
        : null;
      const rec: GameRecord = {
        code,
        c1: ready.c1,
        seedDevice: ready.seedDevice,
        chung: ready.chung,
        seedFinal,
        paramsHash: ready.paramsHash,
        qrHash: qrPayload ? fnv1a64(qrPayload) : null,
        algo: log.algo,
        log,
        status: 'dang-do',
        phase: 'playing',
        createdAt: Date.now(),
        finishedAt: null,
        degradeLevel: 0,
        replacedBy: null,
        qr: {
          branch: qr.parseFailed || !parsed ? '2c' : parsed.accountName ? '2a' : '2b',
          providerId: qrUsable ? qr.providerId : null,
          confirmerId: qrUsable ? qr.confirmerId : null,
          confirmerName:
            qrUsable && qr.confirmerId
              ? (input.members.find((m) => m.id === qr.confirmerId)?.displayName ?? null)
              : null,
          source: qrUsable ? qr.source : null,
          confirmedAt: qrUsable ? (ready.qrConfirmedAt ?? qr.confirmedAt) : null,
          bankDisplay: bankDisplayOf(parsed),
          maskedAccount: parsed?.maskedAccount ?? null,
          accountName: parsed?.accountName ?? null,
          nameMatchedMember: Boolean(matchedMember),
        },
      };
      if (draft.replayOf) {
        patchRecord(draft.replayOf.code, { status: 'da-thay-the', replacedBy: code });
      }
      upsertRecord(rec);
      clearGameDraft(undefined, sessionKey);
      consentShownRef.current = false;
      setFinalFrame(null);
      setRecord(rec);
      startBgm();
      setScreen('m6');
    },
    [draft, input, sessionKey],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setGameMuted(next);
      return next;
    });
  }, []);

  /** «Chơi lại» từ M7 — về panel thiết lập, điền sẵn như ván trước nhưng sửa được. */
  const handlePlayAgain = useCallback(() => {
    if (!record) return;
    // Addendum §3: đóng status của bản ghi cũ NGAY khi bấm «Chơi
    // lại» — cùng cơ chế patchRecord + status 'da-thay-the' mà
    // handleStart dùng cho ván thay thế (replacedBy được handleStart
    // điền khi ván mới thật sự bắt đầu). Trước đây việc đóng bị hoãn
    // tới handleStart của ván mới: bấm «Chơi lại» rồi rời panel là
    // bản ghi cũ nằm lại dang-do + result trong storage thô.
    if (record.status === 'dang-do') {
      patchRecord(record.code, { status: 'da-thay-the' });
    }
    setFinalFrame(null);
    setDraft({
      totalVnd: record.log.params.totalVnd,
      qr: draft.qr,
      selectedPlayerIds: record.log.params.players.map((p) => p.id),
      game: null,
      characterSetId: null,
      characterAssignments: {},
      replayOf: record,
    });
    setRecord(null);
    setScreen('setup');
  }, [record, draft.qr]);

  /**
   * Quy kết quả ván thành các khoản thanh toán và nhờ app chính ghi
   * sổ — trả true khi đã ghi (hoặc đã ghi trước đó trong lần mở này).
   */
  const recordPaymentsToLedger = useCallback((): boolean => {
    if (!record || !onRecordLedgerPayments) return false;
    if (ledgerRecordedCode === record.code) return true;
    const total = record.log.params.totalVnd;
    const result = record.log.result;
    const payments =
      result.kind === 'single'
        ? [{ payerId: result.payerId, amountVnd: total }]
        : result.payerIds.map((payerId, i) => {
            const base = Math.floor(total / result.payerIds.length);
            return {
              payerId,
              amountVnd:
                i === result.payerIds.length - 1
                  ? total - base * (result.payerIds.length - 1)
                  : base,
            };
          });
    if (!payments.every((p) => input.members.some((m) => m.id === p.payerId))) return false;
    onRecordLedgerPayments(payments, record.code);
    setLedgerRecordedCode(record.code);
    return true;
  }, [record, onRecordLedgerPayments, ledgerRecordedCode, input]);

  const completeRecord = useCallback(() => {
    if (!record) return;
    patchRecord(record.code, { status: 'hoan-tat', finishedAt: Date.now() });
    exitCleanup();
  }, [record, exitCleanup]);

  /** CTA «Ghi vào sổ & Xong» của M7: ghi sổ + đóng status + thoát về S2 trong 1 bấm. */
  const handleRecordAndComplete = useCallback(() => {
    recordPaymentsToLedger();
    completeRecord();
  }, [recordPaymentsToLedger, completeRecord]);

  /* ---------------- Pha panel (thiết lập) — inline trong S2 ---------------- */
  if (screen === 'setup') {
    return (
      <GamePanelScreen
        input={input}
        draft={draft}
        onDraft={setDraft}
        onOpenMembers={onOpenMembers}
        onCommitmentShown={() => {
          consentShownRef.current = true;
        }}
        onStart={(ready) => {
          unlockAudio();
          handleStart(ready);
        }}
        onSplitEven={splitEvenAtConsent}
        photos={photos}
        onPhotosChanged={setPhotos}
      />
    );
  }

  /* ---------------- Pha overlay — sân chơi + kết quả full-screen ---------------- */
  const gameName = record?.log.params.game === 'g1' ? 'Đấu trường tự động' : 'Mâm cơm xoay';
  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-canvas pt-[max(0.75rem,env(safe-area-inset-top))]"
      role="dialog"
      aria-modal="true"
      aria-label="Chơi game đãi"
      style={{ overscrollBehavior: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className={`mx-auto w-full px-4 pb-6 ${
          screen === 'm6' || screen === 'm7' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
      >
        {/* Header tối giản 1 hàng (Pha 2 §8): tên trò + «?» + Thoát. */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold whitespace-nowrap text-ink">
            {gameName}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Luật chơi & chi tiết ván"
              onClick={() => setRulesOpen(true)}
              className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-line bg-card text-base font-bold text-ink"
            >
              ?
            </button>
            <button
              type="button"
              onClick={() => {
                if (screen === 'm6' && record) {
                  setExitMatchOpen(true);
                  return;
                }
                closeResultRecord(record);
                if (consentShownRef.current) splitEvenAtConsent();
                else exitCleanup();
              }}
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
            >
              Thoát
            </button>
          </div>
        </div>

        <div className="mt-3">
          {screen === 'm6' && record && (
            <PlayScreen
              record={record}
              players={currentPlayers}
              muted={muted}
              onToggleMute={toggleMute}
              onFinalFrame={setFinalFrame}
              onFinished={() => {
                stopBgm();
                patchRecord(record.code, { phase: 'result' });
                setRecord({ ...record, phase: 'result' });
                setScreen('m7');
              }}
              onPublicCancel={publicCancelMatch}
              onDiscardAndNew={
                recovered && record.code === recovered.code ? discardRecoveredAndNew : undefined
              }
              onDegrade={(level) => {
                patchRecord(record.code, { degradeLevel: level });
                setRecord((prev) => (prev ? { ...prev, degradeLevel: level } : prev));
              }}
            />
          )}
          {screen === 'm7' && record && (
            <M7ResultScreen
              input={input}
              record={record}
              draft={draft}
              finalFrameUrl={finalFrame}
              onComplete={completeRecord}
              onRecordAndComplete={onRecordLedgerPayments ? handleRecordAndComplete : undefined}
              onPlayAgain={handlePlayAgain}
              photos={photos}
              players={currentPlayers}
              muted={muted}
              onToggleMute={toggleMute}
              ledgerRecorded={ledgerRecordedCode === record.code}
              onOpenRules={() => setRulesOpen(true)}
            />
          )}
        </div>

        {exitMatchOpen && record ? (
          <GameSheet open onClose={() => setExitMatchOpen(false)} title="Thoát ván đang chơi">
            <p className="text-base leading-relaxed text-ink">
              Thoát ván {record.code} đang chơi? Ván huỷ công khai, cả nhóm chia đều.
            </p>
            <button
              type="button"
              onClick={publicCancelMatch}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
            >
              Thoát ván — chia đều cho lành
            </button>
            <button
              type="button"
              onClick={() => setExitMatchOpen(false)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep"
            >
              Chơi tiếp
            </button>
          </GameSheet>
        ) : null}

        {/* Sheet «Luật & chi tiết» dùng chung cho sân chơi + kết quả:
            Chi tiết ván của ván đã chốt (Mã ván = record.code, Mã cam
            kết = C1, Số chung đã dùng — không Đổi mã sau khi chơi). */}
        <GameRulesSheet
          open={rulesOpen}
          onClose={() => setRulesOpen(false)}
          detail={record ? { code: record.code, c1: record.c1, chung: record.chung } : undefined}
        />
      </div>
    </div>
  );
}

export default GameEntry;
