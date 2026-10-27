'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { IconCheck, IconCopy } from './icons';
import { formatVND, formatVNDDisplay } from '@/lib/money';
import { buildVietQrPayload, hasBank } from '@/lib/vietqr';
import type { Member, Session, Transfer } from '@/lib/types';
import { GhostButton, PrimaryButton, copyText } from './ui-bits';
import { Sheet } from './sheet';

/** Bỏ dấu tiếng Việt cho nội dung chuyển khoản — nhiều app ngân hàng chỉ nhận không dấu. */
export function transferContent(sessionTitle: string, fromName: string): string {
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

/** Số tài khoản che giữa (SPEC Sheet 3): chỉ lộ 4 số đầu + 3 số cuối. */
export function maskAccountNumber(accountNumber: string): string {
  const n = accountNumber.replace(/\s/g, '');
  if (n.length <= 7) return n;
  return `${n.slice(0, 4)}••••${n.slice(-3)}`;
}

type QrState = { status: 'loading' } | { status: 'ready'; dataUrl: string } | { status: 'error' };

/**
 * Sheet 3 — Thanh toán theo từng dòng chuyển tiền (REDESIGN Pha 1):
 * nơi DUY NHẤT chứa QR thanh toán của app shell (sheet VietQR riêng
 * trong settlement.tsx đã hợp nhất về đây). VietQR dựng payload EMVCo
 * + vẽ 100% tại máy này từ bank đã lưu local (ADR-2). Số tài khoản
 * hiện dạng CHE GIỮA; nội dung chuyển khoản sao chép được tại chỗ —
 * điểm sao chép duy nhất ngoài Sheet 4 (SPEC §2 Sheet 3).
 */
export function PaymentSheet({
  session,
  transfer,
  paid,
  onClose,
  onSetPaid,
  onEditMember,
}: {
  session: Session;
  transfer: Transfer | null;
  paid: boolean;
  onClose: () => void;
  onSetPaid: (transfer: Transfer, paid: boolean) => void;
  onEditMember: (member: Member) => void;
}) {
  const [qrState, setQrState] = useState<QrState>({ status: 'loading' });
  const [contentCopied, setContentCopied] = useState(false);

  const recipient = transfer ? session.members.find((m) => m.id === transfer.toId) : undefined;
  const sender = transfer ? session.members.find((m) => m.id === transfer.fromId) : undefined;
  const canQr = recipient !== undefined && hasBank(recipient);
  const content = transfer ? transferContent(session.title, sender?.name ?? '') : '';

  // Sinh QR tại client khi mở lệnh mới (chuyển từ settlement.tsx):
  // payload EMVCo từ lib/vietqr + thư viện qrcode — chạy cả offline.
  useEffect(() => {
    if (!transfer || !recipient || !hasBank(recipient)) return;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- reset QR về loading đồng bộ khi mở lệnh mới để không quét nhầm mã của lệnh trước */
    setQrState({ status: 'loading' });
    setContentCopied(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    const payload = buildVietQrPayload(recipient.bank, transfer.amount, content);
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
    // content suy từ session.title + tên người gửi — chỉ chạy theo lệnh đang mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy theo lệnh đang mở
  }, [transfer, recipient]);

  async function handleCopyContent() {
    const ok = await copyText(content);
    setContentCopied(ok);
    if (ok) window.setTimeout(() => setContentCopied(false), 2500);
  }

  return (
    <Sheet
      open={transfer !== null}
      onClose={onClose}
      title={recipient ? `Thanh toán — ${recipient.name}` : 'Thanh toán'}
    >
      {transfer && recipient && (
        <div className="grid gap-4">
          <div className="text-center">
            <p className="font-figure text-[32px] leading-none font-bold text-ink">
              {formatVND(transfer.amount)}
            </p>
            <p className="mt-1.5 text-sm text-ink-2">
              {sender?.name ?? 'Thành viên'} chuyển cho {recipient.name}
            </p>
          </div>

          {canQr ? (
            <>
              <div className="mx-auto flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-lg border border-line bg-white p-2">
                {qrState.status === 'ready' ? (
                  // src là data URL do thư viện qrcode sinh tại máy —
                  // next/image không xử lý data URL và QR phải hiển thị
                  // offline, nên <img> thường là đúng ở đây.
                  // eslint-disable-next-line @next/next/no-img-element -- QR là data URL sinh tại máy, next/image không xử lý data URL và QR phải hiện được offline
                  <img
                    src={qrState.dataUrl}
                    alt={`Mã VietQR: ${sender?.name ?? ''} chuyển ${formatVND(transfer.amount)} cho ${recipient.name}`}
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
              <dl className="grid gap-1.5 text-base">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-muted">Ngân hàng</dt>
                  <dd className="min-w-0 font-medium break-words text-ink">
                    {recipient.bank.bankName}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-muted">Số tài khoản</dt>
                  <dd className="font-figure font-medium whitespace-nowrap text-ink">
                    {maskAccountNumber(recipient.bank.accountNumber)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-muted">Chủ tài khoản</dt>
                  <dd className="min-w-0 font-medium break-words text-ink">
                    {recipient.bank.accountName}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted">Nội dung</dt>
                  <dd className="flex min-w-0 items-start gap-1.5">
                    {/* Ngắt tại khoảng trắng (break-words), không xé giữa
                        từ như break-all cũ — hàng được xuống 2 dòng gọn. */}
                    <span className="min-w-0 text-right font-medium break-words text-ink">
                      {content}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyContent}
                      aria-label="Sao chép nội dung chuyển khoản"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink transition duration-100 ease-[var(--ease-lock)] hover:border-brand hover:text-brand-deep"
                    >
                      {contentCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </button>
                  </dd>
                </div>
              </dl>
              {/* SEC-12.6 rút còn 1 dòng: cảnh báo lệch tên tại chỗ. */}
              <p className="text-center text-xs leading-relaxed font-semibold text-brand-deep">
                Trước khi quét, kiểm tra tên chủ tài khoản ở trên có đúng người nhận không.
              </p>
            </>
          ) : (
            <div className="grid gap-2">
              <p className="text-base text-ink">
                Chưa có tài khoản của {recipient.name} trên máy này
              </p>
              <GhostButton onClick={() => onEditMember(recipient)}>Nhập tài khoản</GhostButton>
            </div>
          )}

          {paid ? (
            <div className="flex flex-wrap items-center gap-2">
              <p
                role="status"
                className="flex items-center gap-1.5 text-base font-semibold text-credit-ink"
              >
                <IconCheck size={16} aria-hidden /> Đã trả khoản này
              </p>
              <GhostButton onClick={() => onSetPaid(transfer, false)} className="ml-auto">
                Đánh dấu chưa trả
              </GhostButton>
            </div>
          ) : (
            <PrimaryButton
              onClick={() => {
                onSetPaid(transfer, true);
                onClose();
              }}
              className="w-full"
            >
              <IconCheck size={16} /> Đã trả {formatVNDDisplay(transfer.amount)}
            </PrimaryButton>
          )}
        </div>
      )}
    </Sheet>
  );
}
