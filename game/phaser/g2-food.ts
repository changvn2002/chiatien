// g2-food.ts — Logic THUẦN của món ăn + ô mâm G2 «Mâm Cơm Xoay» (FIX-V3,
// lane C): gán món cho ghế, cỡ món theo hình học vòng, và ánh xạ góc đũa →
// ô. Tách khỏi scenes-g2.ts (không phụ thuộc Phaser) để unit test bằng
// Node, đúng tiền lệ g2-motion.ts / g1-fx.ts.
//
// Atlas `g2-food` (REBUILD-C2 lane A2) có 8 frame: 7 món ghế luân phiên +
// `pot-stew` (nồi hầm) dành cho tâm mâm. Yêu cầu panel v3 (ghế 1 m-3, ghế 2):
// KHÔNG trùng món trên mâm khi còn món phân biệt chưa dùng — ghế kề nhau
// không bao giờ cùng món; ván ≤7 ghế = mọi ghế một món khác nhau; ván
// 8–12 ghế (trùng là bất khả kháng với 7 món ghế) thì ghế kề + ghế đối
// diện cũng không được trùng.

/** 7 món ghế theo thứ tự vòng gán (thứ tự frame trong atlas A2). */
export const SEAT_FOOD_FRAMES = [
  'bowl-broth',
  'bowl-soup',
  'salad',
  'plate-dinner',
  'plate-sauerkraut',
  'turkey',
  'corn',
] as const;

/** Món chung thứ nhất ở tâm mâm (nồi hầm) — không bao giờ gán cho ghế. */
export const CENTER_FOOD_FRAME = 'pot-stew';

/** Mọi frame của atlas g2-food — thiếu bất kỳ frame nào thì dùng fallback. */
export const ALL_FOOD_FRAMES = [...SEAT_FOOD_FRAMES, CENTER_FOOD_FRAME] as const;

/**
 * Gán món cho từng ghế theo vòng 7 món: ghế i nhận
 * SEAT_FOOD_FRAMES[i % 7]. Ván ≤7 ghế: mọi ghế khác nhau hiển nhiên.
 * Ván 8–12 ghế: cặp ghế cách nhau đúng 7 chỉ số mang cùng món; khoảng
 * cách vòng của cặp đó là N−7 ∈ [1,5] — chỉ N=8 biến cặp (0, 7) thành
 * ghế KỀ vòng (ghế cuối kề ghế đầu), và không ván nào biến nó thành cặp
 * ĐỐI diện (đối diện cần N=14). Vòng sửa dưới đây quét lại mọi ghế: ghế
 * nào trùng với ghế kề trước/kề sau (theo vòng) hoặc ghế đối diện thì
 * được gán lại món đầu tiên trong vòng 7 món không trùng với cả ba ghế
 * liên quan đó — luôn tồn tại vì chỉ phải tránh ≤3 món trong 7 món.
 */
export function assignSeatFoodFrames(playerCount: number): string[] {
  const n = Math.max(0, Math.floor(playerCount));
  const frames: string[] = [];
  for (let i = 0; i < n; i++) {
    frames.push(SEAT_FOOD_FRAMES[i % SEAT_FOOD_FRAMES.length]);
  }
  if (n <= SEAT_FOOD_FRAMES.length) return frames;
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const next = (i + 1) % n;
    const opposite = n % 2 === 0 ? (i + n / 2) % n : -1;
    const conflicts =
      frames[i] === frames[prev] ||
      frames[i] === frames[next] ||
      (opposite >= 0 && frames[i] === frames[opposite]);
    if (!conflicts) continue;
    const banned = new Set<string>([frames[prev], frames[next]]);
    if (opposite >= 0) banned.add(frames[opposite]);
    const replacement = SEAT_FOOD_FRAMES.find((frame) => !banned.has(frame));
    if (replacement) frames[i] = replacement;
  }
  return frames;
}

/**
 * Hai món chung ở tâm mâm: [pot-stew, món thứ hai]. Món thứ hai là món
 * ghế ĐẦU TIÊN chưa được ghế nào dùng — ván ≤6 ghế luôn còn món ghế chưa
 * dùng nên toàn mâm không trùng một món nào (tổng món phân biệt trên mâm
 * = N ghế + 2 tâm ≤ 8 frame). Ván ≥7 ghế: cả 8 frame đều đã có mặt, món
 * thứ hai rơi về 'bowl-soup' như bố cục cũ (trùng là bất khả kháng).
 */
export function sharedFoodFrames(playerCount: number): [string, string] {
  const used = new Set(assignSeatFoodFrames(playerCount));
  const unused = SEAT_FOOD_FRAMES.find((frame) => !used.has(frame));
  return [CENTER_FOOD_FRAME, unused ?? 'bowl-soup'];
}

/** Bán kính vòng món (px sân khấu) — dịch ra ngoài từ 175 (đợt trước). */
export const FOOD_RING_RADIUS = 186;

