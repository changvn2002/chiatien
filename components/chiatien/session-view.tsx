'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Link2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { newId } from '@/lib/id';
import { formatVND } from '@/lib/money';
import { computeBalances, computeShares, totalSpent } from '@/lib/split';
import { simplifyDebts } from '@/lib/settle';
import { buildShareUrl } from '@/lib/share';
import type { Expense, Member, Session } from '@/lib/types';
import { Avatar, GhostButton, IconButton, PrimaryButton, SectionTitle } from './ui-bits';
import { ExpenseEditor, type ExpenseSave } from './expense-editor';
import { MemberEditor, type MemberDraft } from './member-editor';
import { Settlement } from './settlement';

const MODE_LABELS: Record<Expense['mode'], string> = {
  equal: 'Chia đều',
  custom: 'Tuỳ chỉnh số tiền',
  shares: 'Theo phần',
};

/** Gắn mốc thời gian sửa đổi — để ngoài component cho lint react-hooks/purity. */
function touch(session: Session, partial: Partial<Session>): Session {
  return { ...session, ...partial, updatedAt: Date.now() };
}

/** Tạo khoản chi mới từ draft của form — để ngoài component cho lint purity. */
function expenseFromDraft(draft: ExpenseSave): Expense {
  return {
    id: newId(),
    title: draft.title,
    amount: draft.amount,
    payerId: draft.payerId,
    participantIds: draft.participantIds,
    mode: draft.mode,
    custom: draft.custom,
    weights: draft.weights,
    createdAt: Date.now(),
  };
}

/**
 * Màn hình chi tiết một cuộc chia: tiêu đề, thành viên, khoản chi, quyết toán.
 * Mọi thay đổi đi qua onChange để app.tsx lưu bền vào localStorage.
 */
