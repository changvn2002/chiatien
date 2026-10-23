'use client';

import { useEffect } from 'react';
import { Check, ChevronDown, ChevronLeft, TriangleAlert, Undo2, X } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/site';
import { cn } from '@/lib/utils';
import { SessionList } from './session-list';
import { SessionView } from './session-view';
import { useSessions } from './use-sessions';
import { WebVitalsReporter } from './web-vitals';

/**
 * Gốc của app Chia Tiền — thuần trình bày (ARC-11 khoản 2): AppBar rút
 * gọn, danh sách cuộc chia / chi tiết cuộc chia, các banner trạng thái và
 * nội dung giới thiệu/FAQ dạng accordion. Toàn bộ wiring storage (nạp,
 * lưu bền, đồng bộ xuyên tab, import share link, hoàn tác) nằm ở
 * use-sessions.ts; component này chỉ nhận state + handler từ hook đó.
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
    importedStep,
    dismissImport,
    externalChange,
    dismissExternalChange,
    savedFlash,
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col px-4 sm:px-6">
      <WebVitalsReporter />
      <header className="flex h-14 items-center gap-3">
        {/* Logo là SVG tĩnh của chính app trong /public — next/image không
            thêm lợi ích (không cần tối ưu/không đổi kích thước theo thiết
            bị) nên dùng <img> thường; lý do cho eslint-disable ở dòng dưới
            (CQ-02). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/products/brand/chiatien-logo.svg" alt="" aria-hidden width={32} height={32} />
        <h1 className="font-display text-xl leading-tight font-bold text-ink">Chia Tiền</h1>
        <span
          aria-live="polite"
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium text-muted transition-opacity duration-300',
            savedFlash ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Check size={13} aria-hidden /> Đã lưu
        </span>
        {active && (
          <button
            type="button"
            onClick={goBackToList}
            className="-mr-2 ml-auto inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold text-brand-deep transition hover:text-ink"
          >
            <ChevronLeft size={16} aria-hidden /> Tất cả cuộc chia
          </button>
        )}
      </header>

      {saveFailed && (
        <p
          role="alert"
          className="mt-2 mb-4 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Trình duyệt đang chặn lưu trữ — dữ liệu chỉ giữ trong lần mở này. Hãy copy link cuộc
            chia để mang đi.
          </span>
        </p>
      )}
      {importedTitle && (
        <div className="mt-2 mb-4 flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand-deep">
          <div className="min-w-0 flex-1">
            <p>
              Đã nhập cuộc chia “{importedTitle}” — bản sao này nằm trên máy của bạn, cứ sửa thoải
              mái.
              {importedDropped > 0 &&
                ` Có ${importedDropped} khoản chi trong link không hợp lệ nên đã bị loại bỏ để tránh lệch tiền — hãy kiểm tra lại danh sách khoản chi.`}
            </p>
            {/* Nhãn chuẩn của DATA-04(iii)/SEC-12.6: nội dung link là do
                người gửi cung cấp, app không xác thực được danh tính. */}
            <p className="mt-1 font-semibold">
              Lưu ý: đây là dữ liệu do người gửi cung cấp, chưa xác thực — hãy đối chiếu danh sách
              thành viên và khoản chi trước khi thanh toán theo.
            </p>
            {importedStrippedBank && (
              <p className="mt-1">
                Link này thuộc bản cũ — thông tin ngân hàng trong link (nếu có) đã bị bỏ qua và
                không được lưu vào máy này.
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={dismissImport}
            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/60"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {externalChange && (
        <div
          role="status"
          className="mt-2 mb-4 flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand-deep"
        >
          <p className="min-w-0 flex-1">
            Dữ liệu vừa được thay đổi ở một tab khác — app đã tải lại bản mới nhất để không tab nào
            ghi đè làm mất dữ liệu của tab nào. Nếu bạn đang nhập dở trong form ở tab này, hãy kiểm
            tra lại nội dung trước khi bấm lưu.
          </p>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={dismissExternalChange}
            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/60"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="flex-1 pt-4 pb-10">
        {!loaded ? (
          <p
            role="status"
            className="rounded-2xl border border-line bg-card/60 p-8 text-center text-muted"
          >
            Đang mở sổ chia tiền…
          </p>
        ) : active ? (
          <SessionView
            key={active.id}
            session={active}
            initialStep={importedStep}
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

      {/* Nội dung giới thiệu/FAQ chỉ ở màn danh sách, dạng accordion đóng mặc
          định — không lặp dưới một cuộc chia đang mở (panel §7.4). */}
      {!active && loaded && (
        <footer className="border-t border-line py-6">
          <div className="grid gap-2">
            <details className="group rounded-2xl border border-line bg-card px-4 sm:px-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 font-display text-base font-bold text-ink [&::-webkit-details-marker]:hidden">
                Chia Tiền là gì?
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="max-w-3xl pb-4 text-sm leading-relaxed text-muted">
                Chia Tiền là công cụ chia tiền nhóm miễn phí cho người Việt. Mỗi chuyến đi chơi, bữa
                ăn nhậu hay kỳ ở trọ chung là một “cuộc chia”: bạn ghi lại ai đã trả khoản nào, app
                tự chia cho đúng những người liên quan, triệt tiêu các khoản nợ chồng chéo và cho ra
                danh sách “ai trả ai bao nhiêu” với số lần chuyển tiền ít nhất — kèm mã VietQR để
                quét chuyển ngay khi người nhận có tài khoản ngân hàng. Không cần cài app, không cần
                đăng nhập, không có máy chủ: mở link là dùng ngay trên trình duyệt, dữ liệu nằm trên
                máy của bạn, cần gửi cho cả nhóm thì dùng link chia sẻ gồm thành viên, khoản chi và
                kết quả quyết toán — thông tin ngân hàng không nằm trong link.
              </p>
            </details>

            <details className="group rounded-2xl border border-line bg-card px-4 sm:px-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 font-display text-base font-bold text-ink [&::-webkit-details-marker]:hidden">
                Cách chia tiền nhóm trong 3 bước
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <ol className="grid gap-4 pb-4 sm:grid-cols-3">
                <li>
                  <h3 className="mb-1 font-display text-base font-bold text-ink">
                    Bước 1 — Tạo cuộc chia, thêm thành viên
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    Đặt tên cho chuyến đi hay bữa tiệc rồi thêm từng người trong nhóm. Ai muốn nhận
                    tiền qua VietQR thì lưu tài khoản ngay trên máy của họ.
                  </p>
                </li>
                <li>
                  <h3 className="mb-1 font-display text-base font-bold text-ink">
                    Bước 2 — Ghi từng khoản chi
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    Ai trả, bao nhiêu, chia cho những ai — chọn cách chia đều, tuỳ chỉnh số tiền
                    từng người, hoặc chia theo phần (ở mấy đêm, ăn mấy bữa).
                  </p>
                </li>
                <li>
                  <h3 className="mb-1 font-display text-base font-bold text-ink">
                    Bước 3 — Chốt quyết toán
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    App tính số dư từng người và rút gọn thành ít lần chuyển nhất. Quét VietQR để
                    trả ngay, hoặc copy bản quyết toán gửi thẳng vào nhóm Zalo, Messenger.
                  </p>
                </li>
              </ol>
            </details>

            <details className="group rounded-2xl border border-line bg-card px-4 sm:px-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 font-display text-base font-bold text-ink [&::-webkit-details-marker]:hidden">
                Câu hỏi thường gặp
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="grid gap-2 pb-4">
                {FAQ_ITEMS.map((item) => (
                  <details key={item.question} className="group/faq rounded-xl bg-paper px-3">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 font-display text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <ChevronDown
                        size={14}
                        aria-hidden
                        className="shrink-0 text-muted transition-transform group-open/faq:rotate-180"
                      />
                    </summary>
                    <p className="max-w-3xl pb-3 text-sm leading-relaxed text-muted">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </details>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted">
            {/* Logo mono ở footer cũng là SVG tĩnh của chính app — cùng lý
                do <img> thường như logo header (CQ-02). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/products/brand/chiatien-logo-mono.svg"
              alt=""
              aria-hidden
              width={16}
              height={16}
            />
            Chia Tiền — công cụ chia tiền nhóm miễn phí cho người Việt.
          </p>
        </footer>
      )}

      {/* Toast Hoàn tác cho thao tác xoá — thay cho việc xoá là mất hẳn. */}
      {undoToast && (
        <div
          role="status"
          className="animate-toast-in fixed inset-x-4 bottom-24 z-[60] mx-auto flex w-fit max-w-full items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-[var(--shadow-lift)] lg:bottom-6"
        >
          <span className="min-w-0 truncate">{undoToast.label}</span>
          <button
            type="button"
            onClick={() => {
              undoToast.undo();
              dismissUndo();
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 font-display font-bold text-brand-soft transition hover:text-white"
          >
            <Undo2 size={15} aria-hidden /> Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
}
