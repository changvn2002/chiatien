'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Link2, MoveRight, Pencil, QrCode, TriangleAlert } from 'lucide-react';
import { assignIdentityColors } from '@/lib/identity';
import { formatVND, formatVNDDisplay } from '@/lib/money';
import { owedByMember, paidByMember, sumBalances } from '@/lib/split';
import { buildSettlementText } from '@/lib/settle';
import { buildShareUrl } from '@/lib/share';
import { buildVietQrPayload, hasBank } from '@/lib/vietqr';
import type { Member, Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, GhostButton, PrimaryButton, copyText } from './ui-bits';
import { Sheet } from './sheet';

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
}: SettlementPanelProps) {
  const [openQr, setOpenQr] = useState<number | null>(null);
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
    <section aria-label="Quyết toán" className="grid gap-6">
      <span className="sr-only" role="status">
        {copied ? 'Đã sao chép bản quyết toán vào bộ nhớ tạm.' : ''}
      </span>
      {discrepancy !== 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Số dư chưa cân bằng: còn {formatVND(Math.abs(discrepancy))} chưa có người chịu, nên
            quyết toán bên dưới chưa khớp hết. Hãy kiểm tra lại các khoản chi “Tuỳ chỉnh số tiền” —
            tổng các phần chia phải đúng bằng số tiền của khoản chi.
          </span>
        </p>
      )}
      {copyFailed && (
        <>
          <p role="alert" className="mb-2 text-sm font-medium text-debt">
            Trình duyệt không cho copy tự động — hãy chọn và copy thủ công phần dưới đây.
          </p>
          <textarea
            readOnly
            rows={7}
            aria-label="Bản quyết toán dạng chữ để copy thủ công"
            value={buildSettlementText(session, balances, transfers)}
            onFocus={(e) => e.target.select()}
            className="mb-3 w-full rounded-xl border border-line-strong bg-card p-3 text-base text-ink outline-none focus:border-brand-deep"
          />
        </>
      )}

      <div>
        <h2 className="mb-2 text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
          Ai trả ai
        </h2>
        {allSettled ? (
          <p className="flex items-center gap-2 py-2 text-sm font-medium text-ink">
            <Check size={16} className="shrink-0 text-credit" aria-hidden />
            Đã cân hết — không ai nợ ai
          </p>
        ) : transfers.length === 0 ? (
          <p className="py-2 text-sm text-ink-2">Chưa có gì để quyết toán</p>
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
                  <MoveRight size={15} className="shrink-0 text-brand" aria-hidden />
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
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 font-display text-xs font-bold text-white transition hover:bg-brand-deep active:bg-brand-deep"
                    >
                      <QrCode size={14} /> VietQR
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
            <p className="text-sm font-semibold text-ink">
              Chưa có mã QR trên máy này — {member.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {count} lệnh chuyển (tổng {formatVNDDisplay(total)}) đang chờ mã QR này.
            </p>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                onClick={() => handleAsk(member, count, total)}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 font-display text-sm font-bold text-white transition hover:bg-brand-deep active:bg-brand-deep"
              >
                {askedId === member.id ? <Check size={15} /> : <Link2 size={15} />}
                Nhắn xin QR của {member.name}
              </button>
              <GhostButton onClick={() => onEditMember(member, { focusBank: true })}>
                <Pencil size={15} />
                Nhập tài khoản của {member.name} trên máy này
              </GhostButton>
            </div>
            {askedId === member.id && (
              <p role="status" className="mt-2 text-sm font-medium text-brand-deep">
                Đã copy lời nhắn — dán vào Zalo/Messenger để gửi {member.name}.
              </p>
            )}
            {askFailed?.memberId === member.id && (
              <div className="mt-2">
                <p role="alert" className="mb-1.5 text-sm font-medium text-debt">
                  Trình duyệt không cho copy tự động — hãy copy thủ công lời nhắn này:
                </p>
                <textarea
                  readOnly
                  rows={5}
                  aria-label="Lời nhắn xin mã QR để copy thủ công"
                  value={askFailed.text}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl border border-line-strong bg-card p-3 text-base text-ink outline-none focus:border-brand-deep"
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
        <p className="mb-2 text-[13px] text-ink-2">Dấu + là được nhận lại, dấu − là trả thêm.</p>
        <ul className="divide-y divide-line">
          {session.members.map((m, idx) => {
            const b = balances[m.id] ?? 0;
            return (
              <li
                key={m.id}
                className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={m.name} colorIndex={colors[idx] ?? 0} size={32} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold text-ink">{m.name}</p>
                    <p className="font-figure text-[13px] text-ink-2">
                      Đã trả {formatVNDDisplay(paid[m.id] ?? 0)} · Phải chịu{' '}
                      {formatVNDDisplay(owed[m.id] ?? 0)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'font-figure text-base font-bold whitespace-nowrap',
                    b > 0 && 'text-credit',
                    b < 0 && 'text-debt',
                    b === 0 && 'text-ink-2',
                  )}
                >
                  {b > 0 ? '+' : ''}
                  {formatVNDDisplay(b)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="double-rule mt-3" aria-hidden />
        <div className="flex min-h-[44px] items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-[0.06em] text-ink-2 uppercase">
            Tổng chuyển
          </span>
          <span className="font-figure text-[19px] font-bold whitespace-nowrap text-ink">
            {formatVNDDisplay(totalTransfers)}
          </span>
        </div>
      </div>

      {/* CTA chân panel: copy là chính; khi đã cân hết, chia sẻ link là
          thứ đáng gửi nên hoán trọng lượng (LAYOUT-SPEC §3). */}
      {allSettled ? (
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={onShare} className="flex-1">
            <Link2 size={16} /> Chia sẻ link
          </PrimaryButton>
          <GhostButton onClick={onCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Đã copy!' : 'Copy bản quyết toán'}
          </GhostButton>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={onCopy} className="flex-1">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Đã copy!' : 'Copy bản quyết toán'}
          </PrimaryButton>
          <GhostButton onClick={onShare}>
            <Link2 size={16} /> Chia sẻ link
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
            <div className="flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-xl border border-line bg-white p-2">
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
                <p className="px-3 text-center text-sm font-medium text-debt">
                  Chưa tạo được mã QR trên máy này — dùng thông tin chuyển khoản bên dưới.
                </p>
              ) : (
                <p role="status" className="text-sm text-muted">
                  Đang tạo mã…
                </p>
              )}
            </div>
            <dl className="grid w-full gap-1.5 text-sm">
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
            <p className="text-center text-[13px] leading-relaxed text-ink-2">
              QR từ tài khoản đã lưu trên máy này. Quét bằng app ngân hàng — số tiền và nội dung đã
              điền sẵn.
            </p>
            {/* SEC-12.6: xác nhận khớp danh tính trước khi quét. */}
            <p className="text-center text-[13px] leading-relaxed font-semibold text-brand-deep">
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
