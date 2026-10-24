'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { newId } from '@/lib/id';
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
import { ensureImportedSeal, titleForcesStatic, type SealMark } from './phieu';

/**
 * Toàn bộ wiring storage của app — tách khỏi app.tsx theo ARC-11 khoản 2
 * để component gốc thuần trình bày: nạp localStorage + share link lúc mở,
 * ghi bền mọi thay đổi, đồng bộ xuyên tab, toast Lưu/Hoàn tác. Hành vi
 * giữ nguyên 100% so với bản inline trước đây (test suite là bằng chứng).
 *
 * Mở nhiều tab (W5-02): mỗi tab giữ state riêng trong bộ nhớ, nên trước
 * đây tab mở sau với state cũ sẽ ghi đè im lặng dữ liệu tab kia vừa thêm.
 * Nay tab nào cũng nghe sự kiện `storage` trên cả STORAGE_KEY lẫn
 * BANK_BOOK_KEY (sổ ngân hàng per-device): thấy dữ liệu trên máy khác với
 * lần ghi gần nhất của CHÍNH mình thì nạp lại bản mới nhất ngay + hiện
 * thông báo — lần ghi tiếp theo của tab này xuất phát từ dữ liệu mới
 * nhất, không còn ghi đè mất dữ liệu của tab khác trong im lặng.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [importedTitle, setImportedTitle] = useState('');
  const [importedDropped, setImportedDropped] = useState(0);
  const [importedStrippedBank, setImportedStrippedBank] = useState(false);
  const [importedStep, setImportedStep] = useState<1 | 3 | undefined>(undefined);
  // Lớp 1 người nhận (v1.8.0, §2): CHỈ bật ở lần import đầu từ link.
  // Mở lại phiên đã import (từ danh sách / quay lại app) -> workspace
  // thẳng, không qua lớp 1. Tên phiên trúng bộ lọc tĩnh -> không lớp 1.
  const [layer1Active, setLayer1Active] = useState(false);
  const [importedSeal, setImportedSeal] = useState<SealMark | null>(null);
  const [qrRequest, setQrRequest] = useState<{ index: number; nonce: number } | null>(null);
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

  // Bootstrap một lần từ hệ thống ngoài (localStorage + URL hash): effect là
  // nơi đúng cho việc này theo React docs; setState ở đây không gây vòng lặp
  // render vì effect chỉ chạy một lần sau mount. (Lý do cho eslint-disable
  // dưới đây: react-hooks/set-state-in-effect cấm setState đồng bộ trong
  // effect, nhưng nạp dữ liệu ngoài một lần khi mount là mẫu được React
  // docs khuyến nghị cho external store — xem CQ-02.)
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
    /* eslint-disable react-hooks/set-state-in-effect -- bootstrap một lần từ localStorage + URL hash (hệ thống ngoài) sau mount, mẫu React docs cho external store */
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
      // Lớp 1 chặn tại điểm rơi import lần đầu (trừ phiên tĩnh cứng):
      // dấu bản của link được ghi local từ updatedAt của payload.
      if (!titleForcesStatic(imported.title)) {
        setImportedSeal(ensureImportedSeal(imported));
        setLayer1Active(true);
      }
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

  function dismissUndo() {
    window.clearTimeout(undoTimerRef.current);
    setUndoToast(null);
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

  /** Lớp 1 -> workspace (đúng 1 chạm qua nút «Bảng đầy đủ»). */
  function dismissLayer1() {
    setLayer1Active(false);
  }

  /** Lớp 1 -> mở phiếu -> nút QR: rời lớp 1, workspace mở QR của đúng lệnh. */
  function requestQrFromLayer1(index: number) {
    setQrRequest({ index, nonce: Date.now() });
    setLayer1Active(false);
  }

  function goBackToList() {
    setActiveId(null);
    setLayer1Active(false);
    setImportedStep(undefined);
    // Dọn ?buoc= của phiên vừa đóng khỏi thanh địa chỉ.
    window.history.replaceState(null, '', window.location.pathname);
  }

  return {
    sessions,
    active,
    activeId,
    setActiveId,
    loaded,
    saveFailed,
    importedTitle,
    importedDropped,
    importedStrippedBank,
    importedStep,
    layer1Active,
    importedSeal,
    qrRequest,
    dismissLayer1,
    requestQrFromLayer1,
    dismissImport: () => setImportedTitle(''),
    externalChange,
    dismissExternalChange: () => setExternalChange(false),
    savedFlash,
    undoToast,
    dismissUndo,
    createSession,
    updateSession,
    deleteSession,
    showUndo,
    goBackToList,
  };
}
