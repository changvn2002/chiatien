'use client';

import { useEffect, useMemo, useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { newId } from '@/lib/id';
import { FAQ_ITEMS } from '@/lib/site';
import { cloneForImport, readShareFromHashWithReport } from '@/lib/share';
import { loadSessions, trySaveSessions } from '@/lib/storage';
import type { Session } from '@/lib/types';
import { SessionList } from './session-list';
import { SessionView } from './session-view';

/**
 * Gốc của app Chia Tiền — quản lý danh sách cuộc chia, lưu bền bằng
 * localStorage, và nhận cuộc chia từ share link (#chia=...) khi mở trang.
 */
export function ChiaTienApp() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [importedTitle, setImportedTitle] = useState('');
  const [importedDropped, setImportedDropped] = useState(0);

  // Bootstrap một lần từ hệ thống ngoài (localStorage + URL hash): effect là
  // nơi đúng cho việc này theo React docs; setState ở đây không gây vòng lặp
  // render vì effect chỉ chạy một lần sau mount.
  useEffect(() => {
    let initial = loadSessions();
    let shared: Session | null = null;
    let dropped = 0;
    try {
      const report = readShareFromHashWithReport();
      shared = report.session;
      dropped = report.droppedExpenses;
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
    if (imported) {
      setImportedTitle(imported.title);
      setImportedDropped(dropped);
      setActiveId(imported.id);
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (imported) setSaveFailed(!trySaveSessions(initial));
  }, []);

  /** Mọi thay đổi dữ liệu đều qua đây: cập nhật state + ghi bền ngay lập tức. */
  function commit(next: Session[]) {
    setSessions(next);
    setSaveFailed(!trySaveSessions(next));
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
    commit(sessions.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 sm:px-6">
      <header className="flex items-center gap-3 border-b border-line py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/products/brand/chiatien-logo.svg" alt="Logo Chia Tiền" width={44} height={44} />
        <div>
          <h1 className="font-display text-xl leading-tight font-bold text-ink">Chia Tiền</h1>
          <p className="text-sm text-muted">Chia tiền nhóm — quyết toán một lần, hết nợ nần</p>
        </div>
      </header>

      {saveFailed && (
        <p
          role="alert"
          className="mt-4 mb-4 flex items-start gap-2 rounded-xl bg-debt/10 px-4 py-3 text-sm font-medium text-debt"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Trình duyệt đang chặn lưu trữ (có thể do chế độ ẩn danh) — dữ liệu chỉ giữ trong lần mở
            này, hãy dùng link chia sẻ để mang cuộc chia đi nơi khác.
          </span>
        </p>
      )}
      {importedTitle && (
        <div className="mt-4 mb-4 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand-deep">
          <p className="flex-1">
            Đã nhập cuộc chia “{importedTitle}” từ link chia sẻ — bản sao này nằm trên máy của bạn,
            cứ sửa thoải mái.
            {importedDropped > 0 &&
              ` Có ${importedDropped} khoản chi trong link không hợp lệ nên đã bị loại bỏ để tránh lệch tiền — hãy kiểm tra lại danh sách khoản chi.`}
          </p>
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

      <main className="flex-1 pt-6 pb-10">
        {!loaded ? (
          <p
            role="status"
            className="rounded-2xl border border-dashed border-line bg-card/60 p-8 text-center text-muted"
          >
            Đang mở sổ chia tiền…
          </p>
        ) : active ? (
          <SessionView
            session={active}
            onChange={updateSession}
            onDelete={() => deleteSession(active.id)}
            onBack={() => setActiveId(null)}
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

      <footer className="border-t border-line py-8">
        <div className="grid gap-9">
          <section aria-labelledby="gioi-thieu">
            <h2 id="gioi-thieu" className="mb-2 font-display text-lg font-bold text-ink">
              Chia Tiền là gì?
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              Chia Tiền là công cụ chia tiền nhóm miễn phí cho người Việt. Mỗi chuyến đi chơi, bữa
              ăn nhậu hay kỳ ở trọ chung là một “cuộc chia”: bạn ghi lại ai đã trả khoản nào, app tự
              chia cho đúng những người liên quan, triệt tiêu các khoản nợ chồng chéo và cho ra danh
              sách “ai trả ai bao nhiêu” với số lần chuyển tiền ít nhất — kèm mã VietQR để quét
              chuyển ngay khi người nhận có tài khoản ngân hàng. Không cần cài app, không cần đăng
              nhập, không có máy chủ: mở link là dùng ngay trên trình duyệt, dữ liệu nằm trên máy
              của bạn, cần gửi cho cả nhóm thì dùng link chia sẻ chứa trọn cuộc chia.
            </p>
          </section>

          <section aria-labelledby="cach-dung">
            <h2 id="cach-dung" className="mb-3 font-display text-lg font-bold text-ink">
              Cách chia tiền nhóm trong 3 bước
            </h2>
            <ol className="grid gap-4 sm:grid-cols-3">
              <li>
                <h3 className="mb-1 font-display text-base font-bold text-ink">
                  Bước 1 — Tạo cuộc chia, thêm thành viên
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Đặt tên cho chuyến đi hay bữa tiệc rồi thêm từng người trong nhóm. Ai muốn nhận
                  tiền qua VietQR thì nhập thêm tài khoản ngân hàng của họ.
                </p>
              </li>
              <li>
                <h3 className="mb-1 font-display text-base font-bold text-ink">
                  Bước 2 — Ghi từng khoản chi
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Ai trả, bao nhiêu, chia cho những ai — chọn cách chia đều, tuỳ chỉnh số tiền từng
                  người, hoặc chia theo phần (ở mấy đêm, ăn mấy bữa).
                </p>
              </li>
              <li>
                <h3 className="mb-1 font-display text-base font-bold text-ink">
                  Bước 3 — Chốt quyết toán
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  App tính số dư từng người và rút gọn thành ít lần chuyển nhất. Quét VietQR để trả
                  ngay, hoặc copy bản quyết toán gửi thẳng vào nhóm Zalo, Messenger.
                </p>
              </li>
            </ol>
          </section>

          <section aria-labelledby="cau-hoi-thuong-gap">
            <h2 id="cau-hoi-thuong-gap" className="mb-3 font-display text-lg font-bold text-ink">
              Câu hỏi thường gặp
            </h2>
            <div className="grid gap-5">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question}>
                  <h3 className="mb-1 font-display text-base font-bold text-ink">
                    {item.question}
                  </h3>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <p className="mt-9 text-center text-xs text-muted">
          Chia Tiền — công cụ chia tiền nhóm miễn phí cho người Việt.
        </p>
      </footer>
    </div>
  );
}
