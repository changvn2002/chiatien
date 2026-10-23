// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/types';
import { SessionView } from './session-view';

/**
 * CQ-05 / DATA-03 — masking ở tầng COMPONENT: số tài khoản và tên chủ
 * tài khoản KHÔNG xuất hiện ở Member Strip, Ledger, bảng số dư hay dải
 * quyết toán — chúng CHỈ xuất hiện trong QR Sheet của đúng lần chuyển
 * (sau khi người dùng chủ động mở) và trong Member Sheet khi sửa đúng
 * thành viên đó.
 *
 * REDESIGN-V2: không còn bước 1/bước 3 — cùng một Màn B; quyết toán xem
 * ngay tại dải mở rộng (startExpanded) / cột desktop, cả hai đều render
 * cùng SettlementPanel.
 */
const ACCOUNT_NUMBER = '0123456789';
const ACCOUNT_NAME = 'NGUYEN VAN AN';

const session: Session = {
  id: 's-mask',
  title: 'Nhậu cuối tuần',
  members: [
    {
      id: 'a',
      name: 'An',
      bank: {
        bin: '970436',
        bankName: 'Vietcombank',
        accountNumber: ACCOUNT_NUMBER,
        accountName: ACCOUNT_NAME,
      },
    },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Tiền ăn',
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

function renderView(startExpanded = false) {
  return render(
    <SessionView
      session={session}
      startExpanded={startExpanded}
      onBack={vi.fn()}
      onChange={vi.fn()}
      onDelete={vi.fn()}
      onNotifyUndo={vi.fn()}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe('masking ngân hàng (DATA-03) ở tầng component', () => {
  it('Member Strip + Ledger (dải thu gọn): không số tài khoản, không tên chủ tài khoản — chip chỉ có chấm trạng thái QR', () => {
    renderView();
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(ACCOUNT_NUMBER);
    expect(text).not.toContain(ACCOUNT_NAME);
    // Chip của An khẳng định "Có QR" dạng sr-only (bank đã qua validation).
    expect(text).toContain('Có QR');
  });

  it('quyết toán mở rộng (dải + cột desktop) trước khi mở QR Sheet: vẫn không lộ số tài khoản/tên chủ tài khoản', () => {
    renderView(true);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(ACCOUNT_NUMBER);
    expect(text).not.toContain(ACCOUNT_NAME);
    // Lần chuyển Bình -> An tồn tại và có nút VietQR (An có bank tại máy này).
    expect(screen.getAllByRole('button', { name: /VietQR/ }).length).toBeGreaterThan(0);
  });

  it('QR Sheet: số tài khoản CHỈ xuất hiện tại đây, kèm câu nhắc kiểm tra khớp tên chủ tài khoản (SEC-12.6)', async () => {
    renderView(true);
    fireEvent.click(screen.getAllByRole('button', { name: /VietQR/ })[0]);
    const numberEl = await screen.findByText(ACCOUNT_NUMBER);
    expect(numberEl).toBeTruthy();
    expect(screen.getByText(ACCOUNT_NAME)).toBeTruthy();
    expect(document.body.textContent).toContain('kiểm tra tên chủ tài khoản');
  });

  it('Member Sheet của An: số tài khoản xuất hiện trong ô nhập của đúng sheet này', () => {
    renderView();
    fireEvent.click(screen.getAllByRole('button', { name: 'An' })[0]);
    const acctInput = screen.getByLabelText('Số tài khoản') as HTMLInputElement;
    expect(acctInput.value).toBe(ACCOUNT_NUMBER);
  });

  it('ShareSheet có preview số liệu cụ thể + dòng không thu hồi được (UI-11 / DATA-04(ii))', async () => {
    renderView(true);
    fireEvent.click(screen.getAllByRole('button', { name: /Chia sẻ link/ })[0]);
    const text = document.body.textContent ?? '';
    expect(text).toContain('2 thành viên');
    expect(text).toContain('1 khoản chi');
    expect(text).toContain('100.000');
    expect(text).toContain('không thu hồi được');
  });
});
