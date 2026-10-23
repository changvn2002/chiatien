'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowRight, Check, Copy, Link2, Pencil, QrCode, TriangleAlert } from 'lucide-react';
import { formatVND } from '@/lib/money';
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

/**
 * Bước 3 — Thanh toán: "Ai trả ai" TRƯỚC (giá trị cốt lõi), "Số dư từng
 * người" SAU kèm chú thích dấu +/−. VietQR dựng payload EMVCo và vẽ QR
 * 100% tại máy này từ tài khoản đã lưu local (DATA-08) — không ảnh ngoài,
 * không dữ liệu ngân hàng rời máy. Máy chưa lưu tài khoản của người nhận
 * thì hiện trạng thái hạng nhất "Chưa có mã QR trên máy này" với 2 đường
 * đi tiếp (DATA-04).
 */
export function Settlement({
  session,
  balances,
  transfers,
  copied,
  copyFailed,
  onCopy,
  onShare,
  onEditMember,
  offlineNotice,
}: {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
  copied: boolean;
  copyFailed: boolean;
  onCopy: () => void;
  onShare: () => void;
  onEditMember: (member: Member) => void;
  offlineNotice?: React.ReactNode;
}) {
  const [openQr, setOpenQr] = useState<number | null>(null);
  const [qrState, setQrState] = useState<QrState>({ status: 'loading' });
  const [askedIndex, setAskedIndex] = useState<number | null>(null);
  const paid = paidByMember(session);
  const owed = owedByMember(session);
  // Chốt chặn toàn vẹn: dữ liệu hợp lệ luôn cho tổng số dư = 0. Nếu khác 0
  // (dữ liệu lạ lọt qua mọi lớp), phải cảnh báo to thay vì trình bày một
  // quyết toán lệch như thể đã khớp hết.
  const discrepancy = sumBalances(balances);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';

  const openTransfer = openQr !== null ? transfers[openQr] : undefined;
  const openRecipient = openTransfer
    ? session.members.find((m) => m.id === openTransfer.toId)
    : undefined;

  // Sinh QR tại client khi mở sheet: payload EMVCo từ lib/vietqr + vẽ bằng
  // thư viện qrcode — chạy cả khi offline, không request ra ngoài.
  useEffect(() => {
    if (!openTransfer || !openRecipient || !hasBank(openRecipient)) return;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
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
    // nameOf/session.title ổn định theo session — chỉ chạy lại khi đổi lệnh mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openQr, openTransfer, openRecipient]);

  async function handleAsk(recipient: Member, index: number) {
    const link = buildShareUrl(session);
    const text = `Đây là link chốt tiền của nhóm mình: ${link} — mở trên máy của bạn để xem ai nợ ai và mã QR của bạn.`;
    const ok = await copyText(text);
    if (ok) {
      setAskedIndex(index);
      window.setTimeout(() => setAskedIndex(null), 3000);
    }
  }

  return (
    <section aria-label="Quyết toán" className="grid gap-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">Ai trả ai</h2>
          {/* Desktop: rail ẩn ở bước 3 nên hai hành động chính nằm ở đây. */}
          <div className="hidden gap-2 lg:flex">
            <PrimaryButton onClick={onCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Đã copy!' : 'Copy bản quyết toán'}
            </PrimaryButton>
            <GhostButton onClick={onShare}>
              <Link2 size={16} /> Chia sẻ link
            </GhostButton>
          </div>
        </div>
        {offlineNotice}
        <span className="sr-only" role="status">
          {copied ? 'Đã sao chép bản quyết toán vào bộ nhớ tạm.' : ''}
        </span>
        {discrepancy !== 0 && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Số dư chưa cân bằng: còn {formatVND(Math.abs(discrepancy))} chưa có người chịu, nên
              quyết toán bên dưới chưa khớp hết. Hãy kiểm tra lại các khoản chi “Tuỳ chỉnh số tiền”
              — tổng các phần chia phải đúng bằng số tiền của khoản chi.
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

        <div className="rounded-2xl border border-line bg-card px-4 shadow-[var(--shadow-card)] sm:px-5">
          {transfers.length === 0 ? (
            <p className="py-4 text-sm text-ink">Mọi người đã cân bằng — không ai nợ ai.</p>
          ) : (
            <ul className="divide-y divide-line">
              {transfers.map((t, i) => {
                const recipient = session.members.find((m) => m.id === t.toId);
                const canQr = recipient !== undefined && hasBank(recipient);
                return (
                  <li key={`${t.fromId}-${t.toId}-${i}`} className="py-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                        <Avatar id={t.fromId} name={nameOf(t.fromId)} size={24} />
                        <span className="truncate">{nameOf(t.fromId)}</span>
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-brand" aria-hidden />
                      <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                        <Avatar id={t.toId} name={nameOf(t.toId)} size={24} />
                        <span className="truncate">{nameOf(t.toId)}</span>
                      </span>
                      <span className="ml-auto font-display text-base font-bold whitespace-nowrap text-ink">
                        {formatVND(t.amount)}
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
                    </div>
                    {canQr ? (
                      <p className="mt-1.5 text-xs text-muted">
                        QR từ tài khoản đã lưu trên máy này
                      </p>
                    ) : (
                      recipient && (
                        <div className="mt-2 rounded-xl bg-paper px-3 py-3">
                          <p className="text-sm font-semibold text-ink">
                            Chưa có mã QR trên máy này
                          </p>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted">
                            {recipient.name} chưa lưu tài khoản trên máy này. Nhờ {recipient.name}{' '}
                            mở link trên máy của {recipient.name} để thấy mã QR, hoặc nhập tài khoản
                            của {recipient.name} tại đây.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleAsk(recipient, i)}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong bg-card px-3 text-sm font-semibold text-brand-deep transition hover:border-brand-deep"
                            >
                              {askedIndex === i ? <Check size={15} /> : <Link2 size={15} />}
                              {askedIndex === i
                                ? 'Đã copy lời nhắn!'
                                : `Nhờ ${recipient.name} mở link trên máy của ${recipient.name}`}
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditMember(recipient)}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong bg-card px-3 text-sm font-semibold text-ink transition hover:border-brand-deep hover:text-brand-deep"
                            >
                              <Pencil size={15} />
                              Nhập tài khoản của {recipient.name} trên máy này
                            </button>
                          </div>
                          <span className="sr-only" role="status">
                            {askedIndex === i ? 'Đã sao chép lời nhắn kèm link chia sẻ.' : ''}
                          </span>
                        </div>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-display text-lg font-bold text-ink">Số dư từng người</h2>
        <p className="mb-3 text-sm text-muted">
          Số dư dương (+) nghĩa là được nhận lại khi quyết toán; số dư âm (−) nghĩa là phải trả
          thêm.
        </p>
        <div className="rounded-2xl border border-line bg-card px-4 shadow-[var(--shadow-card)] sm:px-5">
          <ul className="divide-y divide-line">
            {session.members.map((m) => {
              const b = balances[m.id] ?? 0;
              return (
                <li key={m.id} className="flex min-w-0 items-center gap-3 py-3">
                  <Avatar id={m.id} name={m.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{m.name}</p>
                    <p className="text-xs text-muted">
                      Đã trả{' '}
                      <span className="font-display font-semibold text-ink">
                        {formatVND(paid[m.id] ?? 0)}
                      </span>{' '}
                      · Phải chịu{' '}
                      <span className="font-display font-semibold text-ink">
                        {formatVND(owed[m.id] ?? 0)}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-display text-sm font-bold whitespace-nowrap',
                      b > 0 && 'text-credit',
                      b < 0 && 'text-debt',
                      b === 0 && 'text-muted',
                    )}
                  >
                    {b > 0 ? '+' : ''}
                    {formatVND(b)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Sheet VietQR — QR sinh local, khung 220px cố định không nhảy layout. */}
      <Sheet
        open={openQr !== null && !!openRecipient && hasBank(openRecipient)}
        onClose={() => setOpenQr(null)}
        title={openRecipient ? `VietQR — ${openRecipient.name}` : 'VietQR'}
      >
        {openTransfer && openRecipient && hasBank(openRecipient) && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-xl border border-line bg-white p-2">
              {qrState.status === 'ready' ? (
                // eslint-disable-next-line @next/next/no-img-element
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
                  Đang tạo mã QR…
                </p>
              )}
            </div>
            <dl className="grid w-full gap-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Ngân hàng</dt>
                <dd className="min-w-0 truncate font-medium text-ink">
                  {openRecipient.bank.bankName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Số tài khoản</dt>
                <dd className="font-mono font-medium break-all text-ink">
                  {openRecipient.bank.accountNumber}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Chủ tài khoản</dt>
                <dd className="min-w-0 truncate font-medium text-ink">
                  {openRecipient.bank.accountName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Số tiền</dt>
                <dd className="font-display font-bold whitespace-nowrap text-ink">
                  {formatVND(openTransfer.amount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">Nội dung</dt>
                <dd className="min-w-0 font-mono text-right font-medium break-all text-ink">
                  {transferContent(session.title, nameOf(openTransfer.fromId))}
                </dd>
              </div>
            </dl>
            <p className="text-center text-xs leading-relaxed text-muted">
              QR từ tài khoản đã lưu trên máy này. Quét bằng app ngân hàng — số tiền và nội dung đã
              điền sẵn.
            </p>
          </div>
        )}
      </Sheet>
    </section>
  );
}
