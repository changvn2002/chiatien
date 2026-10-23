'use client';

import { useState } from 'react';
import { ArrowRight, Check, Copy, QrCode, Scale, TriangleAlert } from 'lucide-react';
import { formatVND } from '@/lib/money';
import { owedByMember, paidByMember, sumBalances } from '@/lib/split';
import { buildSettlementText } from '@/lib/settle';
import { hasBank, vietQrUrl } from '@/lib/vietqr';
import type { Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, GhostButton, SectionTitle } from './ui-bits';

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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback cho trình duyệt chặn Clipboard API (iframe, quyền...).
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

/**
 * Khu vực quyết toán: số dư từng người + danh sách giao dịch đã rút gọn
 * (ít lần chuyển nhất). Giao dịch nào người nhận có tài khoản ngân hàng
 * thì kèm ảnh VietQR thật để quét trả ngay.
 */
export function Settlement({
  session,
  balances,
  transfers,
}: {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [openQr, setOpenQr] = useState<number | null>(null);
  const [qrFailed, setQrFailed] = useState<number | null>(null);
  const paid = paidByMember(session);
  const owed = owedByMember(session);
  // Chốt chặn toàn vẹn: dữ liệu hợp lệ luôn cho tổng số dư = 0. Nếu khác 0
  // (dữ liệu lạ lọt qua mọi lớp), phải cảnh báo to thay vì trình bày một
  // quyết toán lệch như thể đã khớp hết.
  const discrepancy = sumBalances(balances);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';

  async function handleCopy() {
    const ok = await copyText(buildSettlementText(session, balances, transfers));
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <section aria-label="Quyết toán">
      <SectionTitle
        icon={<Scale size={20} />}
        title="Quyết toán"
        action={
          <GhostButton onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Đã copy!' : 'Copy bản quyết toán'}
          </GhostButton>
        }
      />
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
            className="mb-3 w-full rounded-xl border border-line bg-card p-3 text-sm text-ink outline-none focus:border-brand"
          />
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 font-display text-sm font-bold tracking-wide text-muted uppercase">
            Số dư từng người
          </h3>
          <ul className="grid gap-2.5">
            {session.members.map((m) => {
              const b = balances[m.id] ?? 0;
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar id={m.id} name={m.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{m.name}</p>
                    <p className="text-xs text-muted">
                      Đã trả {formatVND(paid[m.id] ?? 0)} · Phải chịu {formatVND(owed[m.id] ?? 0)}
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

        <div className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 font-display text-sm font-bold tracking-wide text-muted uppercase">
            Ai trả ai ({transfers.length} lần chuyển)
          </h3>
          {transfers.length === 0 ? (
            <p className="text-sm text-ink">Mọi người đã cân bằng — không ai nợ ai.</p>
          ) : (
            <ul className="grid">
              {transfers.map((t, i) => {
                const recipient = session.members.find((m) => m.id === t.toId);
                const canQr = recipient && hasBank(recipient);
                const qrOpen = openQr === i;
                return (
                  <li
                    key={`${t.fromId}-${t.toId}-${i}`}
                    className="border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                        <Avatar id={t.fromId} name={nameOf(t.fromId)} size={22} />
                        {nameOf(t.fromId)}
                      </span>
                      <ArrowRight size={15} className="text-brand" />
                      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                        <Avatar id={t.toId} name={nameOf(t.toId)} size={22} />
                        {nameOf(t.toId)}
                      </span>
                      <span className="ml-auto font-display font-bold text-ink">
                        {formatVND(t.amount)}
                      </span>
                      {canQr && (
                        <button
                          type="button"
                          aria-expanded={qrOpen}
                          onClick={() => setOpenQr(qrOpen ? null : i)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-white transition hover:bg-brand-deep"
                        >
                          <QrCode size={14} /> VietQR
                        </button>
                      )}
                    </div>
                    {canQr && qrOpen && recipient.bank && (
                      <div className="mt-3 flex flex-col items-center gap-2">
                        {qrFailed === i ? (
                          <p className="text-center text-sm font-medium text-debt">
                            Không tải được ảnh VietQR — hãy chuyển khoản thủ công theo thông tin
                            ngân hàng dưới đây.
                          </p>
                        ) : (
                          <>
                            {/* Ảnh VietQR thật từ img.vietqr.io — quét bằng app ngân hàng để chuyển đúng số tiền. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={vietQrUrl(
                                recipient.bank,
                                t.amount,
                                transferContent(session.title, nameOf(t.fromId)),
                              )}
                              alt={`Mã VietQR: ${nameOf(t.fromId)} chuyển ${formatVND(t.amount)} cho ${nameOf(t.toId)}`}
                              width={220}
                              height={220}
                              loading="lazy"
                              onError={() => setQrFailed(i)}
                              className="rounded-xl border border-line bg-white p-2"
                            />
                          </>
                        )}
                        <p className="text-center text-xs text-muted">
                          {recipient.bank.bankName} · {recipient.bank.accountNumber} ·{' '}
                          {recipient.bank.accountName}
                          <br />
                          Quét bằng app ngân hàng — số tiền và nội dung đã điền sẵn.
                        </p>
                      </div>
                    )}
                    {!canQr && recipient && (
                      <p className="mt-1.5 text-xs text-muted">
                        {recipient.name} chưa có thông tin ngân hàng nên chưa có VietQR — thêm trong
                        mục Thành viên.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
