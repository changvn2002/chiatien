// tick-map.ts — Ánh xạ thuần vận tốc góc / thời gian còn lại → tham số
// phát tiếng «tách» của G2 (SPEC §7.5). Không import Howler — hàm thuần
// để unit test bằng Node (tick-map.spec.ts).
//
// LUẬT SPEC §7.5: tiếng «tách» qua biên ô CHỈ là hàm của vận tốc góc
// hiện tại; trống dồn CHỈ là hàm của thời gian còn lại của vòng quay.
// Cả hai đều mù trước vị trí ô / danh tính người chơi — mọi ô dùng đúng
// một công thức, một mẫu âm; chỉ cao độ (rate) và âm lượng biến thiên.

/** Kẹp về [0, 1]; NaN → 0 (đầu vào hỏng thì phát nhỏ nhất, không vỡ). */
export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

/** Cao độ tiếng «tách» theo vận tốc góc chuẩn hoá v01: 0,75 (chậm) → 1,30 (nhanh). */
export function tickRate(v01: number): number {
  return 0.75 + 0.55 * clamp01(v01);
}

/** Âm lượng tiếng «tách» theo vận tốc góc chuẩn hoá v01: 0,12 → 0,62. */
export function tickVolume(v01: number): number {
  return 0.12 + 0.5 * clamp01(v01);
}

/**
 * Cao độ nhịp trống theo thời gian còn lại r01 (1 = mới bắt đầu, 0 = sắp
 * dừng): càng ít thời gian còn lại trống càng cao/căng: r01=1 → 0,90;
 * r01=0 → 1,20.
 */
export function drumRate(r01: number): number {
  return 0.9 + 0.3 * (1 - clamp01(r01));
}

/** Âm lượng nhịp trống theo thời gian còn lại r01: r01=1 → 0,15; r01=0 → 0,65. */
export function drumVolume(r01: number): number {
  return 0.15 + 0.5 * (1 - clamp01(r01));
}
