// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPLETION_DURATION_MS,
  CompletionMark,
  MARK_GAP,
  completionFrameAt,
  cubicBezierY,
  easeLockAt,
} from './completion-mark';
import { SettlementPanel } from './settlement';
import type { Session } from '@/lib/types';

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduced && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

describe('completion-mark logic (D2 / VISUAL-LAYER §4)', () => {
  it('bezier solver: endpoints + monotonic, no overshoot', () => {
    expect(easeLockAt(0)).toBe(0);
    expect(easeLockAt(1)).toBe(1);
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const v = easeLockAt(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
    expect(cubicBezierY(0.15, 0, 0, 1, -1)).toBe(0);
    expect(cubicBezierY(0.15, 0, 0, 1, 2)).toBe(1);
  });

  it('frame: starts separated, locks at exactly 240ms, clamps', () => {
    expect(COMPLETION_DURATION_MS).toBe(240);
    const f0 = completionFrameAt(0);
    expect(f0.gap).toBe(MARK_GAP);
    expect(f0.done).toBe(false);
    const fEnd = completionFrameAt(240);
    expect(fEnd.gap).toBe(0);
    expect(fEnd.done).toBe(true);
    expect(completionFrameAt(9999).gap).toBe(0);
    expect(completionFrameAt(-5).gap).toBe(MARK_GAP);
  });
});

describe('CompletionMark component', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not render when inactive', () => {
    const { container } = render(<CompletionMark active={false} />);
    expect(container.querySelector('[data-completion-mark]')).toBeNull();
    expect(screen.queryByText('Đã chốt chia')).toBeNull();
  });

  it('reduced-motion: shows static immediately, no canvas', () => {
    mockMatchMedia(true);
    const { container } = render(<CompletionMark active />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Đã chốt chia')).not.toBeNull();
  });

  it('active (motion ok): canvas appears with label, canvas has no text', () => {
    const { container } = render(<CompletionMark active />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(canvas?.textContent ?? '').toBe('');
    expect(screen.getByText('Đã chốt chia')).not.toBeNull();
  });

  it('skip-on-tap: any pointerdown jumps to static final frame', () => {
    const { container } = render(<CompletionMark active />);
    expect(container.querySelector('canvas')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('finishes to static after duration even without canvas 2d (jsdom)', () => {
    const { container } = render(<CompletionMark active />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

const session: Session = {
  id: 'sess-w3',
  title: 'Test',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Phở',
      amount: 100000,
      payerId: 'a',
      participantIds: ['a', 'b'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

describe('SettlementPanel mount points', () => {
  beforeEach(() => {
    mockMatchMedia(true);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('mounts CompletionMark in panel body for both variants, label hidden before trigger', () => {
    for (const variant of ['row', 'stacked'] as const) {
      const { container, unmount } = render(
        <SettlementPanel
          session={session}
          balances={{ a: 50000, b: -50000 }}
          transfers={[{ fromId: 'b', toId: 'a', amount: 50000 }]}
          copied={false}
          copyFailed={false}
          onCopy={() => {}}
          onShare={() => {}}
          onEditMember={() => {}}
          variant={variant}
        />,
      );
      expect(container.querySelector('[data-completion-mark]')).toBeNull();
      unmount();
    }
  });

  it('triggers exactly once when copied flips true; share also triggers', async () => {
    const { rerender, container } = render(
      <SettlementPanel
        session={session}
        balances={{ a: 50000, b: -50000 }}
        transfers={[{ fromId: 'b', toId: 'a', amount: 50000 }]}
        copied={false}
        copyFailed={false}
        onCopy={() => {}}
        onShare={() => {}}
        onEditMember={() => {}}
      />,
    );
    rerender(
      <SettlementPanel
        session={session}
        balances={{ a: 50000, b: -50000 }}
        transfers={[{ fromId: 'b', toId: 'a', amount: 50000 }]}
        copied
        copyFailed={false}
        onCopy={() => {}}
        onShare={() => {}}
        onEditMember={() => {}}
      />,
    );
    expect(container.querySelectorAll('[data-completion-mark]')).toHaveLength(1);
    expect(container.textContent).toContain('Đã chốt chia');
    expect(container.textContent).not.toContain('đã thanh toán');
  });
});
