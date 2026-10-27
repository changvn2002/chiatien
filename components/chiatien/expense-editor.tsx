'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconX } from './icons';
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

/**
 * Giải thích 1 dòng TẠI ĐIỂM CHỌN cho 2 kiểu chia phụ (COPY-DIET §2
 * dòng 11). Mode equal KHÔNG còn hint: «Chia đều cho những người được
 * chọn.» chỉ nói lại nhãn + danh sách ngay trên (Seat 3 N10) — đã xoá.
 */
const MODE_HINTS: Partial<Record<SplitMode, string>> = {
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
  defaultPayerId,
  onSave,
  onSaveAndMore,
  onCancel,
}: {
  members: Member[];
  initial?: Expense;
  draftKey?: string;
  /**
   * Người trả mặc định cho khoản MỚI (SPEC Sheet 1): người trả gần
   * nhất của phiên do SessionView suy từ sổ; vắng -> thành viên đầu.
   */
  defaultPayerId?: string;
  onSave: (draft: ExpenseSave) => void;
  /**
   * Lưu nhưng sheet Ở LẠI ở trạng thái sau-Lưu («Đã lưu — Thêm khoản
   * nữa») — REDESIGN Pha 1 thay nút «Lưu & thêm nữa» ngang hàng cũ.
   */
  onSaveAndMore?: (draft: ExpenseSave) => void;
  onCancel: () => void;
}) {
  const [restoredDraft] = useState<ExpenseDraft | null>(() =>
    draftKey ? loadExpenseDraft(draftKey) : null,
  );
  const [title, setTitle] = useState(restoredDraft?.title ?? initial?.title ?? '');
  const [amount, setAmount] = useState(restoredDraft?.amount ?? initial?.amount ?? 0);
  const [payerId, setPayerId] = useState(
    restoredDraft?.payerId ?? initial?.payerId ?? defaultPayerId ?? members[0]?.id ?? '',
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    restoredDraft?.participantIds ?? initial?.participantIds ?? members.map((m) => m.id),
  );
  const [mode, setMode] = useState<SplitMode>(restoredDraft?.mode ?? initial?.mode ?? 'equal');
  // Addendum §6: kiểu chia mặc định thu gọn 1 lớp — chỉ hiện cách đang
  // dùng + nút «Chia khác»; bung ra mới thấy đủ 3 lựa chọn.
  const [modeExpanded, setModeExpanded] = useState(false);
  const [custom, setCustom] = useState<Record<string, number>>(
    restoredDraft?.custom ?? initial?.custom ?? {},
  );
  const [weights, setWeights] = useState<Record<string, number>>(
    restoredDraft?.weights ?? initial?.weights ?? {},
  );
  const [capError, setCapError] = useState(false);
  // Trạng thái sau-Lưu trong cùng sheet (SPEC Sheet 1): tên khoản vừa lưu.
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const amountWrapRef = useRef<HTMLDivElement>(null);

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
    if (!initial && onSaveAndMore) {
      // Khoản mới + cha giữ sheet: lưu xong sheet chuyển sang trạng
      // thái sau-Lưu «Đã lưu — Thêm khoản nữa» (SPEC Sheet 1), không
      // còn nút «Lưu & thêm nữa» ngang hàng như bản cũ.
      onSaveAndMore({ ...draft });
      setSavedTitle(title);
      return;
    }
    onSave({ ...draft, id: initial?.id });
  }

  function handleAddMore() {
    // Reset tên khoản + số tiền; GIỮ người trả / kiểu chia / người cùng
    // chia (mặc định khoản sau kế thừa khoản trước — SPEC §1.1).
    setTitle('');
    setAmount(0);
    setCustom({});
    setWeights({});
    setCapError(false);
    setSavedTitle(null);
    requestAnimationFrame(() => amountWrapRef.current?.querySelector('input')?.focus());
  }

  function handleCancel() {
    if (draftKey) clearExpenseDraft(draftKey);
    onCancel();
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const allSelected = participantIds.length === members.length;
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {restoredDraft && (
        <p role="status" className="text-base font-medium text-brand-deep">
          Đã khôi phục nội dung bạn nhập dở — kiểm tra lại rồi bấm lưu, hoặc bấm Huỷ để bỏ nháp này.
        </p>
      )}
      {/* SPEC Sheet 1: ô TIỀN focus đầu tiên + bàn phím số; tên khoản
          tuỳ chọn ở dưới. */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div ref={amountWrapRef}>
          <span className={labelClass}>Số tiền</span>
          <MoneyInput
            value={amount}
            autoFocus
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
        <div>
          <label className={labelClass} htmlFor="expense-title">
            Khoản chi
          </label>
          <input
            id="expense-title"
            className={inputClass}
            placeholder="Ví dụ: Tiền phòng, Ăn tối, Xăng xe…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
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
                'inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full px-3 py-2 text-base font-semibold transition duration-100 ease-[var(--ease-lock)]',
                // Addendum §4: trạng thái CHỌN = nền trung tính + viền
                // brand 2px + chữ ink (cấm tô cam đặc); chưa chọn giữ
                // viền 1px như cũ để layout không nhảy.
                payerId === m.id
                  ? 'border-2 border-brand-500 bg-card text-ink'
                  : 'border border-line-strong bg-card text-ink hover:border-brand-deep',
              )}
            >
              <Avatar name={m.name} colorIndex={colorOf(m.id)} size={24} />
              <span className="min-w-0 truncate">{m.name}</span>
              {/* S5-6: chip người trả đang chọn có dấu ✓ như chip
                  người cùng chia ngay bên dưới. */}
              {payerId === m.id && (
                <IconCheck size={14} aria-hidden className="shrink-0 text-brand-950" />
              )}
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
                  'inline-flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full px-3 py-2 text-base font-semibold transition duration-100 ease-[var(--ease-lock)]',
                  // Addendum §4: cùng chuẩn chọn với chip người trả —
                  // nền trung tính + viền brand 2px + chữ ink.
                  active
                    ? 'border-2 border-brand-500 bg-card text-ink'
                    : 'border border-line-strong bg-card text-ink hover:border-brand-deep',
                )}
              >
                <Avatar name={m.name} colorIndex={colorOf(m.id)} size={24} />
                <span className="min-w-0 truncate">{m.name}</span>
                {active && <IconCheck size={14} aria-hidden className="shrink-0 text-brand-950" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className={labelClass} id="split-mode-label">
          Kiểu chia
        </span>
        {/* Addendum §6 — cách chia 1 lớp: mặc định chỉ hiện cách đang
            dùng + 1 nút «Chia khác»; bấm mới bung đủ 3 lựa chọn, chọn
            xong thu gọn về tóm tắt. Mở sửa khoản có mode != equal thì
            tóm tắt hiện ngay mode hiện tại của khoản đó. */}
        {modeExpanded ? (
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
                onClick={() => {
                  setMode(m);
                  setModeExpanded(false);
                }}
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-base font-bold transition duration-100 ease-[var(--ease-lock)]',
                  mode === m ? 'bg-ink text-white' : 'text-ink hover:bg-brand-soft/60',
                )}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-3 text-base font-bold text-ink">
              {MODE_LABELS[mode]}
            </span>
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setModeExpanded(true)}
              className="inline-flex min-h-11 items-center px-2 text-base font-semibold text-brand-deep transition duration-100 ease-[var(--ease-lock)] hover:text-ink"
            >
              Chia khác
            </button>
          </div>
        )}
        {MODE_HINTS[mode] && <p className="mt-2 text-base text-ink-2">{MODE_HINTS[mode]}</p>}
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

      {/* SPEC Sheet 1: khối xem trước dài + details «Vì sao có người
          hơn vài đồng?» đã CẮT — chỉ còn 1 dòng tĩnh khi có phần lẻ.
          Danh sách lỗi liệt kê trùng cũng đã cắt: lỗi tại trường +
          1 lý do cạnh nút Lưu (saveReason) là đủ. */}
      {mode === 'equal' && hasRemainder && (
        <p className="text-base text-ink-2">
          Phần lẻ vài đồng dồn cho người đầu danh sách để tổng khớp tuyệt đối.
        </p>
      )}

      {savedTitle !== null ? (
        // Trạng thái sau-Lưu trong cùng sheet: «Đã lưu — Thêm khoản nữa».
        <div className="flex flex-wrap items-center gap-2">
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-1.5 text-base font-semibold text-credit-ink"
          >
            <IconCheck size={16} aria-hidden /> Đã lưu khoản “{savedTitle}”
          </p>
          <PrimaryButton onClick={handleAddMore}>Thêm khoản nữa</PrimaryButton>
          <GhostButton onClick={handleCancel}>Xong</GhostButton>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          <PrimaryButton disabledReason={saveReason} onClick={handleSave}>
            <IconCheck size={16} /> {initial ? 'Lưu thay đổi' : 'Thêm khoản chi'}
          </PrimaryButton>
          <GhostButton onClick={handleCancel}>
            <IconX size={16} /> Huỷ
          </GhostButton>
        </div>
      )}
    </div>
  );
}
