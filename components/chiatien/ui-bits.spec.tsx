// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IDENTITY_PALETTE, assignIdentityColors, initialsOf } from '@/lib/identity';
import type { Session } from '@/lib/types';
import Page from '../../app/page';
import { SessionView } from './session-view';
import { Avatar } from './ui-bits';

/**
 * HỢP ĐỒNG DiceBear (khôi phục theo override của user 2026-10-24, đợt
 * V4): avatar mặc định render bằng thư viện DiceBear — createAvatar từ
 * @dicebear/core + style `initials` từ @dicebear/collection, SVG sinh
 * 100% tại client, KHÔNG qua HTTP API. Renderer SVG initials nội bộ
 * của đợt V3 (đĩa #FAF3F1 + viền màu ô) đã bị thay thế hẳn.
 *
 * BẤT BIẾN M-2 giữ nguyên và là trọng tâm của spec này: màu một người
 * chỉ phụ thuộc nameKey qua assignIdentityColors ở tầng dữ liệu;
 * component truyền backgroundColor đúng 1 phần tử = ô đã gán, seed =
 * memberNameKey(name) — DiceBear không tự chọn màu theo seed.
 * Hồi quy Panel #03 (attribution <metadata> RDF nhiễm accessible name)
 * và Panel #04 F-R2-02 (aria-hidden trên <svg> gốc) giữ nguyên.
 */

afterEach(() => {
  cleanup();
});

/** Rect nền DiceBear: rect duy nhất không phải rect mặt nạ viewBox (#fff). */
function backgroundRect(container: HTMLElement): Element | null {
  const rects = [...container.querySelectorAll('svg rect')].filter(
    (el) => el.getAttribute('fill') !== '#fff',
  );
  return rects[0] ?? null;
}

function avatarSvgFor(container: HTMLElement, name: string): string {
  const span = [...container.querySelectorAll('span')].find((el) =>
    el.querySelector('svg text')?.textContent?.includes(initialsOf(name).slice(0, 1)),
  );
  return span?.querySelector('svg')?.outerHTML ?? '';
}

