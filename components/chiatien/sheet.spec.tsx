// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfirmDialog, Sheet } from './sheet';

/**
 * Nghiệm thu D-7 (Panel-02) ở tầng jsdom: đóng Sheet / ConfirmDialog bằng
 * Esc phải TRẢ focus về đúng phần tử đã mở (bản live cũ để focus rơi về
 * BODY). jsdom đo được document.activeElement — đợt audit trước đã kiểm
 * chứng harness này (Sheet trả focus bằng requestAnimationFrame sau khi
 * panel unmount, nên assertion dùng waitFor thay vì đọc đồng bộ).
 */

function SheetHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Mở sheet kiểm focus
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Sheet kiểm focus">
        <p>Nội dung sheet</p>
        <input aria-label="Ô nhập trong sheet" />
      </Sheet>
    </div>
  );
}

function ConfirmHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Mở confirm kiểm focus
      </button>
      <ConfirmDialog
        open={open}
        title="Xoá mục kiểm focus?"
        message="Hộp thoại xác nhận dùng để đo focus sau Esc."
        confirmLabel="Xoá mục"
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </div>
  );
}

function SwapOpenerHarness() {
  const [open, setOpen] = useState(false);
  const [gen, setGen] = useState(1);
  return (
    <div>
      <button
        key={gen}
        type="button"
        onClick={() => {
          setOpen(true);
          setGen(2);
        }}
      >
        Mở sheet thay node
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Sheet thay node">
        <p>Nội dung sheet</p>
      </Sheet>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe('Sheet — neo đáy theo --strip-h (Panel #03 Finding E)', () => {
  it('lớp phủ dừng ở var(--strip-h, 0px) thay vì inset-0 phủ kín', () => {
    render(<SheetHarness />);
    const opener = screen.getByRole('button', { name: 'Mở sheet kiểm focus' });
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    const wrap = dialog.parentElement as HTMLElement;
    expect(wrap.style.bottom).toBe('var(--strip-h, 0px)');
    expect(wrap.className).toContain('inset-x-0');
    expect(wrap.className).not.toContain('inset-0');
  });
});

describe('Sheet — trả focus khi opener bị thay node (Panel #03 Finding G)', () => {
  it('opener bị React thay node giữa phiên mở: Esc trả focus về NODE THAY THẾ cùng chữ', async () => {
    render(<SwapOpenerHarness />);
    const gen1 = screen.getByRole('button', { name: 'Mở sheet thay node' });
    gen1.focus();
    fireEvent.focusIn(gen1);
    fireEvent.click(gen1);
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Node thế hệ 1 đã rời document sau commit mở (key đổi).
    expect(gen1.isConnected).toBe(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => {
      const ae = document.activeElement as HTMLElement;
      expect(ae).not.toBe(document.body);
      expect(ae.textContent).toContain('Mở sheet thay node');
      expect(ae.isConnected).toBe(true);
    });
  });
});

describe('Sheet / ConfirmDialog — trả focus sau Esc (D-7)', () => {
  it('Sheet: Esc đóng sheet và document.activeElement trở về nút đã mở', async () => {
    render(<SheetHarness />);
    const opener = screen.getByRole('button', { name: 'Mở sheet kiểm focus' });
    opener.focus();
    expect(document.activeElement).toBe(opener);
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('ConfirmDialog: Esc huỷ dialog và document.activeElement trở về nút đã mở', async () => {
    render(<ConfirmHarness />);
    const opener = screen.getByRole('button', { name: 'Mở confirm kiểm focus' });
    opener.focus();
    expect(document.activeElement).toBe(opener);
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
