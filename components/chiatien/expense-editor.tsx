'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconChevronDown, IconX } from './icons';
import { assignIdentityColors } from '@/lib/identity';
import { formatVND } from '@/lib/money';
import { computeShares, validateExpenseDraft, type ExpenseDraft } from '@/lib/split';
import { clearExpenseDraft, loadExpenseDraft, saveExpenseDraft } from '@/lib/storage';
import type { Expense, Member, SplitMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, GhostButton, PrimaryButton, inputClass, labelClass } from './ui-bits';
import { AMOUNT_CAP_MESSAGE, MoneyInput } from './money-input';

const MODE_LABELS: Record<SplitMode, string> = {
  equal: 'Chia đều',
  custom: 'Tuỳ chỉnh',
  shares: 'Theo phần',
};

/** Giải thích 1 dòng TẠI ĐIỂM CHỌN cho cả 3 kiểu chia (COPY-DIET §2 dòng 11). */
const MODE_HINTS: Record<SplitMode, string> = {
  equal: 'Chia đều cho những người được chọn.',
  custom: 'Nhập đúng số tiền từng người chịu — tổng phải khớp.',
  shares: 'Ví dụ: ở 2/3 đêm thì nhập 2 phần.',
};

export interface ExpenseSave extends ExpenseDraft {
  id?: string;
}

/**
 * Nội dung Expense Sheet (thêm/sửa khoản) — vỏ Sheet do sheet.tsx đảm
 * nhiệm. Mẫu Validation Thống Nhất (DESIGN-LANGUAGE §13.1): một nguồn
 * kiểm duy nhất là validateExpenseDraft của lib/split.ts; lỗi tại trường
 * + tóm tắt role="alert" ngay trên nút Lưu; nút Lưu disabled-CÓ-LÝ-DO
 * ngay từ trạng thái mở đầu (lý do = điều còn thiếu gần nhất).
 *
 * Draft đang nhập (W5-06): draftKey -> giữ localStorage, khôi phục khi mở
 * lại kèm dòng "Đã khôi phục nội dung bạn nhập dở…".
 */
