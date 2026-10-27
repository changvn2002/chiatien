// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trySaveSessions } from '@/lib/storage';
import type { Session } from '@/lib/types';
import Page from '../../app/page';

/**
 * Q4 — REDESIGN Pha 1 (SPEC §A): mở app tự vào thẳng workspace CHỈ
 * KHI có đúng 1 phiên đang dở VÀ phiên đó là phiên active gần nhất
 * (khoá `chiatien:active-session:v1`). «Đang dở» = còn lệnh chuyển
 * chưa đánh dấu đã trả (session-progress — model lib không có trường
 * đã-trả cho lệnh, trạng thái sống ở sổ local của tầng component).
 *
 * THAY ĐỔI SO VỚI BẢN TEAM 2F W2: bản cũ khôi phục vô điều kiện phiên
 * active gần nhất (kể cả phiên trống/chưa có lệnh nào) — SPEC Q4 thu
 * hẹp điều kiện như trên nên 2 ca cũ được viết lại theo hợp đồng mới
 * và bổ sung các ca biên (2 phiên dở; active trỏ phiên đã xong).
 */
const ACTIVE_KEY = 'chiatien:active-session:v1';

/** Phiên ĐANG DỞ: Bình nợ An 50.000 (1 lệnh chưa trả). */
const unfinishedSession: Session = {
  id: 's1',
  title: 'Đi Đà Lạt',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Tiền phòng',
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

/** Phiên KHÔNG dở: chưa có khoản chi nào (không lệnh nào để trả). */
const emptySession: Session = {
  id: 's2',
  title: 'Phiên trống',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [],
  createdAt: 1,
  updatedAt: 3,
};

const secondUnfinished: Session = {
  ...unfinishedSession,
  id: 's3',
  title: 'Ăn trưa nhóm',
  updatedAt: 4,
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('Q4 — tự vào phiên dở duy nhất là active gần nhất', () => {
  it('đúng 1 phiên dở + khoá bền trỏ đúng nó -> bootstrap mở thẳng workspace của nó', () => {
    trySaveSessions([unfinishedSession, emptySession]);
    window.localStorage.setItem(ACTIVE_KEY, 's1');
    render(<Page />);
    expect(screen.getByRole('heading', { name: 'Đi Đà Lạt' })).toBeTruthy();
  });

  it('phiên dở duy nhất nhưng khoá bền trỏ phiên KHÁC (đã xong/trống) -> rơi về danh sách', () => {
    trySaveSessions([unfinishedSession, emptySession]);
    window.localStorage.setItem(ACTIVE_KEY, 's2');
    render(<Page />);
    expect(screen.queryByRole('heading', { name: 'Đi Đà Lạt' })).toBeNull();
    expect(screen.getAllByText('Đi Đà Lạt').length).toBeGreaterThan(0);
  });

  it('có 2 phiên đang dở -> KHÔNG tự mở dù khoá bền trỏ 1 trong 2; danh sách hiện cả hai', () => {
    trySaveSessions([unfinishedSession, secondUnfinished]);
    window.localStorage.setItem(ACTIVE_KEY, 's1');
    render(<Page />);
    expect(screen.queryByRole('heading', { name: 'Đi Đà Lạt' })).toBeNull();
    expect(screen.getAllByText('Đi Đà Lạt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ăn trưa nhóm').length).toBeGreaterThan(0);
  });

  it('không có khoá bền -> danh sách (không tự mở phiên dở)', () => {
    trySaveSessions([unfinishedSession]);
    render(<Page />);
    expect(screen.queryByRole('heading', { name: 'Đi Đà Lạt' })).toBeNull();
    expect(screen.getAllByText('Đi Đà Lạt').length).toBeGreaterThan(0);
  });

  it('khoá bền trỏ id không còn tồn tại -> rơi về danh sách, không crash, không mở nhầm phiên khác', () => {
    trySaveSessions([unfinishedSession]);
    window.localStorage.setItem(ACTIVE_KEY, 'id-khong-con-nua');
    render(<Page />);
    expect(screen.queryByRole('heading', { name: 'Đi Đà Lạt' })).toBeNull();
    expect(screen.getAllByText('Đi Đà Lạt').length).toBeGreaterThan(0);
  });

  it('phiên dở đã đánh dấu đã trả hết trên máy này -> không còn là phiên dở, không tự mở', () => {
    trySaveSessions([unfinishedSession]);
    window.localStorage.setItem(ACTIVE_KEY, 's1');
    // Sổ đã-trả local: lệnh b->a:50000 đã trả.
    window.localStorage.setItem('chiatien:paid-transfers:v1:s1', JSON.stringify(['b>a:50000']));
    render(<Page />);
    expect(screen.queryByRole('heading', { name: 'Đi Đà Lạt' })).toBeNull();
    expect(screen.getAllByText('Đi Đà Lạt').length).toBeGreaterThan(0);
  });
});
