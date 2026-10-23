'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, TriangleAlert, Undo2, X } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/site';
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

  /* ---------------------------------------------------------------- */
  /* Chẩn đoán link hỏng (D-4, LAYOUT-SPEC §5.1): use-sessions KHÔNG   */
  /* phơi tín hiệu lỗi import — readShareFromHashWithReport() nuốt    */
  /* mọi lỗi giải mã thành session=null (đã đọc lib/share.ts), nên    */
  /* tầng shell tự suy chẩn đoán an toàn như sau: bootstrap của hook  */
  /* chạy TRƯỚC effect này (hook đăng ký effect trước trong cùng      */
  /* component); import thành công thì hook đã mở phiên, hiện banner */
  /* nhập (importedTitle) và XOÁ hash khỏi URL bằng replaceState.     */
  /* Vậy khi app đã loaded mà URL vẫn còn hash #chia= và không có     */
  /* banner nhập nào, hash đó chắc chắn không giải mã/sanitize thành  */
  /* phiên được -> hiện chẩn đoán ở Màn A, không bỏ qua im lặng.      */
  /* Kiểm tra chỉ chạy một lần sau khi loaded (cờ ref): đóng chẩn     */
  /* đoán hoặc đóng banner nhập không kích hoạt lại. Giới hạn còn     */
  /* lại: ca hash #chia= hợp lệ nhưng người dùng đã đóng banner nhập  */
  /* ở một lần mở trước trong cùng phiên trang là không thể xảy ra   */
  /* vì kiểm tra chốt ngay sau lần loaded đầu tiên, trước mọi thao    */
  /* tác đóng.                                                         */
  /* ---------------------------------------------------------------- */
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col px-4 sm:px-6">
      <WebVitalsReporter />
      <header className="flex h-12 items-center gap-3">
        {/* Logo là SVG tĩnh của chính app trong /public — next/image không
            thêm lợi ích (không cần tối ưu/không đổi kích thước theo thiết
            bị) nên dùng <img> thường; lý do cho eslint-disable ở dòng dưới
            (CQ-02). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/products/brand/chiatien-logo.svg" alt="" aria-hidden width={28} height={28} />
        {/* H1 duy nhất của Màn A. Chỉ báo lưu thường trực KHÔNG còn là
            span "Đã lưu" opacity thoáng qua ở đây — nó sống ở StatusLine
            tại các bề mặt theo LAYOUT-SPEC §6.3. */}
        <h1 className="font-display text-[19px] leading-tight font-bold text-ink">Chia Tiền</h1>
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
            Trình duyệt đang chặn lưu trữ — dữ liệu chỉ giữ trong lần mở này. Hãy copy link để mang
            đi.
          </span>
        </p>
      )}
      {brokenLink && !active && (
        <div
          role="alert"
          className="mt-2 mb-4 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            Link này không mở được — có thể link đã bị cắt ngắn khi gửi, hoặc không còn đúng định
            dạng. Hãy nhờ người gửi copy lại link đầy đủ.
          </p>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setBrokenLink(false)}
            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/60"
          >
            <X size={16} />
          </button>
        </div>
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
            // startExpanded: người nhận link đến để xem kết quả — dải
            // quyết toán tự mở rộng khi phiên VỪA ĐƯỢC NHẬP (importedStep
            // đã set) và đã có khoản chi (LAYOUT-SPEC §5.1). importedStep
            // của hook dùng undefined cho "không phải import" nên so
            // sánh != null (bắt cả undefined) — dùng !== null sẽ true
            // cả với phiên tự mở từ danh sách.
            startExpanded={importedStep != null && (active?.expenses.length ?? 0) > 0}
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

      {/* Nội dung giới thiệu/FAQ chỉ ở màn danh sách, dạng accordion đóng mặc
          định — không lặp dưới một cuộc chia đang mở (panel §7.4). */}
      {!active && loaded && (
        <footer className="border-t border-line py-6">
          <div className="grid gap-2">
            <details className="group rounded-2xl border border-line bg-card px-4 sm:px-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <h2 className="font-display text-base font-bold text-ink">Chia Tiền là gì?</h2>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="max-w-[72ch] pb-4 text-sm leading-relaxed text-muted">
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
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <h2 className="font-display text-base font-bold text-ink">Cách dùng Chia Tiền</h2>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <ol className="grid gap-4 pb-4 sm:grid-cols-3">
                <li>
                  <h3 className="mb-1 font-display text-base font-bold text-ink">
                    Thêm người của nhóm
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    Đặt tên cho chuyến đi hay bữa tiệc rồi thêm từng người trong nhóm. Ai muốn nhận
                    tiền qua VietQR thì lưu tài khoản ngay trên máy của họ.
                  </p>
                </li>
                <li>
                  <h3 className="mb-1 font-display text-base font-bold text-ink">
                    Ghi khoản chi khi có người trả
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    Ai trả, bao nhiêu, chia cho những ai — chọn cách chia đều, tuỳ chỉnh số tiền
                    từng người, hoặc chia theo phần (ở mấy đêm, ăn mấy bữa).
                  </p>
                </li>
                <li>
                  <h3 className="mb-1 font-display text-base font-bold text-ink">
                    Mở quyết toán, quét VietQR hoặc copy cho Zalo
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    App tính số dư từng người và rút gọn thành ít lần chuyển nhất. Quét VietQR để
                    trả ngay, hoặc copy bản quyết toán gửi thẳng vào nhóm Zalo, Messenger.
                  </p>
                </li>
              </ol>
            </details>

            <details className="group rounded-2xl border border-line bg-card px-4 sm:px-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <h2 className="font-display text-base font-bold text-ink">Câu hỏi thường gặp</h2>
                <ChevronDown
                  size={16}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="grid gap-2 pb-4">
                {FAQ_ITEMS.map((item) => (
                  <details key={item.question} className="group/faq rounded-xl bg-paper px-3">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 [&::-webkit-details-marker]:hidden">
                      <h3 className="font-display text-sm font-bold text-ink">{item.question}</h3>
                      <ChevronDown
                        size={14}
                        aria-hidden
                        className="shrink-0 text-muted transition-transform group-open/faq:rotate-180"
                      />
                    </summary>
                    <p className="max-w-[72ch] pb-3 text-sm leading-relaxed text-muted">
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
