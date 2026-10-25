// qr-capture.tsx — Khối nhập QR của quán DÙNG CHUNG (FIX-UX-GAME): trích
// nguyên khối camera / chọn ảnh / dán chuỗi từ M1 để M1 (luồng cũ, giữ
// nguyên hành vi) và màn thiết lập gộp mới dùng cùng một cơ chế đọc QR.
// Ảnh QR chỉ xử lý trên máy (game/qr/decode.ts), không tải lên đâu; payload
// chỉ sống trong draft (bộ nhớ). Camera tự dừng khi khối unmount.

'use client';

import { useEffect, useRef, useState } from 'react';
import { decodeQrFromCanvasSource, decodeQrFromFile } from '../qr/decode';
import { parseShopQrPayload } from '../qr/emv';
import type { GameDraft } from '../state';

export interface QrCaptureTexts {
  /** Ghi chú khi đọc được QR và giải mã VietQR thành công. */
  parsedNote: string;
  /** Ghi chú khi nhận được nội dung QR nhưng không giải mã được. */
  failedNote: string;
  /** Dòng trạng thái khi đã có payload trong draft. */
  hasPayloadText: string;
  /** Dòng trạng thái khi chưa có QR. */
  emptyText: string;
}

export function QrCaptureBlock({
  draft,
  onDraft,
  totalVnd,
  texts,
}: {
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  /** Tổng tiền hiện tại của ván — ghi kèm vào draft khi áp payload QR. */
  totalVnd: number;
  texts: QrCaptureTexts;
}) {
  const [pasteText, setPasteText] = useState(draft.qr.payload ?? '');
  const [cameraOn, setCameraOn] = useState(false);
  const [qrNote, setQrNote] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  // Rời màn / unmount: luôn tắt camera (trước đây M1 tự gọi ở nút đi tiếp;
  // nay khối tự sở hữu vòng đời camera của mình).
  useEffect(() => {
    const streamAtMount = streamRef;
    return () => {
      streamAtMount.current?.getTracks().forEach((t) => t.stop());
      streamAtMount.current = null;
    };
  }, []);

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
      setQrNote(
        'Chưa đọc được QR trong khung hình. Hãy đưa QR vào gần hơn, đủ sáng và trọn 4 góc rồi chụp lại.',
      );
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
      setQrNote(
        'Chưa đọc được QR từ ảnh này. Hãy thử ảnh rõ hơn, trọn 4 góc, hoặc dán nội dung QR.',
      );
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
    setQrNote(result.ok ? texts.parsedNote : texts.failedNote);
  }

  function applyPaste() {
    const text = pasteText.trim();
    if (!text) return;
    applyPayload(text, null);
  }

  return (
    <div>
      {/* Khung QR im lặng với dải nhãn «VietQR» + 4 góc ngắm (pattern 8 —
          MoMo 2.1 / ShopeePay 2.2, FIX-V3 P1.8 giữ nguyên): camera trực
          tiếp có thật (video + nút chụp để giải mã một khung hình) —
          KHÔNG có quét tự động liên tục. */}
      <div className="relative mt-3 rounded-lg border border-line-strong bg-card px-3 py-3">
        <div className="-mx-3 -mt-3 mb-3 flex items-center justify-between rounded-t-lg bg-ink px-3 py-1.5">
          <span className="text-sm font-bold tracking-[0.2em] text-white">VietQR</span>
          <span className="text-xs text-white">QR của quán</span>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute top-10 left-2 h-5 w-5 border-t-[3px] border-l-[3px] border-brand"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-10 right-2 h-5 w-5 border-t-[3px] border-r-[3px] border-brand"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 h-5 w-5 border-r-[3px] border-b-[3px] border-brand"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-b-[3px] border-l-[3px] border-brand"
        />

        <div className="mt-1 flex flex-wrap gap-2">
          {cameraOn ? (
            <>
              <button
                type="button"
                onClick={() => void captureFrame()}
                className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
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
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 left-1 z-10 h-5 w-5 border-t-[3px] border-l-[3px] border-white"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 right-1 z-10 h-5 w-5 border-t-[3px] border-r-[3px] border-white"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-1 bottom-1 z-10 h-5 w-5 border-r-[3px] border-b-[3px] border-white"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1 z-10 h-5 w-5 border-b-[3px] border-l-[3px] border-white"
            />
            <video ref={videoRef} playsInline muted className="mx-auto block w-full max-w-md" />
          </div>
        ) : null}

        <label className="mt-4 mb-1.5 block text-base font-semibold text-ink" htmlFor="qr-paste">
          Hoặc dán nội dung QR
        </label>
        <textarea
          id="qr-paste"
          rows={3}
          // Viền MỘT nét trung tính (PRES vòng 2, mục 11): khi focus chỉ
          // viền đổi sang line-strong #534946, outline tắt bằng style nội
          // tuyến (luật :focus-visible ở globals.css là CSS không-layer).
          // F3: font-size ≥16px chống iOS zoom; F6: focus cuộn về giữa.
          style={{ outline: 'none' }}
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

      {/* MỘT dòng trạng thái duy nhất (PRES vòng 2, mục 11): ưu tiên ghi
          chú thao tác mới nhất (qrNote) → trạng thái đã có QR → chưa có. */}
      <p role="status" className={qrNote ? 'mt-3 text-base text-ink' : 'mt-3 text-sm text-ink-2'}>
        {qrNote ? qrNote : draft.qr.payload ? texts.hasPayloadText : texts.emptyText}
      </p>
    </div>
  );
}
