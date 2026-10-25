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
// - P1.11: desktop dàn NGANG thật — sân lớn bên trái, cột thông tin
//   phụ (ván + người chơi theo màu danh tính) bên phải.
// - P1.14: nhãn nút tốc độ theo ĐÚNG ngữ cảnh game đang chơi — màn
//   mâm G2 là «Quay nhanh», màn đấu G1 giữ «Đánh nhanh».

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

      {/* Bố cục ngang desktop (P1.11): sân + điều khiển ở cột chính,
          cột phụ 300px bên cạnh mang thông tin ván/người chơi; mobile
          xếp dọc: sân → điều khiển neo đáy → cột phụ. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-5">
        <div>
          {/* Container của lớp diễn — id ổn định để P-STAGE gắn Phaser.Game. */}
          <div ref={containerRef} id="chiatien-game-stage" className="mt-3">
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

          {/* Cụm điều khiển NEO CỐ ĐỊNH ở đáy vùng game (P1.5,
              pattern 3): nút tiếng DUY NHẤT toàn mode nằm ở đây,
              cùng tốc độ + lối thoát chia đều (luật vị trí D5: khu
              hành động dưới cùng, nút phụ bề rộng đầy đủ). */}
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
            </div>
            <p className="mt-1.5 text-sm text-ink-2">
              Tua nhanh và {isG2 ? 'quay nhanh' : 'đánh nhanh'} chỉ đổi tốc độ diễn — kết quả của
              ván đã được chốt và không đổi.
            </p>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
            >
              {SPLIT_EVEN_LABEL}
            </button>
          </div>
        </div>

        {/* Cột thông tin phụ (chỉ thêm ở desktop theo P1.11; mobile
            hiện dưới cụm điều khiển với cùng nội dung). */}
        <aside className="mt-4 rounded-lg border border-line bg-card px-4 py-4 lg:mt-3">
          <p className="text-sm font-semibold tracking-wide text-ink-2 uppercase">
            {isG2 ? 'Mâm cơm xoay' : 'Đấu trường tự động'} · Ván {record.code}
          </p>
          <h3 className="mt-3 text-base font-semibold text-ink">Người chơi ván này</h3>
          <ul className="mt-2 space-y-2">
            {players.map((p) => (
              <li key={p.id} className="flex min-h-8 items-center gap-2.5">
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-line-strong"
                  style={{ backgroundColor: p.colorHex }}
                />
                <span className="text-base text-ink">{p.name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-2">
            Chấm màu là màu danh tính của từng người trong ván — cùng màu với vòng/plate trên sân và
            badge ở các màn khác.
          </p>
        </aside>
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
              Huỷ ván {record.code} và chia đều cho lành? Việc huỷ này hiện cho cả nhóm và được ghi
              vào nhật ký phiên.
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
