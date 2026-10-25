// entry.tsx — Cổng game mode «Ai Đãi» (ARCHITECTURE §1.1/§1.2, §2).
// Component client duy nhất được app chính nạp bằng next/dynamic
// ssr:false (xem điểm chạm trong components/chiatien/session-view.tsx).
// File này và các màn của lane P-CORE KHÔNG import phaser — Phaser chỉ
// vào qua GameStage của lane P-STAGE (game/phaser/stage.tsx), đến lượt nó
// cũng chỉ import('phaser') động trong effect.
//
// Vòng đời: mount → máy trạng thái M1→M8; unmount/thoát → cleanup đúng
// thứ tự §1.2 phía React: GameStage tự dừng scene + destroy khi unmount
// (P-STAGE), entry dừng + unload toàn bộ audio Howler rồi mới đóng overlay.
// Khôi phục: khi vào mode mà có bản ghi đang dở (đã cam kết, chưa kết
// thúc) → đi thẳng M6 diễn lại từ log (hoặc M7 nếu đã xem kết quả), không
// sinh ván mới (SPEC §M6).

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { finalizeSeed, fnv1a64, matchCode, runG1, runG2 } from './engine';
import type { GameSessionInput } from './adapter';
import { buildIdentityMapCovering, buildIdentityMapFromSessionMembers } from './assets/identity';
import { loadAvatarPhotos } from './assets/avatar-store';
import { FALLBACK_SET } from './screens/character-sets';
import { isGameMuted, setGameMuted, startBgm, stopAllAudio, stopBgm, unlockAudio } from './audio/sound';
import { SPLIT_EVEN_LABEL } from './copy';
import type { GameDraft, PlayerView, ScreenId } from './state';
import { EMPTY_DRAFT } from './state';
import {
  countAbandonedCommitments,
  findInProgressRecord,
  incrementAbandonedCommitments,
  patchRecord,
  upsertRecord,
} from './store';
import type { GameRecord } from './store';
import { bankDisplayOf } from './screens/m2-qr-screen';
import { nameKeyOf } from './adapter';
import { M1EntryScreen } from './screens/m1-entry-screen';
import { M2QrScreen } from './screens/m2-qr-screen';
import { M3PlayersScreen } from './screens/m3-players-screen';
import { M3BCharacterScreen } from './screens/m3b-character-screen';
import { M4GameScreen } from './screens/m4-game-screen';
import { M5ConsentScreen } from './screens/m5-consent-screen';
import type { ConsentReady } from './screens/m5-consent-screen';
import { PlayScreen } from './screens/play-screen';
import { M7ResultScreen } from './screens/m7-result-screen';
import { M8ReplayScreen } from './screens/m8-replay-screen';
import { RulesScreen } from './screens/rules-screen';

