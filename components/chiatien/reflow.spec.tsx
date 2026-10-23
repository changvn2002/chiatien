// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeBalances } from '@/lib/split';
import { buildSettlementText, simplifyDebts } from '@/lib/settle';
import type { Session } from '@/lib/types';
import { SessionView } from './session-view';

/**
 * Nghiệm thu CẤU TRÚC họ A/B của REDESIGN-V2 trong sandbox (LAYOUT-SPEC
 * §0.1): ca stress — tên hiển thị 45 ký tự + khoản 999.999.999.999.999 ₫
 * + tiêu đề khoản 71 ký tự — render SessionView với dải quyết toán mở
 * rộng sẵn.
 *
 * GIỚI HẠN GHI THẲNG: spec này là bằng chứng CẤU TRÚC (class lưới, dạng
 * hiển thị rút gọn, nút VietQR tồn tại trong DOM). Đo render thật
 * (scrollWidth = clientWidth ở 5 bề rộng, getBoundingClientRect của nút
 * VietQR) là việc của re-panel trên bản live — jsdom không có layout
 * engine nên không đo được, và file này KHÔNG khẳng định điều đó.
 */

const LONG_NAME = 'Nguyễn Văn Đức Anh Tuấn Kiệt Phương Thảo Linh'; // 45 ký tự
const LONG_TITLE = 'Tiền phòng, ăn uống và di chuyển cho cả nhóm đi Đà Lạt 3 ngày 2 đêm nữa'; // 71 ký tự
const HUGE_AMOUNT = 999_999_999_999_999;
const FULL_TEXT = '999.999.999.999.999';
// Dạng rút gọn THẬT của lib/money.ts cho số all-9 này: quy tắc half-up ở
// 4 chữ số có nghĩa đẩy mantissa 999,999… lên 1000 -> nâng đơn vị ->
// "1 triệu tỷ ₫" (phân xử đã ghi trong lib/money.spec.ts — ví dụ in
// "999,9 nghìn tỷ ₫" ở DESIGN-LANGUAGE §3.3 chỉ đạt được bằng cắt
// truncate, mâu thuẫn với chính quy tắc half-up của spec; test này
// khẳng định kết quả suy từ QUY TẮC + nguồn sự thật lib, kèm NBSP).
const SHORT_TEXT = '1 triệu tỷ\u00A0₫';

