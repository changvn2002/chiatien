// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/types';
import { buildVietQrPayload } from '@/lib/vietqr';
import type { GameSessionInput } from '@/game/adapter';
import { GamePanelScreen } from '@/game/screens/panel-screen';
import { EMPTY_QR_DRAFT, type GameDraft } from '@/game/state';
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

describe('Pha 1 — Dock tóm tắt 1 dòng + panel quyết toán DUY NHẤT (SPEC Q5/D1 thay Strip thu/mở)', () => {
  // THAY ĐỔI THEO SPEC Pha 1: Strip thu/mở + aside desktop (2 cây DOM
  // cùng render SettlementPanel) đã chết. Nay: dock chỉ còn 1 dòng
  // tóm tắt «Còn N lệnh chưa trả · X đ» và panel render ĐÚNG 1 lần
  // trong DOM ở mọi bề rộng. Hai test cũ khoá cấu trúc strip được
  // thay bằng khẳng định hợp đồng mới dưới đây.
  function expectDockStructure(container: HTMLElement, longName: boolean) {
    const summary = container.querySelector('[data-dock-summary]');
    expect(summary).toBeTruthy();
    expect(summary?.textContent).toContain('Còn 2 lệnh chưa trả');
    expect(summary?.textContent).not.toContain('Quyết toán');
    if (longName) expect(summary?.textContent).not.toContain(LONG_NAME);
    // 1 nguồn render: mỗi lệnh chuyển đúng 1 hàng trong toàn DOM.
    expect(container.querySelectorAll('[data-transfer-row]')).toHaveLength(2);
  }

  it('ca tên 45 ký tự + ≥2 lệnh', () => {
    const { container } = renderView(stressSession);
    expectDockStructure(container, true);
  });

  it('ca tên ngắn + ≥2 lệnh', () => {
    const { container } = renderView(shortSession);
    expectDockStructure(container, false);
  });
});

describe('Pha 1 — Sheet 4 Chia sẻ (SPEC §2): link + Sao chép link, payload 0 field ngân hàng (DATA-04 giữ)', () => {
  // THAY ĐỔI THEO SPEC Sheet 4: sheet chia sẻ 2 lớp xác nhận
  // («Tôi hiểu, tạo link») đã gỡ (AP-02: cấm xác nhận chồng). Sheet 4
  // hiện link ngay + nút «Sao chép link» copy ĐÚNG link. Bất biến
  // DATA-04 ở tầng payload giữ nguyên và vẫn khẳng định ở đây.
  async function openShareSheet() {
    fireEvent.click(screen.getByRole('button', { name: 'Hành động của cuộc chia' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chia sẻ' }));
    return screen.findByLabelText('Link chia sẻ phiên') as Promise<HTMLTextAreaElement>;
  }

  it('«Sao chép link» copy link #chia= với payload 0 field ngân hàng ở mọi tầng', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    renderView(shortSession);
    const linkBox = await openShareSheet();
    expect(linkBox.value).toContain('#chia=');
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /Đã copy link/ })).toBeTruthy();
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toBe(linkBox.value);
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
    const linkBox = await openShareSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const url = writeText.mock.calls[0][0] as string;
    expect(url).toBe(linkBox.value);
    const parsed = JSON.parse(
      decompressFromEncodedURIComponent(url.split('#chia=')[1]) ?? 'null',
    ) as { v?: number; s?: { members?: Array<Record<string, unknown>> } };
    expect(parsed.v).toBe(2);
    expect(parsed.s?.members).toHaveLength(3);
    for (const m of parsed.s?.members ?? []) {
      expect(Object.keys(m).sort()).toEqual(['id', 'name']);
    }
  }, 20000);
});

