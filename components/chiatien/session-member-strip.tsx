'use client';

import type { RefObject } from 'react';
import { Plus } from 'lucide-react';
import { hasBank } from '@/lib/vietqr';
import type { Member } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from './ui-bits';

/**
 * Rail thành viên ngang của Màn B (ARC-11): chip avatar + chấm trạng
 * thái ngân hàng (có QR / chưa có QR) + nút Thêm. Bấm chip = sửa
 * thành viên đó (handler thuộc SessionView).
 */
export function SessionMemberStrip({
  members,
  colors,
  stripRef,
  flash,
  onOpenMember,
  onAddMember,
}: {
  members: Member[];
  colors: number[];
  stripRef: RefObject<HTMLDivElement | null>;
  flash: boolean;
  onOpenMember: (member: Member) => void;
  onAddMember: () => void;
}) {
  return (
    <div
      ref={stripRef}
      tabIndex={-1}
      aria-label="Thành viên"
      className={cn(
        'flex h-14 shrink-0 items-center gap-2 outline-none',
        flash && 'rounded-xl outline-2 outline-brand-deep',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
        {members.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            aria-label={m.name}
            title={m.name}
            onClick={() => onOpenMember(m)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-card pr-3 pl-1 transition hover:border-line-strong"
          >
            <Avatar name={m.name} colorIndex={colors[idx] ?? 0} size={32} />
            <span className="max-w-[96px] truncate text-sm font-semibold text-ink">{m.name}</span>
            <span
              aria-hidden
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                hasBank(m) ? 'bg-credit' : 'border border-line-strong bg-transparent',
              )}
            />
            <span className="sr-only">{hasBank(m) ? 'Có QR' : 'Chưa có QR'}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onAddMember}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-deep transition hover:text-ink"
      >
        <Plus size={16} aria-hidden /> Thêm
      </button>
    </div>
  );
}