export function GameEntry({
  input,
  onExit,
}: {
  input: GameSessionInput;
  /** Rời game mode về app chính (chia đều bình thường / hoàn tất). */
  onExit: () => void;
}) {
  const [recovered] = useState<GameRecord | null>(() => findInProgressRecord());
  const [screen, setScreen] = useState<ScreenId>(() =>
    recovered ? (recovered.phase === 'result' ? 'm7' : 'm6') : 'm1',
  );
  const [draft, setDraft] = useState<GameDraft>(() => ({
    ...EMPTY_DRAFT,
    selectedPlayerIds: input.members.map((m) => m.id),
  }));
  const [record, setRecord] = useState<GameRecord | null>(recovered);
  // Ảnh avatar chụp trên máy (FIX-V3 N3): nạp từ kho RIÊNG
  // `ct-game-avatars-v1` — tách khỏi bản ghi ván; mọi màn + PlayerView
  // tra map này theo member id tại lúc hiển thị / bắt đầu ván / replay.
  const [photos, setPhotos] = useState<Map<string, string>>(() => loadAvatarPhotos());
  // Frame cuối của ván — CẢ G1 lẫn G2 (SPEC §M7) — chỉ sống ở bộ nhớ
  // phiên, không lưu bền (giống kỷ luật payload QR). Khôi phục ván → vào
  // thẳng M7 thì null.
  const [finalFrame, setFinalFrame] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => isGameMuted());
  const [abandonedCount, setAbandonedCount] = useState<number>(() => countAbandonedCommitments());
  const rulesReturnRef = useRef<ScreenId>('m4');
  // C1 đã hiển thị trong lần đồng thuận hiện tại hay chưa — để ghi cam kết
  // bị bỏ khi rời M5 bằng «Chia đều cho lành» (SPEC §M5/luật cuối §4).
  const consentShownRef = useRef(false);
  // F1 (audit PWA native-feel): hộp xác nhận thoát ván khi người dùng
  // bấm Back GIỮA ván (màn chơi m6) — xem effect pushState/popstate ở
  // dưới. Đã có một state game riêng trong history hay chưa.
  const [exitMatchOpen, setExitMatchOpen] = useState(false);
  const gameStatePushedRef = useRef(false);

  const exitCleanup = useCallback(() => {
    // Thứ tự §1.2 phía React: stage tự cleanup khi unmount (sau khi state
    // của cha đổi), audio dừng + unload tại đây trước khi overlay đóng.
    stopAllAudio();
    onExit();
  }, [onExit]);

  /** Thoát chia đều TRƯỚC khi có ván (M1–M4): rời mode, không ghi nhật ký ván. */
  const splitEvenBeforeMatch = useCallback(() => {
    exitCleanup();
  }, [exitCleanup]);

  /** Thoát chia đều Ở M5: huỷ ý định; nếu C1 đã hiển thị trong lần này thì ghi 1 cam kết bị bỏ. */
  const splitEvenAtConsent = useCallback(() => {
    if (consentShownRef.current) {
      incrementAbandonedCommitments();
      consentShownRef.current = false;
    }
    exitCleanup();
  }, [exitCleanup]);

  /**
   * Huỷ CÔNG KHAI ván đang chơi — một đường duy nhất cho cả nút «Chia
   * đều cho lành» ở màn chơi (PlayScreen) và hộp xác nhận khi bấm Back
   * giữa ván (F1): ghi trạng thái đã huỷ công khai rồi thoát về chia đều.
   */
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

  // F1 — Back của trình duyệt/hệ điều hành trong overlay game.
  // Hành vi đã cài (ghi vào handoff REBUILD-C-D-SHELL):
  // - Khi overlay mở: pushState MỘT state riêng của game
  //   ({ ctGame: true }) — khác key với state { ctStrip: true } của app
  //   chính nên hai cơ chế không giẫm nhau; app chính chỉ nghe popstate
  //   để thu gọn strip của nó, không đọc state của game.
  // - Back ở màn chơi (m6): KHÔNG rời app, KHÔNG huỷ ván im lặng — mở
  //   hộp xác nhận thoát ván (cùng kiểu hộp «Huỷ ván và chia đều» sẵn
  //   có ở màn chơi) và push lại state game để Back tiếp theo vẫn bị
  //   chặn trong overlay. Chỉ khi người dùng bấm «Thoát ván» trong hộp
  //   thì mới huỷ công khai qua publicCancelMatch.
  // - Back ở m2–m5/m8/rules: lùi ĐÚNG một bước trong overlay (m2→m1,
  //   m3→m2, m4→m3, m5→m4, m8→m7, rules→màn đã mở luật) rồi push lại
  //   state game.
  // - Back ở m1 (chưa có ván) hoặc m7 (ván đã chốt kết quả): đóng
  //   overlay về app chính qua đúng đường thoát hiện hữu (kèm ghi cam
  //   kết bị bỏ nếu C1 đã hiển thị — như nút «Thoát game»).
  const backRef = useRef({ screen, publicCancelMatch, splitEvenAtConsent, exitCleanup });
  useEffect(() => {
    backRef.current = { screen, publicCancelMatch, splitEvenAtConsent, exitCleanup };
  });

  useEffect(() => {
    window.history.pushState({ ctGame: true }, '', window.location.href);
    gameStatePushedRef.current = true;
    const onPopState = () => {
      const cur = backRef.current;
      const pushGameState = () =>
        window.history.pushState({ ctGame: true }, '', window.location.href);
      if (cur.screen === 'm6') {
        setExitMatchOpen(true);
        pushGameState();
        return;
      }
      if (cur.screen === 'rules') {
        setScreen(rulesReturnRef.current);
        pushGameState();
        return;
      }
      const prevStep: Partial<Record<ScreenId, ScreenId>> = {
        m2: 'm1',
        m3: 'm2',
        m3b: 'm3',
        m4: 'm3b',
        m5: 'm4',
        m8: 'm7',
      };
      const target = prevStep[cur.screen];
      if (target) {
        setScreen(target);
        pushGameState();
        return;
      }
      // m1 / m7: state game đã bị pop — đóng overlay, không push lại.
      gameStatePushedRef.current = false;
      if (consentShownRef.current) cur.splitEvenAtConsent();
      else cur.exitCleanup();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Danh tính MỘT NGUỒN DUY NHẤT (FIX-V3 P0.4): colorHex của
  // PlayerView = strongHex từ identity map dựng trên roster ĐẦY ĐỦ
  // của phiên (input.members) — KHÔNG dựng theo tập người được chọn
  // hay tập người chơi của ván, nên cùng một người giữ nguyên màu ở
  // mọi màn / mọi cỡ nhóm. Người chơi của ván đã chốt luôn thuộc
  // roster phiên; buildIdentityMapCovering chỉ nối thêm (ở cuối
  // roster) người chơi lạ của bản ghi khôi phục khác phiên để tra
  // cứu không thiếu, không đổi màu của người thuộc phiên.
  // Trường VIEW-ONLY cho scene (FIX-V3 N2b/N3, contract ở bridge.ts):
  // setId + characterKey tra từ DRAFT (tầng trình diễn thuần — không
  // đọc từ bản ghi ván, không vào paramsHash/seed/log), photoDataUrl
  // tra từ kho ảnh trên máy theo member id TẠI LÚC dựng PlayerView
  // (bắt đầu ván / phát lại M8 đều tra mới, không đọc từ log). Thiếu
  // gán trong draft (vd khôi phục ván sau khi app đã đóng, draft rỗng)
  // → gán mặc định phân biệt theo thứ tự của bộ dự phòng.
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

  /** Bấm «Cả nhóm đồng ý — Bắt đầu»: chốt bản ghi ván + chạy engine THUẦN ngay, lưu bền, rồi sang M6 diễn lại từ log. */
  const handleStart = useCallback(
    (ready: ConsentReady) => {
      const seedFinal = finalizeSeed(ready.seedDevice, ready.chung, ready.paramsHash);
      const code = matchCode(seedFinal);
      const log = ready.params.game === 'g2' ? runG2(seedFinal, ready.params) : runG1(seedFinal, ready.params);
      const qr = draft.qr;
      const parsed = qr.parsed;
      const matchedMember = parsed?.accountName
        ? (input.members.find((m) => nameKeyOf(m.displayName) === nameKeyOf(parsed.accountName ?? '')) ?? null)
        : null;
      const rec: GameRecord = {
        code,
        c1: ready.c1,
        seedDevice: ready.seedDevice,
        chung: ready.chung,
        seedFinal,
        paramsHash: ready.paramsHash,
        qrHash: qr.payload ? fnv1a64(qr.payload) : null,
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
          providerId: qr.providerId,
          confirmerId: qr.confirmerId,
          confirmerName: input.members.find((m) => m.id === qr.confirmerId)?.displayName ?? null,
          source: qr.source,
          confirmedAt: qr.confirmedAt,
          bankDisplay: bankDisplayOf(parsed),
          maskedAccount: parsed?.maskedAccount ?? null,
          accountName: parsed?.accountName ?? null,
          nameMatchedMember: Boolean(matchedMember),
        },
      };
      // Luồng chơi lại: ván cũ chuyển trạng thái «đã thay thế» đúng tại
      // thời điểm ván mới BẮT ĐẦU (trước đó kết quả cũ vẫn còn hiệu lực).
      if (draft.replayOf) {
        patchRecord(draft.replayOf.code, { status: 'da-thay-the', replacedBy: code });
      }
      upsertRecord(rec);
      consentShownRef.current = false;
      setFinalFrame(null);
      setRecord(rec);
      startBgm();
      setScreen('m6');
    },
    [draft, input],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setGameMuted(next);
      return next;
    });
  }, []);

  function goRules(from: ScreenId) {
    rulesReturnRef.current = from;
    setScreen('rules');
  }

  /** «Chơi lại» từ M7 — đúng 3 bước SPEC: M1 điền sẵn nhưng sửa được → M4 tự chọn lại → M5 đầy đủ + dòng bổ sung. */
  const handlePlayAgain = useCallback(() => {
    if (!record) return;
    setFinalFrame(null);
    setDraft({
      totalVnd: record.log.params.totalVnd,
      qr: draft.qr, // QR điền sẵn từ bộ nhớ phiên này (payload + ảnh) — vẫn sửa được ở M1/M2.
      selectedPlayerIds: record.log.params.players.map((p) => p.id),
      game: null, // M4 không chọn sẵn theo ván trước.
      characterSetId: null, // M3B chọn lại bộ/nhân vật như lần đầu (trình diễn thuần, không ảnh hưởng ván cũ).
      characterAssignments: {},
      replayOf: record,
    });
    setRecord(null);
    setScreen('m1');
  }, [record, draft.qr]);

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-canvas"
      role="dialog"
      aria-modal="true"
      aria-label="Chơi game đãi"
      // F4: overscroll-behavior: none ở GỐC overlay — cuộn tới cuối
      // overlay không kéo theo trang app chính phía dưới, không kích
      // pull-to-refresh rời game giữa chừng. (Overlay chỉ có đúng một
      // scroller là chính gốc này — các màn game không có scroller lồng
      // nhau, đã rà game/screens/* — nên không có bề mặt nội bộ nào cần
      // mức contain riêng.)
      // F5: đệm safe-area cho header (trên) và đuôi overlay (dưới) qua
      // env(safe-area-inset-*): máy không tai thỏ inset = 0 thì padding
      // bằng 0, layout y hệt trước.
      style={{
        overscrollBehavior: 'none',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Bề rộng theo màn (FIX-V3 P1.11): các màn form giữ cột đọc
          2xl; M6/M7/M8 mở rộng 6xl để sân + cột phụ / kết quả + QR
          dàn NGANG thật ở desktop, không còn cột mobile giữa biển
          trắng. */}
      <div
        className={`mx-auto w-full px-4 py-4 pb-10 ${
          screen === 'm6' || screen === 'm7' || screen === 'm8' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
      >
        {/* Header: tiêu đề chiếm trọn một hàng riêng để không bị hai nút
            hai bên ép ngắt vụn («Chơi game / đãi» ở pack v2); hàng nút ở
            dưới, căn phải, mọi nút giữ vùng chạm ≥44px (min-h-11).
            FIX-V3 P1.5: nút tiếng KHÔNG còn ở chrome này — toàn mode
            chỉ còn ĐÚNG MỘT nút tiếng, nằm trong cụm điều khiển của
            màn chơi / màn xem lại (play-screen / m8). */}
        <div>
          <h1 className="font-display text-[20px] font-extrabold whitespace-nowrap text-ink">
            Chơi game đãi
          </h1>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                // Thoát sau khi C1 đã hiển thị trong lần đồng thuận này (dù đang
                // ở M5 hay đã quay lại M4) cũng tính là một cam kết bị bỏ.
                if (consentShownRef.current) splitEvenAtConsent();
                else exitCleanup();
              }}
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
            >
              Thoát game
            </button>
          </div>
        </div>
        {/* FIX-V3 P1.5 (panel v3 ghế 1/2/3/4/5): đoạn boilerplate
            offline CHỈ hiện ở lần vào mode đầu tiên (M1) — không lặp
            nguyên văn ở đầu mọi màn, không chiếm vị trí vàng trên sân
            chơi. */}
        {screen === 'm1' ? (
          <p className="mt-1 text-sm text-ink-2">
            Game mode đảm bảo chạy offline sau lần mở đầu tiên có mạng; nếu lần đầu tiên mở mà không có
            mạng, game mode không khả dụng — app chính không bị ảnh hưởng.
          </p>
        ) : null}

        <div className="mt-4">
          {screen === 'm1' && (
            <M1EntryScreen
              input={input}
              draft={draft}
              onDraft={setDraft}
              onNext={() => {
                unlockAudio(); // preload/decode audio từ M1 (SPEC §9), không chờ tới lúc chơi.
                setScreen('m2');
              }}
              onSplitEven={splitEvenBeforeMatch}
            />
          )}
          {screen === 'm2' && (
            <M2QrScreen
              input={input}
              draft={draft}
              onDraft={setDraft}
              totalVnd={draft.totalVnd}
              onNext={() => setScreen('m3')}
              onBack={() => setScreen('m1')}
              onSplitEven={splitEvenBeforeMatch}
            />
          )}
          {screen === 'm3' && (
            <M3PlayersScreen
              input={input}
              draft={draft}
              onDraft={setDraft}
              onNext={() => setScreen('m3b')}
              onBack={() => setScreen('m2')}
              onSplitEven={splitEvenBeforeMatch}
              photos={photos}
            />
          )}
          {screen === 'm3b' && (
            <M3BCharacterScreen
              input={input}
              draft={draft}
              onDraft={setDraft}
              onNext={() => setScreen('m4')}
              onBack={() => setScreen('m3')}
              onSplitEven={splitEvenBeforeMatch}
              photos={photos}
              onPhotosChanged={setPhotos}
            />
          )}
          {screen === 'm4' && (
            <M4GameScreen
              draft={draft}
              onDraft={setDraft}
              onNext={() => {
                consentShownRef.current = true;
                setAbandonedCount(countAbandonedCommitments());
                setScreen('m5');
              }}
              onBack={() => setScreen('m3b')}
              onOpenRules={() => goRules('m4')}
              onSplitEven={splitEvenBeforeMatch}
            />
          )}
          {screen === 'm5' && (
            <M5ConsentScreen
              input={input}
              draft={draft}
              abandonedCount={abandonedCount}
              onStart={handleStart}
              onBack={() => setScreen('m4')}
              onOpenRules={() => goRules('m5')}
              onSplitEven={splitEvenAtConsent}
              photos={photos}
            />
          )}
          {screen === 'rules' && <RulesScreen onBack={() => setScreen(rulesReturnRef.current)} />}
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
              onComplete={() => {
                patchRecord(record.code, { status: 'hoan-tat', finishedAt: Date.now() });
                exitCleanup();
              }}
              onDiscardToSplitEven={() => {
                patchRecord(record.code, { status: 'da-bo-chia-deu', finishedAt: Date.now() });
                exitCleanup();
              }}
              onReplayView={() => setScreen('m8')}
              onPlayAgain={handlePlayAgain}
              photos={photos}
            />
          )}
          {screen === 'm8' && record && (
            <M8ReplayScreen
              record={record}
              players={currentPlayers}
              muted={muted}
              onToggleMute={toggleMute}
              onBack={() => setScreen('m7')}
            />
          )}
        </div>

        {/* Hộp xác nhận thoát ván cho phím Back giữa ván (F1) — cùng
            kiểu hộp thoại huỷ công khai sẵn có ở màn chơi
            (play-screen.tsx), cùng một đường huỷ publicCancelMatch;
            KHÔNG tự chế cơ chế xác nhận mới. */}
        {exitMatchOpen && record ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thoát ván đang chơi"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          >
            <div className="w-full max-w-md rounded-lg bg-card px-4 py-4">
              <p className="text-base leading-relaxed text-ink">
                Thoát ván {record.code} đang chơi? Ván sẽ bị huỷ công khai và cả nhóm quay về chia
                đều cho lành — việc huỷ này hiện cho cả nhóm và được ghi vào nhật ký phiên.
              </p>
              <button
                type="button"
                onClick={publicCancelMatch}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
              >
                Thoát ván — chia đều cho lành
              </button>
              <button
                type="button"
                onClick={() => setExitMatchOpen(false)}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
              >
                Chơi tiếp
              </button>
            </div>
          </div>
        ) : null}

        {/* Dòng chú thích lối thoát cũng là chrome lặp (cùng finding
            boilerplate P1.5): chỉ hiện ở M1; các màn sau tự có nút
            «Chia đều cho lành» thật trong khu hành động của chúng. */}
        {screen === 'm1' ? (
          <p className="mt-6 text-xs text-ink-2">
            Lối thoát luôn mở: bấm «{SPLIT_EVEN_LABEL}» ở bất kỳ màn nào để về quyết toán chia đều bình
            thường của phiên.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default GameEntry;
