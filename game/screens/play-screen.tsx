// M6 — Màn chơi (SPEC §M6): ĐIỂM GẮN của lane P-CORE.
// Chứa: container cho lớp diễn + thanh điều khiển React (mute luôn thấy,
// tua nhanh ×2, «đánh nhanh», «Chia đều cho lành» ở khu hành động dưới
// cùng dạng nút phụ full-width) và mount GameStage của lane P-STAGE qua
// đúng hợp đồng props. Bấm «Chia đều cho lành» KHÔNG huỷ ngay — mở hộp
// thoại huỷ CÔNG KHAI nguyên văn SPEC; chỉ «Cả nhóm đồng ý huỷ — chia
// đều» mới kết thúc ván và ghi trạng thái đã huỷ công khai giữa ván.
//
// FIX-V3 (lane D):
// - P1.5: cụm điều khiển là NƠI DUY NHẤT có nút tiếng của toàn mode
//   (chrome entry không còn nút tiếng thứ hai) và NEO CỐ ĐỊNH ở đáy
//   vùng game (sticky trong overlay); sân chiếm tối đa chiều cao khả
//   dụng (stage.tsx) — hết cảm giác «trang form chứa game»
//   (pattern 3/5: điều khiển dạt ra rìa, giữa sân trống).
// - P1.14: nhãn nút tốc độ theo ĐÚNG ngữ cảnh game đang chơi — màn
//   mâm G2 là «Quay nhanh», màn đấu G1 giữ «Đánh nhanh».
// UIUX-GAME-V2 (2026-10-25): bỏ cột phụ desktop (P1.11 cũ) + đoạn giải
// thích tốc độ + chú thích chấm màu — màn chỉ còn sân, hàng chip người
// chơi và hàng chip điều khiển; giải thích chuyển vào sheet luật.

'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameRecord } from '../store';
import type { PlayerView } from '../state';
import { GameStage } from '../phaser/stage';
import { gameSound } from '../audio/sound';
import { GameSheet, MuteButton } from './shared';
import { SPLIT_EVEN_LABEL } from '../copy';
import { presentationGate } from '../play-duration';

