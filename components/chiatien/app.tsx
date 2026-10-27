'use client';

import { useEffect, useRef, useState } from 'react';
import { IconAlertTriangle, IconUndo, IconX } from './icons';
import { RecipientLayer1 } from './recipient-layer1';
import { SessionList } from './session-list';
import { SessionView } from './session-view';
import { useSessions } from './use-sessions';
import { WebVitalsReporter } from './web-vitals';

/**
 * Gốc của app Chia Tiền — REDESIGN Pha 1: AppBar rút gọn, S1 danh
 * sách / S2 workspace, và lớp thông báo rút về đúng luật SPEC §2:
 *  - lưu lỗi + nhập link xong + link hỏng -> TOAST 1 dòng (đáy màn);
 *  - xung đột tab ngoài -> tối đa 1 banner 1 hàng;
 *  - accordion FAQ 3 mục ở chân ĐÃ CẮT — nội dung sống trong Sheet 5
 *    «Hướng dẫn & dữ liệu» (mở từ nút «?»/menu của từng màn).
 * Toàn bộ wiring storage nằm ở use-sessions.ts.
 */
export function ChiaTienApp() {
  const {
    sessions,
    active,
    setActiveId,
    loaded,
    saveFailed,
    importedTitle,
    importedDropped,
    importedStrippedBank,
    layer1Active,
    importedSeal,
    qrRequest,
    dismissLayer1,
    requestQrFromLayer1,
    dismissImport,
    externalChange,
    dismissExternalChange,
    undoToast,
    dismissUndo,
    createSession,
    updateSession,
    deleteSession,
    showUndo,
    goBackToList,
  } = useSessions();

  // Đăng ký service worker (W5-01): app shell được cache để mở lại offline.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Không đăng ký được SW (trình duyệt cũ/chặn) — app vẫn chạy online
      // bình thường; offline là lớp tăng cường, không phải điều kiện dùng.
    });
  }, []);

  /* Chẩn đoán link hỏng (giữ cơ chế suy luận cũ): bootstrap của hook
     chạy trước effect này; import thành công thì hook đã mở phiên +
     hiện thông báo nhập và XOÁ hash. Vậy khi đã loaded mà URL vẫn còn
     #chia= và không có thông báo nhập nào -> hash không giải mã được. */
  const [brokenLink, setBrokenLink] = useState(false);
  const brokenLinkCheckedRef = useRef(false);
  useEffect(() => {
    if (!loaded || brokenLinkCheckedRef.current) return;
    brokenLinkCheckedRef.current = true;
    if (window.location.hash.startsWith('#chia=') && !importedTitle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- chẩn đoán suy từ URL sau bootstrap, chạy một lần (cờ ref ở trên)
      setBrokenLink(true);
    }
  }, [loaded, importedTitle]);

  const toastClass =
    'animate-fade-in fixed inset-x-4 bottom-6 z-[60] mx-auto flex w-fit max-w-full items-center gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white';

  /* Workspace S2 đang mở (không phải lớp 1): main bỏ đệm đáy pb-10 —
     S2 tự quản mép đáy bằng dock neo đáy viewport (SessionView root
     flex-1 + dock mt-auto). S1 và lớp 1 giữ pb-10 như cũ. */
  const workspaceOpen = Boolean(active && !layer1Active);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col px-4 sm:px-6">
      <WebVitalsReporter />
      <header className="flex h-12 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo là SVG tĩnh của chính app, kích thước cố định; next/image không thêm lợi ích */}
        <img src="/products/brand/chiatien-logo.svg" alt="" aria-hidden width={28} height={28} />
        {/* Màn A: H1 duy nhất là "Chia Tiền" ở đây. Khi một cuộc chia
            đang mở, H1 duy nhất của workspace là tiêu đề cuộc chia
            trong SessionView, nên chữ này hạ xuống <p>. Back về danh
            sách nay ở header của chính S2 (SPEC §2 — 1 nút back duy
            nhất), app-shell không còn nút back riêng. */}
        {active ? (
          <p className="whitespace-nowrap font-display text-[32px] leading-none font-extrabold text-ink">
            Chia Tiền
          </p>
        ) : (
          <h1 className="whitespace-nowrap font-display text-[32px] leading-none font-extrabold text-ink">
            Chia Tiền
          </h1>
        )}
      </header>

      {/* Xung đột tab ngoài: banner DUY NHẤT được phép ở dạng hàng. */}
      {externalChange && (
        <div
          role="status"
          className="mt-2 mb-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-deep"
        >
          <p className="min-w-0 flex-1">
            Dữ liệu vừa thay đổi ở tab khác — app đã tải bản mới nhất. Kiểm tra lại nếu đang nhập dở
            ở tab này.
          </p>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={dismissExternalChange}
            className="-my-1 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition duration-100 ease-[var(--ease-lock)] hover:bg-white/60"
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      <main className={`flex flex-1 flex-col pt-4 ${workspaceOpen ? 'pb-0' : 'pb-10'}`}>
        {!loaded ? (
          <p
            role="status"
            className="rounded-2xl border border-line bg-card/60 p-8 text-center text-muted"
          >
            Đang mở sổ chia tiền…
          </p>
        ) : active && layer1Active ? (
          // LỚP 1 (v1.8.0, §2): chỉ ở lần import đầu từ link — tóm tắt
          // trung tính + phiếu đóng của mọi thành viên + «Bảng đầy đủ»
          // 1 chạm về workspace nguyên vẹn.
          <RecipientLayer1
            session={active}
            seal={importedSeal}
            onShowFullTable={dismissLayer1}
            onOpenQr={requestQrFromLayer1}
          />
        ) : active ? (
          <SessionView
            key={active.id}
            session={active}
            qrRequest={qrRequest}
            onBack={goBackToList}
            onChange={updateSession}
            onDelete={() => deleteSession(active.id)}
            onNotifyUndo={showUndo}
          />
        ) : (
          <SessionList
            sessions={sessions}
            onCreate={createSession}
            onOpen={setActiveId}
            onDelete={deleteSession}
          />
        )}
      </main>

      {/* Chân trang chuẩn khi ở lớp 1 người nhận (giữ từ R4): chỉ dòng
          đóng mang logo mono, không lặp nội dung Sheet 5. */}
      {active && layer1Active && loaded && (
        <footer className="border-t border-line py-6">
          <p className="flex items-center justify-center gap-2 text-center text-xs text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo mono ở footer là SVG tĩnh của chính app như logo header (CQ-02) */}
            <img
              src="/products/brand/chiatien-logo-mono.svg"
              alt=""
              aria-hidden
              width={16}
              height={16}
            />
            <span className="text-balance">
              Chia Tiền — công cụ chia tiền nhóm miễn phí cho người Việt.
            </span>
          </p>
        </footer>
      )}

      {/* Toast 1 dòng: lưu lỗi. */}
      {saveFailed && (
        <div role="alert" className={toastClass}>
          <IconAlertTriangle size={15} className="shrink-0" aria-hidden />
          <span className="min-w-0">
            Trình duyệt đang chặn lưu trữ — dữ liệu chỉ giữ trong lần mở này. Hãy copy link để mang
            đi.
          </span>
        </div>
      )}

      {/* Toast 1 dòng: link hỏng (chỉ ở S1). */}
      {brokenLink && !active && (
        <div role="alert" className={toastClass}>
          <IconAlertTriangle size={15} className="shrink-0" aria-hidden />
          <span className="min-w-0">Link không mở được — nhờ người gửi copy lại link đầy đủ.</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setBrokenLink(false)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          >
            <IconX size={15} />
          </button>
        </div>
      )}

      {/* Toast 1 dòng: nhập link xong. Chi tiết cảnh báo DATA-04(iii)
          giữ trong Sheet 5/dòng dữ liệu — toast chỉ báo kết quả. */}
      {importedTitle && (
        <div role="status" className={toastClass}>
          <span className="min-w-0">
            Đã nhập cuộc chia “{importedTitle}” — bản sao nằm trên máy của bạn.
            {importedDropped > 0 &&
              ` ${importedDropped} khoản trong link không hợp lệ đã bị loại bỏ.`}
            {importedStrippedBank && ' Thông tin ngân hàng trong link đã bị bỏ.'}
          </span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={dismissImport}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          >
            <IconX size={15} />
          </button>
        </div>
      )}

      {/* Toast Hoàn tác cho thao tác xoá. */}
      {undoToast && (
        <div role="status" className={toastClass}>
          <span className="min-w-0 truncate">{undoToast.label}</span>
          <button
            type="button"
            onClick={() => {
              undoToast.undo();
              dismissUndo();
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 font-bold text-brand-soft transition duration-100 ease-[var(--ease-lock)] hover:text-white"
          >
            <IconUndo size={15} aria-hidden /> Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
}
