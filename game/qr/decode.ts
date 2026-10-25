// decode.ts — Giải mã QR TỪ ẢNH bằng jsQR (SPEC §M2, ARCHITECTURE §5).
// jsQR được coordinator chốt ở PROTO-STATE (lane B đo: decoder jsQR) và chỉ
// nạp trong lazy chunk của game qua import động — không vào bundle app chính.
// Ảnh chỉ xử lý trên máy: canvas nội bộ, không tải lên bất kỳ đâu (SPEC §M1).

/** Vẽ một nguồn ảnh (video/canvas/bitmap) vào canvas tạm rồi chạy jsQR. Trả payload hoặc null. */
export async function decodeQrFromCanvasSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<string | null> {
  if (width <= 0 || height <= 0) return null;
  // Thu nhỏ về tối đa 1280px cạnh dài: đủ nét cho QR, nhẹ CPU trên máy yếu.
  const scale = Math.min(1, 1280 / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const jsQR = (await import('jsqr')).default;
  const result = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
  return result?.data ? result.data : null;
}

/** Giải mã từ một File ảnh người dùng chọn (input file) — xử lý hoàn toàn trên máy. */
export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  try {
    return await decodeQrFromCanvasSource(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
