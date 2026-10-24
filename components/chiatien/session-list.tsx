'use client';

import { useState } from 'react';
import { IconLink, IconPlus, IconTrash } from './icons';
import { formatVNDDisplay } from '@/lib/money';
import { totalSpent } from '@/lib/split';
import type { Session } from '@/lib/types';
import {
  GhostButton,
  IconButton,
  PrimaryButton,
  StatusLine,
  inputClass,
  useOnlineStatus,
} from './ui-bits';
import { ConfirmDialog } from './sheet';

/** Danh sách các cuộc chia đã lưu trên máy + form tạo mới (Màn A). */
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
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const online = useOnlineStatus();

  // Hàng gần nhất lên đầu: updatedAt giảm dần (như hiện hành).
  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  function handleCreate() {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle('');
  }

  function focusCreateInput() {
    const input = document.getElementById('new-session');
    input?.scrollIntoView({ block: 'center' });
    input?.focus();
  }

  /**
   * Nhập từ link (cột phụ desktop, LAYOUT-SPEC §1.4): dữ liệu của một
   * cuộc chia nằm trọn trong hash #chia= của link (lib/share.ts) và cơ
   * chế import hiện hành của app chỉ chạy ở lần nạp trang
   * (use-sessions bootstrap đọc hash một lần lúc mount). Vì vậy cách
   * điều hướng sạch trong phạm vi bề mặt này là: trích phần #chia= từ
   * link đã dán (bất kể link thuộc origin nào — dữ liệu tự chứa trong
   * hash, không cần server của origin đó), gán vào URL hiện tại rồi
   * reload để bootstrap nhập nó như một link được mở trực tiếp.
   */
  function handleImportFromLink() {
    const raw = importUrl.trim();
    if (!raw) return;
    const hashStart = raw.indexOf('#chia=');
    if (hashStart === -1) {
      setImportError(
        'Link này không mở được — có thể link đã bị cắt ngắn khi gửi, hoặc không còn đúng định dạng. Hãy nhờ người gửi copy lại link đầy đủ.',
      );
      return;
    }
    setImportError('');
    window.location.hash = raw.slice(hashStart);
    window.location.reload();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-6 lg:max-w-[720px]">
        {/* Card tạo mới — primary CTA DUY NHẤT của Màn A cho hành động
            tạo (D-11): input + nút xếp dọc full-width trong card. */}
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
          <h2 className="mb-1.5 font-display text-[25px] font-extrabold text-ink">
            <label htmlFor="new-session">Tạo cuộc chia mới</label>
          </h2>
          <div className="flex flex-col gap-2">
            <input
              id="new-session"
              className={inputClass}
              placeholder="Ví dụ: Đà Lạt 3 ngày 2 đêm…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <PrimaryButton
              onClick={handleCreate}
              disabledReason={!title.trim() ? 'Đặt tên cho cuộc chia để tạo' : undefined}
              className="w-full"
            >
              <IconPlus size={16} /> Tạo cuộc chia
            </PrimaryButton>
          </div>
          {/* Chỉ báo app-shell ở chân card tạo mới (D-2, LAYOUT-SPEC
              §6.3): thường trực ở Màn A vì màn này chưa có Strip. */}
          <StatusLine status={online} className="mt-3" />
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card px-5 py-6 text-center">
            {/* Lý do (CQ-02): ảnh minh hoạ là tài sản tĩnh của chính app
                trong /public, kích thước hiển thị khai trước — next/image
                không thêm lợi ích ở đây. (V3 dùng empty-state.webp; V4 thay
                bằng hero-split.svg theo whitelist D3.) */}
            {/* eslint-disable-next-line @next/next/no-img-element -- hero V4 là SVG tĩnh của app, aspect-ratio khai trước (CLS=0); next/image không thêm lợi ích */}
            <img
              src="/products/brand/hero-split.svg"
              alt=""
              aria-hidden
              width={792}
              height={240}
              style={{ aspectRatio: '792 / 240' }}
              className="mx-auto mb-3 w-full max-w-[520px]"
              loading="lazy"
            />
            <h2 className="font-display text-[25px] font-extrabold text-ink">
              Chưa có cuộc chia nào
            </h2>
            <p className="mx-auto mt-1 max-w-md text-base text-muted">
              Dữ liệu chỉ lưu trên máy của bạn — không cần tài khoản.
            </p>
            {/* Hành động tạo ở trạng thái rỗng chỉ là ghost/link (D-11):
                primary CTA cho hành động tạo đã nằm ở card tạo mới. */}
            <GhostButton onClick={focusCreateInput} className="mt-4">
              <IconPlus size={16} /> Tạo cuộc chia đầu tiên
            </GhostButton>
          </div>
        ) : (
          // Danh sách dạng BẢNG PHẲNG (LAYOUT-SPEC §1.4): bỏ chrome card
          // (rounded/border/bg-card/shadow) ở wrapper + hàng — hàng ngăn
          // nhau bằng hairline, đúng Flat Table Rule như ledger.
          <ul className="grid">
            {ordered.map((s) => (
              <li key={s.id} className="flex min-w-0 items-center gap-2 border-b border-line py-3">
                <button
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-xl font-bold text-ink">{s.title}</span>
                  <span className="mt-0.5 block truncate text-sm text-ink-2">
                    <span className="font-figure font-semibold">{s.members.length}</span>
                    {' người · '}
                    <span className="font-figure font-semibold">{s.expenses.length}</span>
                    {' khoản · '}
                    <span className="font-figure font-semibold">
                      {formatVNDDisplay(totalSpent(s))}
                    </span>
                  </span>
                </button>
                <IconButton
                  title={`Xoá cuộc chia "${s.title}"`}
                  danger
                  onClick={() => setPendingDelete(s)}
                >
                  <IconTrash size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cột phụ desktop (LAYOUT-SPEC §1.4): hành động nhanh "Nhập từ
          link" + 3 dòng "dữ liệu ở đâu" dạng chữ. KHÔNG còn aside tóm
          tắt quyết toán tĩnh của cuộc chia gần nhất. */}
      <aside
        aria-label="Nhập từ link và thông tin dữ liệu"
        className="sticky top-6 hidden lg:block"
      >
        <h2 className="font-display text-[25px] font-extrabold text-ink">Nhập từ link</h2>
        <p className="mt-1 text-base text-ink-2">
          Dán link cuộc chia đã nhận để mở bản sao trên máy này.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <input
            aria-label="Link cuộc chia"
            className={inputClass}
            placeholder="Dán link có #chia=…"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleImportFromLink();
            }}
          />
          <GhostButton onClick={handleImportFromLink} disabled={!importUrl.trim()}>
            <IconLink size={16} /> Nhập từ link
          </GhostButton>
        </div>
        {importError && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- art loi link V4 la SVG tinh, aspect-ratio khai truoc */}
            <img
              src="/products/brand/hero-broken.svg"
              alt=""
              aria-hidden
              width={240}
              height={160}
              style={{ aspectRatio: '240 / 160' }}
              className="mb-2 max-h-[80px] w-[120px]"
              loading="lazy"
            />
            <p role="alert" className="text-base font-medium text-debt-ink">
              {importError}
            </p>
          </div>
        )}
        <ul className="mt-5 grid gap-1.5 border-t border-line pt-4 text-base text-ink-2">
          <li>Dữ liệu lưu trên máy này — không cần tài khoản.</li>
          <li>Link chia sẻ không chứa thông tin ngân hàng.</li>
          <li>Không có mạng vẫn dùng được.</li>
        </ul>
      </aside>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Xoá cuộc chia này?"
        message={
          pendingDelete
            ? `Cuộc chia "${pendingDelete.title}" cùng mọi khoản chi trong đó sẽ bị xoá khỏi máy này. Bạn vẫn hoàn tác được ngay sau khi xoá.`
            : ''
        }
        confirmLabel="Xoá cuộc chia"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
