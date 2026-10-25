// M4 — Chọn game (SPEC §M4): thứ tự + copy CHỐT CỨNG — G2 trước với nhãn
// «VÁN NHANH» (FIX-V4 D2: thay biệt ngữ nội bộ «RÕ NHẤT» bị panel v4
// chê) và highlight mặc định, G1 sau đầy đủ không làm xám. N=2 hiện
// dòng cảnh báo nguyên văn dưới tiêu đề. CẤM danh hiệu «nhà vô địch đãi»
// và mọi biến thể vinh dự trên màn này (bề mặt trước đồng thuận — D1).
// Từ màn này mở được màn «Luật hoà» tĩnh.

'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { GameKind } from '../engine/types';
import type { GameDraft } from '../state';
import { ScreenTitle, SplitEvenButton, YellowAlert } from './shared';

export function M4GameScreen({
  draft,
  onDraft,
  onNext,
  onBack,
  onOpenRules,
  onSplitEven,
}: {
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  onNext: () => void;
  onBack: () => void;
  onOpenRules: () => void;
  onSplitEven: () => void;
}) {
  const n = draft.selectedPlayerIds.length;
  const chosen: GameKind | null = draft.game;

  return (
    <div>
      <ScreenTitle>Chọn game</ScreenTitle>
      {n === 2 ? (
        <div className="mt-3">
          <YellowAlert>
            Nhóm chỉ có 2 người: người được chọn sẽ trả toàn bộ hoá đơn, gánh thêm một nửa hoá đơn
            so với chia đều.
          </YellowAlert>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <button
          type="button"
          aria-pressed={chosen === 'g2'}
          onClick={() => onDraft({ ...draft, game: 'g2' })}
          className={`w-full rounded-lg border-2 px-4 py-4 text-left transition ${
            // Chưa chọn: viền TRUNG TÍNH như card G1 (PRES vòng 2, mục
            // 10) — trước đây card G2 luôn mang viền brand nên trông như
            // đã chọn trong khi game vẫn null và nút Tiếp tục đang chờ.
            chosen === 'g2' ? 'border-brand bg-brand-50' : 'border-line-strong bg-card'
          }`}
        >
          <span className="mb-3 block" aria-hidden>
            <GameCardArt kind="g2" />
          </span>
          <span className="flex items-center gap-2">
            <span className="font-display text-[20px] font-extrabold text-ink">Mâm cơm xoay</span>
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink-on-seed">
              VÁN NHANH
            </span>
            {chosen === 'g2' ? (
              <span className="text-sm font-semibold text-brand-deep">Đã chọn</span>
            ) : null}
          </span>
          <span className="mt-1 block text-base text-ink">
            Đũa dừng ở ai, người đó đãi · 1 vòng quay, 8–12 giây
          </span>
        </button>

        <button
          type="button"
          aria-pressed={chosen === 'g1'}
          onClick={() => onDraft({ ...draft, game: 'g1' })}
          className={`w-full rounded-lg border-2 px-4 py-4 text-left transition ${
            chosen === 'g1' ? 'border-brand bg-brand-50' : 'border-line-strong bg-card'
          }`}
        >
          <span className="mb-3 block" aria-hidden>
            <GameCardArt kind="g1" />
          </span>
          <span className="flex items-center gap-2">
            <span className="font-display text-[20px] font-extrabold text-ink">
              Đấu trường tự động
            </span>
            {chosen === 'g1' ? (
              <span className="text-sm font-semibold text-brand-deep">Đã chọn</span>
            ) : null}
          </span>
          <span className="mt-1 block text-base text-ink">
            Mỗi người một nhân vật, tự đánh nhau · Người đứng vững cuối cùng là người đãi ·{' '}
            {n === 2 ? '~20 giây' : '30–40 giây'}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenRules}
        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-ink"
      >
        Xem luật hoà và luật chơi
      </button>

      <button
        type="button"
        disabled={!chosen}
        onClick={onNext}
        // Trạng thái nút KHỚP trạng thái chọn, khai tường minh theo
        // `chosen` thay vì chỉ dựa vào biến thể `disabled:` (PRES vòng
        // 2, mục 10): đã chọn → nền brand đặc + chữ ink-on-seed — đúng
        // ngôn ngữ nút chính của M1/M3/M5; chưa chọn → bề mặt chờ
        // deck-sand + chữ ink.
        className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-base font-bold ${
          chosen ? 'bg-brand text-ink-on-seed' : 'cursor-not-allowed bg-deck-sand text-ink'
        }`}
      >
        Tiếp tục
      </button>
      <button
        type="button"
        onClick={onBack}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-ink"
      >
        Quay lại
      </button>
      <SplitEvenButton onClick={onSplitEven} />
    </div>
  );
}

/**
 * Hình thẻ game THẬT — PHƯƠNG ÁN P6 (FIX-V3, quyết của coordinator
 * sau handoff REBUILD-C2-A2-ASSETS §5–§6): dựng hình thẻ TẠI
 * RUNTIME từ asset thật ĐÃ SHIP, +0 B ngân sách. Lý do: tổng dòng B
 * sau lane A2 = 398.741/400.000 B, chỉ dư 1.259 B — file thẻ tĩnh
 * rẻ nhất đo thật là 5.800 B (cặp 320×180 q55) nên KHÔNG vừa trần;
 * P6 là đường duy nhất không nới trần.
 *
 * Kỹ thuật: CSS sprite-crop — một <span> mang background-image là
 * atlas đã ship, background-size phóng theo tỉ lệ ô frame, và
 * background-position âm đúng toạ độ frame trong JSON atlas tương
 * ứng (toạ độ chép từ chính các file *.json cạnh atlas, ghi ở từng
 * hằng số dưới đây). Bố cục tham chiếu ảnh ứng viên composite của
 * lane A2 (scratch-a2/card-g1-candidate.png đọc tốt; card-g2 được
 * CÂN TÂM LẠI theo ghi chú của coordinator).
 *
 * - Thẻ G1: nền đĩa gỗ /game/atlas/g1-floor.webp (512×512 alpha) +
 *   hai nhân vật render thật ở pose HÀNH ĐỘNG cắt từ atlas nhân vật
 *   của BỘ MỚI adventurers (lane A3/INT — thay atlas cũ g1-*):
 *   Knight punchA_2 và Barbarian kick_2 từ
 *   /game/atlas/sets/adventurers/<model>.json/.webp (sheet 480×960,
 *   ô 96×96; punchA hàng 2 y=192, kick hàng 4 y=384, frame thứ 3
 *   x=192 — toạ độ chép từ chính JSON mới). Nhân vật bên phải lật
 *   ngang bằng CSS để hai người đối mặt.
 * - Thẻ G2: nền mâm gốm /game/atlas/g2-tray.webp (512×512 alpha) +
 *   món render thật cắt từ /game/atlas/g2-food.webp (sheet 512×256,
 *   ô 128×128, 8 frame) bày quanh tâm + nồi chung ở tâm + đôi đũa
 *   vẽ bằng CSS (hai thanh nâu mảnh gác từ tâm ra rìa — đũa là phần
 *   tử đơn giản, đọc rõ là đũa trên mâm).
 * Không pictogram, không người que, không SVG minh hoạ tự vẽ nào
 * còn lại ở thẻ này.
 */
function SpriteCrop({
  src,
  sheetW,
  sheetH,
  frame,
  size,
  flip,
  className,
  style,
}: {
  src: string;
  sheetW: number;
  sheetH: number;
  frame: { x: number; y: number; w: number; h: number };
  /** Cạnh hiển thị của ô frame (px) — các frame dùng ở đây đều vuông. */
  size: number;
  flip?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const scale = size / frame.w;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'block',
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
        backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
        backgroundRepeat: 'no-repeat',
        transform: flip ? 'scaleX(-1)' : undefined,
        ...style,
      }}
    />
  );
}

/** Frame món trong g2-food.json (sheet 512×256, ô 128) — thứ tự 4×2. */
const FOOD_FRAME: Record<string, { x: number; y: number; w: number; h: number }> = {
  'bowl-broth': { x: 0, y: 0, w: 128, h: 128 },
  'bowl-soup': { x: 128, y: 0, w: 128, h: 128 },
  salad: { x: 256, y: 0, w: 128, h: 128 },
  'plate-dinner': { x: 384, y: 0, w: 128, h: 128 },
  'plate-sauerkraut': { x: 0, y: 128, w: 128, h: 128 },
  'pot-stew': { x: 128, y: 128, w: 128, h: 128 },
  turkey: { x: 256, y: 128, w: 128, h: 128 },
  corn: { x: 384, y: 128, w: 128, h: 128 },
};

function GameCardArt({ kind }: { kind: GameKind }) {
  if (kind === 'g1') {
    return (
      <span className="relative block h-44 w-full overflow-hidden rounded-lg bg-[#f1ece4]">
        {/* eslint-disable-next-line @next/next/no-img-element -- Asset tĩnh cùng origin trong public/game/atlas (họ cache game của SW) */}
        <img
          src="/game/atlas/g1-floor.webp"
          alt=""
          className="absolute top-1/2 left-1/2 h-[330px] w-[330px] max-w-none -translate-x-1/2 -translate-y-1/2"
        />
        <SpriteCrop
          src="/game/atlas/sets/adventurers/knight.webp"
          sheetW={480}
          sheetH={960}
          frame={{ x: 192, y: 192, w: 96, h: 96 }}
          size={98}
          className="absolute bottom-[16%] left-[19%]"
        />
        <SpriteCrop
          src="/game/atlas/sets/adventurers/barbarian.webp"
          sheetW={480}
          sheetH={960}
          frame={{ x: 192, y: 384, w: 96, h: 96 }}
          size={98}
          flip
          className="absolute right-[19%] bottom-[16%]"
        />
      </span>
    );
  }
  const seat = (name: string, left: string, top: string, size = 56): ReactNode => (
    <SpriteCrop
      key={name}
      src="/game/atlas/g2-food.webp"
      sheetW={512}
      sheetH={256}
      frame={FOOD_FRAME[name]}
      size={size}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left, top }}
    />
  );
  return (
    <span className="relative block h-44 w-full overflow-hidden rounded-lg bg-[#f1ece4]">
      {/* eslint-disable-next-line @next/next/no-img-element -- Asset tĩnh cùng origin trong public/game/atlas (họ cache game của SW) */}
      <img
        src="/game/atlas/g2-tray.webp"
        alt=""
        className="absolute top-1/2 left-1/2 h-[330px] w-[330px] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
      {seat('bowl-broth', '24%', '20%')}
      {seat('salad', '76%', '20%')}
      {seat('turkey', '13%', '55%')}
      {seat('plate-dinner', '87%', '55%')}
      {seat('corn', '26%', '86%')}
      {seat('plate-sauerkraut', '74%', '86%')}
      {seat('pot-stew', '50%', '54%', 64)}
      {/* Đôi đũa bằng CSS: hai thanh nâu mảnh gác từ tâm mâm ra rìa
          trên-phải, lệch nhau 7px như đũa thật đặt song song. */}
      <span
        aria-hidden
        className="absolute top-[54%] left-1/2 block h-[4px] w-[118px] origin-left -rotate-[26deg] rounded-full bg-[#7a5230]"
      />
      <span
        aria-hidden
        className="absolute top-[calc(54%+7px)] left-1/2 block h-[4px] w-[118px] origin-left -rotate-[26deg] rounded-full bg-[#7a5230]"
      />
    </span>
  );
}
