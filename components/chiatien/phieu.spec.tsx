// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeSessionShare } from '@/lib/share';
import { computeBalances } from '@/lib/split';
import { buildSettlementText, simplifyDebts } from '@/lib/settle';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/site';
import type { Session } from '@/lib/types';
import Page from '../../app/page';
import {
  BANNED_WORDS,
  buildSummaryShareText,
  loadSeal,
  sealLabel,
  sealSession,
  titleForcesStatic,
  type SealMark,
} from './phieu';
import { RecipientLayer1 } from './recipient-layer1';
import { SessionView } from './session-view';

/**
 * Nghiệm thu đợt PHIẾU GẤP (spec v2.1 §9 a–f + Test Tắt Game):
 * dataset chuẩn của brief — phiên «Nhậu cuối tuần»:
 *   Ăn tối 800.000 (An trả, đều 4) · Tiền rượu 300.000 (Bình trả, tuỳ
 *   chỉnh) · Taxi 160.000 (Dũng trả, đều 4); tổng 1.260.000 ₫;
 *   quyết toán Chi→An 240.000 · Dũng→An 180.000 · Bình→An 40.000.
 * Phần tuỳ chỉnh của Tiền rượu được giải từ hệ số dư đích: An +460.000 /
 * Bình -40.000 / Chi -240.000 / Dũng -180.000 -> tuỳ chỉnh = An 100.000 ·
 * Bình 100.000 · Chi 0 · Dũng 100.000 (tổng đúng 300.000). Test đầu tiên
 * của file này khẳng định engine cho đúng các số đó.
 */