const stressSession: Session = {
  id: 's-stress',
  title: 'Chuyến đi stress',
  members: [
    { id: 'a', name: LONG_NAME },
    {
      id: 'b',
      name: 'Bình',
      bank: {
        bin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountName: 'NGUYEN VAN BINH',
      },
    },
  ],
  expenses: [
    {
      id: 'e1',
      title: LONG_TITLE,
      amount: HUGE_AMOUNT,
      payerId: 'b',
      // Chỉ người tên dài chịu khoản này -> lệnh chuyển mang đúng số tiền cực trị.
      participantIds: ['a'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

const shortSession: Session = {
  id: 's-short',
  title: 'Ăn trưa',
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
  updatedAt: 2,
};

function renderView(session: Session) {
  return render(
    <SessionView
      session={session}
      startExpanded
      onBack={vi.fn()}
      onChange={vi.fn()}
      onDelete={vi.fn()}
      onNotifyUndo={vi.fn()}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('reflow họ B — ca stress (bằng chứng cấu trúc)', () => {
  it('dữ kiện stress đúng cỡ đã khai: tên 45 ký tự, tiêu đề 71 ký tự', () => {
    expect(LONG_NAME).toHaveLength(45);
    expect(LONG_TITLE).toHaveLength(71);
  });

  it('(i) hàng ledger / hàng lệnh / dòng chốt hiển thị dạng rút gọn, KHÔNG chứa số đầy đủ; bản copy quyết toán CHỨA số đầy đủ', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderView(stressSession);

    // Hàng ledger: nút của hàng khoản (data-expense-row).
    const ledgerRow = document.querySelector('[data-expense-row="e1"]');
    expect(ledgerRow).toBeTruthy();
    expect(ledgerRow?.textContent).toContain(SHORT_TEXT);
    expect(ledgerRow?.textContent).not.toContain(FULL_TEXT);

    // Hàng lệnh chuyển (mọi bản render của panel: dải mở rộng + cột desktop).
    const transferRows = document.querySelectorAll('[data-transfer-row]');
    expect(transferRows.length).toBeGreaterThan(0);
    for (const row of transferRows) {
      expect(row.textContent).toContain(SHORT_TEXT);
      expect(row.textContent).not.toContain(FULL_TEXT);
    }

    // Dòng chốt của Strip thu gọn/mở rộng.
    const stripSummary = document.querySelector('[data-strip-summary]');
    expect(stripSummary).toBeTruthy();
    expect(stripSummary?.textContent).toContain(SHORT_TEXT);
    expect(stripSummary?.textContent).not.toContain(FULL_TEXT);

    // Bản copy quyết toán (đường copy thật của UI): số ĐẦY ĐỦ.
    fireEvent.click(screen.getAllByRole('button', { name: /Copy bản quyết toán/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain(FULL_TEXT);
    // Và khớp đúng hàm nguồn mà panel dùng (buildSettlementText của lib).
    const balances = computeBalances(stressSession);
    expect(buildSettlementText(stressSession, balances, simplifyDebts(balances))).toContain(
      FULL_TEXT,
    );
  });

  it('(ii) hàng lệnh: grid minmax(0,1fr) auto, tên min-w-0 + line-clamp-2, nút VietQR shrink-0 và tồn tại trong DOM', () => {
    renderView(stressSession);
    const rows = document.querySelectorAll('[data-transfer-row]');
    expect(rows.length).toBeGreaterThan(0);
    let checkedRowVariant = false;
    for (const row of rows) {
      const grid = row.querySelector('.grid-cols-\\[minmax\\(0\\,1fr\\)_auto\\]');
      if (!grid) continue; // biến thể stacked của cột desktop không dùng grid này
      checkedRowVariant = true;
      expect(grid.className).toContain('minmax(0,1fr)');
      const clampedNames = grid.querySelectorAll('.line-clamp-2.min-w-0');
      expect(clampedNames.length).toBeGreaterThan(0);
      const qrButton = [...row.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('VietQR'),
      );
      expect(qrButton).toBeTruthy();
      expect(qrButton?.className).toContain('shrink-0');
    }
    expect(checkedRowVariant).toBe(true);
  });
});

describe('reflow họ A — ca tên ngắn (bằng chứng cấu trúc)', () => {
  it('(iii) nhãn trạng thái / chức năng ở Strip không mang class truncate câm', () => {
    renderView(shortSession);
    const strip = document.querySelector('[data-strip]');
    expect(strip).toBeTruthy();
    // Dòng trạng thái thường trực của Strip.
    const statusTexts = [...(strip?.querySelectorAll('[role="status"]') ?? [])];
    expect(statusTexts.length).toBeGreaterThan(0);
    for (const el of statusTexts) {
      expect(el.className).not.toContain('truncate');
      for (const child of el.querySelectorAll('*')) {
        expect(child.className).not.toContain('truncate');
      }
    }
    // Nhãn chức năng "Quyết toán" trên dòng chốt + nút "+ Thêm" của
    // Member Strip là nhãn chức năng — không truncate.
    const summary = document.querySelector('[data-strip-summary]');
    const settleLabel = [...(summary?.querySelectorAll('span') ?? [])].find(
      (s) => s.textContent === 'Quyết toán',
    );
    expect(settleLabel).toBeTruthy();
    expect(settleLabel?.className).not.toContain('truncate');
    const addButton = screen.getByRole('button', { name: 'Thêm' });
    expect(addButton.className).not.toContain('truncate');
  });
});
