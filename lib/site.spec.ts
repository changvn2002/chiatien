import { describe, expect, it } from 'vitest';
import { FAQ_ITEMS, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from './site';

/**
 * Nội dung SEO là một phần bề mặt thật của sản phẩm (layout/JSON-LD/
 * sitemap cùng đọc từ lib/site.ts): khoá các bất biến tối thiểu để một
 * lần sửa nội dung không làm rỗng FAQ hay lệch URL canonical trong im
 * lặng (SEO-08/SEO-09 dùng các giá trị này làm bằng chứng).
 */
describe('lib/site — nội dung SEO dùng chung', () => {
  it('SITE_URL là URL https không slash cuối; tên/tiêu đề/mô tả chứa thương hiệu', () => {
    expect(SITE_URL).toMatch(/^https:\/\//);
    expect(SITE_URL.endsWith('/')).toBe(false);
    expect(SITE_NAME).toBe('Chia Tiền');
    expect(SITE_TITLE).toContain('Chia Tiền');
    expect(SITE_DESCRIPTION).toContain('Chia');
  });

  it('FAQ có nội dung thật: mọi câu hỏi/câu trả lời đều không rỗng', () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(3);
    for (const item of FAQ_ITEMS) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });
});
