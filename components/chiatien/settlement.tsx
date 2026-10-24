'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  IconCheck,
  IconCopy,
  IconLink,
  IconSettleGlyph,
  IconPencil,
  IconQr,
  IconAlertTriangle,
} from './icons';
import { assignIdentityColors } from '@/lib/identity';
import { formatVND, formatVNDDisplay } from '@/lib/money';
import { owedByMember, paidByMember, sumBalances } from '@/lib/split';
import { buildSettlementText } from '@/lib/settle';
import { buildShareUrl } from '@/lib/share';
import { buildVietQrPayload, hasBank } from '@/lib/vietqr';
import type { Member, Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, GhostButton, PrimaryButton, copyText } from './ui-bits';
import { CompletionMark } from './completion-mark';
import { CompletionCard } from './completion-card';
import type { SealMark } from './phieu';
import { Sheet } from './sheet';
import { useSettleLock } from './session-view-hooks';

/** Bỏ dấu tiếng Việt cho nội dung chuyển khoản — nhiều app ngân hàng chỉ nhận không dấu. */
function transferContent(sessionTitle: string, fromName: string): string {
  const plain = `${fromName} chuyen tien ${sessionTitle}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, 50) || 'Chia Tien';
}

type QrState = { status: 'loading' } | { status: 'ready'; dataUrl: string } | { status: 'error' };

export type SettlementPanelProps = {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
  copied: boolean;
  copyFailed: boolean;
  onCopy: () => void;
  onShare: () => void;
  onEditMember: (member: Member, opts?: { focusBank?: boolean }) => void;
  /**
   * 'row' = hàng lệnh một dòng (dải mở rộng mobile, đủ rộng);
   * 'stacked' = biến thể xếp chồng cho cột desktop hẹp 320–360px
   * (dòng 1 tên + mũi tên, dòng 2 tiền + nút VietQR căn phải).
   */
  variant?: 'row' | 'stacked';
  /**
   * Hàng tổng ledger đang cùng khung → panel nhường kẻ đôi (về kẻ
   * đơn), giữ ≤1 cụm kẻ đôi/viewport (LK-22, INTERFACE-SPEC §1).
   */
  doubleRuleYielded?: boolean;
  /**
   * Lớp phiếu (v1.8.0): tổ chức đã bật «Đóng phiếu khi chốt» cho phiên
   * này -> sau CompletionMark hiện THẺ HOÀN TẤT mang phiếu. Tắt/vắng =
   * panel y hệt v1.7.2 (Test Tắt Game ở tầng trình diễn).
   */
  slipsEnabled?: boolean;
  /** Dấu bản local hiện tại của phiên (SessionView sở hữu + truyền xuống). */
  seal?: SealMark | null;
  /**
   * Text copy thủ công khi copy mặc định thất bại: phải là ĐÚNG text
   * mặc định vừa thử (tóm tắt §4), không phải bản chi tiết. Vắng (mount
   * độc lập ngoài SessionView) -> rơi về buildSettlementText như cũ.
   */
  fallbackCopyText?: string;
  /** Yêu cầu mở QR từ lớp 1: {index trong transfers, nonce tăng dần}. */
  qrRequest?: { index: number; nonce: number } | null;
};

/**
 * Bảng quyết toán DÙNG CHUNG (REDESIGN-V2): dải mở rộng mobile và cột
 * quyết toán desktop thường trực là CÙNG một component — "Ai trả ai"
 * trước, khối thiếu-QR GOM THEO NGƯỜI NHẬN, "Số dư từng người" kèm dòng
 * chú thích dấu thường trực, hàng tổng kẻ đôi, CTA chân. VietQR dựng
 * payload EMVCo + vẽ QR 100% tại máy này từ bank đã lưu local và ĐÃ QUA
 * validation (hasBank) — không ảnh ngoài, không dữ liệu ngân hàng rời máy.
 */
export function SettlementPanel({
  session,
  balances,
  transfers,
  copied,
  copyFailed,
  onCopy,
  onShare,
  onEditMember,
  variant = 'row',
  doubleRuleYielded = false,
  slipsEnabled = false,
  seal = null,
  fallbackCopyText,
  qrRequest = null,
}: SettlementPanelProps) {
  // Thẻ hoàn tất: «Xem bảng chia đầy đủ» rút thẻ, bảng cổ điển của
  // chính panel này ở nguyên vị trí (bảng vốn luôn đầy đủ ở đây).
  const [slipsDismissed, setSlipsDismissed] = useState(false);
  const qrNonceRef = useRef(0);
  // Khoảnh khắc hoàn tất (D2): kích hoạt tối đa 1 lần / session id trong
  // lần panel còn mount — copy thành công (copied false→true) hoặc bấm
  // «Chia sẻ link» (onShare). Không persist (lib/storage đóng băng).
  const firedSessionsRef = useRef<Set<string>>(new Set());
  const [completionActive, setCompletionActive] = useState(false);
  const prevCopiedRef = useRef(copied);
  useEffect(() => {
    const was = prevCopiedRef.current;
    prevCopiedRef.current = copied;
    if (copied && !was && !firedSessionsRef.current.has(session.id)) {
      firedSessionsRef.current.add(session.id);
      setCompletionActive(true);
    }
  }, [copied, session.id]);
  function handleShare() {
    if (!firedSessionsRef.current.has(session.id)) {
      firedSessionsRef.current.add(session.id);
      setCompletionActive(true);
    }
    onShare();
  }
  const [openQr, setOpenQr] = useState<number | null>(null);
  useEffect(() => {
    if (!qrRequest || qrRequest.nonce === qrNonceRef.current) return;
    qrNonceRef.current = qrRequest.nonce;
    // Yêu cầu QR từ lớp 1 (chạm thứ 2 trong ngân sách link->QR): mở
    // đúng lệnh được xin; sheet tự giữ điều kiện hasBank như live.
    setOpenQr(qrRequest.index);
  }, [qrRequest]);
  const [qrState, setQrState] = useState<QrState>({ status: 'loading' });
  const [askedId, setAskedId] = useState<string | null>(null);
  const [askFailed, setAskFailed] = useState<{ memberId: string; text: string } | null>(null);
  const paid = paidByMember(session);
  const owed = owedByMember(session);
  // Chốt chặn toàn vẹn: dữ liệu hợp lệ luôn cho tổng số dư = 0. Nếu khác 0
  // (dữ liệu lạ lọt qua mọi lớp), phải cảnh báo thay vì trình bày một
  // quyết toán lệch như thể đã khớp hết.
  const discrepancy = sumBalances(balances);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const colorOf = (id: string) => {
    const idx = session.members.findIndex((m) => m.id === id);
    return idx >= 0 ? (colors[idx] ?? 0) : 0;
  };
  const totalTransfers = transfers.reduce((s, t) => s + t.amount, 0);
  const totalLocking = useSettleLock(totalTransfers);
  const allSettled = transfers.length === 0 && session.expenses.length > 0;

  // Người nhận còn thiếu bank local — GOM theo người nhận (D-1): mỗi
  // người đúng một khối, đếm số lệnh + tổng tiền tới họ.
  const missingRecipients = useMemo(() => {
    const byRecipient = new Map<string, { member: Member; count: number; total: number }>();
    for (const t of transfers) {
      const recipient = session.members.find((m) => m.id === t.toId);
      if (!recipient || hasBank(recipient)) continue;
      const entry = byRecipient.get(recipient.id) ?? { member: recipient, count: 0, total: 0 };
      entry.count += 1;
      entry.total += t.amount;
      byRecipient.set(recipient.id, entry);
    }
    return [...byRecipient.values()];
  }, [transfers, session.members]);

  const openTransfer = openQr !== null ? transfers[openQr] : undefined;
  const openRecipient = openTransfer
    ? session.members.find((m) => m.id === openTransfer.toId)
    : undefined;

  // Sinh QR tại client khi mở sheet: payload EMVCo từ lib/vietqr + vẽ bằng
  // thư viện qrcode — chạy cả khi offline, không request ra ngoài.
  useEffect(() => {
    if (!openTransfer || !openRecipient || !hasBank(openRecipient)) return;
    let cancelled = false;
    // Reset về 'loading' đồng bộ khi mở lệnh mới để người dùng không quét
    // nhầm mã của lệnh trước trong lúc chờ sinh QR mới.
    /* eslint-disable react-hooks/set-state-in-effect -- reset trạng thái QR về loading đồng bộ khi mở lệnh mới để không quét nhầm mã của lệnh trước */
    setQrState({ status: 'loading' });
    /* eslint-enable react-hooks/set-state-in-effect */
    const payload = buildVietQrPayload(
      openRecipient.bank,
      openTransfer.amount,
      transferContent(session.title, nameOf(openTransfer.fromId)),
    );
    QRCode.toDataURL(payload, { width: 440, margin: 1, errorCorrectionLevel: 'M' })
      .then((dataUrl) => {
        if (!cancelled) setQrState({ status: 'ready', dataUrl });
      })
      .catch(() => {
        if (!cancelled) setQrState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
    // nameOf/session.title suy từ session — đưa vào deps sẽ sinh lại QR mỗi
    // lần session đổi identity dù lệnh mở không đổi; chỉ chạy theo lệnh mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy theo lệnh đang mở; nameOf/session.title suy từ session, thêm vào deps sẽ sinh lại QR mỗi lần session đổi identity dù lệnh mở không đổi
  }, [openQr, openTransfer, openRecipient]);

  async function handleAsk(recipient: Member, count: number, total: number) {
    const link = buildShareUrl(session);
    const text = `Chào ${recipient.name}, trong cuộc chia “${session.title}” bạn đang có ${count} lệnh chuyển tiền chờ (tổng ${formatVND(total)}). Máy này chưa có mã QR ngân hàng của bạn — bạn gửi mình mã QR (hoặc ảnh QR ngân hàng) của bạn nhé, để mọi người quét và chuyển đúng cho bạn. Xem quyết toán của nhóm tại: ${link}`;
    const ok = await copyText(text);
    if (ok) {
      setAskFailed(null);
      setAskedId(recipient.id);
      window.setTimeout(() => setAskedId(null), 3000);
    } else {
      setAskedId(null);
      setAskFailed({ memberId: recipient.id, text });
    }
  }

  return (
    // Cột panel PHẢI chốt minmax(0,1fr) (sửa W3, cùng luật Finding B của
    // ExpenseEditor): `grid` không chốt cột để track bị max-content lớn
    // nhất (hàng CTA ~352px) kéo rộng hơn hộp chứa của cột quyết toán
    // desktop (335px ở 1440) — mọi hàng bị đẩy qua mép phải cột dù span
    // tiền tự nó không cụt. Chốt cột xong hàng CTA tự wrap, hàng lệnh
    // nằm trọn trong cột ở cả số trần.
    <section aria-label="Quyết toán" className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <span className="sr-only" role="status">
        {copied ? 'Đã sao chép bản quyết toán vào bộ nhớ tạm.' : ''}
      </span>
      {discrepancy !== 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-debt-bg px-4 py-3 text-base font-medium text-debt-ink"
        >
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Số dư chưa cân bằng: còn {formatVND(Math.abs(discrepancy))} chưa có người chịu, nên
            quyết toán bên dưới chưa khớp hết. Hãy kiểm tra lại các khoản chi “Tuỳ chỉnh số tiền” —
            tổng các phần chia phải đúng bằng số tiền của khoản chi.
          </span>
        </p>
      )}
      {copyFailed && (
        <>
          <p role="alert" className="mb-2 text-base font-medium text-debt-ink">
            Trình duyệt không cho copy tự động — hãy chọn và copy thủ công phần dưới đây.
          </p>
          <textarea
            readOnly
            rows={7}
            aria-label="Bản quyết toán dạng chữ để copy thủ công"
            value={fallbackCopyText ?? buildSettlementText(session, balances, transfers)}
            onFocus={(e) => e.target.select()}
            className="mb-3 w-full rounded-lg border border-line-strong bg-card p-3 text-base text-ink outline-none focus:border-brand-deep"
          />
        </>
      )}

      <div>
        <h2 className="mb-2 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
          Ai trả ai
        </h2>
        {allSettled ? (
          <p className="flex items-center gap-2 py-2 text-base font-medium text-ink">
            <IconCheck size={16} className="shrink-0 text-credit-solid" aria-hidden />
            Đã cân hết — không ai nợ ai
          </p>
        ) : transfers.length === 0 ? (
          <p className="py-2 text-base text-ink-2">Chưa có gì để quyết toán</p>
        ) : (
          <ul className="divide-y divide-line">
            {transfers.map((t, i) => {
              const recipient = session.members.find((m) => m.id === t.toId);
              const canQr = recipient !== undefined && hasBank(recipient);
              const names = (
                <>
                  <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                    <Avatar name={nameOf(t.fromId)} colorIndex={colorOf(t.fromId)} size={24} />
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {nameOf(t.fromId)}
                    </span>
                  </span>
                  <IconSettleGlyph size={15} className="shrink-0 text-ink" aria-hidden />
                  <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                    <Avatar name={nameOf(t.toId)} colorIndex={colorOf(t.toId)} size={24} />
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {nameOf(t.toId)}
                    </span>
                  </span>
                </>
              );
              const amountAndQr = (
                <>
                  <span
                    className="font-figure text-base font-bold whitespace-nowrap text-ink"
                    title={formatVND(t.amount)}
                  >
                    {formatVNDDisplay(t.amount)}
                  </span>
                  {canQr && (
                    <button
                      type="button"
                      aria-expanded={openQr === i}
                      onClick={() => setOpenQr(i)}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
                    >
                      <IconQr size={14} /> VietQR
                    </button>
                  )}
                </>
              );
              return (
                <li key={`${t.fromId}-${t.toId}-${i}`} data-transfer-row={`${t.fromId}-${t.toId}`}>
                  {variant === 'stacked' ? (
                    <div className="min-h-[52px] py-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {names}
                      </div>
                      <div className="mt-1 flex shrink-0 items-center justify-end gap-2">
                        {amountAndQr}
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {names}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">{amountAndQr}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Khối thiếu-QR gom theo NGƯỜI NHẬN (D-1): hàng phẳng cùng bảng —
            hairline trên/dưới, không nền, không bo góc, không hộp lồng. */}
        {missingRecipients.map(({ member, count, total }) => (
          <div key={member.id} className="border-y border-line py-4">
            <p className="text-base font-semibold text-ink">
              Chưa có mã QR trên máy này — {member.name}
            </p>
            {/* Panel #05 R2-F1 (MINOR): text-wrap: pretty (text-pretty)
                chống từ «này.» mồ côi ở dòng cuối — Impeccable URL-mode
                đo 2 vị trí (8%/9%) trên đúng đoạn giải thích này. Chỉ áp
                cho đoạn này, không áp tràn lan. */}
            <p className="mt-1 text-base leading-relaxed text-pretty text-ink-2">
              {count} lệnh chuyển (tổng {formatVNDDisplay(total)}) đang chờ mã QR này.
            </p>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                onClick={() => handleAsk(member, count, total)}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
              >
                {askedId === member.id ? <IconCheck size={15} /> : <IconLink size={15} />}
                Nhắn xin QR của {member.name}
              </button>
              <GhostButton onClick={() => onEditMember(member, { focusBank: true })}>
                <IconPencil size={15} />
                Nhập tài khoản của {member.name} trên máy này
              </GhostButton>
            </div>
            {askedId === member.id && (
              <p role="status" className="mt-2 text-base font-medium text-brand-deep">
                Đã copy lời nhắn — dán vào Zalo/Messenger để gửi {member.name}.
              </p>
            )}
            {askFailed?.memberId === member.id && (
              <div className="mt-2">
                <p role="alert" className="mb-1.5 text-base font-medium text-debt-ink">
                  Trình duyệt không cho copy tự động — hãy copy thủ công lời nhắn này:
                </p>
                <textarea
                  readOnly
                  rows={5}
                  aria-label="Lời nhắn xin mã QR để copy thủ công"
                  value={askFailed.text}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-lg border border-line-strong bg-card p-3 text-base text-ink outline-none focus:border-brand-deep"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-1 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
          Số dư từng người
        </h2>
        {/* Chú thích dấu THƯỜNG TRỰC ở đầu bảng (R3-F2). */}
        <p className="mb-2 text-xs text-ink-2">Dấu + là được nhận lại, dấu − là trả thêm.</p>
        <ul className="divide-y divide-line">
          {session.members.map((m, idx) => {
            const b = balances[m.id] ?? 0;
            return (
              <li
                key={m.id}
                className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={m.name} colorIndex={colors[idx] ?? 0} size={28} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold text-ink">{m.name}</p>
                    <p className="text-[13px] text-ink-2">
                      Đã trả{' '}
                      <span className="font-figure font-bold">
                        {formatVNDDisplay(paid[m.id] ?? 0)}
                      </span>
                      {' · Phải chịu '}
                      <span className="font-figure font-bold">
                        {formatVNDDisplay(owed[m.id] ?? 0)}
                      </span>
                    </p>
                  </div>
                </div>
                {/* LK-22/F: số dư LUÔN --ink ở mọi frame — ngữ nghĩa
                    do dấu +/−, dòng chú thích dấu thường trực và chấm
                    semantic kề bên gánh (chấm không mang chữ nên ngân
                    sách chữ dạng công thức không đổi). Vai semantic:
                    solid cho chấm trạng thái. */}
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full',
                      b > 0 && 'bg-credit-solid',
                      b < 0 && 'bg-debt-solid',
                      b === 0 && 'bg-neutral-300',
                    )}
                  />
                  <span className="font-figure text-base font-bold whitespace-nowrap text-ink">
                    {b > 0 ? '+' : ''}
                    {formatVNDDisplay(b)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {doubleRuleYielded ? (
          <div className="mt-3 border-t border-line" aria-hidden />
        ) : (
          <div className="double-rule mt-3" aria-hidden />
        )}
        {/* Hàng tổng: flex-wrap + ml-auto cho số (sửa W3) — ở số trần
            999.999.999.999 ₫ (284px ở 30px) nhãn + số không vừa một
            hàng trong cột 288–360px; không wrap thì số bị đẩy qua mép
            phải cột 16,8px (đo @1440). Wrap chỉ kích hoạt khi không
            vừa: nhãn giữ dòng đầu, số xuống dòng hai căn phải nguyên
            vẹn; số thường không đổi layout. */}
        <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
            Tổng chuyển
          </span>
          {/* Số tuyên bố của bảng quyết toán: Inter 700 30px tnum
              (thang TYPE-AND-ICON §1, cổng F-7) + C1 settle-lock. */}
          <span
            className={cn(
              'font-figure ml-auto text-[40px] leading-none font-bold whitespace-nowrap text-ink',
              totalLocking && 'animate-settle-lock',
            )}
          >
            {formatVNDDisplay(totalTransfers)}
          </span>
        </div>
      </div>

      <CompletionMark active={completionActive} />

      {/* THẺ HOÀN TẤT mang phiếu (§1.3): chỉ khi CompletionMark đã kích
          hoạt (điểm Copy/Chia sẻ), lớp phiếu được bật cho phiên này và
          đã có dấu bản. Tắt lớp phiếu -> không một nút phiếu nào ở đây,
          panel trở về đúng v1.7.2. */}
      {completionActive &&
        slipsEnabled &&
        seal &&
        !slipsDismissed &&
        (() => {
          const firstQrIndex = transfers.findIndex((t) => {
            const r = session.members.find((m) => m.id === t.toId);
            return r !== undefined && hasBank(r);
          });
          return (
            <CompletionCard
              session={session}
              balances={balances}
              transfers={transfers}
              seal={seal}
              qrAvailable={firstQrIndex >= 0}
              onShowFullTable={() => setSlipsDismissed(true)}
              onGoToQr={() => {
                if (firstQrIndex >= 0) setOpenQr(firstQrIndex);
              }}
              onOpenSlipQr={(index) => setOpenQr(index)}
            />
          );
        })()}

      {/* CTA chân panel: copy là chính; khi đã cân hết, chia sẻ link là
          thứ đáng gửi nên hoán trọng lượng (LAYOUT-SPEC §3). */}
      {/* D4-CT-7 (sửa W3): CTA panel 1 dòng ở 320px — nowrap trên cả
          hai nút: min-content của nút chính thành nguyên nhãn, flex
          không còn ép nút xuống 155px/2 dòng; khi tổng bề rộng hai nút
          vượt panel, nút phụ wrap xuống dòng riêng (flex-wrap sẵn có)
          thay vì chữ trong nút wrap. Nhãn giữ nguyên văn bản đã khoá. */}
      {allSettled ? (
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={handleShare} className="flex-1 whitespace-nowrap">
            <IconLink size={16} /> Chia sẻ link
          </PrimaryButton>
          <GhostButton onClick={onCopy} className="whitespace-nowrap">
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            {copied ? 'Đã copy!' : 'Copy tóm tắt'}
          </GhostButton>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={onCopy} className="flex-1 whitespace-nowrap">
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            {copied ? 'Đã copy!' : 'Copy tóm tắt'}
          </PrimaryButton>
          <GhostButton onClick={handleShare} className="whitespace-nowrap">
            <IconLink size={16} /> Chia sẻ link
          </GhostButton>
        </div>
      )}

      {/* QR Sheet — chỉ mở khi hasBank(người nhận): điều kiện kiểm chứng
          cho câu "đã điền sẵn" (Verified Claim Rule). Khung 220px giữ chỗ. */}
      <Sheet
        open={openQr !== null && !!openRecipient && hasBank(openRecipient)}
        onClose={() => setOpenQr(null)}
        title={openRecipient ? `VietQR — ${openRecipient.name}` : 'VietQR'}
      >
        {openTransfer && openRecipient && hasBank(openRecipient) && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-lg border border-line bg-white p-2">
              {qrState.status === 'ready' ? (
                // src là data URL do thư viện qrcode sinh tại máy —
                // next/image không xử lý data URL và QR phải hiển thị
                // offline, nên <img> thường là đúng ở đây.
                // eslint-disable-next-line @next/next/no-img-element -- QR là data URL sinh tại máy, next/image không xử lý data URL và QR phải hiện được offline
                <img
                  src={qrState.dataUrl}
                  alt={`Mã VietQR: ${nameOf(openTransfer.fromId)} chuyển ${formatVND(openTransfer.amount)} cho ${openRecipient.name}`}
                  width={220}
                  height={220}
                  className="h-full w-full"
                />
              ) : qrState.status === 'error' ? (
                <p className="px-3 text-center text-base font-medium text-debt-ink">
                  Chưa tạo được mã QR trên máy này — dùng thông tin chuyển khoản bên dưới.
                </p>
              ) : (
                <p role="status" className="text-base text-muted">
                  Đang tạo mã…
                </p>
              )}
            </div>
            <dl className="grid w-full gap-1.5 text-base">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Ngân hàng</dt>
                <dd className="min-w-0 font-medium break-words text-ink">
                  {openRecipient.bank.bankName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Số tài khoản</dt>
                <dd className="font-figure font-medium break-all text-ink">
                  {openRecipient.bank.accountNumber}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Chủ tài khoản</dt>
                <dd className="min-w-0 font-medium break-words text-ink">
                  {openRecipient.bank.accountName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Số tiền</dt>
                <dd className="font-figure font-bold whitespace-nowrap text-ink">
                  {formatVND(openTransfer.amount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Nội dung</dt>
                <dd className="min-w-0 text-right font-medium break-all text-ink">
                  {transferContent(session.title, nameOf(openTransfer.fromId))}
                </dd>
              </div>
            </dl>
            <p className="text-center text-xs leading-relaxed text-ink-2">
              QR từ tài khoản đã lưu trên máy này. Quét bằng app ngân hàng — số tiền và nội dung đã
              điền sẵn.
            </p>
            {/* SEC-12.6: xác nhận khớp danh tính trước khi quét. */}
            <p className="text-center text-xs leading-relaxed font-semibold text-brand-deep">
              Trước khi quét, hãy kiểm tra tên chủ tài khoản ở trên khớp đúng người bạn định chuyển
              — nếu sai tên, đừng quét, hãy sửa lại tài khoản đã lưu.
            </p>
          </div>
        )}
      </Sheet>
    </section>
  );
}

/** Tên cũ giữ làm alias cho mọi nơi gọi còn sót — component là một. */
export const Settlement = SettlementPanel;
