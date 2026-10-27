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

  it('(i) hàng ledger / hàng lệnh / dòng tóm tắt dock hiển thị dạng rút gọn, KHÔNG chứa số đầy đủ; bản quyết toán dạng chữ của lib CHỨA số đầy đủ', async () => {
    // THAY ĐỔI THEO SPEC Pha 1: nút «Copy tóm tắt» ở panel đã gỡ về
    // Sheet 4 (chỉ copy link) — khẳng định «số đầy đủ» nay giữ ở tầng
    // nguồn lib (buildSettlementText) thay vì qua nút copy của panel.
    renderView(stressSession);

    // Hàng ledger: nút của hàng khoản (data-expense-row).
    const ledgerRow = document.querySelector('[data-expense-row="e1"]');
    expect(ledgerRow).toBeTruthy();
    expect(ledgerRow?.textContent).toContain(SHORT_TEXT);
    expect(ledgerRow?.textContent).not.toContain(FULL_TEXT);

    // Hàng lệnh chuyển — panel render DUY NHẤT 1 lần (Q5/D1).
    const transferRows = document.querySelectorAll('[data-transfer-row]');
    expect(transferRows).toHaveLength(1);
    for (const row of transferRows) {
      expect(row.textContent).toContain(SHORT_TEXT);
      expect(row.textContent).not.toContain(FULL_TEXT);
    }

    // Dòng tóm tắt 1 dòng của dock: «Còn 1 lệnh chưa trả · <tổng rút gọn>».
    const dockSummary = document.querySelector('[data-dock-summary]');
    expect(dockSummary).toBeTruthy();
    expect(dockSummary?.textContent).toContain('Còn 1 lệnh chưa trả');
    expect(dockSummary?.textContent).toContain(SHORT_TEXT);
    expect(dockSummary?.textContent).not.toContain(FULL_TEXT);

    // Nguồn chữ quyết toán đầy đủ của lib giữ nguyên số đầy đủ.
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

describe('Pha 1 — Dock tóm tắt 1 dòng (thay Strip tóm tắt của Panel #03 Finding A)', () => {
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

  it('(iv) dock tóm tắt ĐÚNG 1 dòng «Còn N lệnh chưa trả · X đ»; không tên cặp người chuyển — danh sách lệnh đầy đủ nằm trong panel duy nhất', () => {
    // THAY ĐỔI THEO SPEC §1.4: tóm tắt khi cuộn tối đa 1 dòng dạng
    // «Còn N lệnh chưa trả · X đ» — thay hàng «Tổng + Quyết toán»
    // của strip cũ.
    renderView(twoTransferSession);
    const summary = document.querySelector('[data-dock-summary]');
    expect(summary).toBeTruthy();
    expect(summary?.textContent).toContain('Còn 2 lệnh chưa trả');
    expect(summary?.textContent).not.toContain('Quyết toán');
    expect(summary?.textContent).not.toContain('Bình');
    // Panel duy nhất chứa cả 2 lệnh.
    expect(document.querySelectorAll('[data-transfer-row]')).toHaveLength(2);
  });
});

describe('Pha 1 — Sheet 4 Chia sẻ (thay Share Sheet 2 lớp của Panel #03)', () => {
  it('(v) menu ⋯ -> «Chia sẻ»: link hiện ngay + «Sao chép link» copy link; 0 dữ kiện ngân hàng trong link', async () => {
    // THAY ĐỔI THEO SPEC Sheet 4: bỏ cổng xác nhận 2 lớp
    // («Tôi hiểu, tạo link»/«Quay lại») — AP-02 cấm xác nhận chồng.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderView(stressSession);
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của cuộc chia' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chia sẻ' }));
    const linkBox = (await screen.findByLabelText('Link chia sẻ phiên')) as HTMLTextAreaElement;
    expect(linkBox.value).toContain('#chia=');
    expect(screen.queryByRole('button', { name: /Tôi hiểu, tạo link/ })).toBeNull();
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toContain('#chia=');
    // DATA-04: payload không mang số tài khoản / trường ngân hàng.
    expect(url).not.toContain('0123456789');
    expect(url).not.toContain('accountNumber');
  });
});

describe('Pha 1 — D11: danh sách thiếu-QR gọn (thay khối «Nhắn xin QR» của Finding F)', () => {
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

  it('(vi) Bình thiếu QR: danh sách gọn có đúng 1 nút «Nhập tài khoản» cho Bình; KHÔNG còn «Nhắn xin QR»/copy lời nhắn', async () => {
    // THAY ĐỔI THEO SPEC D11: đường copy lời nhắn xin QR bị cắt cùng
    // các nút sao chép rải rác; việc duy nhất còn lại tại panel là
    // nhập tài khoản của người nhận ngay trên máy này.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderView(noBankSession);
    expect(screen.queryByRole('button', { name: /Nhắn xin QR/ })).toBeNull();
    const importButtons = screen.getAllByRole('button', { name: 'Nhập tài khoản' });
    expect(importButtons).toHaveLength(1);
    fireEvent.click(importButtons[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Sửa thành viên');
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe('Panel #03 — Sheet khoản chi (Finding B, cấu trúc)', () => {
  it('(vii) form chốt cột minmax(0,1fr); chip tên dài có min-w-0 + truncate; «Bỏ chọn tất cả» có mặt', async () => {
    renderView(stressSession);
    // CTA chính của S2 ở dock: «+ Khoản chi» (SPEC §2 S2).
    fireEvent.click(screen.getByRole('button', { name: 'Khoản chi' }));
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
  it('(iii) StatusLine ở Dock (bề mặt trạng thái duy nhất của S2 — D8) không mang class truncate câm; nút "+ Thêm" của dải thành viên cũng vậy', () => {
    // THAY ĐỔI THEO SPEC D8/Pha 1: Strip chết, trạng thái sống ở Dock.
    renderView(shortSession);
    const dock = document.querySelector('[data-dock]');
    expect(dock).toBeTruthy();
    const statusTexts = [...(dock?.querySelectorAll('[role="status"]') ?? [])];
    expect(statusTexts.length).toBeGreaterThan(0);
    for (const el of statusTexts) {
      expect(el.className).not.toContain('truncate');
      for (const child of el.querySelectorAll('*')) {
        expect(child.className).not.toContain('truncate');
      }
    }
    // StatusLine chỉ còn ĐÚNG 1 bề mặt trong toàn S2.
    const allStatus = [...document.querySelectorAll('[role="status"]')].filter((el) =>
      el.textContent?.includes('Đã lưu trên máy này'),
    );
    expect(allStatus).toHaveLength(1);
    const addButton = screen.getByRole('button', { name: 'Thêm' });
    expect(addButton.className).not.toContain('truncate');
  });
});
