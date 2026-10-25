// g2-motion.ts — Đường cong quay của G2 «Mâm Cơm Xoay» (SPEC §7.4), thuần
// TypeScript, không phụ thuộc Phaser — tách riêng để unit test bằng Node.
//
// LUẬT CỨNG (SPEC §7.4, điều kiện chặn release):
// - Sau giai đoạn tăng tốc ban đầu, vận tốc góc CHỈ GIẢM ĐƠN ĐIỆU, không bao
//   giờ tăng lại cho tới khi dừng hẳn.
// - Không fake-stop, không overshoot qua góc đích rồi quay lại, không
//   near-miss: hàm góc là đơn điệu tăng theo thời gian và dừng ĐÚNG tại
//   finalAngleDeg của event log (sai số < 0,5° — ở đây là khớp giải tích).
// - Đường cong MÙ trước danh tính người chơi: mọi tham số chỉ suy ra từ
//   spinSeconds + finalAngleDeg của log (kết quả đã chốt ở tầng engine);
//   hình dạng chuẩn hoá của đường cong không đổi theo ô/người được chọn.
//
// THIẾT KẾ ĐƯỜNG CONG (vận tốc hình — velocity shape, đỉnh = 1):
//   t ∈ [0, r]   : v(t) = sin( (π/2) · t/r )            — tăng tốc mượt 0 → 1
//   t ∈ [r, 1]   : v(t) = cos( (π/2) · (t−r)/(1−r) )   — giảm đơn điệu 1 → 0
// với r = G2_RAMP_RATIO. Tích phân toàn phần ∫v = 2/π (độc lập r), nên phân
// số góc đã đi f(t) = (∫₀ᵗ v) / (2/π) có dạng giải tích đóng:
//   t ≤ r : f(t) = r · (1 − cos( (π/2)·t/r ))
//   t > r : f(t) = r + (1−r) · sin( (π/2)·(t−r)/(1−r) )
// f(0) = 0, f(r) = r, f(1) = 1; f'(t) = v(t)·π/2 ≥ 0 mọi t (không overshoot);
// v liên tục tại t = r (cả hai nhánh đều = 1) và v(1) = 0 (dừng hẳn, không
// trượt thêm). Đơn điệu của nhánh giảm: cos giảm nghiêm ngặt trên [0, π/2].

/** Tỉ lệ thời gian dành cho giai đoạn tăng tốc (quy ước lớp diễn, mù theo ô). */
export const G2_RAMP_RATIO = 0.12;

function clamp01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}

/**
 * Hình vận tốc chuẩn hoá tại tiến độ t ∈ [0,1] (đỉnh = 1 tại cuối ramp).
 * Sau ramp: giảm đơn điệu nghiêm ngặt. Đây là HÀM DUY NHẤT quyết định hình
 * dạng đường cong — test đơn điệu chạy trực tiếp trên hàm này.
 */
export function g2VelocityShape(t01: number, rampRatio: number = G2_RAMP_RATIO): number {
  const t = clamp01(t01);
  const r = Math.min(0.5, Math.max(0.01, rampRatio));
  if (t <= r) {
    return Math.sin((Math.PI / 2) * (t / r));
  }
  return Math.cos((Math.PI / 2) * ((t - r) / (1 - r)));
}

/** Phân số góc đã đi tại tiến độ t ∈ [0,1] — tích phân giải tích của hình vận tốc. */
export function g2AngleFraction(t01: number, rampRatio: number = G2_RAMP_RATIO): number {
  const t = clamp01(t01);
  const r = Math.min(0.5, Math.max(0.01, rampRatio));
  if (t <= r) {
    return r * (1 - Math.cos((Math.PI / 2) * (t / r)));
  }
  return r + (1 - r) * Math.sin((Math.PI / 2) * ((t - r) / (1 - r)));
}

/** Vận tốc góc tức thời (độ/giây) tại tiến độ t01 của một vòng quay. */
export function g2AngularVelocityDegPerSec(
  t01: number,
  totalAngleDeg: number,
  durationSec: number,
  rampRatio: number = G2_RAMP_RATIO,
): number {
  if (durationSec <= 0) return 0;
  // f'(t) = v(t) · π/2 (vì ∫v trên [0,1] = 2/π); đổi sang độ/giây: × total / duration.
  return (g2VelocityShape(t01, rampRatio) * (Math.PI / 2) * totalAngleDeg) / durationSec;
}

/** Góc tuyệt đối (độ, đo theo chiều kim đồng hồ từ hướng 12 giờ) tại tiến độ t01. */
export function g2AngleDegAt(
  t01: number,
  totalAngleDeg: number,
  rampRatio: number = G2_RAMP_RATIO,
): number {
  return totalAngleDeg * g2AngleFraction(t01, rampRatio);
}

