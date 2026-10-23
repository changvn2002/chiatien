'use client';

import { useState } from 'react';
import { Check, Landmark, X } from 'lucide-react';
import { BANKS } from '@/lib/vietqr';
import type { BankInfo, Member } from '@/lib/types';
import { GhostButton, PrimaryButton, inputClass, labelClass } from './ui-bits';

export interface MemberDraft {
  name: string;
  bank?: BankInfo;
}

/**
 * Form thêm/sửa một thành viên. Thông tin ngân hàng là tuỳ chọn — điền thì
 * các giao dịch quyết toán trả cho người này mới có mã VietQR để quét.
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
  const [hasBank, setHasBank] = useState(Boolean(initial?.bank));
  const [bin, setBin] = useState(initial?.bank?.bin ?? BANKS[0].bin);
  const [accountNumber, setAccountNumber] = useState(initial?.bank?.accountNumber ?? '');
  const [accountName, setAccountName] = useState(initial?.bank?.accountName ?? '');
  const [error, setError] = useState('');

  function handleSave() {
    if (!name.trim()) {
      setError('Chưa nhập tên thành viên.');
      return;
    }
    if (hasBank) {
      const bank = BANKS.find((b) => b.bin === bin);
      if (!bank) {
        setError('Chưa chọn ngân hàng.');
        return;
      }
      if (!accountNumber.trim()) {
        setError('Đã bật thông tin ngân hàng thì cần nhập số tài khoản.');
        return;
      }
      if (!accountName.trim()) {
        setError('Đã bật thông tin ngân hàng thì cần nhập tên chủ tài khoản.');
        return;
      }
      onSave({
        name: name.trim(),
        bank: {
          bin: bank.bin,
          bankName: bank.shortName,
          accountNumber: accountNumber.replace(/\s/g, ''),
          accountName: accountName.trim().toUpperCase(),
        },
      });
      return;
    }
    onSave({ name: name.trim() });
  }

  return (
    <div className="rounded-2xl border border-brand/40 bg-brand-soft/40 p-4">
      <div className="grid gap-3">
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

        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={hasBank}
            onChange={(e) => setHasBank(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          <Landmark size={16} className="text-brand" />
          Thêm tài khoản ngân hàng (để nhận tiền qua VietQR)
        </label>

        {hasBank && (
          <div className="grid gap-3 sm:grid-cols-3">
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
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-debt">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <PrimaryButton onClick={handleSave}>
            <Check size={16} /> Lưu thành viên
          </PrimaryButton>
          <GhostButton onClick={onCancel}>
            <X size={16} /> Huỷ
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
