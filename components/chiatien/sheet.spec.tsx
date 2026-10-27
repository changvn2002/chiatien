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

describe('Sheet — phủ kín toàn viewport (Addendum §4, đảo ngược Finding E)', () => {
  // HỢP ĐỒNG MỚI (Fix Wave 2, Addendum §4): Finding E cũ giữ sheet dừng
  // ở đỉnh dock (--strip-h) làm dock rò sáng dưới mọi sheet. Addendum
  // đảo ngược: lớp phủ là inset-0 phủ kín cả dock như GameSheet.
  it('lớp phủ là inset-0 phủ kín viewport, không còn neo đáy var(--strip-h)', () => {
    render(<SheetHarness />);
    const opener = screen.getByRole('button', { name: 'Mở sheet kiểm focus' });
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    const wrap = dialog.parentElement as HTMLElement;
    expect(wrap.className).toContain('inset-0');
    expect(wrap.style.bottom).toBe('');
  });

  it('vùng nội dung có đệm đáy max(1.25rem, env(safe-area-inset-bottom))', () => {
    render(<SheetHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở sheet kiểm focus' }));
    const dialog = screen.getByRole('dialog');
    const content = dialog.lastElementChild as HTMLElement;
    expect(content.className).toContain('pb-[max(1.25rem,env(safe-area-inset-bottom))]');
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
    // HỢP ĐỒNG MỚI (REDESIGN-V3 C4): panel giữ mount 125ms cho exit
    // animation --ease-leave rồi mới rời DOM — khẳng định «đã đóng»
    // chuyển từ đồng bộ sang waitFor; trả focus vẫn ngay tại đóng.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
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
    // HỢP ĐỒNG MỚI (REDESIGN-V3 C4): như trên — exit 125ms giữ mount.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  // HỢP ĐỒNG MỚI (Panel #04 MINOR, khai báo thay đổi test): ConfirmDialog
  // nay là role="alertdialog" (trước đây test này khoá role="dialog").
  // Hành vi Esc + trả focus giữ nguyên; chỉ role truy vấn đổi theo
  // hợp đồng ngữ nghĩa mới. Test Sheet thường ở trên giữ nguyên 'dialog'.
  it('ConfirmDialog: Esc huỷ dialog và document.activeElement trở về nút đã mở', async () => {
    render(<ConfirmHarness />);
    const opener = screen.getByRole('button', { name: 'Mở confirm kiểm focus' });
    opener.focus();
    expect(document.activeElement).toBe(opener);
    fireEvent.click(opener);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    // HỢP ĐỒNG MỚI (REDESIGN-V3 C4): như trên — exit 125ms giữ mount.
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

describe('ConfirmDialog — ngữ nghĩa alertdialog (Panel #04 MINOR)', () => {
  it('role=alertdialog + aria-describedby trỏ đúng đoạn message hệ quả; tên = câu hỏi xác nhận', () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở confirm kiểm focus' }));
    const dialog = screen.getByRole('alertdialog');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Xoá mục kiểm focus?');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const messageEl = document.getElementById(describedBy!);
    expect(messageEl).toBeTruthy();
    expect(messageEl!.tagName).toBe('P');
    expect(messageEl!.textContent).toContain('Hộp thoại xác nhận dùng để đo focus sau Esc.');
  });

  it('Sheet thường giữ role=dialog và không mang aria-describedby khi không truyền', () => {
    render(<SheetHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở sheet kiểm focus' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-describedby')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
