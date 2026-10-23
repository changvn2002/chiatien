'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { formatVND } from '@/lib/money';
import { computeShares, validateExpenseDraft, type ExpenseDraft } from '@/lib/split';
import { clearExpenseDraft, loadExpenseDraft, saveExpenseDraft } from '@/lib/storage';
import type { Expense, Member, SplitMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, GhostButton, PrimaryButton, inputClass, labelClass } from './ui-bits';
import { MoneyInput } from './money-input';

const MODE_LABELS: Record<SplitMode, string> = {
  equal: 'Chia đều',
  custom: 'Tuỳ chỉnh',
  shares: 'Theo phần',
};

export interface ExpenseSave extends ExpenseDraft {
  id?: string;
}

/**
 * Nội dung form thêm/sửa khoản chi — vỏ bottom-sheet/dialog do
 * components/chiatien/sheet.tsx đảm nhiệm: tên, số tiền, người trả, nhóm
 * người cùng chia và 1 trong 3 kiểu chia. Lỗi validate hiển thị trực tiếp,
 * nút Lưu chỉ bấm được khi khoản chi hợp lệ — đặc biệt kiểu tuỳ chỉnh bắt
 * tổng phải khớp.
 *
 * Draft đang nhập (W5-06 / backlog F4): khi được cấp draftKey, mọi thay
 * đổi trong form được giữ vào localStorage và khôi phục nguyên trạng khi
 * form mở lại — reload trang (hoặc lỡ tay đóng tab) không còn làm mất
 * khoản đang gõ dở. Draft bị xoá khi lưu thành công hoặc bấm Huỷ.
 */
