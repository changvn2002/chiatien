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

  it('Sheet 3 Thanh toán: số tài khoản hiện CHE GIỮA (SPEC Pha 1), tên chủ tài khoản + câu nhắc kiểm tra khớp tên (SEC-12.6)', async () => {
    // THAY ĐỔI THEO SPEC Sheet 3: số TK không còn hiện đầy đủ kể cả
    // trong sheet thanh toán — chỉ lộ 4 số đầu + 3 số cuối.
    renderView(true);
    fireEvent.click(screen.getAllByRole('button', { name: /VietQR/ })[0]);
    const maskedEl = await screen.findByText('0123••••789');
    expect(maskedEl).toBeTruthy();
    expect(document.body.textContent).not.toContain(ACCOUNT_NUMBER);
    expect(screen.getByText(ACCOUNT_NAME)).toBeTruthy();
    expect(document.body.textContent).toContain('kiểm tra tên chủ tài khoản');
  });

  it('Member Sheet của An: số tài khoản xuất hiện trong ô nhập của đúng sheet này', () => {
    renderView();
    fireEvent.click(screen.getAllByRole('button', { name: 'An' })[0]);
    const acctInput = screen.getByLabelText('Số tài khoản') as HTMLInputElement;
    expect(acctInput.value).toBe(ACCOUNT_NUMBER);
  });

  it('Sheet 4 Chia sẻ: link phiên + 1 dòng DATA-04; link không chứa số tài khoản/tên chủ tài khoản', async () => {
    // THAY ĐỔI THEO SPEC Sheet 4 (Pha 1): sheet chia sẻ 2 lớp cảnh
    // báo cũ (preview số liệu + «không thu hồi được») được thay bằng
    // đúng: link + «Sao chép link» + 1 dòng «Link không chứa thông
    // tin ngân hàng». DATA-04 vẫn khẳng định ở tầng payload.
    renderView(true);
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của cuộc chia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ' }));
    const dataLine = await screen.findByText('Link không chứa thông tin ngân hàng.');
    const dialog = dataLine.closest('[role="dialog"]');
    expect(dialog).toBeTruthy();
    const linkBox = screen.getByLabelText('Link chia sẻ phiên') as HTMLTextAreaElement;
    expect(linkBox.value).toContain('#chia=');
    expect(linkBox.value).not.toContain(ACCOUNT_NUMBER);
    expect(linkBox.value).not.toContain(ACCOUNT_NAME);
  });
});
