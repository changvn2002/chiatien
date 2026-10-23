'use client';

import { useState } from 'react';
import { Check, Landmark, X } from 'lucide-react';
import { BANKS, accountNumberError, normalizeAccountNumber } from '@/lib/vietqr';
import type { BankInfo, Member } from '@/lib/types';
import { GhostButton, PrimaryButton, inputClass, labelClass } from './ui-bits';

export interface MemberDraft {
  name: string;
  bank?: BankInfo;
}

/**
 * Nội dung form thêm/sửa một thành viên — vỏ bottom-sheet/dialog do
 * components/chiatien/sheet.tsx đảm nhiệm. Thông tin ngân hàng là tuỳ chọn
 * và CHỈ lưu trên máy này (sổ ngân hàng per-device, DATA-04): điền thì các
 * giao dịch quyết toán trả cho người này mới có mã VietQR tại máy này.
 */
export function MemberEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Member;
  onSave: (draft: MemberDraft) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [wantsBank, setWantsBank] = useState(Boolean(initial?.bank));
  const [bin, setBin] = useState(initial?.bank?.bin ?? BANKS[0].bin);
  const [accountNumber, setAccountNumber] = useState(initial?.bank?.accountNumber ?? '');
  const [accountName, setAccountName] = useState(initial?.bank?.accountName ?? '');
  const [error, setError] = useState('');

  function handleSave() {
    if (!name.trim()) {
      setError('Chưa nhập tên thành viên.');
      return;
    }
    if (wantsBank) {
      const bank = BANKS.find((b) => b.bin === bin);
      if (!bank) {
        setError('Chưa chọn ngân hàng.');
        return;
      }
      if (!accountNumber.trim()) {
        setError('Đã bật lưu tài khoản thì cần nhập số tài khoản.');
        return;
      }
      // M-3 (Panel #02): validate ĐỊNH DẠNG số tài khoản ngay tại điểm
      // lưu — số rác ("abc", "12") bị chặn kèm lý do cụ thể, không lưu,
      // thay vì lưu xong rồi UI vẫn khẳng định "có VietQR".
      const acctError = accountNumberError(accountNumber);
      if (acctError) {
        setError(acctError);
        return;
      }
      if (!accountName.trim()) {
        setError('Đã bật lưu tài khoản thì cần nhập tên chủ tài khoản.');
        return;
      }
      onSave({
        name: name.trim(),
        bank: {
          bin: bank.bin,
          bankName: bank.shortName,
          accountNumber: normalizeAccountNumber(accountNumber),
          accountName: accountName.trim().toUpperCase(),
        },
      });
      return;
    }
    onSave({ name: name.trim() });
  }

  return (
    <div className="grid gap-4">
      <div>
        <label className={labelClass} htmlFor="member-name">
          Tên thành viên
        </label>
        <input
          id="member-name"
          className={inputClass}
          placeholder="Ví dụ: An, Bình, chị Chi…"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
      </div>

      <div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={wantsBank}
            onChange={(e) => setWantsBank(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-brand"
          />
          <Landmark size={16} className="shrink-0 text-brand-deep" aria-hidden />
          <span>Lưu tài khoản ngân hàng trên máy này (để tạo VietQR)</span>
        </label>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Tài khoản chỉ lưu trên máy này để tạo mã QR khi quyết toán — không nằm trong link chia sẻ,
          không gửi đi đâu.
        </p>
        {/* DATA-09b: hướng dẫn trách nhiệm tại đúng điểm nhập — số tài
            khoản là dữ liệu của người khác khi nhập hộ. */}
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Chỉ nhập tài khoản của chính người này, khi họ đồng ý cho lưu trên máy này để nhận tiền
          qua VietQR.
        </p>
      </div>

      {wantsBank && (
        <div className="grid gap-3">
          <div>
            <label className={labelClass} htmlFor="member-bank">
              Ngân hàng
            </label>
            <select
              id="member-bank"
              className={inputClass}
              value={bin}
              onChange={(e) => setBin(e.target.value)}
            >
              {BANKS.map((b) => (
                <option key={b.bin} value={b.bin}>
                  {b.shortName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="member-account">
                Số tài khoản
              </label>
              <input
                id="member-account"
                className={inputClass}
                inputMode="numeric"
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="member-account-name">
                Tên chủ tài khoản
              </label>
              <input
                id="member-account-name"
                className={inputClass}
                placeholder="NGUYEN VAN AN"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-debt">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={handleSave}>
          <Check size={16} /> Lưu thành viên
        </PrimaryButton>
        <GhostButton onClick={onCancel}>
          <X size={16} /> Huỷ
        </GhostButton>
      </div>
    </div>
  );
}