export function SessionView({
  session,
  onChange,
  onDelete,
  onBack,
}: {
  session: Session;
  onChange: (next: Session) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [memberEditing, setMemberEditing] = useState<Member | 'new' | null>(null);
  const [expenseEditing, setExpenseEditing] = useState<Expense | 'new' | null>(null);
  const [memberNotice, setMemberNotice] = useState('');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareUrl, setShareUrl] = useState('');

  const balances = useMemo(() => computeBalances(session), [session]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const total = totalSpent(session);
  const bankMembers = session.members.filter((m) => m.bank);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';

  function patch(partial: Partial<Session>) {
    onChange(touch(session, partial));
  }

  function saveMember(draft: MemberDraft) {
    if (memberEditing === 'new') {
      patch({ members: [...session.members, { id: newId(), ...draft }] });
    } else if (memberEditing) {
      patch({
        members: session.members.map((m) =>
          m.id === memberEditing.id ? { ...m, name: draft.name, bank: draft.bank } : m,
        ),
      });
    }
    setMemberEditing(null);
    setMemberNotice('');
  }

  function deleteMember(member: Member) {
    const referenced = session.expenses.some(
      (e) => e.payerId === member.id || e.participantIds.includes(member.id),
    );
    if (referenced) {
      setMemberNotice(
        `Không xoá được ${member.name} vì đã có khoản chi liên quan. Hãy sửa/xoá các khoản chi đó trước.`,
      );
      return;
    }
    if (!window.confirm(`Xoá thành viên ${member.name}?`)) return;
    patch({ members: session.members.filter((m) => m.id !== member.id) });
  }

  function saveExpense(draft: ExpenseSave) {
    if (draft.id) {
      patch({
        expenses: session.expenses.map((e) =>
          e.id === draft.id ? { ...e, ...draft, id: e.id, createdAt: e.createdAt } : e,
        ),
      });
    } else {
      patch({ expenses: [...session.expenses, expenseFromDraft(draft)] });
    }
    setExpenseEditing(null);
  }

  async function handleShare() {
    // Cảnh báo riêng tư cụ thể TRƯỚC khi copy (QA F2): link chứa nguyên
    // cuộc chia, gồm cả số tài khoản + tên chủ tài khoản của thành viên —
    // phải nói đúng điều đó, không chỉ cảnh báo chung chung.
    if (bankMembers.length > 0) {
      const ok = window.confirm(
        `Link chia sẻ chứa số tài khoản ngân hàng và tên chủ tài khoản của ${bankMembers
          .map((m) => m.name)
          .join(
            ', ',
          )}. Ai mở link cũng xem được các thông tin này — chỉ gửi link cho người trong nhóm thôi. Vẫn copy link?`,
      );
      if (!ok) return;
    }
    const url = buildShareUrl(session);
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      // Chỉ trạng thái thành công mới tự mờ đi; trạng thái lỗi phải ở lại
      // cho tới khi người dùng copy được URL dự phòng bên dưới.
      window.setTimeout(() => setShareState('idle'), 3000);
    } catch {
      setShareState('failed');
    }
  }

  return (
    <div className="grid gap-8">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 -ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-muted transition hover:text-brand-deep"
        >
          <ArrowLeft size={16} /> Tất cả cuộc chia
        </button>
        <div className="flex flex-wrap items-start gap-3">
          <input
            aria-label="Tên cuộc chia"
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 font-display text-2xl font-bold text-ink outline-none focus:border-brand focus:bg-card sm:text-3xl"
            value={session.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <div className="flex gap-2">
            <GhostButton onClick={handleShare}>
              {shareState === 'copied' ? <Check size={16} /> : <Link2 size={16} />}
              {shareState === 'copied' ? 'Đã copy link!' : 'Chia sẻ link'}
            </GhostButton>
            <GhostButton
              onClick={() => {
                if (window.confirm(`Xoá hẳn cuộc chia "${session.title}"? Không khôi phục được.`)) {
                  onDelete();
                }
              }}
            >
              <Trash2 size={16} /> Xoá
            </GhostButton>
          </div>
        </div>
        <span className="sr-only" role="status">
          {shareState === 'copied' ? 'Đã sao chép link chia sẻ vào bộ nhớ tạm.' : ''}
        </span>
        {shareState === 'failed' && shareUrl && (
          <p className="mt-2 text-sm text-muted">
            Trình duyệt không cho copy tự động — copy thủ công link này:{' '}
            <span className="break-all font-medium text-ink">{shareUrl}</span>
          </p>
        )}
        <p className="mt-1 px-2 text-sm text-muted">
          Link chia sẻ chứa toàn bộ cuộc chia — ai mở link cũng xem và sửa tiếp được trên máy của
          họ. Tổng chi: <strong className="text-ink">{formatVND(total)}</strong> ·{' '}
          {session.expenses.length} khoản · {session.members.length} người
        </p>
        {bankMembers.length > 0 && (
          <p
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Link chia sẻ có chứa số tài khoản ngân hàng và tên chủ tài khoản của{' '}
              {bankMembers.map((m) => m.name).join(', ')} — bất kỳ ai mở link đều xem được. Chỉ gửi
              link cho người trong nhóm, đừng đăng lên nơi công khai.
            </span>
          </p>
        )}
      </div>

      <section aria-label="Thành viên">
        <SectionTitle
          icon={<Users size={20} />}
          title={`Thành viên (${session.members.length})`}
          action={
            memberEditing === null ? (
              <GhostButton onClick={() => setMemberEditing('new')}>
                <Plus size={16} /> Thêm người
              </GhostButton>
            ) : undefined
          }
        />
        {memberNotice && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
          >
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{memberNotice}</span>
          </p>
        )}
        {memberEditing === 'new' && (
          <div className="mb-3">
            <MemberEditor onSave={saveMember} onCancel={() => setMemberEditing(null)} />
          </div>
        )}
        {session.members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card/60 p-5 text-sm text-muted">
            Chưa có thành viên nào. Thêm người vào để bắt đầu ghi khoản chi.
          </p>
        ) : (
          <ul className="grid gap-2">
            {session.members.map((m) => (
              <li key={m.id}>
                {memberEditing !== 'new' && memberEditing?.id === m.id ? (
                  <MemberEditor
                    initial={m}
                    onSave={saveMember}
                    onCancel={() => setMemberEditing(null)}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-[var(--shadow-card)]">
                    <Avatar id={m.id} name={m.name} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{m.name}</p>
                      <p className="truncate text-xs text-muted">
                        {m.bank
                          ? `${m.bank.bankName} · TK ${m.bank.accountNumber} · ${m.bank.accountName}`
                          : 'Chưa có tài khoản ngân hàng (không có VietQR)'}
                      </p>
                    </div>
                    <IconButton title={`Sửa ${m.name}`} onClick={() => setMemberEditing(m)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton title={`Xoá ${m.name}`} danger onClick={() => deleteMember(m)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Khoản chi">
        <SectionTitle
          icon={<Receipt size={20} />}
          title={`Khoản chi (${session.expenses.length})`}
          action={
            expenseEditing === null && session.members.length >= 1 ? (
              <PrimaryButton onClick={() => setExpenseEditing('new')}>
                <Plus size={16} /> Thêm khoản chi
              </PrimaryButton>
            ) : undefined
          }
        />
        {session.members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card/60 p-5 text-sm text-muted">
            Cần có thành viên trước khi ghi khoản chi.
          </p>
        ) : (
          <>
            {expenseEditing === 'new' && (
              <div className="mb-3">
                <ExpenseEditor
                  members={session.members}
                  onSave={saveExpense}
                  onCancel={() => setExpenseEditing(null)}
                />
              </div>
            )}
            {session.expenses.length === 0 && expenseEditing === null ? (
              <p className="rounded-2xl border border-dashed border-line bg-card/60 p-5 text-sm text-muted">
                Chưa có khoản chi nào. Bấm “Thêm khoản chi” để ghi khoản đầu tiên — ai trả, bao
                nhiêu, chia cho những ai.
              </p>
            ) : (
              <ul className="grid gap-2">
                {[...session.expenses]
                  .sort((a, b) => a.createdAt - b.createdAt)
                  .map((e) => {
                    if (expenseEditing !== 'new' && expenseEditing?.id === e.id) {
                      return (
                        <li key={e.id}>
                          <ExpenseEditor
                            members={session.members}
                            initial={e}
                            onSave={saveExpense}
                            onCancel={() => setExpenseEditing(null)}
                          />
                        </li>
                      );
                    }
                    const shares = computeShares(e);
                    return (
                      <li
                        key={e.id}
                        className="rounded-2xl border border-line bg-card px-4 py-3 shadow-[var(--shadow-card)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-ink">{e.title}</p>
                            <p className="text-sm text-muted">
                              <strong className="text-ink">{nameOf(e.payerId)}</strong> đã trả ·{' '}
                              {MODE_LABELS[e.mode]} cho {e.participantIds.length} người
                            </p>
                          </div>
                          <span className="font-display text-base font-bold whitespace-nowrap text-ink">
                            {formatVND(e.amount)}
                          </span>
                          <IconButton title="Sửa khoản chi" onClick={() => setExpenseEditing(e)}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton
                            title="Xoá khoản chi"
                            danger
                            onClick={() => {
                              if (window.confirm(`Xoá khoản chi "${e.title}"?`)) {
                                patch({
                                  expenses: session.expenses.filter((x) => x.id !== e.id),
                                });
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                        <p className="mt-1.5 text-xs text-muted">
                          {e.participantIds
                            .map((id) => `${nameOf(id)}: ${formatVND(shares[id] ?? 0)}`)
                            .join(' · ')}
                        </p>
                      </li>
                    );
                  })}
              </ul>
            )}
          </>
        )}
      </section>

      {session.members.length > 0 && session.expenses.length > 0 && (
        <Settlement session={session} balances={balances} transfers={transfers} />
      )}
    </div>
  );
}
