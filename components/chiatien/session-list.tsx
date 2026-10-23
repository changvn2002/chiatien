'use client';

import { useState } from 'react';
import { Plus, Receipt, Trash2, Users, Wallet } from 'lucide-react';
import { formatVND } from '@/lib/money';
import { totalSpent } from '@/lib/split';
import type { Session } from '@/lib/types';
import { IconButton, PrimaryButton, inputClass } from './ui-bits';

/** Danh sách các cuộc chia đã lưu trên máy + form tạo mới. */
export function SessionList({
  sessions,
  onCreate,
  onOpen,
  onDelete,
}: {
  sessions: Session[];
  onCreate: (title: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState('');

  function handleCreate() {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle('');
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <label
          className="mb-1.5 block font-display text-base font-bold text-ink"
          htmlFor="new-session"
        >
          Tạo cuộc chia mới
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="new-session"
            className={inputClass}
            placeholder="Ví dụ: Đà Lạt 3 ngày 2 đêm, Nhậu cuối tuần, Tiền trọ tháng 10…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <PrimaryButton onClick={handleCreate} disabled={!title.trim()} className="shrink-0">
            <Plus size={16} /> Tạo cuộc chia
          </PrimaryButton>
        </div>
        <p className="mt-2 text-sm text-muted">
          Sau khi tạo, thêm thành viên và từng khoản chi — app tự tính ai trả ai.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/60 p-8 text-center">
          <Wallet className="mx-auto mb-2 text-brand" size={32} />
          <p className="font-display text-lg font-bold text-ink">Chưa có cuộc chia nào</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Tạo cuộc chia đầu tiên ở trên — mọi dữ liệu chỉ lưu trên máy của bạn, không cần tài
            khoản, không gửi đi đâu.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <button
                type="button"
                onClick={() => onOpen(s.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate font-display text-lg font-bold text-ink hover:text-brand-deep">
                  {s.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} /> {s.members.length} người
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Receipt size={14} /> {s.expenses.length} khoản
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wallet size={14} /> Tổng {formatVND(totalSpent(s))}
                  </span>
                </span>
              </button>
              <IconButton
                title={`Xoá cuộc chia "${s.title}"`}
                danger
                onClick={() => {
                  if (window.confirm(`Xoá hẳn cuộc chia "${s.title}"? Không khôi phục được.`)) {
                    onDelete(s.id);
                  }
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
