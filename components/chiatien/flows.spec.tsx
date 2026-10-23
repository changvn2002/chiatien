// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member, Session } from '@/lib/types';
import Page from '../../app/page';
import { ExpenseEditor } from './expense-editor';
import { MemberEditor } from './member-editor';
import { SessionList } from './session-list';

/**
 * Component test cho các flow lõi (CQ-06): tạo cuộc chia từ màn danh
 * sách, lưu thành viên có ngân hàng, lưu khoản chi chia đều, danh sách
 * cuộc chia có dữ liệu. Không mock component — render cây thật.
 *
 * REDESIGN-V2: luồng không còn wizard/bước — tạo xong vào thẳng Màn B
 * (AppBar + Member Strip + Ledger + Strip); tên cuộc chia là H1 chạm-để-
 * sửa (không còn input thường trực như bản wizard).
 */
const members: Member[] = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
];

const sampleSession: Session = {
  id: 's1',
  title: 'Đi Đà Lạt',
  members,
  expenses: [
    {
      id: 'e1',
      title: 'Tiền phòng',
      amount: 600000,
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

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('flow lõi ở tầng component', () => {
  it('ChiaTienApp (qua app/page): mở app trống -> tạo cuộc chia mới -> vào Màn B một màn hình và dữ liệu đã ghi vào localStorage', () => {
    render(<Page />);
    expect(screen.getByText('Chưa có cuộc chia nào')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tạo cuộc chia mới'), {
      target: { value: 'Nhậu cuối tuần' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo cuộc chia' }));
    // Vào thẳng cuộc chia vừa tạo: H1 là tên cuộc chia, KHÔNG còn stepper/bước.
    expect(screen.getByRole('heading', { name: 'Nhậu cuối tuần' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: /Các bước/ })).toBeNull();
    // Trạng thái rỗng 0 người: hành động "+ Thêm người" ở ledger
    // (jsdom không áp CSS ẩn theo breakpoint nên bản desktop cũng có mặt).
    expect(screen.getAllByRole('button', { name: /Thêm người/ }).length).toBeGreaterThan(0);
    const raw = window.localStorage.getItem('chiatien:sessions:v1') ?? '';
    expect(raw).toContain('Nhậu cuối tuần');
    expect(raw).toContain('"schemaVersion":1');
  });

  it('SessionList có dữ liệu: hiện cuộc chia gần nhất + tổng chi, bấm mở gọi onOpen', () => {
    const onOpen = vi.fn();
    render(
      <SessionList
        sessions={[sampleSession]}
        onCreate={vi.fn()}
        onOpen={onOpen}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Đi Đà Lạt').length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain('600.000');
    fireEvent.click(screen.getAllByRole('button', { name: /Đi Đà Lạt/ })[0]);
    expect(onOpen).toHaveBeenCalledWith('s1');
  });

  it('MemberEditor: chưa nhập tên -> nút Lưu disabled kèm dòng lý do ngay từ lúc mở (mẫu D-5/§9.8 — Panel #03 MINOR R3-F4; trước đây lỗi chỉ hiện khi bấm Lưu); nhập đủ tên + tài khoản -> onSave nhận bank đã chuẩn hoá', () => {
    const onSave = vi.fn();
    render(<MemberEditor onSave={onSave} onCancel={vi.fn()} />);
    // Chưa nhập tên: lý do hiện sẵn cạnh nút + nút ở trạng thái
    // aria-disabled; bấm không lưu được gì (onClick bị gỡ ở PrimaryButton).
    expect(screen.getByText('Nhập tên thành viên để lưu')).toBeTruthy();
    const saveButton = screen.getByRole('button', { name: /Lưu thành viên/ });
    expect(saveButton.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(saveButton);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Tên thành viên'), { target: { value: 'Chi' } });
    fireEvent.click(screen.getByLabelText(/Lưu tài khoản trên máy này/));
    fireEvent.change(screen.getByLabelText('Số tài khoản'), {
      target: { value: '0123 456 789' },
    });
    fireEvent.change(screen.getByLabelText('Tên chủ tài khoản'), {
      target: { value: 'nguyen thi chi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thành viên/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const draft = onSave.mock.calls[0][0] as { name: string; bank?: { accountNumber: string } };
    expect(draft.name).toBe('Chi');
    expect(draft.bank?.accountNumber).toBe('0123456789');
  });

  it('MemberEditor (M-3): số tài khoản rác "abc" bị chặn — lỗi định dạng tại trường, onSave KHÔNG được gọi', () => {
    const onSave = vi.fn();
    render(<MemberEditor onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Tên thành viên'), { target: { value: 'Chi' } });
    fireEvent.click(screen.getByLabelText(/Lưu tài khoản trên máy này/));
    fireEvent.change(screen.getByLabelText('Số tài khoản'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Tên chủ tài khoản'), {
      target: { value: 'NGUYEN THI CHI' },
    });
    // Lỗi tại trường hiện ngay khi giá trị không hợp lệ (và nút Lưu ở
    // trạng thái disabled-có-lý-do nên click không lưu được gì).
    expect(screen.getByRole('alert').textContent).toContain('quá ngắn');
    fireEvent.click(screen.getByRole('button', { name: /Lưu thành viên/ }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('MemberEditor (D-3): tên trùng sau chuẩn hoá -> lỗi tại trường nguyên văn + đường mở thành viên đã có', () => {
    const onSave = vi.fn();
    const onOpenExisting = vi.fn();
    render(
      <MemberEditor
        members={members}
        onSave={onSave}
        onOpenExisting={onOpenExisting}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Tên thành viên'), { target: { value: ' an ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thành viên/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain(
      'Đã có thành viên tên “An” trong cuộc chia này.',
    );
    fireEvent.click(screen.getByRole('button', { name: /Mở thành viên “An” để sửa/ }));
    expect(onOpenExisting).toHaveBeenCalledWith(members[0]);
  });

  it('MemberEditor (D-6): nhập "Lan, Hùng, Mai" -> xem trước tại chỗ + nút "Thêm 3 người" gọi onSaveBulk', () => {
    const onSave = vi.fn();
    const onSaveBulk = vi.fn();
    render(
      <MemberEditor members={members} onSave={onSave} onSaveBulk={onSaveBulk} onCancel={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Tên thành viên'), {
      target: { value: 'Lan, Hùng, Mai' },
    });
    expect(screen.getByText(/Sẽ thêm 3 người: Lan · Hùng · Mai/)).toBeTruthy();
    // Chế độ bulk KHÔNG hiện khối ngân hàng.
    expect(screen.queryByLabelText(/Lưu tài khoản trên máy này/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm 3 người' }));
    expect(onSaveBulk).toHaveBeenCalledWith(['Lan', 'Hùng', 'Mai']);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('ExpenseEditor: điền khoản chia đều hợp lệ -> onSave nhận đúng draft', () => {
    const onSave = vi.fn();
    render(<ExpenseEditor members={members} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Khoản chi'), { target: { value: 'Ăn tối' } });
    fireEvent.change(screen.getByLabelText('Số tiền khoản chi'), { target: { value: '200000' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm khoản chi/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const draft = onSave.mock.calls[0][0] as {
      title: string;
      amount: number;
      payerId: string;
      participantIds: string[];
      mode: string;
    };
    expect(draft.title).toBe('Ăn tối');
    expect(draft.amount).toBe(200000);
    expect(draft.payerId).toBe('a');
    expect(draft.participantIds).toEqual(['a', 'b']);
    expect(draft.mode).toBe('equal');
  });

  it('ExpenseEditor: nút Lưu disabled-có-lý-do NGAY từ trạng thái mở đầu (R3-10)', () => {
    render(<ExpenseEditor members={members} onSave={vi.fn()} onCancel={vi.fn()} />);
    const saveButton = screen.getByRole('button', { name: /Thêm khoản chi/ });
    expect(saveButton.getAttribute('aria-disabled')).toBe('true');
    expect(document.body.textContent).toContain('Nhập số tiền để lưu khoản chi');
  });

  it('ExpenseEditor (M-4): dán số tiền vượt trần UI bị chặn — giữ giá trị cũ + câu trần tại trường', () => {
    const onSave = vi.fn();
    render(<ExpenseEditor members={members} onSave={onSave} onCancel={vi.fn()} />);
    const amountInput = screen.getByLabelText('Số tiền khoản chi');
    fireEvent.change(amountInput, { target: { value: '200000' } });
    fireEvent.change(amountInput, { target: { value: '999999999999999' } });
    expect(document.body.textContent).toContain(
      'Số tiền tối đa cho một khoản là 999.999.999.999 ₫.',
    );
    fireEvent.change(screen.getByLabelText('Khoản chi'), { target: { value: 'Ăn tối' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm khoản chi/ }));
    const draft = onSave.mock.calls[0][0] as { amount: number };
    expect(draft.amount).toBe(200000);
  });
});