export function ExpenseEditor({
  members,
  initial,
  draftKey,
  onSave,
  onSaveAndMore,
  onCancel,
}: {
  members: Member[];
  initial?: Expense;
  draftKey?: string;
  onSave: (draft: ExpenseSave) => void;
  /** "Lưu & thêm nữa": lưu nhưng sheet Ở LẠI (session-view không đóng). */
  onSaveAndMore?: (draft: ExpenseSave) => void;
  onCancel: () => void;
}) {
  const [restoredDraft] = useState<ExpenseDraft | null>(() =>
    draftKey ? loadExpenseDraft(draftKey) : null,
  );
  const [title, setTitle] = useState(restoredDraft?.title ?? initial?.title ?? '');
  const [amount, setAmount] = useState(restoredDraft?.amount ?? initial?.amount ?? 0);
  const [payerId, setPayerId] = useState(
    restoredDraft?.payerId ?? initial?.payerId ?? members[0]?.id ?? '',
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    restoredDraft?.participantIds ?? initial?.participantIds ?? members.map((m) => m.id),
  );
  const [mode, setMode] = useState<SplitMode>(restoredDraft?.mode ?? initial?.mode ?? 'equal');
  const [custom, setCustom] = useState<Record<string, number>>(
    restoredDraft?.custom ?? initial?.custom ?? {},
  );
  const [weights, setWeights] = useState<Record<string, number>>(
    restoredDraft?.weights ?? initial?.weights ?? {},
  );
  const [touched, setTouched] = useState(false);
  const [capError, setCapError] = useState(false);
  const [savedMoreNotice, setSavedMoreNotice] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const colors = useMemo(() => assignIdentityColors(members), [members]);
  const colorOf = (id: string) => {
    const idx = members.findIndex((m) => m.id === id);
    return idx >= 0 ? (colors[idx] ?? 0) : 0;
  };

  const effectiveCustom = useMemo(
    () => Object.fromEntries(participantIds.map((id) => [id, custom[id] ?? 0])),
    [participantIds, custom],
  );
  const effectiveWeights = useMemo(
    () => Object.fromEntries(participantIds.map((id) => [id, weights[id] ?? 1])),
    [participantIds, weights],
  );
  const draft: ExpenseDraft = {
    title,
    amount,
    payerId,
    participantIds,
    mode,
    custom: effectiveCustom,
    weights: effectiveWeights,
  };
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const errors = validateExpenseDraft(draft, memberIds);

  // Lý do disabled của nút Lưu — điều còn thiếu GẦN NHẤT, có ngay từ lúc
  // sheet vừa mở (COPY-DIET §5, R3-10).
  const customSum = participantIds.reduce((s, id) => s + (custom[id] ?? 0), 0);
  const saveReason =
    errors.length === 0
      ? undefined
      : amount <= 0
        ? 'Nhập số tiền để lưu khoản chi'
        : !memberIds.includes(payerId)
          ? 'Chọn người trả để lưu khoản chi'
          : participantIds.length === 0
            ? 'Chọn ít nhất 1 người cùng chia để lưu khoản chi'
            : mode === 'custom' && customSum !== amount
              ? 'Tổng các phần chưa khớp số tiền khoản chi'
              : !title.trim()
                ? 'Nhập tên khoản chi để lưu'
                : errors[0];

  const preview = useMemo(() => {
    if (amount <= 0 || participantIds.length === 0) return null;
    if (mode === 'custom') {
      const sum = participantIds.reduce((s, id) => s + (custom[id] ?? 0), 0);
      return { kind: 'custom' as const, sum, diff: amount - sum };
    }
    const shares = computeShares({
      id: 'preview',
      title,
      amount,
      payerId,
      participantIds,
      mode,
      custom: effectiveCustom,
      weights: effectiveWeights,
      createdAt: 0,
    });
    return { kind: 'computed' as const, shares };
  }, [amount, participantIds, mode, custom, effectiveCustom, effectiveWeights, payerId, title]);

  useEffect(() => {
    if (!draftKey) return;
    saveExpenseDraft(draftKey, { title, amount, payerId, participantIds, mode, custom, weights });
  }, [draftKey, title, amount, payerId, participantIds, mode, custom, weights]);

  function handleSave() {
    if (errors.length > 0) return;
    if (draftKey) clearExpenseDraft(draftKey);
    onSave({ ...draft, id: initial?.id });
  }

  function handleSaveAndMore() {
    if (errors.length > 0) return;
    const savedTitle = title;
    if (draftKey) clearExpenseDraft(draftKey);
    if (onSaveAndMore) onSaveAndMore({ ...draft, id: initial?.id });
    else onSave({ ...draft, id: initial?.id });
    // Reset tên khoản + số tiền; GIỮ người trả / kiểu chia / người cùng chia.
    // Cả cờ touched: form mới phải mở SẠCH — nếu giữ touched, tóm tắt lỗi
    // của form vừa lưu (tên trống + số tiền 0) hiện ngay khi chưa chạm ô
    // nào (Panel #03, MINOR R3-F3: mở ra đã sẵn 2 lỗi chưa chạm).
    setTitle('');
    setAmount(0);
    setCustom({});
    setWeights({});
    setTouched(false);
    setCapError(false);
    setSavedMoreNotice(`Đã lưu khoản ${savedTitle} — ghi tiếp khoản mới`);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  }

  function handleCancel() {
    if (draftKey) clearExpenseDraft(draftKey);
    onCancel();
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const allSelected = participantIds.length === members.length;
  const equalShareValues =
    preview?.kind === 'computed' && mode === 'equal' ? Object.values(preview.shares) : [];
  const equalShare = equalShareValues.length > 0 ? Math.max(...equalShareValues) : 0;
  const hasRemainder =
    mode === 'equal' && participantIds.length > 0 && amount % participantIds.length !== 0;

  return (
    // Cột grid PHẢI chốt minmax(0,1fr) (Finding B, Panel #03): cột ngầm
    // của `grid` được định cỡ theo min-content của các section con — mà
    // min-content của chip tên dài (span truncate = nowrap) bằng NGUYÊN
    // bề rộng chuỗi 45 ký tự, nên cột phình tới 416px và dialog tràn
    // ngang ở mọi bề rộng máy (đo thật: dialog scrollWidth 440 ở cả 320
    // lẫn 390). minmax(0,1fr) biến cột thành bề rộng xác định theo
    // container, chip mới co lại bằng flex + truncate như thiết kế.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" onChange={() => setTouched(true)}>
      {restoredDraft && (
        <p role="status" className="text-base font-medium text-brand-deep">
          Đã khôi phục nội dung bạn nhập dở — kiểm tra lại rồi bấm lưu, hoặc bấm Huỷ để bỏ nháp này.
        </p>
      )}
      {savedMoreNotice && (
        <p role="status" aria-live="polite" className="text-base font-medium text-brand-deep">
          {savedMoreNotice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label className={labelClass} htmlFor="expense-title">
            Khoản chi
          </label>
          <input
            ref={titleInputRef}
            id="expense-title"
            className={inputClass}
            placeholder="Ví dụ: Tiền phòng, Ăn tối, Xăng xe…"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <span className={labelClass}>Số tiền</span>
          <MoneyInput
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setCapError(false);
            }}
            onCapError={() => setCapError(true)}
            ariaLabel="Số tiền khoản chi"
          />
          {capError && (
            <p role="alert" className="mt-1.5 text-base font-medium text-debt-ink">
              {AMOUNT_CAP_MESSAGE}
            </p>
          )}
        </div>
      </div>

      <div>
        <span className={labelClass} id="payer-label">
          Người trả tiền
        </span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="payer-label">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={payerId === m.id}
              onClick={() => setPayerId(m.id)}
              className={cn(
                'inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full border px-3 py-2 text-base font-semibold transition duration-100 ease-[var(--ease-lock)]',
                payerId === m.id
                  ? 'border-brand bg-brand text-ink-on-seed'
                  : 'border-line-strong bg-card text-ink hover:border-brand-deep',
              )}
            >
              <Avatar name={m.name} colorIndex={colorOf(m.id)} size={24} />
              <span className="min-w-0 truncate">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={cn(labelClass, 'mb-0')}>Người cùng chia</span>
          <button
            type="button"
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center px-2 text-base font-semibold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
            onClick={() => setParticipantIds(allSelected ? [] : members.map((m) => m.id))}
          >
            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const active = participantIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleParticipant(m.id)}
                className={cn(
                  'inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full border px-3 py-2 text-base font-semibold transition duration-100 ease-[var(--ease-lock)]',
                  active
                    ? 'border-brand bg-brand-soft text-brand-950'
                    : 'border-line-strong bg-card text-ink hover:border-brand-deep',
                )}
              >
                <Avatar name={m.name} colorIndex={colorOf(m.id)} size={24} />
                <span className="min-w-0 truncate">{m.name}</span>
                {active && <IconCheck size={14} aria-hidden className="shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className={labelClass} id="split-mode-label">
          Kiểu chia
        </span>
        <div
          className="grid grid-cols-3 gap-1 rounded-lg border border-line-strong bg-card p-1"
          role="radiogroup"
          aria-labelledby="split-mode-label"
        >
          {(Object.keys(MODE_LABELS) as SplitMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-base font-bold transition duration-100 ease-[var(--ease-lock)]',
                mode === m ? 'bg-ink text-white' : 'text-ink hover:bg-brand-soft/60',
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-base text-ink-2">{MODE_HINTS[mode]}</p>
      </div>

      {mode === 'custom' && participantIds.length > 0 && (
        <div className="grid gap-2">
          {participantIds.map((id) => {
            const member = members.find((m) => m.id === id);
            if (!member) return null;
            return (
              <div key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="flex min-w-0 items-center gap-2 text-base font-medium text-ink">
                  <Avatar name={member.name} colorIndex={colorOf(member.id)} size={24} />
                  <span className="line-clamp-2 min-w-0">{member.name}</span>
                </span>
                <MoneyInput
                  className="w-[136px] shrink-0"
                  value={custom[id] ?? 0}
                  onChange={(v) => setCustom((prev) => ({ ...prev, [id]: v }))}
                  onCapError={() => setCapError(true)}
                  ariaLabel={`Số tiền ${member.name} phải chịu`}
                />
              </div>
            );
          })}
          {preview?.kind === 'custom' && (
            <p
              aria-live="polite"
              className={cn(
                'text-base font-semibold',
                preview.diff === 0 ? 'text-credit-ink' : 'text-debt-ink',
              )}
            >
              Đã phân bổ {formatVND(preview.sum)} / {formatVND(amount)}
              {preview.diff !== 0 &&
                ` — ${preview.diff > 0 ? 'còn thiếu' : 'thừa'} ${formatVND(Math.abs(preview.diff))}`}
              {preview.diff === 0 && ' — đã khớp'}
            </p>
          )}
        </div>
      )}

      {mode === 'shares' && participantIds.length > 0 && (
        <div className="grid gap-2">
          {participantIds.map((id) => {
            const member = members.find((m) => m.id === id);
            if (!member) return null;
            return (
              <div key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="flex min-w-0 items-center gap-2 text-base font-medium text-ink">
                  <Avatar name={member.name} colorIndex={colorOf(member.id)} size={24} />
                  <span className="line-clamp-2 min-w-0">{member.name}</span>
                </span>
                <span className="flex w-[136px] shrink-0 items-center gap-2">
                  {preview?.kind === 'computed' && (
                    <span className="font-figure hidden text-sm whitespace-nowrap text-ink-2 min-[420px]:inline">
                      ≈ {formatVND(preview.shares[id] ?? 0)}
                    </span>
                  )}
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    aria-label={`Số phần của ${member.name}`}
                    className="min-h-11 w-full min-w-0 rounded-lg border border-line-strong bg-card px-3 py-2.5 text-right text-base font-semibold text-ink outline-none transition duration-100 ease-[var(--ease-lock)] focus:border-brand-deep"
                    value={weights[id] ?? 1}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [id]: Number(e.target.value) }))
                    }
                  />
                  <span className="shrink-0 text-base text-ink-2">phần</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'equal' && preview?.kind === 'computed' && (
        <div className="text-base text-ink-2">
          <p>
            Mỗi người chịu{' '}
            <span className="font-figure font-bold text-ink">{formatVND(equalShare)}</span>
          </p>
          {hasRemainder && (
            <details className="mt-1">
              <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-medium text-brand-deep">
                Vì sao có người hơn vài đồng? <IconChevronDown size={14} aria-hidden />
              </summary>
              <p className="pt-1">
                Phần lẻ vài đồng dồn cho người đầu danh sách để tổng khớp tuyệt đối.
              </p>
            </details>
          )}
        </div>
      )}

      {/* Tóm tắt validation ngay trên nút Lưu (Mẫu Validation Thống Nhất). */}
      {touched && errors.length > 0 && (
        <ul role="alert" className="grid gap-1 text-base font-medium text-debt-ink">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <PrimaryButton disabledReason={saveReason} onClick={handleSave}>
          <IconCheck size={16} /> {initial ? 'Lưu thay đổi' : 'Thêm khoản chi'}
        </PrimaryButton>
        {!initial && (
          <GhostButton disabled={errors.length > 0} onClick={handleSaveAndMore}>
            Lưu &amp; thêm nữa
          </GhostButton>
        )}
        <GhostButton onClick={handleCancel}>
          <IconX size={16} /> Huỷ
        </GhostButton>
      </div>
    </div>
  );
}
