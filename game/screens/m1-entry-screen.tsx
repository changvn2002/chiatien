// M1 — Nhập liệu (SPEC §M1): tổng tiền + QR quán bằng 3 đường (camera /
// chọn ảnh / dán chuỗi). Kiểm trần kép NGAY tại M1 theo mặc định toàn bộ
// thành viên phiên (checkCaps của engine với phần chia đều của app qua
// adapter) — vượt trần thì chặn cứng, nêu đúng số, không cho đi tiếp.
// Ảnh QR chỉ xử lý trên máy (game/qr/decode.ts), không tải lên đâu.

'use client';

import { useMemo, useRef, useState } from 'react';
import { checkCaps } from '../engine';
import { equalSharesFor, formatMoney, formatMoneyGrouped, parseMoneyInput } from '../adapter';
import type { GameSessionInput } from '../adapter';
import { decodeQrFromCanvasSource, decodeQrFromFile } from '../qr/decode';
import { parseShopQrPayload } from '../qr/emv';
import type { GameDraft } from '../state';
import { RedAlert, ScreenTitle, SplitEvenButton } from './shared';

export function M1EntryScreen({
  input,
  draft,
  onDraft,
  onNext,
  onSplitEven,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  onNext: () => void;
  onSplitEven: () => void;
}) {
  const [totalText, setTotalText] = useState(() =>
    draft.totalVnd > 0 ? formatMoneyGrouped(draft.totalVnd) : '',
  );
  const [pasteText, setPasteText] = useState(draft.qr.payload ?? '');
  const [cameraOn, setCameraOn] = useState(false);
  const [qrNote, setQrNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalVnd = parseMoneyInput(totalText);
  const allIds = useMemo(() => input.members.map((m) => m.id), [input]);
  // Trần kép tại M1: mặc định toàn bộ thành viên phiên (SPEC §M1).
  const caps = useMemo(() => {
    if (totalVnd <= 0 || allIds.length < 2) return null;
    const shares = allIds.map((id) => equalSharesFor(totalVnd, allIds)[id] ?? 0);
    return checkCaps(totalVnd, shares);
  }, [totalVnd, allIds]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // Gắn stream sau khi video đã render.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      setQrNote('Không mở được camera. Hãy thử chọn ảnh QR hoặc dán nội dung QR.');
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const payload = await decodeQrFromCanvasSource(video, video.videoWidth, video.videoHeight);
    if (!payload) {
      setQrNote('Chưa đọc được QR trong khung hình. Hãy đưa QR vào gần hơn, đủ sáng và trọn 4 góc rồi chụp lại.');
      return;
    }
    applyPayload(payload, null);
    stopCamera();
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    // Giữ ảnh (data URL) chỉ trong bộ nhớ để M7 hiện lại nếu còn phiên.
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    const payload = await decodeQrFromFile(file);
    if (!payload) {
      setQrNote('Chưa đọc được QR từ ảnh này. Hãy thử ảnh rõ hơn, trọn 4 góc, hoặc dán nội dung QR.');
      return;
    }
    applyPayload(payload, dataUrl);
  }

  function applyPayload(payload: string, imageDataUrl: string | null) {
    const result = parseShopQrPayload(payload);
    onDraft({
      ...draft,
      totalVnd,
      qr: {
        ...draft.qr,
        payload,
        imageDataUrl,
        parsed: result.ok ? result.parsed : null,
        parseFailed: !result.ok,
      },
    });
    setPasteText(payload);
    setQrNote(
      result.ok
        ? 'Đã đọc được QR. Bước tiếp theo sẽ đối chiếu thông tin người nhận.'
        : 'Đã nhận nội dung QR nhưng chưa giải mã được theo chuẩn VietQR. Nhóm vẫn có thể chơi tiếp — xem hướng dẫn ở bước sau.',
    );
  }

  function applyPaste() {
    const text = pasteText.trim();
    if (!text) return;
    applyPayload(text, null);
  }

  const canContinue = totalVnd > 0 && caps !== null && caps.ok && Boolean(draft.qr.payload);
  const totalChangedVsSession =
    input.sessionTotalVnd > 0 && totalVnd > 0 && totalVnd !== input.sessionTotalVnd;

  return (
    <div>
      <ScreenTitle>Nhập tiền và QR của quán</ScreenTitle>
      <p className="mt-1 text-base text-ink-2">
        Tổng số tiền buổi hôm nay phải trả cho quán và mã QR của quán. Game chỉ dùng hai dữ kiện này để
        chọn người đãi — phép chia đều của phiên không đổi.
      </p>

      <label className="mt-5 mb-1.5 block text-base font-semibold text-ink" htmlFor="m1-total">
        Tổng hoá đơn hôm nay (VND)
      </label>
      <input
        id="m1-total"
        // F9 (audit PWA native-feel): ô tiền dùng bàn phím decimal.
        inputMode="decimal"
        className="w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 text-base text-ink outline-none placeholder:text-placeholder focus:border-brand-deep"
        placeholder="Ví dụ: 450.000"
        value={totalText}
        onChange={(e) => {
          const v = parseMoneyInput(e.target.value);
          setTotalText(v > 0 ? formatMoneyGrouped(v) : '');
          onDraft({ ...draft, totalVnd: v });
        }}
      />
      {totalChangedVsSession ? (
        <p className="mt-1.5 text-sm text-ink-2">
          Tổng này khác tổng hiện tại của phiên ({formatMoney(input.sessionTotalVnd)}). Trần của ván được
          kiểm theo đúng tổng vừa nhập.
        </p>
      ) : null}

      {caps && !caps.ok ? (
        <div className="mt-3">
          <RedAlert>
            <p className="font-bold">Số tiền này vượt trần của game nên chưa chơi được.</p>
            <ul className="mt-1 list-disc pl-5">
              {caps.violations.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p className="mt-1">
              Người được chọn sẽ gánh thêm tối đa {formatMoney(caps.maxExtra)} so với chia đều. Cách hợp
              lệ duy nhất là quay về chia đều như thường.
            </p>
          </RedAlert>
        </div>
      ) : null}

      <h3 className="mt-6 text-base font-semibold text-ink">QR của quán</h3>
      <p className="text-sm text-ink-2">Chọn một trong ba cách. Ảnh QR chỉ được xử lý ngay trên máy này.</p>

      {/* FIX-V3 P1.8 (pattern 8 — MoMo 2.1 / ShopeePay 2.2) trong
          GIỚI HẠN TÍNH NĂNG THẬT đang có: vùng chụp/chọn/dán QR nằm
          trong MỘT KHUNG IM LẶNG có dải nhãn «VietQR» ngay trên khung
          và 4 góc ngắm ở khung camera thật. Tính năng thật: camera
          trực tiếp có thật (video trực tiếp + nút chụp để giải mã
          một khung hình) — KHÔNG có quét tự động liên tục, app không
          dàn dựng tính năng đó (ghi rõ ở handoff lane D). */}
      <div className="relative mt-3 rounded-lg border border-line-strong bg-card px-3 py-3">
        <div className="-mx-3 -mt-3 mb-3 flex items-center justify-between rounded-t-lg bg-ink px-3 py-1.5">
          <span className="text-sm font-bold tracking-[0.2em] text-white">VietQR</span>
          <span className="text-xs text-white">QR của quán</span>
        </div>
        <span aria-hidden className="pointer-events-none absolute top-10 left-2 h-5 w-5 border-t-[3px] border-l-[3px] border-brand" />
        <span aria-hidden className="pointer-events-none absolute top-10 right-2 h-5 w-5 border-t-[3px] border-r-[3px] border-brand" />
        <span aria-hidden className="pointer-events-none absolute right-2 bottom-2 h-5 w-5 border-r-[3px] border-b-[3px] border-brand" />
        <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-b-[3px] border-l-[3px] border-brand" />

      <div className="mt-1 flex flex-wrap gap-2">
        {cameraOn ? (
          <>
            <button
              type="button"
              onClick={() => void captureFrame()}
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
            >
              Chụp QR trong khung hình
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
            >
              Tắt camera
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
          >
            Chụp bằng camera
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
        >
          Chọn ảnh QR
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onPickFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </div>

      {cameraOn ? (
        <div className="relative mt-3 bg-ink p-2">
          <span aria-hidden className="pointer-events-none absolute top-1 left-1 z-10 h-5 w-5 border-t-[3px] border-l-[3px] border-white" />
          <span aria-hidden className="pointer-events-none absolute top-1 right-1 z-10 h-5 w-5 border-t-[3px] border-r-[3px] border-white" />
          <span aria-hidden className="pointer-events-none absolute right-1 bottom-1 z-10 h-5 w-5 border-r-[3px] border-b-[3px] border-white" />
          <span aria-hidden className="pointer-events-none absolute bottom-1 left-1 z-10 h-5 w-5 border-b-[3px] border-l-[3px] border-white" />
          <video ref={videoRef} playsInline muted className="mx-auto block w-full max-w-md" />
        </div>
      ) : null}

      <label className="mt-4 mb-1.5 block text-base font-semibold text-ink" htmlFor="m1-paste">
        Hoặc dán nội dung QR
      </label>
      <textarea
        id="m1-paste"
        rows={3}
        // Viền MỘT nét trung tính (PRES vòng 2, mục 11): bỏ
        // focus:border-brand-deep — viền brand + vòng :focus-visible
        // brand-900 toàn cục chồng thành viền đôi cam/đỏ đọc như báo
        // lỗi. Khi focus, CHỈ viền của ô đổi sang line-strong #534946
        // (DESIGN.md: token line-strong / Line Control) và outline bị
        // tắt bằng style nội tuyến (luật :focus-visible ở globals.css
        // là CSS không-layer, đè được outline-none dạng utility nên
        // phải tắt ở tầng style) — focus vẫn đọc rõ qua nét viền đậm
        // trung tính duy nhất đó.
        style={{ outline: 'none' }}
        // F3 (audit PWA native-feel): font-size ≥16px cho MỌI ô nhập của
        // game — ô này trước đây text-sm (14px) làm iOS tự zoom khi
        // focus. F6: khi focus, cuộn ô về giữa màn hình để bàn phím ảo
        // không che (cơ chế scrollIntoView block:center).
        onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })}
        className="w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 font-mono text-base text-ink placeholder:text-placeholder focus:border-[#534946]"
        placeholder="Dán chuỗi nội dung đọc được từ mã QR…"
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
      />
      <button
        type="button"
        onClick={applyPaste}
        disabled={!pasteText.trim()}
        className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink disabled:cursor-not-allowed disabled:text-muted"
      >
        Dùng nội dung này
      </button>
      </div>

      {/* MỘT dòng trạng thái duy nhất (PRES vòng 2, mục 11): trước đây
          qrNote và dòng «Đã có QR cho ván này…» cùng hiện và trùng
          nghĩa. Ưu tiên: thông báo mới nhất của thao tác QR (qrNote —
          gồm cả lỗi camera/đọc ảnh) → trạng thái đã có QR → trạng thái
          chưa có QR. */}
      <p role="status" className={qrNote ? 'mt-3 text-base text-ink' : 'mt-3 text-sm text-ink-2'}>
        {qrNote
          ? qrNote
          : draft.qr.payload
            ? 'Đã có QR cho ván này. Bấm Tiếp tục để đối chiếu thông tin người nhận trước khi chơi.'
            : 'Cần có QR của quán (một trong ba cách trên) để sang bước đối chiếu.'}
      </p>

      <button
        type="button"
        disabled={!canContinue}
        onClick={() => {
          stopCamera();
          onNext();
        }}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed disabled:cursor-not-allowed disabled:bg-deck-sand disabled:text-ink"
      >
        Tiếp tục
      </button>
      <SplitEvenButton
        onClick={() => {
          stopCamera();
          onSplitEven();
        }}
      />
    </div>
  );
}
