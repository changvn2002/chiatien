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

import { useRef, useState } from 'react';
import type { GameRecord } from '../store';
import type { PlayerView } from '../state';
import { GameStage } from '../phaser/stage';
import { gameSound } from '../audio/sound';
import { MuteButton } from './shared';
import { SPLIT_EVEN_LABEL } from '../copy';

export function PlayScreen({
  record,
  players,
  muted,
  onToggleMute,
  onFinished,
  onPublicCancel,
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

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[22px] font-extrabold text-ink">
          {isG2 ? 'Mâm cơm xoay' : 'Đấu trường tự động'}
        </h2>
        <span className="font-mono text-base font-bold text-ink">Ván {record.code}</span>
      </div>

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
          onFinished={onFinished}
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
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-semibold text-ink"
          >
            {SPLIT_EVEN_LABEL}
          </button>
        </div>
      </div>

      {cancelOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Huỷ ván và chia đều"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-lg bg-card px-4 py-4">
            <p className="text-base leading-relaxed text-ink">
              Huỷ ván {record.code} và chia đều? Việc huỷ hiện công khai cho cả nhóm.
            </p>
            <button
              type="button"
              onClick={onPublicCancel}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
            >
              Cả nhóm đồng ý huỷ — chia đều
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
            >
              Chơi tiếp
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