export const standardSession: Session = {
  id: 's-standard',
  title: 'Nhậu cuối tuần',
  members: [
    {
      id: 'an',
      name: 'An',
      bank: {
        bin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountName: 'NGUYEN VAN AN',
      },
    },
    { id: 'binh', name: 'Bình' },
    { id: 'chi', name: 'Chi' },
    { id: 'dung', name: 'Dũng' },
  ],
  expenses: [
    {
      id: 'e1',
      title: 'Ăn tối',
      amount: 800_000,
      payerId: 'an',
      participantIds: ['an', 'binh', 'chi', 'dung'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 1,
    },
    {
      id: 'e2',
      title: 'Tiền rượu',
      amount: 300_000,
      payerId: 'binh',
      participantIds: ['an', 'binh', 'chi', 'dung'],
      mode: 'custom',
      custom: { an: 100_000, binh: 100_000, chi: 0, dung: 100_000 },
      weights: {},
      createdAt: 2,
    },
    {
      id: 'e3',
      title: 'Taxi',
      amount: 160_000,
      payerId: 'dung',
      participantIds: ['an', 'binh', 'chi', 'dung'],
      mode: 'equal',
      custom: {},
      weights: {},
      createdAt: 3,
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

const SEAL: SealMark = {
  version: 2,
  sealedAt: new Date(2026, 9, 24, 20, 42).getTime(),
  contentKey: 'fixture',
};

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('dataset chuẩn — engine khớp brief từng đồng', () => {
  it('tổng 1.260.000; quyết toán đúng 3 lệnh Chi→An 240.000 · Dũng→An 180.000 · Bình→An 40.000', () => {
    const balances = computeBalances(standardSession);
    expect(standardSession.expenses.reduce((s, e) => s + e.amount, 0)).toBe(1_260_000);
    expect(simplifyDebts(balances)).toEqual([
      { fromId: 'chi', toId: 'an', amount: 240_000 },
      { fromId: 'dung', toId: 'an', amount: 180_000 },
      { fromId: 'binh', toId: 'an', amount: 40_000 },
    ]);
  });
});

describe('Test Tắt Game — nghiệm thu số 1', () => {
  it('payload share schema v2 byte-identical khi lớp phiếu chưa từng bật; lib không đổi đầu ra', () => {
    // Corpus golden: payload của dataset chuẩn chụp từ encode hiện hành
    // của lib/share (v2) — lớp phiếu không tham gia vào đường này.
    const code = encodeSessionShare(standardSession);
    const json = decompressFromEncodedURIComponent(code);
    expect(json).toBeTruthy();
    const payload = JSON.parse(json!) as { v: number; s: Session };
    expect(payload.v).toBe(2);
    // Không một khoá nào của lớp phiếu lọt vào payload.
    expect(json).not.toContain('phieu');
    expect(json).not.toContain('seal');
    expect(json).not.toContain('bản');
    for (const m of payload.s.members) {
      expect(Object.keys(m).sort()).toEqual(['id', 'name']);
    }
    // Bảng đầy đủ (buildSettlementText của lib) vẫn nguyên từng dòng lệnh.
    const balances = computeBalances(standardSession);
    const text = buildSettlementText(standardSession, balances, simplifyDebts(balances));
    expect(text).toContain('1. Chi → An: 240.000');
    expect(text).toContain('2. Dũng → An: 180.000');
    expect(text).toContain('3. Bình → An: 40.000');
  });

  it('SessionView KHÔNG bật phiếu: không thẻ hoàn tất, không phiếu nào trong DOM sau copy', async () => {
    const writeText = mockClipboard();
    render(
      <SessionView
        session={standardSession}
        startExpanded
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: /Copy tóm tắt/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(document.querySelector('[data-completion-card]')).toBeNull();
    expect(document.querySelector('[data-slip]')).toBeNull();
  });
});

describe('§9(e) — copy text mặc định KHÔNG chứa mũi tên/số cá nhân — CẢ HAI chế độ', () => {
  const PERSONAL = ['240.000', '180.000', '40.000', '→', 'Chi →', 'Bình →', 'Dũng →'];

  function expectSummaryOnly(text: string) {
    for (const p of PERSONAL) expect(text).not.toContain(p);
    expect(text).toContain('Chia Tiền — phiên “Nhậu cuối tuần”');
    expect(text).toContain('Tổng 1.260.000');
    expect(text).toContain('3 lần chuyển');
    expect(text).toContain('Mở link để xem phần của bạn và mã QR.');
    expect(text).toContain('bản 1');
    expect(text).toContain('#chia=');
  }

  it('chế độ TĨNH (phiếu tắt): copy mặc định = tóm tắt; share link = tóm tắt + link', async () => {
    const writeText = mockClipboard();
    render(
      <SessionView
        session={standardSession}
        startExpanded
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: /Copy tóm tắt/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expectSummaryOnly(writeText.mock.calls[0][0] as string);

    // Đường chia sẻ link (Share Sheet -> «Tôi hiểu, tạo link»).
    fireEvent.click(screen.getAllByRole('button', { name: 'Chia sẻ link' })[0]);
    const dialog = await screen.findByRole('dialog');
    const confirm = [...dialog.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tôi hiểu, tạo link'),
    );
    fireEvent.click(confirm!);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expectSummaryOnly(writeText.mock.calls[1][0] as string);
  });

  it('chế độ PHIẾU BẬT: copy mặc định vẫn là cùng mẫu tóm tắt', async () => {
    const writeText = mockClipboard();
    render(
      <SessionView
        session={standardSession}
        startExpanded
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    // Bật qua Session Action Sheet: nút mở sheet là nút ở AppBar của phiên.
    const actionsBtn = screen.getAllByRole('button', { name: /Cuộc chia này|hành động/i })[0];
    if (actionsBtn) fireEvent.click(actionsBtn);
    const toggle = await screen.findByRole('switch', { name: /Đóng phiếu khi chốt/ });
    fireEvent.click(toggle);
    fireEvent.click(screen.getAllByRole('button', { name: /Copy tóm tắt/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expectSummaryOnly(writeText.mock.calls[0][0] as string);
    // Và thẻ hoàn tất hiện phiếu đóng của cả 4 thành viên (panel render
    // song song bản mobile + desktop như mọi bề mặt cũ — đếm trong
    // MỘT thẻ hoàn tất).
    await waitFor(() => expect(document.querySelector('[data-completion-card]')).toBeTruthy());
    const firstCard = document.querySelector('[data-completion-card]');
    expect(firstCard?.querySelectorAll('[data-slip]')).toHaveLength(4);
  });

  it('buildSummaryShareText thuần: đúng mẫu §4 với dấu bản cho trước', () => {
    const balances = computeBalances(standardSession);
    const text = buildSummaryShareText(
      standardSession,
      simplifyDebts(balances),
      SEAL,
      'https://example.test/#chia=abc',
    );
    expect(text).toBe(
      'Chia Tiền — phiên “Nhậu cuối tuần”: Tổng 1.260.000\u00A0₫ · 3 lần chuyển. Mở link để xem phần của bạn và mã QR. (Chốt lúc 20:42 · bản 2)\nhttps://example.test/#chia=abc',
    );
  });

  it('copy chi tiết đầy đủ CHỈ qua hành động tường minh trong Action Sheet', async () => {
    const writeText = mockClipboard();
    render(
      <SessionView
        session={standardSession}
        startExpanded
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    const actionsBtn = screen.getAllByRole('button', { name: /Cuộc chia này|hành động/i })[0];
    if (actionsBtn) fireEvent.click(actionsBtn);
    const detailed = await screen.findByRole('button', { name: 'Sao chép chi tiết đầy đủ' });
    fireEvent.click(detailed);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('Chi → An: 240.000');
    expect(text).toContain('Bình → An: 40.000');
  });
});

describe('§9(a)(b)(d) — lớp 1 người nhận', () => {
  it('(a) lớp 1: tóm tắt trung tính + dấu bản + đủ phiếu MỌI thành viên (kể cả số dư 0)', () => {
    // Thêm thành viên số dư 0: trả đúng phần của mình (trả 100.000 cho
    // một khoản chỉ mình chịu) -> số dư 0, vẫn phải có phiếu.
    const withZero: Session = {
      ...standardSession,
      members: [...standardSession.members, { id: 'em', name: 'Em' }],
      expenses: [
        ...standardSession.expenses,
        {
          id: 'e4',
          title: 'Cà phê riêng',
          amount: 50_000,
          payerId: 'em',
          participantIds: ['em'],
          mode: 'equal',
          custom: {},
          weights: {},
          createdAt: 4,
        },
      ],
    };
    render(
      <RecipientLayer1
        session={withZero}
        seal={SEAL}
        onShowFullTable={vi.fn()}
        onOpenQr={vi.fn()}
      />,
    );
    const layer = document.querySelector('[data-layer1]');
    expect(layer?.textContent).toContain('bản 2 của link này');
    expect(layer?.textContent).not.toContain('chốt lúc');
    expect(layer?.textContent).toContain('Tổng 1.310.000');
    expect(layer?.textContent).toContain('3 lần chuyển');
    expect(document.querySelectorAll('[data-slip]')).toHaveLength(5);
    // Mặt phiếu đóng: avatar + «Phần của [Tên]», không số, không chiều.
    for (const name of ['An', 'Bình', 'Chi', 'Dũng', 'Em']) {
      expect(layer?.textContent).toContain(`Phần của ${name}`);
    }
    expect(layer?.textContent).not.toContain('240.000');
    // Mở phiếu của Em (số dư 0): đúng một dòng trung tính.
    fireEvent.click(screen.getByRole('button', { name: 'Phần của Em' }));
    expect(layer?.textContent).toContain('Em đã gọn phần của mình.');
  });

  it('(b) lớp 1 -> đúng 1 chạm «Bảng đầy đủ»; (d) mở phiếu mình (1) -> nút QR (2)', () => {
    const onShowFullTable = vi.fn();
    const onOpenQr = vi.fn();
    render(
      <RecipientLayer1
        session={standardSession}
        seal={SEAL}
        onShowFullTable={onShowFullTable}
        onOpenQr={onOpenQr}
      />,
    );
    // (d) chạm 1: mở phiếu của Bình (người nợ An 40.000).
    fireEvent.click(screen.getByRole('button', { name: 'Phần của Bình' }));
    const layer = document.querySelector('[data-layer1]');
    // Nội dung có ngay: lệnh mũi tên + số chính xác.
    expect(layer?.textContent).toContain('Bình → An: 40.000');
    // chạm 2: nút QR của lệnh đó.
    fireEvent.click(screen.getByRole('button', { name: 'Mã QR của lệnh này' }));
    expect(onOpenQr).toHaveBeenCalledTimes(1);
    // Chỉ số lệnh của Bình→An trong transfers của engine = 2.
    expect(onOpenQr).toHaveBeenCalledWith(2);
    // (b) đúng 1 chạm tới bảng đầy đủ.
    fireEvent.click(screen.getByRole('button', { name: 'Bảng đầy đủ' }));
    expect(onShowFullTable).toHaveBeenCalledTimes(1);
  });

  it('người được nhận: phiếu của An hiện chiều nhận INLINE đúng §4 (MINOR-4), không dạng danh sách, không mũi tên nợ', () => {
    // parent phê duyệt cập nhật đúng test phieu.spec.tsx theo MINOR-4
    // (R8): bản cũ khoá định dạng DANH SÁCH «Chi: 240.000 ₫»… mà
    // MINOR-4 của Panel #07 ra lệnh bỏ — nội dung phiếu mở hiện hành
    // là dạng INLINE đúng §4: «An nhận từ: Chi 240.000 ₫ · Dũng
    // 180.000 ₫ · Bình 40.000 ₫» (thứ tự giảm dần theo số tiền).
    render(
      <RecipientLayer1
        session={standardSession}
        seal={SEAL}
        onShowFullTable={vi.fn()}
        onOpenQr={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Phần của An' }));
    const layer = document.querySelector('[data-layer1]');
    expect(layer?.textContent).toContain('An nhận từ:');
    // Dạng inline §4: tên người gửi + số tiền, nối nhau bằng « · ».
    expect(layer?.textContent).toContain('An nhận từ: Chi 240.000');
    expect(layer?.textContent).toContain('· Dũng 180.000');
    expect(layer?.textContent).toContain('· Bình 40.000');
    // Dạng danh sách cũ bị cấm quay lại: không «Tên: số» cho người gửi.
    expect(layer?.textContent).not.toContain('Chi: 240.000');
    expect(layer?.textContent).not.toContain('Dũng: 180.000');
    expect(layer?.textContent).not.toContain('Bình: 40.000');
  });
});

describe('§9(c) — import link: lần đầu qua lớp 1, mở lại vào thẳng workspace', () => {
  it('mở link lần đầu -> lớp 1; «Bảng đầy đủ» -> workspace; quay về danh sách mở lại -> workspace thẳng', async () => {
    const code = encodeSessionShare(standardSession);
    window.history.replaceState(null, '', `/#chia=${code}`);
    render(<Page />);
    // Lớp 1 hiện (không phải workspace): có phiếu + nút Bảng đầy đủ.
    expect(await screen.findByText(/Tìm phiếu mang tên bạn/)).toBeTruthy();
    expect(document.querySelector('[data-layer1]')).toBeTruthy();
    expect(document.querySelectorAll('[data-slip]').length).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: 'Bảng đầy đủ' }));
    // Workspace: ledger khoản chi hiện ra.
    await waitFor(() => expect(document.querySelector('[data-layer1]')).toBeNull());
    expect(document.body.textContent).toContain('Ăn tối');
    // Quay về danh sách rồi mở lại phiên đã import -> workspace thẳng.
    fireEvent.click(screen.getByRole('button', { name: /Tất cả cuộc chia/ }));
    // Hàng phiên là nút đầu tiên khớp tên (nút thứ hai là nút xoá mang
    // cùng tên phiên trong accessible name).
    const openBtns = await screen.findAllByRole('button', { name: /Nhậu cuối tuần/ });
    fireEvent.click(openBtns[0]);
    await waitFor(() => expect(document.body.textContent).toContain('Ăn tối'));
    expect(document.querySelector('[data-layer1]')).toBeNull();
  });
});

describe('§9(f) — lớp 0: metadata trung tính cấp app', () => {
  it('title/description/OG chỉ chứa nội dung cấp app — không tên phiên, không tổng, không dấu bản', () => {
    for (const field of [SITE_TITLE, SITE_DESCRIPTION, SITE_NAME]) {
      expect(field).not.toContain('Nhậu cuối tuần');
      expect(field).not.toContain('1.260.000');
      expect(field).not.toContain('bản 2');
      expect(field).not.toContain('20:42');
    }
    expect(SITE_NAME).toBe('Chia Tiền');
  });
});

describe('dấu bản §1.7 — đếm local theo sessionId', () => {
  it('bản đầu = 1; sửa NỘI DUNG phiên rồi chốt lại -> bản 2; chỉ đổi updatedAt (nạp lại) -> giữ bản', () => {
    const s1 = sealSession(standardSession, new Date(2026, 9, 24, 20, 0).getTime());
    expect(s1.version).toBe(1);
    expect(sealLabel(s1)).toBe('chốt lúc 20:00 · bản 1');
    // Nạp lại trang: sanitize ghi updatedAt = Date.now() (hành vi có
    // sẵn) — KHÔNG phải sửa nội dung, bản phải giữ nguyên.
    const reloaded: Session = { ...standardSession, updatedAt: 999_999 };
    const sReload = sealSession(reloaded, new Date(2026, 9, 24, 20, 30).getTime());
    expect(sReload.version).toBe(1);
    // Sửa thật một khoản chi -> bản 2.
    const edited: Session = {
      ...standardSession,
      expenses: standardSession.expenses.map((e) =>
        e.id === 'e3' ? { ...e, amount: 200_000 } : e,
      ),
    };
    const s2 = sealSession(edited, new Date(2026, 9, 24, 20, 42).getTime());
    expect(s2.version).toBe(2);
    expect(sealLabel(s2)).toBe('chốt lúc 20:42 · bản 2');
    const s3 = sealSession(edited, new Date(2026, 9, 24, 21, 5).getTime());
    expect(s3.version).toBe(2);
    expect(loadSeal(standardSession.id)?.version).toBe(2);
    // Dấu bản KHÔNG nằm trong payload (đếm local thuần).
    const json = decompressFromEncodedURIComponent(encodeSessionShare(edited));
    expect(json).not.toContain('bản 2');
  });

  it('không chữ «bản cuối cùng / không sửa được» trong mọi copy mới; bộ từ cấm V-05 vắng mặt', () => {
    const balances = computeBalances(standardSession);
    const summary = buildSummaryShareText(standardSession, simplifyDebts(balances), SEAL);
    for (const banned of [...BANNED_WORDS, 'bản cuối cùng', 'không sửa được', 'nợ An']) {
      expect(summary.toLowerCase()).not.toContain(banned.toLowerCase());
    }
    expect(summary).not.toContain('→');
  });
});

describe('điều kiện bật/tắt §3', () => {
  it('bộ lọc từ khoá tên phiên: khớp các từ bối cảnh, không khớp tên thường', () => {
    expect(titleForcesStatic('Tiền giỗ bà nội')).toBe(true);
    expect(titleForcesStatic('Quỹ phúng điếu')).toBe(true);
    expect(titleForcesStatic('Thăm bệnh anh Ba')).toBe(true);
    expect(titleForcesStatic('Quyên góp miền Trung')).toBe(true);
    expect(titleForcesStatic('Nhậu cuối tuần')).toBe(false);
    expect(titleForcesStatic('Đi Đà Lạt')).toBe(false);
  });

  it('phiên tên tĩnh: công tắc trong Action Sheet hiện tắt + đúng một dòng «Phiên này giữ dạng tĩnh.»', async () => {
    const solemn: Session = { ...standardSession, id: 's-solemn', title: 'Tiền giỗ bà nội' };
    render(
      <SessionView
        session={solemn}
        startExpanded
        onBack={vi.fn()}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onNotifyUndo={vi.fn()}
      />,
    );
    const actionsBtn = screen.getAllByRole('button', { name: /Cuộc chia này|hành động/i })[0];
    if (actionsBtn) fireEvent.click(actionsBtn);
    const toggle = await screen.findByRole('switch', { name: /Đóng phiếu khi chốt/ });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Phiên này giữ dạng tĩnh.')).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});
