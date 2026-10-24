'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Khoảnh khắc hoàn tất canvas-2D (REDESIGN-V4, VISUAL-LAYER §4 / D2):
 * bốn khối của mark (tỉ lệ 65:35 + kênh đôi, hình học IDENTITY) bắt đầu
 * hơi tách rời, trượt tịnh tiến thuần (không xoay/nảy/overshoot) vào
 * vị trí khoá trong đúng 240ms, easing cubic-bezier(0.15, 0, 0, 1)
 * của token --ease-lock. Số tiền KHÔNG nằm trong canvas; canvas
 * aria-hidden, không focusable. Fallback tĩnh 1-1 (SVG bốn khối đã
 * khoá + kẻ đôi brand-900) là bản chính và là frame cuối của canvas.
 * Chỉ tuyên bố «Đã chốt chia» — không hàm ý tiền đã di chuyển.
 */

export const COMPLETION_DURATION_MS = 240;

/** Bộ giải cubic-bezier nhỏ (Newton + bisection) — không dependency. */
export function cubicBezierY(x1: number, y1: number, x2: number, y2: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const cx = (t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
  };
  const cy = (t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
  };
  const dx = (t: number) => {
    const u = 1 - t;
    return 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2);
  };
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = cx(t) - x;
    if (Math.abs(err) < 1e-6) return cy(t);
    const d = dx(t);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
    if (t < 0 || t > 1) break;
  }
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 24; i++) {
    const v = cx(t);
    if (Math.abs(v - x) < 1e-6) break;
    if (v < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return cy(t);
}

/** Easing --ease-lock: cubic-bezier(0.15, 0, 0, 1). */
export function easeLockAt(t: number): number {
  return cubicBezierY(0.15, 0, 0, 1, t);
}

/** Bốn khối mark trong hệ 96×96 (IDENTITY: biên x10–86, y12–84, kênh dọc x50–64, kênh ngang y43–53). */
export const MARK_BLOCKS = [
  { x: 10, y: 12, w: 40, h: 31, dx: -1, dy: -1 },
  { x: 64, y: 12, w: 22, h: 31, dx: 1, dy: -1 },
  { x: 10, y: 53, w: 40, h: 31, dx: -1, dy: 1 },
  { x: 64, y: 53, w: 22, h: 31, dx: 1, dy: 1 },
] as const;

/** Độ tách tối đa lúc bắt đầu (đơn vị hệ 96). */
export const MARK_GAP = 6;

/** Frame tại elapsedMs: progress đã ease + độ tách còn lại (0 ở frame cuối). */
export function completionFrameAt(elapsedMs: number): {
  progress: number;
  gap: number;
  done: boolean;
} {
  const raw = Math.min(1, Math.max(0, elapsedMs / COMPLETION_DURATION_MS));
  const progress = easeLockAt(raw);
  return { progress, gap: MARK_GAP * (1 - progress), done: raw >= 1 };
}

/** SVG tĩnh 1-1: bốn khối đã khoá + kẻ đôi brand-900 — frame cuối của canvas, bản chính. */
export function CompletionMarkStatic() {
  return (
    <svg viewBox="0 0 96 104" width={48} height={52} aria-hidden focusable="false">
      {MARK_BLOCKS.map((b) => (
        <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="#212121" />
      ))}
      <line x1="10" y1="94" x2="86" y2="94" stroke="#BF360C" strokeWidth="3" />
      <line x1="10" y1="100" x2="86" y2="100" stroke="#BF360C" strokeWidth="3" />
    </svg>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function CompletionMark({ active }: { active: boolean }) {
  const [mode, setMode] = useState<'idle' | 'animating' | 'static'>('idle');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active || firedRef.current) return;
    firedRef.current = true;
    // Chuyển mode là đầu ra của kích hoạt (prop) + hệ thống ngoài
    // matchMedia, chạy đúng một lần nhờ firedRef — cùng mẫu
    // eslint-disable có lý do như reset QR trong settlement.tsx.
    /* eslint-disable react-hooks/set-state-in-effect -- kich hoat mot lan: mode suy tu prop active + matchMedia, co firedRef chan chay lai */
    if (prefersReducedMotion()) {
      setMode('static');
      return;
    }
    setMode('animating');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [active]);

  useEffect(() => {
    if (mode !== 'animating') return;
    let raf = 0;
    let timer = 0;
    const start = performance.now();
    const finish = () => setMode('static');
    const onTap = () => finish();
    window.addEventListener('pointerdown', onTap, { once: true });
    window.addEventListener('click', onTap, { once: true });

    const draw = (gap: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const scale = canvas.width / 96;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#212121';
      for (const b of MARK_BLOCKS) {
        ctx.fillRect(
          (b.x + b.dx * gap) * scale,
          (b.y + b.dy * gap) * scale,
          b.w * scale,
          b.h * scale,
        );
      }
      ctx.fillStyle = '#BF360C';
      ctx.fillRect(10 * scale, 94 * scale, 76 * scale, 3 * scale);
      ctx.fillRect(10 * scale, 100 * scale, 76 * scale, 3 * scale);
    };

    const tick = () => {
      const frame = completionFrameAt(performance.now() - start);
      draw(frame.gap);
      if (frame.done) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Fallback khi rAF/ctx không khả dụng (vd jsdom): vẫn về frame cuối đúng hạn.
    timer = window.setTimeout(finish, COMPLETION_DURATION_MS + 40);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onTap);
      window.removeEventListener('click', onTap);
    };
  }, [mode]);

  if (!active && mode === 'idle') return null;
  if (mode === 'idle') return null;

  return (
    <div data-completion-mark className="flex items-center gap-3">
      {mode === 'animating' ? (
        <canvas
          ref={canvasRef}
          width={96}
          height={104}
          aria-hidden
          style={{ width: 48, height: 52 }}
        />
      ) : (
        <CompletionMarkStatic />
      )}
      <span className="text-base font-bold text-ink">Đã chốt chia</span>
    </div>
  );
}
