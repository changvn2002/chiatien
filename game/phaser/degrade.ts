// degrade.ts — Auto-degrade lớp diễn theo FPS (SPEC §M6 + ARCHITECTURE §6).
// Thuần TypeScript, không phụ thuộc Phaser — unit test bằng Node.
//
// Giao thức (ARCHITECTURE §6, T3.5):
// - Đo bằng TRUNG BÌNH TRƯỢT của các frame gần nhất (cửa sổ 30 frame), không
//   dùng FPS đếm theo giây lịch.
// - Trung bình trượt < ~45 FPS → bậc 1: giảm particles, tắt rung màn hình +
//   hiệu ứng phụ.
// - Trung bình trượt < ~30 FPS → bậc 2: giảm tiếp hiệu ứng + hạ độ phân giải
//   render (stage.tsx thực thi qua Scale Manager).
// - KHÔNG nâng bậc trở lại giữa ván: bậc là đơn điệu không giảm trong một
//   tracker (một tracker = một lần vào stage).
// - Degrade CHỈ chạm lớp diễn — không bao giờ đổi event log / kết quả.

export type DegradeLevel = 0 | 1 | 2;

export const DEGRADE_WINDOW_FRAMES = 30;
export const DEGRADE_FPS_LEVEL1 = 45;
export const DEGRADE_FPS_LEVEL2 = 30;

/** Bậc degrade suy từ FPS trung bình trượt. Ngưỡng là điểm xuất phát hiệu chuẩn của dự án (ARCH §6). */
export function degradeLevelForFps(avgFps: number): DegradeLevel {
  if (!Number.isFinite(avgFps) || avgFps <= 0) return 0;
  if (avgFps < DEGRADE_FPS_LEVEL2) return 2;
  if (avgFps < DEGRADE_FPS_LEVEL1) return 1;
  return 0;
}

export class FpsDegradeTracker {
  private samples: number[] = [];
  private currentLevel: DegradeLevel = 0;

  /** Bậc hiện tại (chỉ tăng trong suốt vòng đời tracker). */
  get level(): DegradeLevel {
    return this.currentLevel;
  }

  /** FPS trung bình trượt hiện tại, hoặc null khi chưa đủ cửa sổ. */
  get averageFps(): number | null {
    if (this.samples.length < DEGRADE_WINDOW_FRAMES) return null;
    const sum = this.samples.reduce((a, b) => a + b, 0);
    return 1000 / (sum / this.samples.length);
  }

  /**
   * Nạp một frame. deltaMs bị kẹp ở 100 ms để một lần khựng (chuyển tab,
   * GC) không kéo trung bình xuống giả tạo; frame bất thường (≤ 0) bị bỏ.
   * Trả về bậc hiện tại sau khi nạp.
   */
  push(deltaMs: number): DegradeLevel {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return this.currentLevel;
    this.samples.push(Math.min(deltaMs, 100));
    if (this.samples.length > DEGRADE_WINDOW_FRAMES) this.samples.shift();
    const fps = this.averageFps;
    if (fps !== null) {
      const candidate = degradeLevelForFps(fps);
      if (candidate > this.currentLevel) this.currentLevel = candidate;
    }
    return this.currentLevel;
  }
}
