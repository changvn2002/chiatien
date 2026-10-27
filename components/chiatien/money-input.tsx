'use client';

import { useRef, useState } from 'react';
import { formatGrouped, parseVNDInput } from '@/lib/money';
import { MAX_UI_AMOUNT_VND } from '@/lib/split';
import { cn } from '@/lib/utils';

/** Câu trần tiền tại trường (COPY-DIET §5) — hiển thị bởi sheet cha qua onCapError. */
export const AMOUNT_CAP_MESSAGE =
  'Số tiền tối đa cho một khoản là 999.999.999.999 ₫. Nếu cần ghi nhiều hơn, hãy tách thành nhiều khoản.';

/**
 * Ô nhập tiền VND: gõ số thô, hiển thị phân nhóm nghìn ngay khi gõ
 * ("150000" -> "150.000"), giá trị đưa ra ngoài là số nguyên đồng.
 * Khi không focus, hiển thị luôn suy ra từ value bên ngoài (không cần effect
 * đồng bộ) — chỉ khi đang gõ mới giữ text nội bộ.
 *
 * Panel §7.8: ô nhập THẬT cao ≥44px và bấm vào bất cứ đâu trên khung bao
 * cũng focus được vào ô nhập (trước đây input chỉ cao 24px, khung bao
 * không bấm được).
 *
 * REDESIGN-V2 (M-4 + mục E): số tiền ở Figure (Inter + tnum), căn phải,
 * hậu tố ₫ bằng ink-2. TRẦN NHẬP UI (MAX_UI_AMOUNT_VND): giá trị mới
 * vượt trần bị CHẶN — giữ nguyên giá trị trước đó, không nhận thêm chữ
 * số tại trần và dán vượt trần cũng giữ giá trị cũ — đồng thời phát tín
 * hiệu qua onCapError để sheet cha hiện câu trần tại trường; không có
 * onCapError thì component tự giữ một thông báo aria (role="alert",
 * chỉ đọc màn hình) để tín hiệu không bao giờ câm.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  autoFocus,
  className,
  ariaLabel,
  onCapError,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
  onCapError?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [capHit, setCapHit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const text = focused ? typingText : value > 0 ? formatGrouped(value) : '';

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex min-h-11 cursor-text items-center gap-1 rounded-lg border border-line-strong bg-card px-3 transition duration-100 ease-[var(--ease-lock)] focus-within:border-brand-deep',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel ?? 'Số tiền'}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onFocus={() => {
          setTypingText(value > 0 ? formatGrouped(value) : '');
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const next = parseVNDInput(e.target.value);
          if (next > MAX_UI_AMOUNT_VND) {
            // Vượt trần: chặn tại trường — GIỮ giá trị trước đó (không tự
            // sửa/chặn một phần số tiền của người dùng) và phát tín hiệu lỗi.
            setTypingText(value > 0 ? formatGrouped(value) : '');
            setCapHit(true);
            onCapError?.();
            return;
          }
          setCapHit(false);
          setTypingText(next > 0 ? formatGrouped(next) : '');
          onChange(next);
        }}
        className="font-figure h-11 min-w-0 w-full bg-transparent text-right text-base font-semibold text-ink outline-none placeholder:text-placeholder focus-visible:outline-none"
      />
      <span aria-hidden className="shrink-0 text-base font-medium text-ink-2">
        ₫
      </span>
      {capHit && !onCapError && (
        <span role="alert" className="sr-only">
          {AMOUNT_CAP_MESSAGE}
        </span>
      )}
    </div>
  );
}
