// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/types';
import { SessionList } from './session-list';
import { SessionView } from './session-view';

/**
 * Nghiệm thu REDESIGN Pha 1 cho các hành vi MỚI mà các spec cũ chưa
 * phủ: đánh dấu «Đã trả» qua Sheet 3 (sổ local session-progress),
 * tiến độ «n/m lệnh đã trả» ở S1, nhánh «Game đãi» là điểm mở game duy
 * nhất ở đầu mục «Ai trả ai» (từ Pha 2: mở PANEL ngay trong mục),
 * và Sheet 1 ở trạng thái sau-Lưu.
 */

const session: Session = {
  id: 's-p1',
  title: 'Nhậu cuối tuần',
  members: [
    {
      id: 'a',
      name: 'An',
      bank: {
        bin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountName: 'NGUYEN VAN AN',
      },
    },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Bia',
      amount: 200000,
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

function renderView() {
  return render(
    <SessionView
      session={session}
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
});

describe('Pha 1 — đánh dấu đã trả qua Sheet 3', () => {
  it('dock báo «Còn 1 lệnh chưa trả»; mở Sheet 3 từ nút VietQR, bấm «Đã trả» -> dock về «Đã cân hết», hàng lệnh mang nhãn Đã trả, sổ local ghi đúng khoá lệnh', async () => {
    const { container } = renderView();
    const dockSummary = container.querySelector('[data-dock-summary]');
    expect(dockSummary?.textContent).toContain('Còn 1 lệnh chưa trả');
    expect(dockSummary?.textContent).toContain('100.000');

    fireEvent.click(screen.getByRole('button', { name: /VietQR/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Thanh toán — An');
    fireEvent.click(screen.getByRole('button', { name: /Đã trả/ }));

    await waitFor(() =>
      expect(container.querySelector('[data-dock-summary]')?.textContent).toContain('Đã cân hết'),
    );
    const row = container.querySelector('[data-transfer-row]');
    expect(row?.textContent).toContain('Đã trả');
    expect(window.localStorage.getItem('chiatien:paid-transfers:v1:s-p1')).toContain('b>a:100000');
  });

  // Addendum (Seat 3 N7): mẫu số nói rõ đếm LỆNH — «n/m lệnh đã trả».
  it('S1 hiện tiến độ «0/1 lệnh đã trả»; sau khi đánh dấu (sổ local có sẵn) hiện «1/1 lệnh đã trả»', () => {
    const { unmount } = render(
      <SessionList sessions={[session]} onCreate={vi.fn()} onOpen={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(document.body.textContent).toContain('0/1 lệnh đã trả');
    unmount();
    window.localStorage.setItem('chiatien:paid-transfers:v1:s-p1', JSON.stringify(['b>a:100000']));
    render(
      <SessionList sessions={[session]} onCreate={vi.fn()} onOpen={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(document.body.textContent).toContain('1/1 lệnh đã trả');
  });
});

describe('Fix Wave 2 — S2 chưa có khoản chi (Addendum §6)', () => {
  it('ẩn «Số dư từng người» + «Tổng chuyển», dock không có phần tử tóm tắt; giữ «Chưa có gì để quyết toán»', () => {
    const empty: Session = { ...session, id: 's-empty', expenses: [] };
    const { container } = render(
      <SessionView
        session={empty}
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    expect(document.body.textContent).toContain('Chưa có gì để quyết toán');
    expect(document.body.textContent).not.toContain('Số dư từng người');
    expect(document.body.textContent).not.toContain('Tổng chuyển');
    expect(container.querySelector('[data-dock-summary]')).toBeNull();
  });

  it('dock chưa trả: số tiền nằm ở span shrink-0 riêng, không bao giờ truncate (Addendum §5)', () => {
    const { container } = renderView();
    const summary = container.querySelector('[data-dock-summary]');
    expect(summary?.textContent).toContain('Còn 1 lệnh chưa trả');
    expect(summary?.textContent).toContain('100.000');
    const amountSpan = [...(summary?.querySelectorAll('span') ?? [])].find((s) =>
      s.textContent?.includes('100.000'),
    );
    expect(amountSpan?.className).toContain('shrink-0');
    expect(amountSpan?.className).toContain('font-figure');
    expect(amountSpan?.className).not.toContain('truncate');
  });
});

describe('Pha 1+2 — nhánh Game đãi là điểm mở game DUY NHẤT', () => {
  // ĐỔI Ở PHA 2 (SPEC §C2): chọn nhánh «Game đãi» không còn hiện nút
  // «Chơi game đãi» mở overlay — PANEL game mở ngay trong mục «Ai trả
  // ai» (CTA của panel là «Chơi»). Test cũ đếm nút mở overlay nên
  // viết lại theo hành vi panel; tính duy nhất của điểm mở giữ nguyên.
  it('mặc định nhánh Chia đều: panel game không hiện; chọn Game đãi -> panel mở ngay tại mục với đúng 1 nút «Chơi»; quay về Chia đều -> panel đóng', async () => {
    renderView();
    expect(screen.queryByRole('button', { name: 'Chơi' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Game đãi' }));
    const play = await screen.findByRole('button', { name: 'Chơi' });
    expect(play).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Chơi' })).toHaveLength(1);
    expect(document.querySelector('[data-game-panel]')).not.toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Chia đều' }));
    expect(screen.queryByRole('button', { name: 'Chơi' })).toBeNull();
    expect(document.querySelector('[data-game-panel]')).toBeNull();
  });

  it('phiên 1 người: chọn Game đãi hiện lý do «Cần ít nhất 2 thành viên» ngay tại nhánh', () => {
    const solo: Session = { ...session, id: 's-solo', members: [session.members[0]], expenses: [] };
    render(
      <SessionView
        session={solo}
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Game đãi' }));
    expect(screen.getByText('Cần ít nhất 2 thành viên để chơi game đãi.')).toBeTruthy();
    const play = screen.getByRole('button', { name: 'Chơi game đãi' });
    expect(play.getAttribute('aria-disabled')).toBe('true');
  });
});
