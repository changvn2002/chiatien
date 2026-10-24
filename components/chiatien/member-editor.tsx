'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconBank, IconTrash, IconX } from './icons';
import {
  findDuplicateMember,
  memberNameKey,
  normalizeMemberName,
  parseBulkMemberNames,
} from '@/lib/identity';
import {
  BANKS,
  accountNumberError,
  isValidAccountNumber,
  normalizeAccountNumber,
} from '@/lib/vietqr';
import type { BankInfo, Member } from '@/lib/types';
import { GhostButton, PrimaryButton, inputClass, labelClass } from './ui-bits';

export interface MemberDraft {
  name: string;
  bank?: BankInfo;
}

/**
 * Nội dung Member Sheet (thêm/sửa người) — vỏ Sheet do sheet.tsx đảm
 * nhiệm. Ngân hàng CHỈ lưu trên máy này (sổ per-device, DATA-04).
 *
 * REDESIGN-V2:
 * - Thêm hàng loạt bằng dấu phẩy ở chế độ thêm mới (D-6): xem trước tại
 *   chỗ, tên trùng (với nhóm hoặc trong chính danh sách) bị đánh dấu +
 *   bỏ qua, phần hợp lệ vẫn thêm được; bulk KHÔNG hiện khối ngân hàng.
 * - Chống trùng tên (D-3): chuẩn hoá NFC/trim/gộp khoảng trắng/hạ chữ
 *   thường qua lib/identity; trùng -> lỗi tại trường nguyên văn
 *   COPY-DIET §5 + đường mở đúng thành viên đã có.
 * - Validation số tài khoản (M-3): accountNumberError của lib/vietqr là
 *   nguồn sự thật duy nhất — kiểm khi blur + khi Lưu, lỗi nguyên văn của
 *   lib hiện dưới ô, nút Lưu disabled-có-lý-do tới khi hợp lệ, dữ liệu
 *   không đạt KHÔNG được lưu. Bank cũ không còn hợp lệ -> trạng thái
 *   "Số tài khoản chưa hợp lệ — kiểm tra lại", không khẳng định Có QR.
 */