export function PlayScreen({
  record,
  players,
  muted,
  onToggleMute,
  onFinished,
  onPublicCancel,
  onDiscardAndNew,
  onDegrade,
  onFinalFrame,
}: {
  record: GameRecord;
  players: PlayerView[];
  muted: boolean;
  onToggleMute: () => void;
  onFinished: () => void;
  /** Cả nhóm đồng ý huỷ công khai — entry ghi trạng thái + thoát về chia đều. */
  onPublicCancel: () => void;
  /**
   * Chỉ có khi ván đang diễn là ván KHÔI PHỤC từ lần mở trước (SPEC
   * C1.5): «Bỏ ván cũ, chơi ván mới» ngay tại màn chơi — entry đóng
   * status ván cũ rồi về setup ván mới, không kẹt diễn lại ván cũ.
   */
  onDiscardAndNew?: () => void;
  onDegrade: (level: number) => void;
  onFinalFrame?: (dataUrl: string) => void;
}) {
  const [speed, setSpeed] = useState<1 | 2 | 'fast'>(1);
  const [cancelOpen, setCancelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isG2 = record.log.params.game === 'g2';
  // P1.14: nhãn «nhanh» theo ngữ cảnh — quay mâm thì «Quay nhanh»,
  // đấu trường thì «Đánh nhanh» (giữ đúng nhãn gốc của G1).
  const fastLabel = isG2 ? 'Quay nhanh' : 'Đánh nhanh';

  // SÀN THỜI LƯỢNG TRÌNH DIỄN (SPEC §C2/P-10, game/play-duration.ts):
  // mốc bắt đầu pha diễn = lúc màn chơi mount; onFinished từ scene
  // chỉ được chấp nhận khi đã qua sàn của trò — scene báo sớm hơn
  // (vd log hỏng báo finished ngay) thì HOÃN công bố tới đủ sàn bằng
  // timer, không huỷ ván, không gọi onFinished hai lần.
  const startedAtRef = useRef<number>(0);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishSentRef = useRef(false);
  useEffect(() => {
    // Mốc bắt đầu pha diễn = lúc màn chơi mount (ghi trong effect —
    // scene Phaser chỉ báo finished sau khi boot xong, luôn sau mốc này).
    startedAtRef.current = Date.now();
    const timer = finishTimerRef;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const handleFinished = () => {
    if (finishSentRef.current || finishTimerRef.current) return;
    const gate = presentationGate(record.log.params.game, startedAtRef.current, Date.now());
    if (gate.ready) {
      finishSentRef.current = true;
      onFinished();
      return;
    }
    finishTimerRef.current = setTimeout(() => {
      finishTimerRef.current = null;
      if (finishSentRef.current) return;
      finishSentRef.current = true;
      onFinished();
    }, gate.waitMs);
  };

  return (
    <div>
      {/* Header sân chơi tối giản 1 hàng (tên trò + Thoát) do entry
          render — màn này không còn hàng tiêu đề riêng (Pha 2 §8). */}

      {/* UIUX-GAME-V2: BỎ lưới 2 cột + cột phụ — màn chơi chỉ còn sân
          (giới hạn bề rộng như cột chính cũ ở desktop), 1 HÀNG CHIP
          người chơi (chấm màu + tên, không chú thích — plate trên sân
          đã mang tên/màu) và thanh điều khiển chip gọn neo đáy. Đoạn
          giải thích tốc độ + chú thích chấm màu chuyển vào sheet
          «Luật chơi & chi tiết» (mục «Trong ván»). */}
      <div
        ref={containerRef}
        id="chiatien-game-stage"
        className="mx-auto mt-3 w-full max-w-[860px]"
      >
        <GameStage
          log={record.log}
          players={players}
          speed={speed}
          muted={muted}
          sound={gameSound}
          onFinished={handleFinished}
          onDegrade={onDegrade}
          onFinalFrame={onFinalFrame}
        />
      </div>

      <ul
        className="mx-auto mt-3 flex w-full max-w-[860px] flex-wrap items-center gap-1.5"
        aria-label="Người chơi ván này"
      >
        {players.map((p) => (
          <li
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-1 pr-2.5 pl-2 text-sm font-medium text-ink"
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: p.colorHex }}
            />
            {p.name}
          </li>
        ))}
      </ul>

      {/* Cụm điều khiển chip gọn NEO CỐ ĐỊNH ở đáy vùng game (P1.5):
          nút tiếng DUY NHẤT toàn mode + tốc độ + lối thoát ván, tất
          cả cùng một hàng chip. */}
      <div className="sticky bottom-0 z-20 mt-3 bg-canvas/95 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <MuteButton muted={muted} onToggle={onToggleMute} />
          <button
            type="button"
            aria-pressed={speed === 2}
            onClick={() => setSpeed(speed === 2 ? 1 : 2)}
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            Tua nhanh ×2
          </button>
          <button
            type="button"
            aria-pressed={speed === 'fast'}
            onClick={() => setSpeed('fast')}
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            {fastLabel}
          </button>
          {onDiscardAndNew ? (
            <button
              type="button"
              onClick={onDiscardAndNew}
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
            >
              Bỏ ván cũ, chơi ván mới
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            {SPLIT_EVEN_LABEL}
          </button>
        </div>
      </div>

      {/* UI-SLIM T10: hộp thoại huỷ về GameSheet — game còn đúng MỘT
          mẫu sheet/modal (portal, scrim, Esc) thay hộp tự chế. */}
      <GameSheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Huỷ ván và chia đều">
        <p className="text-base leading-relaxed text-ink">
          Huỷ ván {record.code} và chia đều? Việc huỷ hiện công khai cho cả nhóm.
        </p>
        <button
          type="button"
          onClick={onPublicCancel}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
        >
          Cả nhóm đồng ý huỷ — chia đều
        </button>
        <button
          type="button"
          onClick={() => setCancelOpen(false)}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep"
        >
          Chơi tiếp
        </button>
      </GameSheet>
    </div>
  );
}
