'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, TriangleAlert, Undo2, X } from 'lucide-react';
import { newId } from '@/lib/id';
import { FAQ_ITEMS } from '@/lib/site';
import { cloneForImport, readShareFromHashWithReport } from '@/lib/share';
import {
  BANK_BOOK_KEY,
  loadBankBook,
  loadSessions,
  serializeSessions,
  STORAGE_KEY,
  trySaveSessions,
} from '@/lib/storage';
import type { Session } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SessionList } from './session-list';
import { SessionView } from './session-view';

/**
 * Gốc của app Chia Tiền — AppBar rút gọn, danh sách cuộc chia, lưu bền bằng
 * localStorage, và nhận cuộc chia từ share link (#chia=...) khi mở trang.
 *
 * Mở nhiều tab (W5-02): mỗi tab giữ state riêng trong bộ nhớ, nên trước
 * đây tab mở sau với state cũ sẽ ghi đè im lặng dữ liệu tab kia vừa thêm.
 * Nay tab nào cũng nghe sự kiện `storage` trên cả STORAGE_KEY lẫn
 * BANK_BOOK_KEY (sổ ngân hàng per-device): thấy dữ liệu trên máy khác với
 * lần ghi gần nhất của CHÍNH mình thì nạp lại bản mới nhất ngay + hiện
 * thông báo — lần ghi tiếp theo của tab này xuất phát từ dữ liệu mới
 * nhất, không còn ghi đè mất dữ liệu của tab khác trong im lặng.
 */
export function ChiaTienApp() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [importedTitle, setImportedTitle] = useState('');
  const [importedDropped, setImportedDropped] = useState(0);
  const [importedStrippedBank, setImportedStrippedBank] = useState(false);
  const [importedStep, setImportedStep] = useState<1 | 3 | undefined>(undefined);
  const [externalChange, setExternalChange] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [undoToast, setUndoToast] = useState<{ label: string; undo: () => void } | null>(null);
  // Chuỗi JSON lần gần nhất tab này ghi (hoặc nạp) — mốc đối chiếu để phân
  // biệt "storage đổi do chính mình" với "tab khác vừa ghi" trong sự kiện
  // storage (sự kiện không bắn ở tab đã ghi, nhưng đối chiếu cho chắc).
  const lastWrittenRef = useRef<string | null>(null);
  const lastBankRef = useRef<string | null>(null);
  const savedTimerRef = useRef<number | undefined>(undefined);
  const undoTimerRef = useRef<number | undefined>(undefined);

  // Đăng ký service worker (W5-01): app shell được cache để mở lại offline.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Không đăng ký được SW (trình duyệt cũ/chặn) — app vẫn chạy online
      // bình thường; offline là lớp tăng cường, không phải điều kiện dùng.
    });
  }, []);

  // Bootstrap một lần từ hệ thống ngoài (localStorage + URL hash): effect là
  // nơi đúng cho việc này theo React docs; setState ở đây không gây vòng lặp
  // render vì effect chỉ chạy một lần sau mount.
  useEffect(() => {
    let initial = loadSessions();
    let shared: Session | null = null;
    let dropped = 0;
    let strippedBank = false;
    try {
      const report = readShareFromHashWithReport();
      shared = report.session;
      dropped = report.droppedExpenses;
      strippedBank = report.strippedBank;
    } catch {
      shared = null;
    }
    let imported: Session | null = null;
    if (shared) {
      imported = cloneForImport(shared);
      initial = [imported, ...initial];
      // Xoá hash khỏi thanh địa chỉ để reload không import trùng.
      window.history.replaceState(null, '', window.location.pathname);
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setSessions(initial);
    lastWrittenRef.current = serializeSessions(initial);
    lastBankRef.current = JSON.stringify(loadBankBook());
    if (imported) {
      setImportedTitle(imported.title);
      setImportedDropped(dropped);
      setImportedStrippedBank(strippedBank);
      // Người nhận link thường đến để xem kết quả: có khoản chi -> bước 3.
      setImportedStep(imported.expenses.length > 0 ? 3 : 1);
      setActiveId(imported.id);
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (imported) setSaveFailed(!trySaveSessions(initial));
  }, []);

  // Đồng bộ xuyên tab (W5-02 + DATA-04): tab khác ghi sessions HOẶC sổ
  // ngân hàng -> nạp lại bản mới nhất và báo rõ, thay vì giữ state cũ rồi
  // ghi đè mất dữ liệu của họ.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== BANK_BOOK_KEY) return;
      const fresh = loadSessions();
      const freshSerialized = serializeSessions(fresh);
      const freshBank = JSON.stringify(loadBankBook());
      const sessionsChanged = freshSerialized !== lastWrittenRef.current;
      const bankChanged = freshBank !== lastBankRef.current;
      if (!sessionsChanged && !bankChanged) return;
      lastWrittenRef.current = freshSerialized;
      lastBankRef.current = freshBank;
      setSessions(fresh);
      // Cuộc chia đang mở đã bị tab khác xoá -> quay về danh sách.
      setActiveId((current) => (current && fresh.some((s) => s.id === current) ? current : null));
      setExternalChange(true);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function flashSaved() {
    window.clearTimeout(savedTimerRef.current);
    setSavedFlash(true);
    savedTimerRef.current = window.setTimeout(() => setSavedFlash(false), 2000);
  }

  /** Mọi thay đổi dữ liệu đều qua đây: cập nhật state + ghi bền ngay lập tức. */
  function commit(next: Session[]) {
    lastWrittenRef.current = serializeSessions(next);
    setSessions(next);
    const ok = trySaveSessions(next);
    lastBankRef.current = JSON.stringify(loadBankBook());
    setSaveFailed(!ok);
    if (ok) flashSaved();
  }

  /** Toast Hoàn tác dùng chung cho mọi thao tác xoá trong app (panel §7.10). */
  function showUndo(label: string, undo: () => void) {
    window.clearTimeout(undoTimerRef.current);
    setUndoToast({ label, undo });
    undoTimerRef.current = window.setTimeout(() => setUndoToast(null), 6000);
  }

  const active = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  function createSession(title: string) {
    const now = Date.now();
    const session: Session = {
      id: newId(),
      title,
      members: [],
      expenses: [],
      createdAt: now,
      updatedAt: now,
    };
    commit([session, ...sessions]);
    setActiveId(session.id);
  }

  function updateSession(next: Session) {
    commit(sessions.map((s) => (s.id === next.id ? next : s)));
  }

  function deleteSession(id: string) {
    const index = sessions.findIndex((s) => s.id === id);
    const target = sessions[index];
    commit(sessions.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
    if (target) {
      showUndo(`Đã xoá cuộc chia "${target.title}"`, () => {
        setSessions((current) => {
          if (current.some((s) => s.id === id)) return current;
          const restored = [...current];
          restored.splice(Math.min(index, restored.length), 0, target);
          lastWrittenRef.current = serializeSessions(restored);
          setSaveFailed(!trySaveSessions(restored));
          lastBankRef.current = JSON.stringify(loadBankBook());
          return restored;
        });
      });
    }
  }

  function goBackToList() {
    setActiveId(null);
    setImportedStep(undefined);
    // Dọn ?buoc= của phiên vừa đóng khỏi thanh địa chỉ.
    window.history.replaceState(null, '', window.location.pathname);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col px-4 sm:px-6">
      <header className="flex h-14 items-center gap-3">
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
            onClick={() => setImportedTitle('')}
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
            onClick={() => setExternalChange(false)}
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
              window.clearTimeout(undoTimerRef.current);
              setUndoToast(null);
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
