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
    fireEvent.click(screen.getAllByRole('button', { name: /Copy tóm tắt/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain(FULL_TEXT);
    // Và khớp đúng hàm nguồn mà panel dùng (buildSettlementText của lib).
    const balances = computeBalances(stressSession);
    expect(buildSettlementText(stressSession, balances, simplifyDebts(balances))).toContain(
      FULL_TEXT,
    );
  });

  it('(ii) hàng lệnh: grid minmax(0,1fr) auto, tên min-w-0 + truncate trong container flex-wrap (Panel #03 Finding C — thay line-clamp-2: nhóm người nhận wrap xuống hàng riêng thay vì bị ép), nút VietQR shrink-0 và tồn tại trong DOM', () => {
    renderView(stressSession);
    const rows = document.querySelectorAll('[data-transfer-row]');
    expect(rows.length).toBeGreaterThan(0);
    let checkedRowVariant = false;
    for (const row of rows) {
      const grid = row.querySelector('.grid-cols-\\[minmax\\(0\\,1fr\\)_auto\\]');
      if (!grid) continue; // biến thể stacked của cột desktop không dùng grid này
      checkedRowVariant = true;
      expect(grid.className).toContain('minmax(0,1fr)');
      const clampedNames = grid.querySelectorAll('.truncate.min-w-0');
      expect(clampedNames.length).toBeGreaterThan(0);
      // Finding C: container tên phải flex-wrap để nhóm người nhận xuống
      // hàng riêng nguyên vẹn khi chật, thay vì bị ép còn vài px.
      expect(grid.querySelector('.flex-wrap')).toBeTruthy();
      const qrButton = [...row.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('VietQR'),
      );
      expect(qrButton).toBeTruthy();
      expect(qrButton?.className).toContain('shrink-0');
    }
    expect(checkedRowVariant).toBe(true);
  });
});

describe('Panel #03 — Strip tóm tắt 2 hàng (Finding A, cấu trúc)', () => {
  const twoTransferSession: Session = {
    id: 's-two',
    title: 'Ăn trưa nhóm',
    members: [
      { id: 'a', name: 'An' },
      { id: 'b', name: 'Chi' },
      { id: 'c', name: 'Dũng' },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'Phở',
        amount: 900000,
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

  it('(iv) «Quyết toán» + Tổng ở hàng đầu; tên lệnh + tiền + «+N lệnh» ở hàng riêng bên dưới', () => {
    renderView(twoTransferSession);
    const summary = document.querySelector('[data-strip-summary]');
    expect(summary).toBeTruthy();
    const rows = [...(summary?.children ?? [])];
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const headerRow = rows.find((r) => r.textContent?.includes('Quyết toán'));
    expect(headerRow).toBeTruthy();
    expect(headerRow?.textContent).toContain('Tổng');
    // Cụm «+N lệnh» KHÔNG còn chung hàng với nhãn Quyết toán (gốc chồng glyph).
    expect(headerRow?.textContent).not.toContain('lệnh');
    const transferRow = rows.find(
      (r) => r !== headerRow && r.querySelector('.truncate') && r.textContent?.includes('lệnh'),
    );
    expect(transferRow).toBeTruthy();
    // Tên người gửi/nhận theo HỢP ĐỒNG MỚI D4-CT-1 (REDESIGN-V3):
    // ô lưới minmax(72px,1fr)/minmax(96px,1fr) + truncate, CẤM min-w-0
    // trên ô tên — sàn lưới thay cơ chế flex-1 + min-w-0 của Finding A.
    expect(transferRow?.className).toContain('minmax(72px,1fr)');
    const nameSpans = [...(transferRow?.querySelectorAll('.truncate') ?? [])];
    expect(nameSpans.length).toBeGreaterThanOrEqual(2);
    for (const s of nameSpans) {
      expect(s.className).not.toContain('min-w-0');
    }
  });
});

describe('Panel #03 — Share Sheet 2 lớp (DATA-04(ii), cấu trúc + hành vi)', () => {
  it('(v) đúng chữ «Tôi hiểu, tạo link»/«Quay lại»; link CHỈ sinh sau xác nhận và 0 dữ kiện ngân hàng', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderView(stressSession);
    const shareButtons = screen.getAllByRole('button', { name: 'Chia sẻ link' });
    fireEvent.click(shareButtons[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain(
      'Bất kỳ ai có link này đều xem và sửa được bản sao cuộc chia',
    );
    const confirmBtn = [...dialog.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tôi hiểu, tạo link'),
    );
    const backBtn = [...dialog.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Quay lại',
    );
    expect(confirmBtn).toBeTruthy();
    expect(backBtn).toBeTruthy();
    // Trước xác nhận: chưa copy gì cả.
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.click(confirmBtn!);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toContain('#chia=');
    // DATA-04: payload không mang số tài khoản / trường ngân hàng.
    expect(url).not.toContain('0123456789');
    expect(url).not.toContain('accountNumber');
  });
});

describe('Panel #03 — khối thiếu-QR (Finding F, hành vi clipboard)', () => {
  const noBankSession: Session = {
    id: 's-nobank',
    title: 'Nhậu cuối tuần',
    members: [
      { id: 'a', name: 'An' },
      { id: 'b', name: 'Bình' },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'Bia',
        amount: 200000,
        payerId: 'b',
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

  it('(vi) «Nhắn xin QR của Bình» copy LỜI NHẮN XIN QR thật (tên người nhận + số lệnh/tiền), không phải text link chung', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderView(noBankSession);
    const askButtons = screen.getAllByRole('button', { name: 'Nhắn xin QR của Bình' });
    expect(askButtons.length).toBeGreaterThan(0);
    fireEvent.click(askButtons[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('Bình');
    expect(text).toContain('mã QR');
    expect(text).toContain('100.000');
    expect(text.startsWith('Đây là link chốt tiền của nhóm mình')).toBe(false);
    // Xác nhận sau copy phải nói đúng việc đã làm (không còn xác nhận giả).
    await waitFor(() =>
      expect(document.body.textContent).toContain('Đã copy lời nhắn — dán vào Zalo/Messenger'),
    );
  });
});

describe('Panel #03 — Sheet khoản chi (Finding B, cấu trúc)', () => {
  it('(vii) form chốt cột minmax(0,1fr); chip tên dài có min-w-0 + truncate; «Bỏ chọn tất cả» có mặt', async () => {
    renderView(stressSession);
    const addButtons = screen.getAllByRole('button', { name: /Thêm khoản/ });
    fireEvent.click(addButtons[0]);
    const dialog = await screen.findByRole('dialog');
    const formRoot = dialog.querySelector('.grid');
    expect(formRoot?.className).toContain('grid-cols-[minmax(0,1fr)]');
    const payerChips = [...dialog.querySelectorAll('[role="radio"]')];
    expect(payerChips.length).toBeGreaterThan(0);
    const longChip = payerChips.find((c) => c.textContent?.includes('Nguyễn Văn Đức Anh'));
    expect(longChip).toBeTruthy();
    expect(longChip?.className).toContain('min-w-0');
    const nameSpan = longChip?.querySelector('.truncate');
    expect(nameSpan).toBeTruthy();
    expect(nameSpan?.className).toContain('min-w-0');
    const participantChips = [...dialog.querySelectorAll('button[aria-pressed="true"]')];
    expect(participantChips.length).toBeGreaterThan(0);
    expect(dialog.textContent).toContain('Bỏ chọn tất cả');
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