describe('Pha 1 — D11: khối thiếu-QR gom thành 1 danh sách gọn (tên + 1 nút/người)', () => {
  // THAY ĐỔI THEO SPEC D11 + Sheet 3/4: nút «Nhắn xin QR» (copy lời
  // nhắn) và khối lặp theo người nhận đã CẮT. Panel nay chỉ còn một
  // danh sách gọn «Chưa có QR trên máy này»: mỗi người nhận thiếu QR
  // đúng 1 hàng + 1 nút «Nhập tài khoản» mở Sheet 2 đúng người đó.
  it('Bình thiếu QR: đúng 1 hàng trong danh sách gọn, 0 nút «Nhắn xin QR» trong DOM', () => {
    renderView(noBankSession, true);
    expect(screen.queryByRole('button', { name: /Nhắn xin QR/ })).toBeNull();
    const importButtons = screen.getAllByRole('button', { name: 'Nhập tài khoản' });
    // Panel render 1 lần duy nhất -> đúng 1 nút cho 1 người nhận.
    expect(importButtons).toHaveLength(1);
    expect(document.body.textContent).toContain('Chưa có QR trên máy này');
    expect(document.body.textContent).toContain('1 lệnh · 100.000');
  });

  it('bấm «Nhập tài khoản» mở Sheet Người của đúng Bình với disclosure tài khoản mở sẵn', async () => {
    renderView(noBankSession, true);
    fireEvent.click(screen.getByRole('button', { name: 'Nhập tài khoản' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Sửa thành viên');
    // Disclosure tài khoản mở sẵn (autoEnableBank) -> ô số tài khoản có mặt.
    expect(screen.getByLabelText('Số tài khoản')).toBeTruthy();
    const nameInput = screen.getByLabelText('Tên thành viên') as HTMLInputElement;
    expect(nameInput.value).toBe('Bình');
  });
});

describe('Fix Wave 2 B2 — QR panel: chọn «Người đưa QR» trước, người đưa bị chặn tự đối chiếu (Addendum §2)', () => {
  // Payload QR THẬT do chính hàm dựng của lib sinh (CRC hợp lệ, số
  // tiền 400.000 khớp tổng ván của harness) — bơm vào panel qua ô dán
  // của QrCaptureBlock như người dùng dán nội dung QR.
  const QR_TOTAL = 400_000;
  const payload = buildVietQrPayload(BANK, QR_TOTAL, 'An chuyen tien');
  const input: GameSessionInput = {
    members: [
      { id: 'a', displayName: 'An' },
      { id: 'b', displayName: 'Bình' },
      { id: 'c', displayName: 'Chi' },
    ],
    equalShareByMemberId: { a: 133_334, b: 133_333, c: 133_333 },
    sessionTotalVnd: QR_TOTAL,
    sessionTitle: 'Nhậu cuối tuần',
  };

  function PanelHarness() {
    const [draft, setDraft] = useState<GameDraft>({
      totalVnd: QR_TOTAL,
      qr: { ...EMPTY_QR_DRAFT },
      selectedPlayerIds: ['a', 'b', 'c'],
      game: 'g2',
      characterSetId: null,
      characterAssignments: {},
      replayOf: null,
    });
    return (
      <>
        <GamePanelScreen
          input={input}
          draft={draft}
          onDraft={setDraft}
          onStart={vi.fn()}
          onSplitEven={vi.fn()}
          photos={new Map()}
          onPhotosChanged={vi.fn()}
        />
        <div data-testid="qr-state">
          {JSON.stringify({ providerId: draft.qr.providerId, confirmerId: draft.qr.confirmerId })}
        </div>
      </>
    );
  }

  function qrState(container: HTMLElement) {
    return JSON.parse(container.querySelector('[data-testid="qr-state"]')?.textContent ?? '{}') as {
      providerId: string | null;
      confirmerId: string | null;
    };
  }

  function verifyButtons(container: HTMLElement) {
    return [...(container.querySelector('#panel-qr-verify')?.querySelectorAll('button') ?? [])];
  }

  it('(i) chưa chọn người đưa QR → không đối chiếu được; (ii) người đưa bị chặn; (iii) người khác đối chiếu được → QR usable', async () => {
    const { container } = render(<PanelHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm QR' }));
    fireEvent.change(screen.getByLabelText('Hoặc dán nội dung QR'), { target: { value: payload } });
    fireEvent.click(screen.getByRole('button', { name: 'Dùng nội dung này' }));
    await screen.findByText(/Người đưa QR — người đã chụp hoặc chia sẻ mã này:/);

    // (i) Chưa chọn người đưa: chỉ có 3 chip người đưa, KHÔNG có chip
    // đối chiếu; có câu gợi ý + dòng F-06 (QR chưa đối chiếu → không dùng).
    expect(screen.getByText(/Chọn người đưa QR trước/)).toBeTruthy();
    expect(verifyButtons(container)).toHaveLength(3);
    expect(screen.getByText(/QR chưa được đối chiếu nên ván này không dùng QR/)).toBeTruthy();
    expect(qrState(container)).toEqual({ providerId: null, confirmerId: null });

    // Chọn An là người đưa QR.
    fireEvent.click(verifyButtons(container)[0]);
    expect(qrState(container).providerId).toBe('a');
    // Hàng đối chiếu mở: 3 chip người đưa + 3 chip đối chiếu.
    const buttons = verifyButtons(container);
    expect(buttons).toHaveLength(6);

    // (ii) Chip đối chiếu của An (người đưa) bị chặn: aria-disabled +
    // bấm không ghi confirmer.
    const anConfirmer = buttons[3];
    expect(anConfirmer.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(anConfirmer);
    expect(qrState(container).confirmerId).toBeNull();

    // (iii) Bình đối chiếu được → confirmerId = Bình, dòng F-06 biến mất.
    fireEvent.click(verifyButtons(container)[4]);
    expect(qrState(container)).toEqual({ providerId: 'a', confirmerId: 'b' });
    expect(screen.getByText(/Đã đối chiếu/)).toBeTruthy();
    expect(screen.queryByText(/QR chưa được đối chiếu nên ván này không dùng QR/)).toBeNull();
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
