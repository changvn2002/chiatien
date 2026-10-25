// caps.ts — Trần kép SPEC §3.3, kiểm tra TRƯỚC màn đồng thuận, chặn cứng (không override).

export const TOTAL_CAP_VND = 2_000_000;
export const EXTRA_CAP_VND = 500_000;

/**
 * Trần tổng hiệu dụng theo cỡ nhóm n (n ≥ 2):
 * min(TOTAL_CAP; round(EXTRA_CAP × n/(n−1))).
 * Giá trị khớp bảng hệ quả SPEC §3.3: n=2→1.000.000; n=3→750.000;
 * n=4→666.667; n=8→571.429; n=12→545.455 (SPEC ghi «~», làm tròn tới đồng gần nhất).
 */
export function effectiveTotalCap(n: number): number {
  if (!Number.isFinite(n) || n < 2) return TOTAL_CAP_VND;
  return Math.min(TOTAL_CAP_VND, Math.round((EXTRA_CAP_VND * n) / (n - 1)));
}

export interface CapsCheck {
  ok: boolean;
  /** Gánh-thêm tối đa của ván = total − phần chia đều nhỏ nhất. */
  maxExtra: number;
  violations: string[];
}

/**
 * Kiểm tra trần kép.
 * @param totalVnd tổng hoá đơn của ván.
 * @param equalShares phần chia đều hiện tại của từng người chơi (theo đúng thứ tự người chơi).
 */
export function checkCaps(totalVnd: number, equalShares: number[]): CapsCheck {
  const violations: string[] = [];
  const n = equalShares.length;
  const minShare = n > 0 ? Math.min(...equalShares) : 0;
  const maxExtra = totalVnd - minShare;
  const effCap = effectiveTotalCap(n);

  if (totalVnd > TOTAL_CAP_VND) {
    violations.push(`Vượt trần tổng: tổng hoá đơn ${totalVnd} ₫ > trần tổng ${TOTAL_CAP_VND} ₫.`);
  }
  if (totalVnd > effCap) {
    violations.push(
      `Vượt trần tổng hiệu dụng cho nhóm ${n} người: tổng hoá đơn ${totalVnd} ₫ > ${effCap} ₫.`,
    );
  }
  if (maxExtra > EXTRA_CAP_VND) {
    violations.push(
      `Vượt trần gánh-thêm: người được chọn sẽ gánh thêm tối đa ${maxExtra} ₫ > trần gánh-thêm ${EXTRA_CAP_VND} ₫.`,
    );
  }
  return { ok: violations.length === 0, maxExtra, violations };
}
