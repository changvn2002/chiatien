// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/types';
import { SessionView } from './session-view';

/**
 * CQ-05 / DATA-03 — test masking ở tầng COMPONENT (named case cuối của
 * CQ-05): số tài khoản và tên chủ tài khoản KHÔNG được xuất hiện trong
 * danh sách thành viên ở bất kỳ trạng thái nào, cũng không xuất hiện
 * trong danh sách quyết toán — chúng CHỈ xuất hiện trong sheet thanh
 * toán VietQR của đúng lần chuyển, sau khi người dùng chủ động mở.
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

function renderView(step: 1 | 3) {
  return render(
    <SessionView
      session={session}
      initialStep={step}
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
  it('danh sách thành viên (bước 1): không số tài khoản, không tên chủ tài khoản — chỉ trạng thái đã lưu', () => {
    renderView(1);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(ACCOUNT_NUMBER);
    expect(text).not.toContain(ACCOUNT_NAME);
    expect(text).toContain('Đã lưu ngân hàng trên máy này');
  });

  it('danh sách quyết toán (bước 3) trước khi mở sheet: vẫn không lộ số tài khoản/tên chủ tài khoản', () => {
    renderView(3);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(ACCOUNT_NUMBER);
    expect(text).not.toContain(ACCOUNT_NAME);
    // Lần chuyển Bình -> An tồn tại và có nút VietQR (An có bank tại máy này).
    expect(screen.getByRole('button', { name: /VietQR/ })).toBeTruthy();
  });

  it('sheet thanh toán VietQR: số tài khoản CHỈ xuất hiện tại đây, kèm câu nhắc kiểm tra khớp tên chủ tài khoản (SEC-12.6)', async () => {
    renderView(3);
    fireEvent.click(screen.getByRole('button', { name: /VietQR/ }));
    const numberEl = await screen.findByText(ACCOUNT_NUMBER);
    expect(numberEl).toBeTruthy();
    expect(screen.getByText(ACCOUNT_NAME)).toBeTruthy();
    expect(document.body.textContent).toContain('kiểm tra tên chủ tài khoản');
  });

  it('ShareSheet có preview số liệu cụ thể + dòng không thu hồi được (UI-11 / DATA-04(ii))', async () => {
    renderView(3);
    fireEvent.click(screen.getAllByRole('button', { name: /Chia sẻ link/ })[0]);
    const text = document.body.textContent ?? '';
    expect(text).toContain('2 thành viên');
    expect(text).toContain('1 khoản chi');
    expect(text).toContain('100.000');
    expect(text).toContain('không thu hồi được');
  });
});
