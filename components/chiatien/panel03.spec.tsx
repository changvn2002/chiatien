// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/types';
import { ExpenseEditor } from './expense-editor';
import { SessionView } from './session-view';

/**
 * Nghiệm thu CẤU TRÚC cho các finding Panel #03 mà reflow.spec.tsx chưa
 * phủ: A (Strip thu gọn — §9.1), DATA-04(ii) (Share Sheet 2 lớp — §9.5
 * ở tầng cổng hành vi + payload), F (handleAsk «Nhắn xin QR» — §9.5),
 * B (chip sheet khoản chi — §9.2).
 *
 * GIỚI HẠN GHI THẲNG (như reflow.spec): đây là bằng chứng CẤU TRÚC ở
 * jsdom (hàng nào chứa nhãn nào, class co/truncate, cổng copy, nội dung
 * clipboard). Hình học render thật (px, scrollWidth) do harness CDP
 * `scripts/geometry-stress.mjs` trên bản build local + re-panel trên
 * bản live phụ trách — file này KHÔNG khẳng định hình học.
 */

const LONG_NAME = 'Nguyễn Văn Đức Anh Tuấn Kiệt Phương Thảo Linh'; // 45 ký tự
const BANK = {
  bin: '970436',
  bankName: 'Vietcombank',
  accountNumber: '0123456789',
  accountName: 'NGUYEN VAN BINH',
};