export interface G2SpinPlan {
  /** Tổng góc quay (độ) = số vòng nguyên × 360 + góc nghỉ của log. */
  totalAngleDeg: number;
  /** Số vòng nguyên — chỉ suy từ spinSeconds, không phụ thuộc ô/người. */
  fullTurns: number;
  /** Thời lượng quay (ms) ở tốc độ 1× — đúng spinSeconds của log. */
  durationMs: number;
  /** Góc nghỉ cuối (độ, [0,360)) — nguyên văn finalAngleDeg của log. */
  restAngleDeg: number;
  /**
   * FIX-V4 — MÔ HÌNH MÂM XOAY THẬT: tổng góc XOAY CỦA MÂM (độ, dấu âm =
   * ngược chiều kim đồng hồ theo quy ước góc scene) = −totalAngleDeg.
   * Đũa thành KIM CỐ ĐỊNH ở đỉnh mâm (hướng 12 giờ); mâm mang theo món
   * quay bên dưới kim. Ánh xạ này giữ nguyên tính tất định của log: ô
   * dưới kim tại thời điểm t đúng bằng ô mà đầu đũa mô hình cũ trỏ vào
   * tại cùng góc quét — xem g2TrayCellIndexAtPointer.
   */
  trayTotalRotationDeg: number;
  /** Góc nghỉ của mâm (độ, (−360,0]) = −restAngleDeg. */
  trayRestRotationDeg: number;
}

/**
 * Lập kế hoạch quay từ event `spin` của log G2. Số vòng nguyên suy ra CHỈ từ
 * spinSeconds (8–12 s → 7–10 vòng) để hình dạng/trọng lượng vòng quay không
 * tiết lộ và không phụ thuộc ô được chọn; phần lẻ là đúng finalAngleDeg.
 */
export function planG2Spin(finalAngleDeg: number, spinSeconds: number): G2SpinPlan {
  const restAngleDeg = ((finalAngleDeg % 360) + 360) % 360;
  const seconds = Math.min(12, Math.max(8, spinSeconds));
  const fullTurns = Math.min(10, Math.max(7, Math.round(seconds * 0.85)));
  const totalAngleDeg = fullTurns * 360 + restAngleDeg;
  return {
    totalAngleDeg,
    fullTurns,
    durationMs: Math.round(seconds * 1000),
    restAngleDeg,
    trayTotalRotationDeg: -totalAngleDeg,
    trayRestRotationDeg: -restAngleDeg,
  };
}

// ---------------------------------------------------------------------------
// FIX-V4 — MÔ HÌNH MÂM XOAY THẬT (hàm thuần, có spec riêng ở g2-motion.spec).
//
// Quy ước góc của scene: độ đo theo chiều kim đồng hồ từ hướng 12 giờ.
// Góc QUÉT θ(t) = g2AngleDegAt(t, total) giữ nguyên hồ sơ chuyển động cũ
// (tăng tốc ngắn → giảm đơn điệu → dừng đúng finalAngleDeg). Mâm xoay
// NGƯỢC chiều kim đồng hồ đúng bằng góc quét: trayRotation(t) = −θ(t).
// Hệ quả hình học (điểm cốt lõi của mô hình): một ô cố định trên mâm có
// góc cục bộ a sẽ xuất hiện ở góc thế giới a − θ(t); ô nằm DƯỚI KIM cố
// định (góc thế giới 0) là ô có góc cục bộ ≡ θ(t) — tức đúng ô mà đầu
// đũa quay mô hình cũ trỏ vào tại cùng góc quét. Nhờ vậy ô dưới kim, ô
// highlight và tên trên chip trạng thái khớp nhau 100% ở mọi thời điểm
// (truy vết 3 kênh của G2 giữ nguyên), và khi dừng (θ ≡ finalAngleDeg)
// ô dưới kim là đúng ô kết quả cellIndex của engine — kết quả ván không
// đổi, chỉ đổi phần tử trình diễn quay (mâm thay vì đũa).
// ---------------------------------------------------------------------------

/** Góc xoay của mâm (độ, ≤ 0 — ngược chiều kim đồng hồ) tại tiến độ t01. */
export function g2TrayRotationDegAt(
  t01: number,
  totalAngleDeg: number,
  rampRatio: number = G2_RAMP_RATIO,
): number {
  return -g2AngleDegAt(t01, totalAngleDeg, rampRatio);
}

/**
 * Ô (chỉ số ghế/ô trên mâm) đang nằm DƯỚI KIM cố định ở đỉnh mâm khi mâm
 * đã xoay `trayRotationDeg` độ. Tính thuần từ góc mâm: góc cục bộ dưới
 * kim = −trayRotationDeg (chuẩn hoá [0,360)) rồi chia đều theo ô — cùng
 * quy ước biên ô với g2CellIndexAtAngle của g2-food.ts (spec chứng minh
 * hai hàm khớp nhau trên mọi góc xoay suy ra từ hồ sơ quay).
 */
export function g2TrayCellIndexAtPointer(trayRotationDeg: number, playerCount: number): number {
  const n = Math.floor(playerCount);
  if (n < 1) return -1;
  const localDeg = ((-trayRotationDeg % 360) + 360) % 360;
  const idx = Math.floor(localDeg / (360 / n));
  return Math.min(n - 1, idx);
}