describe('Avatar DiceBear initials — khôi phục V4 (override 2026-10-24)', () => {
  it('nền đặc = đúng hex ô palette được truyền, initials trắng Inter 600 trên nền đó', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={0} />);
    const hex = IDENTITY_PALETTE[0];
    const rect = backgroundRect(container);
    expect(rect).toBeTruthy();
    expect(rect!.getAttribute('fill')).toBe(hex);
    const text = container.querySelector('svg text');
    expect(text?.getAttribute('fill')).toBe('#ffffff');
    expect(text?.getAttribute('font-weight')).toBe('600');
    expect(text?.getAttribute('font-family')).toContain('Inter');
    // Cơ chế V3 đã chết: không còn đĩa #FAF3F1 + vòng stroke màu ô.
    expect(container.innerHTML).not.toContain('#FAF3F1');
    expect(container.querySelector('svg circle')).toBeNull();
  });

  it('(c) initials đúng initialsOf: «Nguyễn Văn An» → NA · «Đức Anh» → ĐA · một từ «Bình» → B (chars:1)', () => {
    const cases: Array<[string, string]> = [
      ['Nguyễn Văn An', 'NA'],
      ['Đức Anh', 'ĐA'],
      ['Trần Thị Hồng', 'TH'],
      ['Bình', 'B'],
    ];
    for (const [name, glyph] of cases) {
      const { container, unmount } = render(<Avatar name={name} colorIndex={0} />);
      expect(container.querySelector('svg text')?.textContent).toBe(glyph);
      expect(glyph).toBe(initialsOf(name));
      unmount();
    }
  });

  it('(a) tất định chéo thứ tự: cùng tập thành viên, đảo thứ tự mảng → SVG từng người giống hệt', () => {
    const members = [{ name: 'Nguyễn Văn An' }, { name: 'Bình' }, { name: 'Chi' }];
    const renderAll = (list: typeof members) => {
      const colors = assignIdentityColors(list);
      const { container, unmount } = render(
        <div>
          {list.map((m, i) => (
            <Avatar key={m.name} name={m.name} colorIndex={colors[i]} />
          ))}
        </div>,
      );
      const byName = new Map<string, string>();
      for (const m of list) byName.set(m.name, avatarSvgFor(container, m.name));
      unmount();
      return byName;
    };
    const forward = renderAll(members);
    const reversed = renderAll([...members].reverse());
    for (const m of members) {
      expect(forward.get(m.name)).toBeTruthy();
      expect(reversed.get(m.name)).toBe(forward.get(m.name));
    }
  });

  it('(b) ca đụng độ hash: «bình»/«chi» cùng ứng viên 5 → Bình giữ ô 5, Chi thăm tuyến tính sang ô 6 — ở cả hai thứ tự', () => {
    // fnv1a32('bình') % 12 = fnv1a32('chi') % 12 = 5 (đo độc lập); thứ tự
    // chuẩn nameKey↑ cho Bình trước nên Chi phải nhận ô 6 qua linear probe.
    for (const list of [
      [{ name: 'Bình' }, { name: 'Chi' }],
      [{ name: 'Chi' }, { name: 'Bình' }],
    ]) {
      const colors = assignIdentityColors(list);
      const { container, unmount } = render(
        <div>
          {list.map((m, i) => (
            <Avatar key={m.name} name={m.name} colorIndex={colors[i]} />
          ))}
        </div>,
      );
      const spans = [...container.querySelectorAll('span')].filter((el) => el.querySelector('svg'));
      const fillOf = (glyph: string) =>
        spans
          .find((el) => el.querySelector('svg text')?.textContent === glyph)
          ?.querySelector('svg rect:not([fill="#fff"])')
          ?.getAttribute('fill');
      expect(fillOf('B')).toBe(IDENTITY_PALETTE[5]);
      expect(fillOf('C')).toBe(IDENTITY_PALETTE[6]);
      unmount();
    }
  });

  it('(b) màu nền luôn ∈ ô palette mà M-2 gán: quét mọi colorIndex 0..11', () => {
    for (let idx = 0; idx < IDENTITY_PALETTE.length; idx++) {
      const { container, unmount } = render(<Avatar name="An" colorIndex={idx} />);
      expect(backgroundRect(container)?.getAttribute('fill')).toBe(IDENTITY_PALETTE[idx]);
      unmount();
    }
  });

  it('(d) không dùng HTTP API: không api.dicebear.com, không <img>, không thuộc tính src/href tải ngoài', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={3} />);
    expect(container.innerHTML).not.toContain('api.dicebear.com');
    expect(container.querySelector('img')).toBeNull();
    // Không phần tử nào mang src/href — SVG inline thuần, 0 request tải ảnh.
    // (xmlns="http://www.w3.org/2000/svg" là định danh namespace của SVG,
    // không phải URL được fetch.)
    expect(container.querySelector('[src]')).toBeNull();
    expect(container.querySelector('[href]')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('kích thước: span đúng size truyền vào (24/28/32) và bo tròn đầy (rounded-full)', () => {
    for (const size of [24, 28, 32]) {
      const { container, unmount } = render(<Avatar name="An" colorIndex={2} size={size} />);
      const span = container.querySelector('span');
      expect(span?.style.width).toBe(`${size}px`);
      expect(span?.style.height).toBe(`${size}px`);
      expect(span?.className).toContain('rounded-full');
      unmount();
    }
  });

  it('tĩnh tuyệt đối: không animation/transition trên span lẫn svg', () => {
    const { container } = render(<Avatar name="An" colorIndex={3} size={28} />);
    const span = container.querySelector('span');
    expect(span?.className).not.toMatch(/animate|transition/);
    expect(container.querySelector('svg')?.getAttribute('class') ?? '').not.toMatch(
      /animate|transition/,
    );
    expect(container.innerHTML).not.toContain('<animate');
  });

  it('thẻ <svg> gốc mang aria-hidden="true" (Panel #04 F-R2-02) + span bọc aria-hidden', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={0} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    expect(svg!.outerHTML.match(/aria-hidden="true"/g)).toHaveLength(1);
    expect(container.querySelector('span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('nút chứa avatar: textContent không chứa attribution thư viện nào (hồi quy Panel #03)', () => {
    const { container } = render(
      <button type="button">
        <Avatar name="Bình" colorIndex={1} />
        <span>Bình</span>
      </button>,
    );
    const button = container.querySelector('button');
    expect(button!.textContent).not.toContain('DiceBear');
    expect(container.innerHTML).not.toContain('<metadata');
    expect(container.innerHTML).not.toContain('dc:title');
    expect(button!.textContent).toContain('Bình');
  });

  it('colorIndex ngoài palette được gấp về đúng ô (guard runtime)', () => {
    const { container } = render(<Avatar name="An" colorIndex={12} />);
    expect(backgroundRect(container)?.getAttribute('fill')).toBe(IDENTITY_PALETTE[0]);
  });
});

/* ------------------------------------------------------------------ */
/* Panel #05 R2-F2 — quét DOM: 0 SVG trang trí trong nút có nhãn thiếu */
/* aria-hidden="true". Quét trên cây render THẬT của app (trang chủ +  */
/* Màn B mở rộng, nơi có nút VietQR và chip thành viên chứa avatar     */
/* DiceBear) chứ không chỉ render icon đơn lẻ.                         */
/* ------------------------------------------------------------------ */

function decorativeSvgViolations(root: ParentNode): string[] {
  const violations: string[] = [];
  root.querySelectorAll('button').forEach((btn) => {
    const label = (btn.getAttribute('aria-label') ?? btn.textContent ?? '').trim();
    if (!label) return;
    btn.querySelectorAll('svg').forEach((svg) => {
      if (svg.getAttribute('aria-hidden') !== 'true') {
        violations.push(`nút «${label.slice(0, 40)}» chứa <svg> thiếu aria-hidden="true"`);
      }
    });
  });
  return violations;
}

const scanSession: Session = {
  id: 's-scan',
  title: 'Nhậu cuối tuần',
  members: [
    {
      id: 'a',
      name: 'An',
      bank: {
        bin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountName: 'NGUYEN VAN AN',
      },
    },
    { id: 'b', name: 'Bình' },
    { id: 'c', name: 'Chi' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Tiền ăn',
      amount: 300000,
      payerId: 'a',
      participantIds: ['a', 'b', 'c'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

describe('R2-F2 — quét DOM render thật: SVG trang trí trong nút có nhãn', () => {
  it('Màn B mở rộng (nút VietQR + chip avatar DiceBear trong nút): 0 vi phạm', () => {
    const { container } = render(
      <SessionView
        session={scanSession}
        startExpanded
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    // Chống pass rỗng: bề mặt quét phải thật sự chứa nút VietQR có SVG
    // và chip thành viên chứa avatar DiceBear (SVG) bên trong nút.
    const vietQrButtons = [...container.querySelectorAll('button')].filter((b) =>
      (b.textContent ?? '').includes('VietQR'),
    );
    expect(vietQrButtons.length).toBeGreaterThan(0);
    expect(vietQrButtons.some((b) => b.querySelector('svg'))).toBe(true);
    const chipWithAvatar = [...container.querySelectorAll('button')].filter((b) =>
      b.querySelector('svg text'),
    );
    expect(chipWithAvatar.length).toBeGreaterThan(0);
    expect(decorativeSvgViolations(container)).toEqual([]);
  });

  it('Trang chủ (app đầy đủ qua app/page): 0 vi phạm', () => {
    const { container } = render(<Page />);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(decorativeSvgViolations(container)).toEqual([]);
  });

  it('Sheet VietQR mở (sau khi bấm nút VietQR): 0 vi phạm', () => {
    const { container } = render(
      <SessionView
        session={scanSession}
        startExpanded
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    const vietQr = screen
      .getAllByRole('button', { name: /VietQR/ })
      .find((b) => b.querySelector('svg'));
    expect(vietQr).toBeTruthy();
    fireEvent.click(vietQr!);
    expect(decorativeSvgViolations(container)).toEqual([]);
  });
});