/** Cỡ hiển thị tối đa của món vòng (px sân khấu) khi vòng còn rộng. */
export const FOOD_MAX_DISPLAY_SIZE = 112;

/**
 * Tỉ lệ chiếm chỗ thị giác tối đa của model trong ô atlas 128 (đo ở đợt
 * REBUILD-C: model chiếm ~80–91% ô) — dùng 0,91 làm biên an toàn khi
 * tính chồng lấn: hai món kề không chồng khi đường kính thị giác của món
 * + khe hở ≤ dây cung giữa hai tâm món kề nhau.
 */
export const FOOD_VISUAL_RATIO = 0.91;

/** Khe hở tối thiểu giữa hai món kề nhau (px sân khấu). */
export const FOOD_MIN_GAP_PX = 4;

/** Dây cung giữa hai tâm món kề nhau trên vòng món ở ván `playerCount` ghế. */
export function foodRingChord(playerCount: number, radius: number = FOOD_RING_RADIUS): number {
  const n = Math.floor(playerCount);
  if (n < 2) return Number.POSITIVE_INFINITY;
  return 2 * radius * Math.sin(Math.PI / n);
}

/**
 * Cỡ hiển thị của món vòng theo số ghế — TO hơn đợt trước (84–88) ở mọi
 * cỡ ván, đồng thời tôn trọng ràng buộc cứng không chồng ở ván đông:
 *   size = min(112, floor((dây cung − 4) / 0,91))
 * Số chốt: N=12 → dây cung 2×186×sin(15°) ≈ 96,28 → size 101 (đường kính
 * thị giác 0,91×101 ≈ 91,9 + khe 4 ≈ 95,9 ≤ 96,28); N=11 → 110; N≤10 →
 * trần 112 (dây cung N=10 ≈ 114,95 vẫn thừa). Mép ngoài của món ở N≤10:
 * 186 + 112/2 = 242 < 252 (mép mâm) — món không tràn khỏi mặt mâm.
 */
export function foodDishDisplaySize(playerCount: number): number {
  const chord = foodRingChord(playerCount);
  if (!Number.isFinite(chord)) return FOOD_MAX_DISPLAY_SIZE;
  const byChord = Math.floor((chord - FOOD_MIN_GAP_PX) / FOOD_VISUAL_RATIO);
  return Math.max(1, Math.min(FOOD_MAX_DISPLAY_SIZE, byChord));
}

/**
 * Alpha của bóng món (FIX-V4, Cụm 5): 0,18 — trong khoảng chốt 0,16–0,20,
 * đậm hơn mức 0,14 của FIX-V3 để bóng đọc được trên mặt mâm gốm sáng,
 * hết cảm giác món là sticker dán nổi.
 */
export const FOOD_SHADOW_ALPHA = 0.18;

export interface FoodShadowEllipse {
  /** Bề rộng ellipse bóng (px) — hơi lớn hơn chân món (0,91 × cỡ hiển thị). */
  width: number;
  /** Bề cao ellipse bóng (px). */
  height: number;
  /** Lệch ngang của tâm bóng so với tâm món (px). */
  offsetX: number;
  /** Lệch dọc của tâm bóng so với tâm món (px) — chốt trong khoảng +4..+6. */
  offsetY: number;
  /** Alpha phủ bóng. */
  alpha: number;
}

/**
 * Hình học bóng của một món có cỡ hiển thị `displaySize`: ellipse mềm
 * nằm ngay dưới món (trong cùng container mâm xoay), rộng 0,88 × cỡ món
 * (so với đường kính thị giác 0,91 × cỡ món của model trong atlas — bóng
 * ôm sát chân món, nhô ra một vệt mỏng), cao 0,66 × cỡ món, lệch (+3,+5).
 * Hàm thuần để scene sprite + fallback vector dùng CHUNG một công thức
 * và spec khoá được các bất biến (alpha trong [0,16, 0,20], offsetY
 * trong [+4, +6]).
 */
export function foodShadowEllipse(displaySize: number): FoodShadowEllipse {
  const size = Math.max(0, displaySize);
  return {
    width: size * 0.88,
    height: size * 0.66,
    offsetX: 3,
    offsetY: 5,
    alpha: FOOD_SHADOW_ALPHA,
  };
}

/**
 * Ô (chỉ số ghế) mà đầu đũa đang trỏ vào tại góc `angleDeg` (độ, chiều
 * kim đồng hồ từ hướng 12 giờ, có thể >360 sau nhiều vòng quay): chuẩn
 * hoá về [0,360) rồi chia đều theo ô — cùng quy ước với biên ô của tiếng
 * «tách» trong scene (floor(angle / cellDeg)) và với ô kết quả của log
 * (finalAngleDeg nằm trong ô cellIndex).
 */
export function g2CellIndexAtAngle(angleDeg: number, playerCount: number): number {
  const n = Math.floor(playerCount);
  if (n < 1) return -1;
  const norm = ((angleDeg % 360) + 360) % 360;
  const idx = Math.floor(norm / (360 / n));
  return Math.min(n - 1, idx);
}
