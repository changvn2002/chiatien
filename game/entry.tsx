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
import { GameSheet } from './screens/shared';
import {
  isGameMuted,
  setGameMuted,
  startBgm,
  stopAllAudio,
  stopBgm,
  unlockAudio,
} from './audio/sound';
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
import { SetupScreen } from './screens/setup-screen';
import type { ConsentReady } from './screens/m5-consent-screen';
import { PlayScreen } from './screens/play-screen';
import { M7ResultScreen } from './screens/m7-result-screen';
import { M8ReplayScreen } from './screens/m8-replay-screen';
import { RulesScreen } from './screens/rules-screen';

export function GameEntry({
  input,
  onExit,
  onRecordLedgerPayments,
}: {
  input: GameSessionInput;
  /** Rời game mode về app chính (chia đều bình thường / hoàn tất). */
  onExit: () => void;
  /**
   * FIX-UX-GAME (F6): ghi kết quả ván vào SỔ của phiên qua API phiên
   * hiện hữu của app chính (session-view tự dựng khoản chi) — game chỉ
   * BÁO khoản cần ghi (người đãi + số tiền), không tự ghi gì vào phiên
   * và không đụng lib. Vắng prop này thì M7 chỉ hiện dòng nói rõ kết
   * quả chưa tự ghi vào sổ, không hiện nút ghi.
   */
  onRecordLedgerPayments?: (
    payments: { payerId: string; amountVnd: number }[],
    matchCode: string,
  ) => void;
}) {
  const [recovered] = useState<GameRecord | null>(() => findInProgressRecord());
  const [screen, setScreen] = useState<ScreenId>(() =>
    recovered ? (recovered.phase === 'result' ? 'm7' : 'm6') : 'setup',
  );
  const [draft, setDraft] = useState<GameDraft>(() => ({
    ...EMPTY_DRAFT,
    // FIX-UX-GAME (F2): tổng tiền TỰ ĐIỀN từ tổng phiên + trò mặc định
    // G2 — vào màn thiết lập là bấm Bắt đầu được ngay khi đã nhập số
    // chung, không còn nhập lại những gì app đã biết.
    totalVnd: input.sessionTotalVnd,
    game: 'g2',
    selectedPlayerIds: input.members.map((m) => m.id),
  }));
  // Ván nào đã ghi vào sổ trong lần mở mode này (chống ghi trùng khi
  // người dùng bấm nút ghi ở M7 hai lần).
  const [ledgerRecordedCode, setLedgerRecordedCode] = useState<string | null>(null);
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

  // FIX-UX-GAME: C1 được tạo ngay trên màn thiết lập gộp (trong mục
  // «Chi tiết ván») — vào màn thiết lập tức là cam kết đã hiển thị cho
  // lần đồng thuận này, nên rời mode từ đây bằng «Chia đều cho lành»
  // hay «Thoát game» đều ghi cam kết bị bỏ như luật cũ ở M5.
  useEffect(() => {
    if (screen === 'setup') {
      consentShownRef.current = true;
      // Hoãn sang microtask: setState đồng bộ trong thân effect bị cấm
      // bởi react-hooks/set-state-in-effect (cùng mẫu ở M7).
      void Promise.resolve().then(() => setAbandonedCount(countAbandonedCommitments()));
    }
  }, [screen]);

  const exitCleanup = useCallback(() => {
    // Thứ tự §1.2 phía React: stage tự cleanup khi unmount (sau khi state
    // của cha đổi), audio dừng + unload tại đây trước khi overlay đóng.
    stopAllAudio();
    onExit();
  }, [onExit]);

  /** Thoát chia đều từ màn thiết lập (C1 đã hiển thị tại đây): huỷ ý định; nếu C1 đã hiển thị trong lần này thì ghi 1 cam kết bị bỏ. */
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
  // - Back ở m8/rules: lùi ĐÚNG một bước trong overlay (m8→m7,
  //   rules→màn đã mở luật) rồi push lại state game. (FIX-UX-GAME:
  //   luồng trước ván chỉ còn màn thiết lập gộp nên không còn các bước
  //   lùi m2–m5 như luồng cũ.)
  // - Back ở setup (chưa có ván) hoặc m7 (ván đã chốt kết quả): đóng
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
        // FIX-UX-GAME: luồng trước ván chỉ còn màn thiết lập gộp —
        // Back ở setup = rời mode (xử lý ở nhánh m1/m7 phía dưới, setup
        // được xếp cùng nhóm màn gốc); chỉ còn m8 → m7 là bước lùi nội bộ.
        m8: 'm7',
      };
      const target = prevStep[cur.screen];
      if (target) {
        setScreen(target);
        pushGameState();
        return;
      }
      // setup / m7: state game đã bị pop — đóng overlay, không push lại.
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
      const log =
        ready.params.game === 'g2'
          ? runG2(seedFinal, ready.params)
          : runG1(seedFinal, ready.params);
      const qr = draft.qr;
      const parsed = qr.parsed;
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
          confirmedAt: ready.qrConfirmedAt ?? qr.confirmedAt,
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

  /** «Chơi lại» từ M7 — về thẳng màn thiết lập gộp, điền sẵn như ván trước nhưng sửa được (FIX-UX-GAME). */
  const handlePlayAgain = useCallback(() => {
    if (!record) return;
    setFinalFrame(null);
    setDraft({
      totalVnd: record.log.params.totalVnd,
      qr: draft.qr, // QR điền sẵn từ bộ nhớ phiên này (payload + ảnh) — vẫn sửa được ở màn thiết lập.
      selectedPlayerIds: record.log.params.players.map((p) => p.id),
      game: 'g2', // Mặc định ván nhanh như lần đầu vào mode.
      characterSetId: null, // Gán lại mặc định như lần đầu (trình diễn thuần, không ảnh hưởng ván cũ).
      characterAssignments: {},
      replayOf: record,
    });
    setRecord(null);
    setScreen('setup');
  }, [record, draft.qr]);

  /**
   * FIX-UX-GAME (F6): M7 bấm «Ghi vào sổ» → entry quy kết quả ván
   * thành các khoản thanh toán (người đãi + số tiền) rồi nhờ app chính
   * ghi qua callback. Cùng đãi: mỗi người một khoản phần bằng nhau,
   * phần lẻ dồn cho người cuối để tổng khớp đúng tổng hoá đơn.
   */
  const handleRecordToLedger = useCallback(() => {
    if (!record || !onRecordLedgerPayments) return;
    if (ledgerRecordedCode === record.code) return;
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
    // Chỉ ghi khi mọi người đãi còn là thành viên phiên (app chính tra
    // khoản theo member id của phiên).
    if (!payments.every((p) => input.members.some((m) => m.id === p.payerId))) return;
    onRecordLedgerPayments(payments, record.code);
    setLedgerRecordedCode(record.code);
  }, [record, onRecordLedgerPayments, ledgerRecordedCode, input]);

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
        className={`mx-auto w-full px-4 py-3 pb-6 ${
          screen === 'm6' || screen === 'm7' || screen === 'm8' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
      >
        {/* Header MỘT HÀNG DUY NHẤT: tiêu đề trái, cụm nút phải cùng
            hàng (bản hai hàng cũ — tiêu đề một hàng, nút một hàng căn
            phải — bị user chê là lỗi vị trí trên mobile 2026-10-25:
            hàng nút trống gần hết chiều ngang, trông như vỡ layout).
            Tiêu đề truncate khi hẹp, nút shrink-0, vùng chạm ≥44px.
            FIX-V3 P1.5: nút tiếng KHÔNG còn ở chrome này — toàn mode
            chỉ còn ĐÚNG MỘT nút tiếng, nằm trong cụm điều khiển của
            màn chơi / màn xem lại (play-screen / m8). */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate font-display text-[20px] font-extrabold whitespace-nowrap text-ink">
            Chơi game đãi
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {/* UIUX-GAME-V2: nút «?» là CỔNG DUY NHẤT vào mọi giải thích
                dài của game mode (sheet «Luật chơi & chi tiết») — các
                màn không còn đoạn văn dài hiển thị mặc định nữa. */}
            {screen !== 'rules' ? (
              <button
                type="button"
                aria-label="Luật chơi & chi tiết"
                onClick={() => goRules(screen)}
                className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-line bg-card text-base font-bold text-ink"
              >
                ?
              </button>
            ) : null}
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
        {/* UIUX-GAME-V2: đoạn boilerplate offline KHÔNG còn ở đầu màn
            thiết lập — bản đầy đủ sống trong sheet «Luật chơi & chi
            tiết» (mục «Chạy offline»), màn thiết lập chỉ giữ 1 dòng
            ngắn trong «Chi tiết ván». */}

        <div className="mt-3">
          {screen === 'setup' && (
            <SetupScreen
              input={input}
              draft={draft}
              onDraft={setDraft}
              abandonedCount={abandonedCount}
              onStart={(ready) => {
                unlockAudio(); // preload/decode audio từ thao tác bắt đầu (SPEC §9).
                handleStart(ready);
              }}
              onSplitEven={splitEvenAtConsent}
              photos={photos}
              onPhotosChanged={setPhotos}
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
              ledgerRecorded={ledgerRecordedCode === record.code}
              onRecordToLedger={onRecordLedgerPayments ? handleRecordToLedger : undefined}
              onOpenRules={() => goRules('m7')}
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
            một đường huỷ publicCancelMatch; UI-SLIM T10: render bằng
            GameSheet (mẫu sheet duy nhất của game) thay hộp tự chế. */}
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

        {/* UIUX-GAME-V2: dòng chú thích lối thoát ở chân màn thiết lập
            đã bỏ — nút «Chia đều cho lành» thật nằm ngay trong thanh
            Bắt đầu của màn thiết lập, không cần chú thích nữa. */}
      </div>
    </div>
  );
}

export default GameEntry;
