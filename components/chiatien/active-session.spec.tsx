// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trySaveSessions } from '@/lib/storage';
import type { Session } from '@/lib/types';
import Page from '../../app/page';

/**
 * TEAM 2F W2 — phiên đang mở phải BỀN qua lần đóng/mở app: trước đây
 * `activeId` chỉ ở bộ nhớ (use-sessions.ts) nên mở lại app luôn rơi về
 * Màn danh sách, người dùng phải chọn lại phiên đang làm dở. Nay id
 * phiên đang mở được ghi ở khoá riêng `chiatien:active-session:v1` và
 * bootstrap vào thẳng phiên đó khi nó còn tồn tại.
 */
const ACTIVE_KEY = 'chiatien:active-session:v1';

const sampleSession: Session = {
  id: 's1',
  title: 'Đi Đà Lạt',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [],
  createdAt: 1,
  updatedAt: 2,
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('activeId bền (TEAM 2F W2)', () => {
  it('tạo phiên -> đóng app -> mở lại: vào THẲNG phiên đang dở, không rơi về danh sách; khoá bền mang đúng id phiên', () => {
    const first = render(<Page />);
    fireEvent.change(screen.getByLabelText('Tạo cuộc chia mới'), {
      target: { value: 'Nhậu cuối tuần' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo cuộc chia' }));
    expect(screen.getByRole('heading', { name: 'Nhậu cuối tuần' })).toBeTruthy();
    const persistedId = window.localStorage.getItem(ACTIVE_KEY);
    expect(persistedId).toBeTruthy();
    first.unmount();

    render(<Page />);
    // Vào thẳng workspace của phiên vừa tạo — heading tên phiên hiện
    // ngay, không phải chọn lại từ danh sách.
    expect(screen.getByRole('heading', { name: 'Nhậu cuối tuần' })).toBeTruthy();
    expect(window.localStorage.getItem(ACTIVE_KEY)).toBe(persistedId);
  });

  it('khoá bền trỏ đúng một phiên có sẵn -> bootstrap mở thẳng phiên đó', () => {
    trySaveSessions([sampleSession]);
    window.localStorage.setItem(ACTIVE_KEY, 's1');
    render(<Page />);
    expect(screen.getByRole('heading', { name: 'Đi Đà Lạt' })).toBeTruthy();
  });

  it('khoá bền trỏ id không còn tồn tại -> rơi về danh sách như trước, không crash, không mở nhầm phiên khác', () => {
    trySaveSessions([sampleSession]);
    window.localStorage.setItem(ACTIVE_KEY, 'id-khong-con-nua');
    render(<Page />);
    expect(screen.queryByRole('heading', { name: 'Đi Đà Lạt' })).toBeNull();
    // Danh sách vẫn hiện phiên có sẵn để người dùng chọn tay.
    expect(screen.getAllByText('Đi Đà Lạt').length).toBeGreaterThan(0);
  });
});