export function MemberEditor({
  initial,
  members = [],
  autoEnableBank = false,
  onSave,
  onSaveBulk,
  onOpenExisting,
  onDeleteRequest,
  onCancel,
}: {
  initial?: Member;
  /** Thành viên hiện có của cuộc chia — cho chống trùng tên + bulk. */
  members?: Member[];
  /** Mở từ khối thiếu-QR: công tắc ngân hàng bật sẵn + focus ô ngân hàng. */
  autoEnableBank?: boolean;
  onSave: (draft: MemberDraft) => void;
  onSaveBulk?: (names: string[]) => void;
  onOpenExisting?: (member: Member) => void;
  /** Xoá thành viên ở chân sheet (chỉ khi sửa) — cha xử lý confirm/chặn. */
  onDeleteRequest?: (member: Member) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [wantsBank, setWantsBank] = useState(Boolean(initial?.bank) || autoEnableBank);
  const [bin, setBin] = useState(initial?.bank?.bin ?? BANKS[0].bin);
  const [accountNumber, setAccountNumber] = useState(initial?.bank?.accountNumber ?? '');
  const [accountName, setAccountName] = useState(initial?.bank?.accountName ?? '');
  const [nameError, setNameError] = useState('');
  const [acctBlurred, setAcctBlurred] = useState(false);
  const [bankError, setBankError] = useState('');
  const bankSelectRef = useRef<HTMLSelectElement>(null);

  // Mở từ khối thiếu-QR: focus vào ô ngân hàng khi sheet mở.
  useEffect(() => {
    if (autoEnableBank) bankSelectRef.current?.focus();
  }, [autoEnableBank]);

  const initialBankInvalid = Boolean(
    initial?.bank && !isValidAccountNumber(initial.bank.accountNumber),
  );

  /* ---------------- Thêm hàng loạt (chỉ chế độ thêm mới) ---------------- */
  const bulkParsed = useMemo(
    () => (!initial && name.includes(',') ? parseBulkMemberNames(name) : []),
    [initial, name],
  );
  const isBulk = bulkParsed.length >= 2;
  const bulkAnalysis = useMemo(() => {
    if (!isBulk) return { valid: [] as string[], duplicates: [] as string[] };
    const valid: string[] = [];
    const duplicates: string[] = [];
    const seen = new Set<string>();
    for (const part of bulkParsed) {
      const key = memberNameKey(part);
      if (seen.has(key) || findDuplicateMember(members, part)) duplicates.push(part);
      else {
        valid.push(part);
        seen.add(key);
      }
    }
    return { valid, duplicates };
  }, [isBulk, bulkParsed, members]);

  /* ---------------- Validation ngân hàng (M-3) ---------------- */
  const acctError = wantsBank && !isBulk ? accountNumberError(accountNumber) : null;
  const showAcctError = Boolean(
    acctError && (acctBlurred || bankError || accountNumber.trim().length > 0),
  );
  // Nút Lưu disabled-có-lý-do CHỈ vì dữ liệu ngân hàng chưa hợp lệ —
  // các lỗi tên còn lại chặn ở điểm Lưu kèm lỗi tại trường như Mẫu
  // Validation Thống Nhất.
  const bankSaveReason =
    wantsBank && !isBulk
      ? (acctError ??
        (!accountName.trim() ? 'Chưa nhập tên chủ tài khoản.' : undefined) ??
        undefined)
      : undefined;

  function buildBank(): BankInfo | null {
    const bank = BANKS.find((b) => b.bin === bin);
    if (!bank) {
      setBankError('Chưa chọn ngân hàng.');
      return null;
    }
    const err = accountNumberError(accountNumber);
    if (err) {
      setBankError(err);
      return null;
    }
    if (!accountName.trim()) {
      setBankError('Đã bật lưu tài khoản thì cần nhập tên chủ tài khoản.');
      return null;
    }
    return {
      bin: bank.bin,
      bankName: bank.shortName,
      accountNumber: normalizeAccountNumber(accountNumber),
      accountName: accountName.trim().toUpperCase(),
    };
  }

  function handleSave() {
    setNameError('');
    setBankError('');

    if (isBulk) {
      if (bulkAnalysis.valid.length === 0) return;
      if (onSaveBulk) onSaveBulk(bulkAnalysis.valid);
      else bulkAnalysis.valid.forEach((n) => onSave({ name: n }));
      return;
    }

    const trimmed = normalizeMemberName(name);
    if (!trimmed) {
      setNameError('Chưa nhập tên thành viên.');
      return;
    }
    if (name.includes(',')) {
      // Sửa một người (hoặc thêm đơn lẻ) mà tên chứa dấu phẩy: dấu phẩy là
      // ký tự tách danh sách, không phải ký tự tên.
      setNameError('Tên thành viên không chứa dấu phẩy — hãy bỏ dấu phẩy trong tên để lưu.');
      return;
    }
    const duplicate = findDuplicateMember(members, trimmed, initial?.id);
    if (duplicate) {
      setNameError(
        `Đã có thành viên tên “${duplicate.name}” trong cuộc chia này. Hãy thêm ký tự phân biệt (ví dụ họ hoặc biệt danh), hoặc mở thành viên đó để sửa.`,
      );
      return;
    }
    if (wantsBank) {
      const bank = buildBank();
      if (!bank) return;
      onSave({ name: trimmed, bank });
      return;
    }
    onSave({ name: trimmed });
  }

  const duplicateForAction = !isBulk ? findDuplicateMember(members, name, initial?.id) : undefined;
  const saveLabel = isBulk
    ? `Thêm ${bulkAnalysis.valid.length} người`
    : initial
      ? 'Lưu thành viên'
      : 'Lưu thành viên';

  return (
    // Cột minmax(0,1fr): cùng chốt chống phình min-content như
    // ExpenseEditor (Finding B — cột grid ngầm định cỡ theo min-content
    // của section con có thể tràn dialog).
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <label className={labelClass} htmlFor="member-name">
          Tên thành viên
        </label>
        <input
          id="member-name"
          className={inputClass}
          placeholder="Ví dụ: An, Bình, chị Chi…"
          value={name}
          autoFocus={!autoEnableBank}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        {!initial && (
          <p className="mt-1 text-xs text-ink-2">
            Thêm nhiều người một lúc: ngăn cách bằng dấu phẩy.
          </p>
        )}
        {nameError && (
          <div className="mt-1.5">
            <p role="alert" className="text-base font-medium text-debt-ink">
              {nameError}
            </p>
            {duplicateForAction && onOpenExisting && (
              <button
                type="button"
                onClick={() => onOpenExisting(duplicateForAction)}
                className="mt-1 inline-flex min-h-11 items-center text-base font-semibold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
              >
                Mở thành viên “{duplicateForAction.name}” để sửa
              </button>
            )}
          </div>
        )}
        {isBulk && (
          <div className="mt-2 grid gap-1">
            <p role="status" className="text-base font-medium text-ink">
              Sẽ thêm {bulkAnalysis.valid.length} người: {bulkAnalysis.valid.join(' · ')}
            </p>
            {bulkAnalysis.duplicates.map((dup) => (
              <p key={dup} className="text-base font-medium text-debt-ink">
                “{dup}” đã có trong cuộc chia — sẽ bỏ qua
              </p>
            ))}
          </div>
        )}
      </div>

      {!isBulk && (
        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-base font-medium text-ink">
            <input
              type="checkbox"
              checked={wantsBank}
              onChange={(e) => setWantsBank(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-brand"
            />
            <IconBank size={16} className="shrink-0 text-brand-deep" aria-hidden />
            <span>Lưu tài khoản trên máy này để tạo VietQR</span>
          </label>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">
            Chỉ lưu trên máy này — không đi theo link chia sẻ. Ai nhận tiền qua QR thì lưu tài khoản
            ngay trên máy của mình.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">
            Chỉ nhập tài khoản của chính người này, khi họ đồng ý cho lưu trên máy này để nhận tiền
            qua VietQR.
          </p>
        </div>
      )}

      {!isBulk && wantsBank && (
        <div className="grid gap-3">
          <div>
            <label className={labelClass} htmlFor="member-bank">
              Ngân hàng
            </label>
            <select
              ref={bankSelectRef}
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
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                onBlur={() => setAcctBlurred(true)}
                // Panel #05 F-R5-2 (MINOR): nối dây chương trình trường ↔
                // lỗi — khi lỗi hiện, input mang aria-invalid="true" và
                // aria-describedby trỏ đúng id của <p role="alert"> lỗi
                // bên dưới; khi không lỗi, cả hai thuộc tính đều vắng mặt.
                aria-invalid={showAcctError && acctError ? true : undefined}
                aria-describedby={showAcctError && acctError ? 'member-account-error' : undefined}
              />
              {initialBankInvalid && (
                <p className="mt-1.5 text-base font-medium text-debt-ink">
                  Số tài khoản chưa hợp lệ — kiểm tra lại
                </p>
              )}
              {showAcctError && acctError && (
                <p
                  id="member-account-error"
                  role="alert"
                  className="mt-1.5 text-base font-medium text-debt-ink"
                >
                  {acctError}
                </p>
              )}
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

      {bankError && bankError !== acctError && (
        <p role="alert" className="text-base font-medium text-debt-ink">
          {bankError}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <PrimaryButton
          disabledReason={
            isBulk && bulkAnalysis.valid.length === 0
              ? 'Tất cả tên đều đã có trong cuộc chia'
              : !isBulk && !name.trim()
                ? // Cùng mẫu ExpenseEditor: điều còn thiếu GẦN NHẤT hiện
                  // ngay từ lúc mở form, không đợi tới điểm Lưu (Panel
                  // #03, MINOR R3-F4: form thành viên thiếu dòng lý do
                  // khi mở mà các form khác đã có).
                  'Nhập tên thành viên để lưu'
                : bankSaveReason
          }
          onClick={handleSave}
        >
          <IconCheck size={16} /> {saveLabel}
        </PrimaryButton>
        <GhostButton onClick={onCancel}>
          <IconX size={16} /> Huỷ
        </GhostButton>
      </div>

      {initial && onDeleteRequest && (
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => onDeleteRequest(initial)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-base font-semibold text-debt-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-debt-bg"
          >
            <IconTrash size={15} aria-hidden /> Xoá thành viên
          </button>
        </div>
      )}
    </div>
  );
}
