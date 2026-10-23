// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IDENTITY_PALETTE } from '@/lib/identity';
import { Avatar } from './ui-bits';

/**
 * HỢP ĐỒNG MỚI (REDESIGN-V3, LK-15/16/17): cơ chế avatar DiceBear + nền
 * đặc đã chết hẳn. Avatar nay là SVG inline tự sinh: đĩa tròn fill
 * neutral-50 #FAF3F1 (ĐÓNG BĂNG, chung mọi thành viên) + viền solid màu
 * ô identity + <text> initials Inter 600 fill màu ô. Các test DiceBear
 * cũ (lọc <metadata> RDF) được thay bằng test cơ chế mới dưới đây; hồi
 * quy Panel #03 (attribution nhiễm accessible name) giữ qua test nút
 * chứa avatar, và F-R2-02 (aria-hidden trên <svg> gốc) giữ nguyên.
 */

afterEach(() => {
  cleanup();
});

describe('Avatar V3 — đĩa #FAF3F1 + initials + viền màu ô (LK-15/16)', () => {
  it('đĩa fill đúng #FAF3F1, stroke = hex ô, text fill = hex ô, KHÔNG nền đặc màu ô', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={0} />);
    const hex = IDENTITY_PALETTE[0];
    const circle = container.querySelector('svg circle');
    expect(circle).toBeTruthy();
    expect(circle!.getAttribute('fill')).toBe('#FAF3F1');
    expect(circle!.getAttribute('stroke')).toBe(hex);
    const text = container.querySelector('svg text');
    expect(text?.getAttribute('fill')).toBe(hex);
    expect(text?.getAttribute('font-weight')).toBe('600');
    // Không phần tử nào dùng hex ô làm fill nền đặc (cấm tái phạm LK-16):
    // hex chỉ xuất hiện ở stroke của đĩa + fill của initials.
    const filled = [...container.querySelectorAll('[fill]')].filter(
      (el) => el.getAttribute('fill') === hex,
    );
    expect(filled).toHaveLength(1);
    expect(filled[0].tagName).toBe('text');
    expect(container.innerHTML).not.toContain('<rect');
  });

  it('initials đúng từ initialsOf: «Nguyễn Văn An» → NA, tên một từ → 1 ký tự', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={0} />);
    expect(container.querySelector('svg text')?.textContent).toBe('NA');
    const { container: c2 } = render(<Avatar name="Bình" colorIndex={1} />);
    expect(c2.querySelector('svg text')?.textContent).toBe('B');
  });

  it('tầng cỡ khoá: 24→10px/viền 1,5 · 28→11px/2 · 32→12px/2 · lạ→tầng gần nhất ≤32', () => {
    const cases: Array<[number, number, number, string]> = [
      [22, 24, 10, '1.5'],
      [24, 24, 10, '1.5'],
      [28, 28, 11, '2'],
      [32, 32, 12, '2'],
      [36, 32, 12, '2'],
    ];
    for (const [size, disc, fontSize, strokeWidth] of cases) {
      const { container, unmount } = render(<Avatar name="An" colorIndex={2} size={size} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe(String(disc));
      expect(container.querySelector('svg text')?.getAttribute('font-size')).toBe(String(fontSize));
      expect(container.querySelector('svg circle')?.getAttribute('stroke-width')).toBe(strokeWidth);
      unmount();
    }
  });

  it('tĩnh tuyệt đối: không animation/transition trên span lẫn svg (LK-17)', () => {
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
    expect(container.querySelector('svg circle')?.getAttribute('stroke')).toBe(IDENTITY_PALETTE[0]);
  });
});
