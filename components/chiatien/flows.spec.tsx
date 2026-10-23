// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member, Session } from '@/lib/types';
import Page from '../../app/page';
import { ExpenseEditor } from './expense-editor';
import { MemberEditor } from './member-editor';
import { SessionList } from './session-list';

/**
 * Component test cho các flow lõi còn lại (CQ-06: phủ đủ để toàn repo đạt
 * ngưỡng coverage, đồng thời khoá hành vi thật): tạo cuộc chia từ màn
 * danh sách, lưu thành viên có ngân hàng, lưu khoản chi chia đều, danh
 * sách cuộc chia có dữ liệu. Không mock component — render cây thật.
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
  it('ChiaTienApp (qua app/page): mở app trống -> tạo cuộc chia mới -> vào bước Thành viên và dữ liệu đã ghi vào localStorage', () => {
    render(<Page />);
    expect(screen.getByText('Chưa có cuộc chia nào')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tạo cuộc chia mới'), {
      target: { value: 'Nhậu cuối tuần' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo cuộc chia' }));
    // Vào thẳng cuộc chia vừa tạo, bước 1 Thành viên.
    expect(screen.getByDisplayValue('Nhậu cuối tuần')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Thêm người/ })).toBeTruthy();
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

  it('MemberEditor: chưa nhập tên -> báo lỗi; nhập đủ tên + tài khoản -> onSave nhận bank đã chuẩn hoá', () => {
    const onSave = vi.fn();
    render(<MemberEditor onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Lưu thành viên/ }));
    expect(screen.getByRole('alert').textContent).toContain('Chưa nhập tên');
    fireEvent.change(screen.getByLabelText('Tên thành viên'), { target: { value: 'Chi' } });
    fireEvent.click(screen.getByLabelText(/Lưu tài khoản ngân hàng/));
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

  it('MemberEditor (M-3): số tài khoản rác "abc" bị chặn tại điểm lưu — báo lỗi định dạng, onSave KHÔNG được gọi', () => {
    const onSave = vi.fn();
    render(<MemberEditor onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Tên thành viên'), { target: { value: 'Chi' } });
    fireEvent.click(screen.getByLabelText(/Lưu tài khoản ngân hàng/));
    fireEvent.change(screen.getByLabelText('Số tài khoản'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Tên chủ tài khoản'), {
      target: { value: 'NGUYEN THI CHI' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thành viên/ }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('quá ngắn');
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
});
