// M8 — Xem lại ván (chỉ G1, SPEC §M8): phát lại từ EVENT LOG đã lưu qua
// GameStage ở chế độ replay (stage chỉ diễn lại log — không chạy lại mô
// phỏng), tốc độ 0.5×/1×, kèm mã ván + seed để đối chiếu với M7.
// FIX-V3 P1.12: thuật toán/seed/số chung KHÔNG còn phơi dạng
// monospace ở mặc định — chúng nằm trong mục «Kiểm chứng ván» THU
// GỌN (mặc định đóng, bấm mới mở; giá trị vẫn qua GroupedTechString
// như cũ). Màn mặc định = sân replay + tường thuật ván (cùng câu
// tường thuật với M7, tái dùng highlightText của M7).
// Ghi chú hợp đồng: StageSpeed của bridge chỉ khai 1|2|'fast'; scene G1
// tính thời lượng nhịp bằng TICK_MS / speed nên truyền 0.5 cho đúng 0.5×
// (ép kiểu tại điểm này, đã ghi vào hồ sơ PROTO-C-APP mục phụ thuộc P-STAGE).

'use client';

import { useMemo, useState } from 'react';
import type { StageSpeed } from '../phaser/bridge';
import { GameStage } from '../phaser/stage';
import { gameSound } from '../audio/sound';
import { pickHighlights } from '../engine';
import type { GameRecord } from '../store';
import type { PlayerView } from '../state';
import { GroupedTechString, MuteButton, ScreenTitle } from './shared';
import { highlightText } from './m7-result-screen';

export function M8ReplayScreen({
  record,
  players,
  muted,
  onToggleMute,
  onBack,
}: {
  record: GameRecord;
  players: PlayerView[];
  muted: boolean;
  onToggleMute: () => void;
  onBack: () => void;
}) {
  const [rate, setRate] = useState<0.5 | 1>(1);
  const [runId, setRunId] = useState(0);
  const [done, setDone] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const nameOf = (id: string) =>
    record.log.params.players.find((pl) => pl.id === id)?.name ?? 'Người chơi';
  const highlights = useMemo(
    () => [...pickHighlights(record.log.events)].sort((a, b) => a.tick - b.tick),
    [record.log],
  );

  return (
    <div>
      <ScreenTitle>Xem lại ván {record.code}</ScreenTitle>
      <div className="mt-3" key={`${record.code}-${runId}-${rate}`}>
        <GameStage
          log={record.log}
          players={players}
          speed={rate as unknown as StageSpeed}
          muted={muted}
          sound={gameSound}
          onFinished={() => setDone(true)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MuteButton muted={muted} onToggle={onToggleMute} />
        <button
          type="button"
          aria-pressed={rate === 0.5}
          onClick={() => {
            setRate(0.5);
            setDone(false);
            setRunId((v) => v + 1);
          }}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
        >
          Tốc độ 0.5×
        </button>
        <button
          type="button"
          aria-pressed={rate === 1}
          onClick={() => {
            setRate(1);
            setDone(false);
            setRunId((v) => v + 1);
          }}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
        >
          Tốc độ 1×
        </button>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setRunId((v) => v + 1);
          }}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
        >
          Phát lại từ đầu
        </button>
      </div>
      {done ? <p className="mt-2 text-base text-ink">Đã phát lại hết ván {record.code}.</p> : null}

      {/* Tường thuật ván — cùng khoảnh khắc + cùng câu chữ với
          M7 (highlightText dùng chung), sắp theo tick tăng dần. */}
      {highlights.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-base font-semibold text-ink">Tường thuật ván</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-ink">
            {highlights.map((h, i) => (
              <li key={i}>{highlightText(h, nameOf)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* «Kiểm chứng ván» THU GỌN (P1.12) — mặc định ĐÓNG.
          Khối kỹ thuật (PRES vòng 2, mục 12): nhãn và giá trị TÁCH
          DÒNG RIÊNG — nhãn không bao giờ mang break-all; giá trị
          seed hiển thị mono dạng nhóm 4 ký tự như C1
          (GroupedTechString — chuỗi gốc giữ nguyên); số chung giữ
          nguyên đúng như đã nhập. */}
      <button
        type="button"
        aria-expanded={techOpen}
        onClick={() => setTechOpen(!techOpen)}
        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink"
      >
        {techOpen ? 'Thu gọn mục kiểm chứng ván' : 'Kiểm chứng ván (thuật toán, seed, số chung)'}
      </button>
      {techOpen ? (
        <dl className="mt-2 space-y-1.5 text-sm">
          <div>
            <dt className="font-semibold text-ink">Thuật toán</dt>
            <dd className="font-mono break-words text-ink-2">{record.algo}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Seed cuối</dt>
            <dd className="font-mono text-ink-2">
              <GroupedTechString value={String(record.seedFinal)} />
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">seed_device</dt>
            <dd className="font-mono text-ink-2">
              <GroupedTechString value={String(record.seedDevice)} />
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Số chung</dt>
            <dd className="font-mono text-ink-2">{record.chung}</dd>
          </div>
        </dl>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
      >
        Quay lại kết quả
      </button>
    </div>
  );
}
