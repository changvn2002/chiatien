'use client';

import { useState } from 'react';
import { formatGrouped, parseVNDInput } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Ô nhập tiền VND: gõ số thô, hiển thị phân nhóm nghìn ngay khi gõ
 * ("150000" -> "150.000"), giá trị đưa ra ngoài là số nguyên đồng.
 * Khi không focus, hiển thị luôn suy ra từ value bên ngoài (không cần effect
 * đồng bộ) — chỉ khi đang gõ mới giữ text nội bộ.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  autoFocus,
  className,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [typingText, setTypingText] = useState('');
  const text = focused ? typingText : value > 0 ? formatGrouped(value) : '';

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-xl border border-line bg-card px-3 py-2.5 focus-within:border-brand',
        className,
      )}
    >
      <input
        type="text"
        inputMode="numeric"
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
          setTypingText(next > 0 ? formatGrouped(next) : '');
          onChange(next);
        }}
        className="w-full bg-transparent text-right font-display text-base font-semibold text-ink outline-none placeholder:text-placeholder"
      />
      <span className="shrink-0 text-sm font-medium text-muted">đ</span>
    </div>
  );
}
