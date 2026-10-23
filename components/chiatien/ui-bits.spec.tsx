// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Avatar } from './ui-bits';

/**
 * Panel #03 (MINOR): chuỗi attribution DiceBear trong khối <metadata> RDF
 * của SVG sinh bởi @dicebear/core nhiễm textContent / accessible name của
 * nút chứa avatar. Avatar phải lọc bỏ khối đó trước khi inject inline,
 * nhưng vẫn giữ nguyên glyph chữ viết tắt + nền màu danh tính.
 */

afterEach(() => {
  cleanup();
});

describe('Avatar — SVG không chứa attribution DiceBear (Panel #03 MINOR)', () => {
  it('span avatar không chứa "DiceBear", <metadata> hay <dc:title> trong HTML lẫn textContent', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={0} />);
    const span = container.querySelector('span');
    expect(span).toBeTruthy();
    const html = span!.innerHTML;
    expect(html).not.toContain('DiceBear');
    expect(html).not.toContain('<metadata');
    expect(html).not.toContain('dc:title');
    expect(html).not.toContain('creativecommons');
    expect(span!.textContent).not.toContain('DiceBear');
  });

  it('vẫn chứa glyph chữ viết tắt và rect nền màu palette', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={0} />);
    const text = container.querySelector('svg text');
    expect(text?.textContent).toBe('NA');
    // Rect nền dùng màu đầu IDENTITY_PALETTE (không '#').
    expect(container.innerHTML).toContain('<rect');
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('thẻ <svg> gốc mang aria-hidden="true" (Panel #04 F-R2-02), chỉ gắn một lần', () => {
    const { container } = render(<Avatar name="Nguyễn Văn An" colorIndex={0} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    // Chỉ thẻ svg gốc được gắn — không lặp thuộc tính ở phần tử con nào
    // (span bọc ngoài cũng mang aria-hidden riêng, nên đếm trong svg).
    expect(svg!.outerHTML.match(/aria-hidden="true"/g)).toHaveLength(1);
    expect(svg!.innerHTML).not.toContain('aria-hidden');
  });

  it('nút chứa avatar: accessible name suy từ textContent không dính attribution', () => {
    const { container } = render(
      <button type="button">
        <Avatar name="Bình" colorIndex={1} />
        <span>Bình</span>
      </button>,
    );
    const button = container.querySelector('button');
    expect(button!.textContent).not.toContain('DiceBear');
    expect(button!.textContent).toContain('Bình');
  });
});