export function ExpenseEditor({
  members,
  initial,
  draftKey,
  onSave,
  onCancel,
}: {
  members: Member[];
  initial?: Expense;
  draftKey?: string;
  onSave: (draft: ExpenseSave) => void;
  onCancel: () => void;
}) {
  // Draft khôi phục được đọc MỘT lần lúc form mở; có draft thì nội dung
  // đang nhập dở thắng giá trị ban đầu — đó chính là thứ người dùng cần lại.
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
  // Chỉ "la" lỗi sau khi người dùng đã bắt đầu thao tác — mở form ra chưa
  // nhập gì mà đã thấy danh sách lỗi đỏ là báo lỗi cho việc họ chưa làm.
  const [touched, setTouched] = useState(false);

  // Giá trị hiệu lực: người tham gia chưa từng sửa ô của mình thì dùng mặc định
  // hiển thị trên form (tuỳ chỉnh = 0đ, trọng số = 1 phần) — tránh validate
  // chặn oan trong khi giao diện đang hiển thị một giá trị hợp lệ.
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

  // Giữ draft liên tục theo từng thay đổi — reload ở bất kỳ thời điểm nào
  // cũng khôi phục được đúng nội dung đang hiển thị trong form.
  useEffect(() => {
    if (!draftKey) return;
    saveExpenseDraft(draftKey, { title, amount, payerId, participantIds, mode, custom, weights });
  }, [draftKey, title, amount, payerId, participantIds, mode, custom, weights]);

  function handleSave() {
    if (draftKey) clearExpenseDraft(draftKey);
    onSave({ ...draft, id: initial?.id });
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
    <div className="grid gap-4" onChange={() => setTouched(true)}>
      {restoredDraft && (
        <p role="status" className="text-sm font-medium text-brand-deep">
          Đã khôi phục nội dung bạn nhập dở từ lần trước — kiểm tra lại rồi bấm lưu, hoặc bấm Huỷ để
          bỏ bản nháp này.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="expense-title">
            Khoản chi
          </label>
          <input
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
          <MoneyInput value={amount} onChange={setAmount} ariaLabel="Số tiền khoản chi" />
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
                'inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition',
                payerId === m.id
                  ? 'border-brand bg-brand text-white'
                  : 'border-line-strong bg-card text-ink hover:border-brand-deep',
              )}
            >
              <Avatar id={m.id} name={m.name} size={22} />
              <span className="truncate">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className={cn(labelClass, 'mb-0')}>Người cùng chia</span>
          <button
            type="button"
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-brand-deep transition hover:text-ink"
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
                  'inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition',
                  active
                    ? 'border-brand bg-brand-soft text-brand-deep'
                    : 'border-line-strong bg-card text-ink hover:border-brand-deep',
                )}
              >
                <Avatar id={m.id} name={m.name} size={22} />
                <span className="truncate">{m.name}</span>
                {active && <Check size={14} aria-hidden className="shrink-0" />}
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
          className="grid grid-cols-3 gap-1 rounded-xl border border-line-strong bg-card p-1"
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
                'inline-flex min-h-11 items-center justify-center rounded-lg px-2 font-display text-sm font-bold transition',
                mode === m ? 'bg-ink text-white' : 'text-ink hover:bg-brand-soft/60',
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        {/* Panel §7.11: giải thích "Theo phần" ngay tại điểm chọn, 1 dòng. */}
        {mode === 'shares' && (
          <p className="mt-2 text-sm text-muted">Ví dụ: ở 2/3 đêm thì nhập 2 phần.</p>
        )}
        {mode === 'custom' && (
          <p className="mt-2 text-sm text-muted">
            Nhập đúng số tiền từng người phải chịu — tổng phải khớp số tiền khoản chi.
          </p>
        )}
      </div>

      {mode === 'custom' && participantIds.length > 0 && (
        <div className="grid gap-2">
          {participantIds.map((id) => {
            const member = members.find((m) => m.id === id);
            if (!member) return null;
            return (
              <div key={id} className="flex items-center gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-ink">
                  <Avatar id={member.id} name={member.name} size={24} />
                  <span className="truncate">{member.name}</span>
                </span>
                <MoneyInput
                  className="w-40 shrink-0 sm:w-44"
                  value={custom[id] ?? 0}
                  onChange={(v) => setCustom((prev) => ({ ...prev, [id]: v }))}
                  ariaLabel={`Số tiền ${member.name} phải chịu`}
                />
              </div>
            );
          })}
          {preview?.kind === 'custom' && (
            <p
              aria-live="polite"
              className={cn(
                'text-sm font-semibold',
                preview.diff === 0 ? 'text-credit' : 'text-debt',
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
              <div key={id} className="flex items-center gap-2 sm:gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-ink">
                  <Avatar id={member.id} name={member.name} size={24} />
                  <span className="truncate">{member.name}</span>
                </span>
                {preview?.kind === 'computed' && (
                  <span className="hidden font-display text-sm whitespace-nowrap text-muted min-[420px]:inline">
                    ≈ {formatVND(preview.shares[id] ?? 0)}
                  </span>
                )}
                <input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  aria-label={`Số phần của ${member.name}`}
                  className="min-h-11 w-20 shrink-0 rounded-xl border border-line-strong bg-card px-3 py-2.5 text-right font-display text-base font-semibold text-ink outline-none transition focus:border-brand-deep sm:w-24"
                  value={weights[id] ?? 1}
                  onChange={(e) =>
                    setWeights((prev) => ({ ...prev, [id]: Number(e.target.value) }))
                  }
                />
                <span className="shrink-0 text-sm text-muted">phần</span>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'equal' && preview?.kind === 'computed' && (
        <div className="text-sm text-muted">
          <p>
            Mỗi người chịu{' '}
            <span className="font-display font-bold text-ink">{formatVND(equalShare)}</span>
          </p>
          {hasRemainder && (
            <details className="mt-1">
              <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-medium text-brand-deep">
                Vì sao có người hơn vài đồng? <ChevronDown size={14} aria-hidden />
              </summary>
              <p className="pt-1">
                Phần lẻ vài đồng dồn cho người đầu danh sách để tổng khớp tuyệt đối.
              </p>
            </details>
          )}
        </div>
      )}

      {touched && errors.length > 0 && (
        <ul role="alert" className="grid gap-1 text-sm font-medium text-debt">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <PrimaryButton disabled={errors.length > 0} onClick={handleSave}>
          <Check size={16} /> {initial ? 'Lưu thay đổi' : 'Thêm khoản chi'}
        </PrimaryButton>
        <GhostButton onClick={handleCancel}>
          <X size={16} /> Huỷ
        </GhostButton>
      </div>
    </div>
  );
}