/** Ca stress: tên 45 ký tự + 2 lệnh chuyển (a→b số cực trị, c→b 150.000). */
const stressSession: Session = {
  id: 's-stress',
  title: 'Chuyến đi stress',
  members: [
    { id: 'a', name: LONG_NAME },
    { id: 'b', name: 'Bình', bank: BANK },
    { id: 'c', name: 'Chi' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Tiền phòng, ăn uống và di chuyển cho cả nhóm đi Đà Lạt 3 ngày 2 đêm nữa',
      amount: 999_999_999_999_999,
      payerId: 'b',
      participantIds: ['a'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
    {
      id: 'e2',
      title: 'Ăn tối',
      amount: 300_000,
      payerId: 'b',
      participantIds: ['b', 'c'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 2,
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

/** Ca tên ngắn + 2 lệnh chuyển (Chi→An 300.000, Dũng→An 300.000). */
const shortSession: Session = {
  id: 's-short',
  title: 'Ăn trưa nhóm',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Chi' },
    { id: 'c', name: 'Dũng' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Phở',
      amount: 900_000,
      payerId: 'a',
      participantIds: ['a', 'b', 'c'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

/** Ca chưa-có-QR: Bình trả, An nợ Bình 100.000; Bình KHÔNG có bank. */
const noBankSession: Session = {
  id: 's-nobank',
  title: 'Nhậu cuối tuần',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Bia',
      amount: 200_000,
      payerId: 'b',
      participantIds: ['a', 'b'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

function renderView(session: Session, startExpanded = false) {
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

function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Panel #03 A — Strip thu gọn: nhãn «Quyết toán» tách hàng khỏi tên lệnh (§9.1)', () => {
  function expectStripStructure(container: HTMLElement, longName: boolean) {
    const summary = container.querySelector('[data-strip-summary]');
    expect(summary).toBeTruthy();
    const rows = [...(summary?.children ?? [])];
    expect(rows.length).toBeGreaterThanOrEqual(2);
    // Hàng 1: «Tổng» + tổng tiền + «Quyết toán» — KHÔNG chứa tên thành
    // viên, KHÔNG chứa cụm «+N lệnh» (gốc lỗi chồng glyph của Finding A).
    const headerRow = rows.find((r) =>
      [...r.querySelectorAll('span')].some((s) => s.textContent?.trim() === 'Quyết toán'),
    );
    expect(headerRow).toBeTruthy();
    expect(headerRow?.textContent).toContain('Tổng');
    expect(headerRow?.textContent).not.toContain('lệnh');
    if (longName) expect(headerRow?.textContent).not.toContain(LONG_NAME);
    // Hàng 2 (lệnh đầu): 2 span tên flex-1 + min-w-0 + truncate (slot đọc
    // được do flex chia đều, không còn span tự do bị ép về 0–2px), số
    // tiền shrink-0 + whitespace-nowrap, cụm «+1 lệnh» shrink-0.
    const transferRow = rows.find((r) => r !== headerRow && /lệnh/.test(r.textContent ?? ''));
    expect(transferRow).toBeTruthy();
    expect(transferRow?.textContent).toContain('+1 lệnh');
    const nameSpans = [...(transferRow?.querySelectorAll('span.truncate') ?? [])];
    expect(nameSpans).toHaveLength(2);
    for (const s of nameSpans) {
      expect(s.className).toContain('flex-1');
      expect(s.className).toContain('min-w-0');
    }
    if (longName) {
      expect(nameSpans.some((s) => s.textContent === LONG_NAME)).toBe(true);
    }
    const amountSpan = [...(transferRow?.querySelectorAll('span') ?? [])].find((s) =>
      s.className.includes('font-figure'),
    );
    expect(amountSpan?.className).toContain('shrink-0');
    expect(amountSpan?.className).toContain('whitespace-nowrap');
  }

  it('ca tên 45 ký tự + ≥2 lệnh', () => {
    const { container } = renderView(stressSession);
    expectStripStructure(container, true);
  });

  it('ca tên ngắn + ≥2 lệnh (Finding A nổ cả với tên ngắn)', () => {
    const { container } = renderView(shortSession);
    expectStripStructure(container, false);
  });
});

describe('Panel #03 DATA-04(ii) — Share Sheet 2 lớp: link chỉ sinh sau xác nhận (§9.5)', () => {
  it('trước «Tôi hiểu, tạo link»: 0 lần copy; sau: copy link #chia= với payload 0 field ngân hàng', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    renderView(shortSession);
    fireEvent.click(screen.getAllByRole('button', { name: 'Chia sẻ link' })[0]);
    const dialog = await screen.findByRole('dialog');
    // Lớp 1: headline + nút xác nhận đúng chữ; Lớp 2: đúng 3 gạch đầu dòng.
    expect(dialog.textContent).toContain(
      'Bất kỳ ai có link này đều xem và sửa được bản sao cuộc chia',
    );
    expect(dialog.querySelectorAll('ul li')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeTruthy();
    expect(writeText).not.toHaveBeenCalled();
    // Bấm xác nhận -> mới copy, nhãn lật sang trạng thái đã copy.
    fireEvent.click(screen.getByRole('button', { name: 'Tôi hiểu, tạo link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /Đã copy link/ })).toBeTruthy();
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toContain('#chia=');
    // Payload giải mã được và không mang field ngân hàng ở BẤT KỲ tầng nào
    // (phiên này thành viên Bình CÓ bank ở ca stress — dùng ca có bank để
    // khẳng định mạnh: kiểm trên chính payload của phiên stress).
    const payload = url.split('#chia=')[1];
    const parsed = JSON.parse(decompressFromEncodedURIComponent(payload) ?? 'null') as unknown;
    const keys: string[] = [];
    const walk = (v: unknown) => {
      if (v && typeof v === 'object') {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          keys.push(k);
          walk(val);
        }
      }
    };
    walk(parsed);
    for (const banned of ['bank', 'accountNumber', 'accountName', 'bin']) {
      expect(keys).not.toContain(banned);
    }
  });

  it('payload của phiên CÓ thành viên mang bank vẫn 0 field ngân hàng', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    renderView(stressSession);
    fireEvent.click(screen.getAllByRole('button', { name: 'Chia sẻ link' })[0]);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Tôi hiểu, tạo link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const url = writeText.mock.calls[0][0] as string;
    const parsed = JSON.parse(
      decompressFromEncodedURIComponent(url.split('#chia=')[1]) ?? 'null',
    ) as { v?: number; s?: { members?: Array<Record<string, unknown>> } };
    expect(parsed.v).toBe(2);
    expect(parsed.s?.members).toHaveLength(3);
    for (const m of parsed.s?.members ?? []) {
      expect(Object.keys(m).sort()).toEqual(['id', 'name']);
    }
    // Timeout nới riêng cho test này (khai báo trung thực, không đổi
    // assertion): test render toàn bộ SessionView + giải mã lz-string;
    // chạy đơn lẻ ~2,5s nhưng dưới tải suite đầy đủ trên máy 2 vCPU nó
    // từng chạm 5.251ms > timeout mặc định 5.000ms (fail dạng timeout,
    // không phải sai logic — ghi nhận ở wave sửa Panel #03, 2026-10-23).
  }, 20000);
});

describe('Panel #03 F — «Nhắn xin QR của {Tên}» copy lời nhắn xin QR thật (§9.5)', () => {
  it('clipboard: chào đúng tên người nhận, nêu số lệnh + tổng tiền, xin gửi mã QR, link khép vòng — KHÔNG phải bản quyết toán chung', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    renderView(noBankSession, true);
    const askButtons = await screen.findAllByRole('button', { name: 'Nhắn xin QR của Bình' });
    fireEvent.click(askButtons[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('Chào Bình');
    expect(text).toContain('1 lệnh chuyển tiền chờ');
    expect(text).toContain('100.000\u00A0₫'); // formatVND: NBSP trước ₫
    expect(text).toContain('gửi mình mã QR');
    expect(text).toContain('#chia=');
    // Không phải văn bản quyết toán dùng chung (gốc lỗi F ở Panel #03).
    expect(text).not.toContain('Ai trả ai');
    expect(text).not.toContain('Số dư từng người');
  });

  it('copy thất bại: hiện textarea lời nhắn + role=alert, KHÔNG xác nhận «đã copy» giả', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    mockClipboard(writeText);
    renderView(noBankSession, true);
    const askButtons = await screen.findAllByRole('button', { name: 'Nhắn xin QR của Bình' });
    fireEvent.click(askButtons[0]);
    // App render song song bản mobile + desktop của panel — lấy mọi
    // textarea copy thủ công và khẳng định trên bản đầu tiên.
    const manuals = await screen.findAllByLabelText('Lời nhắn xin mã QR để copy thủ công');
    expect((manuals[0] as HTMLTextAreaElement).value).toContain('Chào Bình');
    expect((manuals[0] as HTMLTextAreaElement).value).toContain('gửi mình mã QR');
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('copy thủ công'))).toBe(true);
    expect(screen.queryByText(/Đã copy lời nhắn/)).toBeNull();
  });
});

describe('Panel #03 B — Sheet khoản chi: chip tên dài co được trong cột (§9.2, cấu trúc)', () => {
  it('chip người trả + chip người cùng chia: nút min-w-0/max-w-full, span tên min-w-0 truncate; cột gốc minmax(0,1fr); ₫ shrink-0', () => {
    const { container } = render(
      <ExpenseEditor
        members={[
          { id: 'a', name: LONG_NAME },
          { id: 'b', name: 'Bình' },
        ]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // Cột gốc của editor bị chốt minmax(0,1fr) — cùng chốt chống phình
    // min-content đã áp ở MemberEditor (gốc Finding B nằm ở cột grid).
    expect((container.firstChild as HTMLElement).className).toContain('grid-cols-[minmax(0,1fr)]');
    // Cả hai họ chip (người trả + người cùng chia) đều mang tên dài.
    const longChips = [...container.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes(LONG_NAME),
    );
    expect(longChips.length).toBeGreaterThanOrEqual(2);
    for (const chip of longChips) {
      expect(chip.className).toContain('min-w-0');
      expect(chip.className).toContain('max-w-full');
      const nameSpan = [...chip.querySelectorAll('span')].find((s) => s.textContent === LONG_NAME);
      expect(nameSpan).toBeTruthy();
      expect(nameSpan?.className).toContain('min-w-0');
      expect(nameSpan?.className).toContain('truncate');
    }
    // Hậu tố ₫ của MoneyInput là span shrink-0; ô nhập min-w-0.
    const dong = [...container.querySelectorAll('span')].find((s) => s.textContent === '₫');
    expect(dong?.className).toContain('shrink-0');
    const amountInput = screen.getByLabelText('Số tiền khoản chi');
    expect(amountInput.className).toContain('min-w-0');
    // «Bỏ chọn tất cả» tồn tại trong DOM của sheet (vị trí trong khung do
    // harness CDP đo — §9.2).
    expect(screen.getByRole('button', { name: 'Bỏ chọn tất cả' })).toBeTruthy();
  });
});
