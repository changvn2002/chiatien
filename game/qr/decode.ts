// decode.ts — Giải mã QR TỪ ẢNH (SPEC §M2, ARCHITECTURE §5).
// Thứ tự giải mã (UI-SLIM FLOW-3STEP, theo yêu cầu ngân sách):
// 1) BarcodeDetector của trình duyệt (API gốc, 0 byte thư viện) khi có
//    hỗ trợ 'qr_code' — thử TRƯỚC trên chính nguồn ảnh.
// 2) jsQR nạp LƯỜI bằng import động (chỉ tải chunk khi thật sự cần giải
//    mã) — đường dự phòng khi không có BarcodeDetector hoặc nó không
//    đọc được khung hình này. Kết quả là hợp tập của hai đường: hành
//    vi giải mã không kém bản cũ ở bất kỳ ca nào.
// Ảnh chỉ xử lý trên máy: canvas nội bộ, không tải lên bất kỳ đâu (SPEC §M1).

/** Tối thiểu của BarcodeDetector (chưa có trong lib DOM chuẩn của TS). */
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

/** Thử BarcodeDetector: undefined = không khả dụng (đi tiếp jsQR); string/null = đã thử. */
async function tryBarcodeDetector(source: CanvasImageSource): Promise<string | null | undefined> {
  try {
    const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!ctor) return undefined;
    if (ctor.getSupportedFormats) {
      const formats = await ctor.getSupportedFormats().catch(() => [] as string[]);
      if (!formats.includes('qr_code')) return undefined;
    }
    const detector = new ctor({ formats: ['qr_code'] });
    const codes = await detector.detect(source as ImageBitmapSource);
    return codes?.[0]?.rawValue ? codes[0].rawValue : null;
  } catch {
    return undefined;
  }
}

/** Vẽ một nguồn ảnh (video/canvas/bitmap) vào canvas tạm rồi chạy jsQR. Trả payload hoặc null. */
export async function decodeQrFromCanvasSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<string | null> {
  if (width <= 0 || height <= 0) return null;
  const native = await tryBarcodeDetector(source);
  if (typeof native === 'string' && native) return native;
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
