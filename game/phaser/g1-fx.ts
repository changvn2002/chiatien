// g1-fx.ts — Logic THUẦN của lớp trình diễn G1 (đợt FIX-V3, lane B).
//
// Tách khỏi scenes-g1.ts để kiểm chứng bằng vitest trong môi trường node
// (Phaser runtime không import được ở node — «window is not defined»).
// File này KHÔNG import Phaser: mọi hàm chỉ làm toán trên số/chuỗi hex.
// scenes-g1.ts là nơi duy nhất biến các giá trị ở đây thành hiệu ứng.

/* ------------------------------------------------------------------ */
/* Màu: trộn hex (tint thân + flash trúng đòn)                         */
/* ------------------------------------------------------------------ */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse '#RRGGBB' / 'RRGGBB' / '#RGB' → kênh 0–255. Chuỗi lỗi → đen. */
export function parseHexColor(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n) || h.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Trộn tuyến tính hai màu: ratio 0 → a, 1 → b (kẹp [0,1]). */
export function mixRgb(a: Rgb, b: Rgb, ratio: number): Rgb {
  const t = Math.min(1, Math.max(0, ratio));
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export function rgbToNumber(c: Rgb): number {
  return (c.r << 16) | (c.g << 8) | c.b;
}

/** Trộn hexA về phía hexB theo ratio, trả số màu 0xRRGGBB cho Phaser tint. */
export function mixHexColor(hexA: string, hexB: string, ratio: number): number {
  return rgbToNumber(mixRgb(parseHexColor(hexA), parseHexColor(hexB), ratio));
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };

/**
 * Độ trộn trắng của tint thân — FIX-V3 (P1.10): giảm từ 60% (REBUILD-C,
 * làm model bạc màu — ghế 1/2 panel v3) xuống **20%**: chỉ ngả tông nhẹ,
 * model giữ màu gốc giàu như demo B. Danh tính vẫn do vòng chân + badge.
 */
export const G1_TINT_WHITE_MIX = 0.2;

/** Màu tint thân từ colorHex danh tính (PlayerView.colorHex = strongHex). */
export function g1TintColorValue(colorHex: string): number {
  return rgbToNumber(mixRgb(parseHexColor(colorHex), WHITE, G1_TINT_WHITE_MIX));
}

/** Tông ấm của flash trúng đòn (cam hổ phách — cùng họ accent của app). */
export const G1_HIT_FLASH_WARM_HEX = '#ff8a3c';
/** Độ pha flash thường / chí mạng — trần cứng 40% theo brief FIX-V3. */
export const G1_HIT_FLASH_MIX = 0.3;
export const G1_HIT_FLASH_MIX_CRIT = 0.4;

/**
 * Màu flash khi trúng đòn (FIX-V3 P0.1 — thay flash trắng xoá): lấy màu
 * danh tính của NẠN NHÂN, chỉ làm sáng nhẹ (5% về trắng) rồi pha ≤40% về
 * tông ấm. Vì tint của Phaser là phép NHÂN, màu này giữ hue danh tính
 * trên thân model (không bao giờ ra trắng/đa sắc lạ) mà vẫn «nảy» sáng
 * hơn tint nền 20% trắng — đọc được là trúng đòn mà không mất nhân vật.
 */
export function g1HitFlashColor(colorHex: string, crit: boolean): number {
  const base = mixRgb(parseHexColor(colorHex), WHITE, 0.05);
  const warm = parseHexColor(G1_HIT_FLASH_WARM_HEX);
  return rgbToNumber(mixRgb(base, warm, crit ? G1_HIT_FLASH_MIX_CRIT : G1_HIT_FLASH_MIX));
}

/* ------------------------------------------------------------------ */
/* HP: ngưỡng đổi màu thanh + chữ (FIX-V3 P1.14)                       */
/* ------------------------------------------------------------------ */

/** HP ≤ 30% → CAM (sắp ngã); HP ≤ 15% → ĐỎ (nguy kịch). Chốt FIX-V3. */
export const G1_HP_LOW_RATIO = 0.3;
export const G1_HP_CRITICAL_RATIO = 0.15;

export type G1HpTone = 'healthy' | 'low' | 'critical' | 'fallen';

export function g1HpTone(hp: number, maxHp: number, alive: boolean): G1HpTone {
  if (!alive || hp <= 0) return 'fallen';
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio <= G1_HP_CRITICAL_RATIO) return 'critical';
  if (ratio <= G1_HP_LOW_RATIO) return 'low';
  return 'healthy';
}

/** Màu THANH HP theo trạng thái (dùng chung plate + cột mép). */
export function g1HpBarColor(tone: G1HpTone): number {
  switch (tone) {
    case 'healthy':
      return 0x16a34a;
    case 'low':
      return 0xff5722;
    case 'critical':
      return 0xdc2626;
    case 'fallen':
      return 0xa8a29e;
  }
}

/** Màu CHỮ số HP / nhãn trạng thái theo trạng thái. */
export function g1HpTextColor(tone: G1HpTone): string {
  switch (tone) {
    case 'healthy':
      return '#44403c';
    case 'low':
      return '#c2410c';
    case 'critical':
      return '#dc2626';
    case 'fallen':
      return '#78716c';
  }
}

/* ------------------------------------------------------------------ */
/* Cột mép (≥6 người): highlight «vừa trúng đòn» là TÍN HIỆU ĐƠN NHẤT  */
/* ------------------------------------------------------------------ */

/**
 * Giữ đúng MỘT người giữ highlight cam «vừa trúng đòn» ở cột mép tại
 * một thời điểm (FIX-V3 P0.2 — panel v3: 3 hàng cam cùng lúc làm tín
 * hiệu mất nghĩa). claim() trả về người giữ TRƯỚC để scene khôi phục
 * hàng của họ về trạng thái theo HP ngay lập tức.
 */
export class G1ColumnHitTracker {
  private current: string | null = null;

  claim(playerId: string): string | null {
    const prev = this.current;
    this.current = playerId;
    return prev === playerId ? null : prev;
  }

  /** Giải phóng nếu người này đang giữ; trả true khi có giải phóng. */
  release(playerId: string): boolean {
    if (this.current !== playerId) return false;
    this.current = null;
    return true;
  }

  get holder(): string | null {
    return this.current;
  }
}

/* ------------------------------------------------------------------ */
/* Chữ nổi (floater): TRẦN 2 TOÀN SÂN + hàng đợi FIFO + né plate       */
/* (FIX-V4 Cụm 1 — thay bản FIX-V3: trần 8, slot theo nạn nhân,        */
/*  spawn chỉ né plate theo ĐIỂM nên vẫn đè plate ở pha đa đòn)        */
/* ------------------------------------------------------------------ */

/**
 * Trần floater HIỂN THỊ ĐỒNG THỜI trên toàn sân (FIX-V4): đúng **2**,
 * gộp cả chữ sự kiện («BỐP!»/«HỤT!»/«CHÍ MẠNG!») lẫn số sát thương.
 * Panel v4 chết ở chính pha này: trần cũ cho 3–4 floater nở cùng một
 * cụm và đè plate/HP của người khác.
 */
export const G1_FLOATER_MAX_TOTAL = 2;
/** Trần mỗi nạn nhân: tối đa 1 chữ sự kiện + 1 số sát thương hiển thị cùng lúc. */
export const G1_FLOATER_MAX_PER_TARGET = 2;
/** Nhịp nhả hàng đợi: floater chờ được thả cách nhau 200 ms (dải chốt của brief: 150–250). */
export const G1_FLOATER_STAGGER_MS = 200;
/** Trần độ dài hàng đợi floater — luật khi đầy xem G1FloaterDirector.enqueue. */
export const G1_FLOATER_QUEUE_MAX = 6;
/** Tuổi tối đa của floater trong hàng đợi: quá 1,5 s, chữ của đòn đó đã vô nghĩa. */
export const G1_FLOATER_QUEUE_TTL_MS = 1500;
/** Floater phải cách mọi rect plate / cột / floater khác ít nhất bấy nhiêu px. */
export const G1_FLOATER_PLATE_PAD = 4;
/** Quãng bay lên của floater trong đời nó (px) — rect «giữ chỗ» phải chừa phần này. */
export const G1_FLOATER_RISE_PX = 30;

export type G1FloaterKind = 'event' | 'damage';

/** Rect trục-thẳng theo toạ độ sân khấu (dùng chung cho plate, cột, floater). */
export interface G1Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Hai rect có giao nhau không (pad = nới mỗi rect ra pad px mỗi phía). */
export function g1RectsOverlap(a: G1Rect, b: G1Rect, pad = 0): boolean {
  return a.x1 - pad < b.x2 && a.x2 + pad > b.x1 && a.y1 - pad < b.y2 && a.y2 + pad > b.y1;
}

/**
 * Các làn ứng viên cho tâm floater quanh điểm neo của nạn nhân, theo
 * thứ tự ưu tiên: trên đầu giữa → trên đầu lệch trái/phải → hai bên
 * thân → trên cụm (cao hẳn lên). Vị trí đầu tiên KHÔNG giao bất kỳ
 * rect cấm nào (nới G1_FLOATER_PLATE_PAD) và nằm trọn trong sân được
 * chọn; không làn nào sạch → floater Ở LẠI HÀNG ĐỢI tới nhịp kiểm sau
 * (không bao giờ đè plate — luật cứng FIX-V4).
 *
 * FIX-V4.1 (lane B3 — bằng chứng probe-b3-before): bản FIX-V4 chỉ kiểm
 * rect TẠI ĐIỂM SINH. Floater sau đó BAY LÊN 26–30px trong suốt đời
 * nó → rect sinh sạch vẫn trôi vào plate nằm ngay phía trên (đo thuần:
 * spawn (450,350) sạch, bay +26px → GIAO plate). Từ FIX-V4.1, rect
 * kiểm là rect QUÉT theo quỹ đạo: từ đáy điểm sinh tới đỉnh sau khi
 * bay đủ G1_FLOATER_RISE_PX — làn chỉ sạch khi CẢ QUỸ ĐẠO sạch.
 */
const FLOATER_CANDIDATE_OFFSETS: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: -58, dy: -4 },
  { dx: 58, dy: -4 },
  { dx: -100, dy: 30 },
  { dx: 100, dy: 30 },
  { dx: 0, dy: -58 },
  { dx: -58, dy: -58 },
  { dx: 58, dy: -58 },
];

/** Rect QUÉT của floater có tâm (cx, cy): phủ trọn quãng bay lên `risePx`. */
export function g1FloaterSweptRect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  risePx: number = G1_FLOATER_RISE_PX,
): G1Rect {
  return { x1: cx - w / 2, y1: cy - h / 2 - risePx, x2: cx + w / 2, y2: cy + h / 2 };
}

export function g1PickFloaterSpot(
  anchor: { x: number; y: number },
  w: number,
  h: number,
  blockers: readonly G1Rect[],
  stage: G1Rect,
): { x: number; y: number } | null {
  for (const off of FLOATER_CANDIDATE_OFFSETS) {
    const cx = anchor.x + off.dx;
    const cy = anchor.y + off.dy;
    const rect = g1FloaterSweptRect(cx, cy, w, h);
    if (rect.x1 < stage.x1 || rect.x2 > stage.x2 || rect.y1 < stage.y1 || rect.y2 > stage.y2) {
      continue;
    }
    if (blockers.some((b) => g1RectsOverlap(rect, b, G1_FLOATER_PLATE_PAD))) continue;
    return { x: cx, y: cy };
  }
  return null;
}

/** Bán kính tìm tối đa khi floater đang sống phải trượt né (px). */
export const G1_FLOATER_EVADE_SEARCH_PX = 192;

/**
 * Vị trí sạch GẦN NHẤT quanh `current` cho floater đang sống (FIX-V4.1):
 * thử chính vị trí hiện tại trước, rồi các vòng bán kính tăng dần
 * (bước 12px, 16 hướng/vòng, ưu tiên hướng LÊN trong cùng một vòng) —
 * vị trí đầu tiên có rect QUÉT (quỹ đạo bay lên còn lại) không giao
 * bất kỳ rect cấm nào và nằm trọn trong sân thắng. Hết bán kính tìm
 * mà không có chỗ → null (scene cho floater mờ sớm — plate luôn thắng).
 * Hàm thuần, xác định (cùng đầu vào → cùng đầu ra) để test được.
 */
export function g1FindNearestSafeSpot(
  current: { x: number; y: number },
  w: number,
  h: number,
  blockers: readonly G1Rect[],
  stage: G1Rect,
  risePx: number = G1_FLOATER_RISE_PX,
): { x: number; y: number } | null {
  const clean = (cx: number, cy: number): boolean => {
    const rect = g1FloaterSweptRect(cx, cy, w, h, risePx);
    if (rect.x1 < stage.x1 || rect.x2 > stage.x2 || rect.y1 < stage.y1 || rect.y2 > stage.y2) {
      return false;
    }
    return !blockers.some((b) => g1RectsOverlap(rect, b, G1_FLOATER_PLATE_PAD));
  };
  if (clean(current.x, current.y)) return { x: current.x, y: current.y };
  const DIRECTIONS = 16;
  for (let r = 12; r <= G1_FLOATER_EVADE_SEARCH_PX; r += 12) {
    // Hướng bắt đầu từ thẳng lên (−90°) và quét đều — floater ưu tiên
    // trượt lên/xa thân thay vì chui xuống dưới plate khác.
    for (let k = 0; k < DIRECTIONS; k++) {
      const a = -Math.PI / 2 + (k / DIRECTIONS) * Math.PI * 2;
      const cx = Math.round(current.x + Math.cos(a) * r);
      const cy = Math.round(current.y + Math.sin(a) * r);
      if (clean(cx, cy)) return { x: cx, y: cy };
    }
  }
  return null;
}

/** Một yêu cầu floater (dữ liệu thuần — scene biến thành Text khi được 'show'). */
export interface G1FloaterEntry {
  targetId: string;
  kind: G1FloaterKind;
  /** Chữ sự kiện (kind='event'). */
  content: string;
  /** Màu chữ khi render. */
  color: string;
  /** Sát thương (kind='damage') — hàng đợi GỘP dồn vào số này. */
  damage: number;
  crit: boolean;
  /** Kích thước ước lượng để tính va chạm (px sân khấu). */
  w: number;
  h: number;
  /** Mốc thời gian (đồng hồ scene) lúc yêu cầu được nộp — tính TTL hàng đợi. */
  enqueuedAt: number;
}

export interface G1FloaterShow {
  id: number;
  entry: G1FloaterEntry;
  x: number;
  y: number;
}

export type G1FloaterSubmit =
  | { type: 'show'; show: G1FloaterShow }
  | { type: 'merge-visible' }
  | { type: 'queued' }
  | { type: 'merged-queued' }
  | { type: 'dropped' };

export type G1FloaterPumpAction =
  { type: 'show'; show: G1FloaterShow } | { type: 'merge'; targetId: string; damage: number };

/**
 * Hành động NÉ LIÊN TỤC cho floater đang sống (FIX-V4.1): 'move' = trượt
 * tâm floater tới (x, y) sạch gần nhất; 'fade' = không còn chỗ sạch
 * trong bán kính tìm → scene mờ floater sớm (plate luôn thắng).
 */
export type G1FloaterEvadeAction =
  { type: 'move'; id: number; x: number; y: number } | { type: 'fade'; id: number };

/** Điểm neo spawn của một nạn nhân theo loại floater (scene tính từ thân hiện tại). */
export interface G1FloaterAnchors {
  event: { x: number; y: number };
  damage: { x: number; y: number };
}

/**
 * Điều phối floater (FIX-V4 Cụm 1). Luật chốt:
 * - TỐI ĐA 2 floater hiển thị đồng thời trên toàn sân; mỗi nạn nhân
 *   tối đa 1 sự kiện + 1 số sát thương đang hiện. Số sát thương mới
 *   của nạn nhân ĐÃ có số đang hiện → 'merge-visible' (scene cộng dồn
 *   vào floater đó + pop lại, như FIX-V3).
 * - Vượt trần / đang trong nhịp stagger 200 ms / chưa có vị trí sạch
 *   (né plate tuyệt đối) → HÀNG ĐỢI FIFO. Công bằng FIFO: còn hàng
 *   đợi thì yêu cầu mới không được nhảy hàng (trừ gộp-số ở trên).
 * - Hàng đợi (trần 6): số sát thương chờ của cùng nạn nhân GỘP dồn
 *   vào mục đang chờ của nạn nhân đó ('merged-queued'); chữ sự kiện
 *   trùng nạn nhân đang chờ → rớt; hàng đợi đầy → rớt yêu cầu mới
 *   (số HP trên plate vẫn là nguồn thật, chữ chỉ là lớp diễn).
 * - pump() mỗi frame: mục chờ quá TTL 1,5 s → số sát thương GỘP vào
 *   floater đang hiện của nạn nhân (nếu có, qua action 'merge') rồi
 *   rớt, chữ sự kiện rớt thẳng; tới nhịp stagger và còn slot + có vị
 *   trí sạch thì thả ĐÚNG 1 mục đầu hàng (không sạch → giữ lại chờ).
 */
export class G1FloaterDirector {
  private visible: Array<{
    id: number;
    entry: G1FloaterEntry;
    rect: G1Rect;
    x: number;
    y: number;
  }> = [];
  private queue: G1FloaterEntry[] = [];
  private nextId = 1;
  private nextReleaseAt = 0;

  /** Số floater ĐANG HIỂN THỊ trên toàn sân. */
  get total(): number {
    return this.visible.length;
  }

  /** Số floater đang chờ trong hàng đợi. */
  get queued(): number {
    return this.queue.length;
  }

  activeFor(targetId: string): number {
    return this.visible.filter((v) => v.entry.targetId === targetId).length;
  }

  hasEventLabel(targetId: string): boolean {
    return this.visible.some((v) => v.entry.targetId === targetId && v.entry.kind === 'event');
  }

  hasVisibleDamage(targetId: string): boolean {
    return this.visible.some((v) => v.entry.targetId === targetId && v.entry.kind === 'damage');
  }

  private tryShow(
    entry: G1FloaterEntry,
    blockers: readonly G1Rect[],
    anchors: G1FloaterAnchors,
    stage: G1Rect,
  ): G1FloaterShow | null {
    if (this.visible.length >= G1_FLOATER_MAX_TOTAL) return null;
    if (entry.kind === 'event' && this.hasEventLabel(entry.targetId)) return null;
    if (entry.kind === 'damage' && this.hasVisibleDamage(entry.targetId)) return null;
    const anchor = entry.kind === 'event' ? anchors.event : anchors.damage;
    const allBlockers = [...blockers, ...this.visible.map((v) => v.rect)];
    const spot = g1PickFloaterSpot(anchor, entry.w, entry.h, allBlockers, stage);
    if (!spot) return null;
    const id = this.nextId;
    this.nextId += 1;
    // Rect giữ chỗ: chừa quãng bay lên 30px để floater thả sau không
    // chiếm đúng đường bay của floater này.
    const rect: G1Rect = {
      x1: spot.x - entry.w / 2,
      y1: spot.y - entry.h / 2 - G1_FLOATER_RISE_PX,
      x2: spot.x + entry.w / 2,
      y2: spot.y + entry.h / 2,
    };
    this.visible.push({ id, entry, rect, x: spot.x, y: spot.y });
    return { id, entry, x: spot.x, y: spot.y };
  }

  submit(
    entry: G1FloaterEntry,
    now: number,
    blockers: readonly G1Rect[],
    anchors: G1FloaterAnchors,
    stage: G1Rect,
  ): G1FloaterSubmit {
    if (entry.kind === 'damage' && this.hasVisibleDamage(entry.targetId)) {
      return { type: 'merge-visible' };
    }
    if (this.queue.length === 0 && now >= this.nextReleaseAt) {
      const show = this.tryShow(entry, blockers, anchors, stage);
      if (show) return { type: 'show', show };
    }
    return this.enqueue(entry);
  }

  private enqueue(entry: G1FloaterEntry): G1FloaterSubmit {
    if (entry.kind === 'damage') {
      const existing = this.queue.find((q) => q.kind === 'damage' && q.targetId === entry.targetId);
      if (existing) {
        existing.damage += entry.damage;
        existing.crit = existing.crit || entry.crit;
        return { type: 'merged-queued' };
      }
    }
    if (
      entry.kind === 'event' &&
      this.queue.some((q) => q.kind === 'event' && q.targetId === entry.targetId)
    ) {
      return { type: 'dropped' };
    }
    if (this.queue.length >= G1_FLOATER_QUEUE_MAX) return { type: 'dropped' };
    this.queue.push(entry);
    return { type: 'queued' };
  }

  pump(
    now: number,
    blockers: readonly G1Rect[],
    anchorsOf: (targetId: string) => G1FloaterAnchors | undefined,
    stage: G1Rect,
  ): G1FloaterPumpAction[] {
    const actions: G1FloaterPumpAction[] = [];
    while (this.queue.length > 0 && now - this.queue[0].enqueuedAt > G1_FLOATER_QUEUE_TTL_MS) {
      const old = this.queue.shift()!;
      if (old.kind === 'damage' && this.hasVisibleDamage(old.targetId)) {
        actions.push({ type: 'merge', targetId: old.targetId, damage: old.damage });
      }
    }
    if (this.queue.length === 0 || this.visible.length >= G1_FLOATER_MAX_TOTAL) return actions;
    if (now < this.nextReleaseAt) return actions;
    const head = this.queue[0];
    const anchors = anchorsOf(head.targetId);
    if (!anchors) {
      this.queue.shift();
      return actions;
    }
    const show = this.tryShow(head, blockers, anchors, stage);
    if (show) {
      this.queue.shift();
      this.nextReleaseAt = now + G1_FLOATER_STAGGER_MS;
      actions.push({ type: 'show', show });
    }
    return actions;
  }

  /** Floater tắt (hết tween) → trả slot hiển thị. */
  release(id: number): void {
    this.visible = this.visible.filter((v) => v.id !== id);
  }

  /** Tâm hiện tại mà director đang tin của floater đang sống (test/giám sát). */
  centerOf(id: number): { x: number; y: number } | null {
    const v = this.visible.find((f) => f.id === id);
    return v ? { x: v.x, y: v.y } : null;
  }

  /**
   * Đồng bộ tâm THẬT của floater (FIX-V4.1): scene gọi mỗi frame với
   * vị trí Text hiện tại (tween bay lên đã dời nó khỏi điểm sinh) để
   * rect giữ chỗ + vòng né dưới đây luôn tính trên vị trí đang vẽ,
   * không phải vị trí lúc sinh.
   */
  syncCenter(id: number, x: number, y: number): void {
    const v = this.visible.find((f) => f.id === id);
    if (!v) return;
    v.x = x;
    v.y = y;
    v.rect = {
      x1: x - v.entry.w / 2,
      y1: y - v.entry.h / 2 - G1_FLOATER_RISE_PX,
      x2: x + v.entry.w / 2,
      y2: y + v.entry.h / 2,
    };
  }

  /**
   * NÉ LIÊN TỤC (FIX-V4.1 — đóng lỗi «plate di chuyển vào floater đứng
   * yên» của pack v5): scene gọi MỖI FRAME sau layout plate với rect
   * plate HIỆN TẠI. Floater nào có rect TỨC THỜI (không gồm quãng bay)
   * giao một rect cấm (plate/cột) hoặc rect giữ chỗ của floater khác
   * → trượt tới vị trí sạch gần nhất (rect QUÉT của nó phải sạch);
   * không còn chỗ trong bán kính tìm → 'fade' (mờ sớm, plate thắng).
   * Thứ tự xử lý = thứ tự sinh: floater trước giữ chỗ, floater sau né
   * quanh cả vị trí ĐÃ NÉ của floater trước trong cùng một nhịp.
   */
  evade(blockers: readonly G1Rect[], stage: G1Rect): G1FloaterEvadeAction[] {
    const actions: G1FloaterEvadeAction[] = [];
    for (const v of this.visible) {
      const instant: G1Rect = {
        x1: v.x - v.entry.w / 2,
        y1: v.y - v.entry.h / 2,
        x2: v.x + v.entry.w / 2,
        y2: v.y + v.entry.h / 2,
      };
      const others = this.visible.filter((o) => o.id !== v.id).map((o) => o.rect);
      const threatened =
        blockers.some((b) => g1RectsOverlap(instant, b, G1_FLOATER_PLATE_PAD)) ||
        others.some((b) => g1RectsOverlap(instant, b, G1_FLOATER_PLATE_PAD));
      if (!threatened) continue;
      const spot = g1FindNearestSafeSpot(
        { x: v.x, y: v.y },
        v.entry.w,
        v.entry.h,
        [...blockers, ...others],
        stage,
      );
      if (!spot) {
        actions.push({ type: 'fade', id: v.id });
        continue;
      }
      if (spot.x !== v.x || spot.y !== v.y) {
        this.syncCenter(v.id, spot.x, spot.y);
        actions.push({ type: 'move', id: v.id, x: spot.x, y: spot.y });
      }
    }
    return actions;
  }
}

/* ------------------------------------------------------------------ */
/* Neo đất của sprite (FIX-V3 P0.3) — ĐO TỪ ALPHA BBOX CỦA ATLAS THẬT  */
/* ------------------------------------------------------------------ */

/** Cạnh ô atlas nguồn (px). */
export const G1_CELL_SIZE = 192;

/**
 * Điểm chạm đất + đỉnh đầu của từng model, đo từ atlas đã ship
 * (public/game/atlas/g1-<model>.webp, alpha bbox + trọng tâm dải đáy
 * 10px của các frame idle/fall_3 — xem REBUILD-C2-B-G1 §3): nhân vật
 * KHÔNG đứng giữa ô — chân chạm đất ở y≈154–162/192 và lệch trái tới
 * 40px tuỳ model (knight), nên neo (0.5, 1) của sprite KHÔNG phải điểm
 * chạm đất. Mọi neo thị giác (vòng chân, sao choáng) phải qua bảng này.
 * Toạ độ theo px của ô 192, gốc trên-trái.
 */
export interface G1SpriteAnchor {
  /** Trọng tâm dải chân khi đứng (frame idle). */
  groundX: number;
  groundY: number;
  /** Trọng tâm dải đáy khi đã ngã (frame fall_3). */
  fallX: number;
  fallY: number;
  /** Đỉnh đầu khi đứng (alpha bbox top của frame idle). */
  headTopY: number;
}

export const G1_SPRITE_ANCHORS: Readonly<Record<string, G1SpriteAnchor>> = {
  knight: { groundX: 56, groundY: 162, fallX: 118, fallY: 169, headTopY: 21 },
  barbarian: { groundX: 72, groundY: 161, fallX: 115, fallY: 169, headTopY: 18 },
  mage: { groundX: 90, groundY: 161, fallX: 73, fallY: 177, headTopY: 33 },
  rogue: { groundX: 81, groundY: 154, fallX: 126, fallY: 170, headTopY: 25 },
  roguehooded: { groundX: 83, groundY: 154, fallX: 126, fallY: 169, headTopY: 24 },
};

/** Neo dự phòng cho model lạ (lấy gần mage — nhân vật cân giữa nhất). */
export const G1_DEFAULT_SPRITE_ANCHOR: G1SpriteAnchor = {
  groundX: 90,
  groundY: 161,
  fallX: 96,
  fallY: 170,
  headTopY: 30,
};

export function g1SpriteAnchorOf(model: string): G1SpriteAnchor {
  return G1_SPRITE_ANCHORS[model] ?? G1_DEFAULT_SPRITE_ANCHOR;
}

export interface G1GroundOffsetOptions {
  fallen: boolean;
  /** Sprite đang lật ngang (flipX) — điểm đất gương qua trục neo. */
  flipX: boolean;
  /** Tỉ lệ scaleY hiện tại so với scale gốc (squash khi trúng đòn). */
  scaleYRatio: number;
  /** Góc nghiêng thân (độ) — thân nghiêng quanh neo, điểm đất quay theo. */
  angleDeg: number;
}

/**
 * Lệch (px hiển thị) từ NEO SPRITE (giữa-đáy ô, điểm container đứng)
 * tới ĐIỂM CHẠM ĐẤT THẬT của thân, ở trạng thái hiện tại. Vòng danh
 * tính đặt tại container + lệch này MỖI FRAME → ôm đúng chân sprite
 * dù thân lao/giật/lật/nghiêng/squash hay đã ngã.
 */
export function g1GroundOffset(
  anchor: G1SpriteAnchor,
  displaySize: number,
  opts: G1GroundOffsetOptions,
): { x: number; y: number } {
  const cellX = opts.fallen ? anchor.fallX : anchor.groundX;
  const cellY = opts.fallen ? anchor.fallY : anchor.groundY;
  let x = ((cellX - G1_CELL_SIZE / 2) / G1_CELL_SIZE) * displaySize;
  if (opts.flipX) x = -x;
  const y = ((cellY - G1_CELL_SIZE) / G1_CELL_SIZE) * displaySize * opts.scaleYRatio;
  const rad = (opts.angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Lệch từ neo sprite tới ĐỈNH ĐẦU THẬT (sao choáng bám theo): x theo
 * trọng tâm chân (thân đứng thẳng, đầu trên chân), y theo đỉnh alpha.
 */
export function g1HeadOffset(
  anchor: G1SpriteAnchor,
  displaySize: number,
  flipX: boolean,
): { x: number; y: number } {
  let x = ((anchor.groundX - G1_CELL_SIZE / 2) / G1_CELL_SIZE) * displaySize;
  if (flipX) x = -x;
  const y = ((anchor.headTopY - G1_CELL_SIZE) / G1_CELL_SIZE) * displaySize;
  return { x, y };
}

/* ------------------------------------------------------------------ */
/* Bố cục chế độ đông (≥6 người): gutter cột cố định (FIX-V3 P0.2)      */
/* ------------------------------------------------------------------ */

export interface G1DenseArena {
  /** Tâm sân mới: giữa vùng chơi SAU KHI trừ gutter trái cho cột. */
  centerX: number;
  /**
   * Trần bán kính cụm để mép trái của sprite ngoài cùng (tâm cụm −
   * bán kính − nửa thân) không bao giờ chui dưới cột.
   */
  maxClusterRadius: number;
}

/**
 * Vùng chơi = sân khấu trừ gutter trái (cột + lề). Sân tự DỊCH tâm vào
 * giữa vùng chơi và THU cụm theo trần này; kèm camera tĩnh toàn cảnh ở
 * chế độ đông (scenes-g1) → không sprite/vòng/plate nào bị cột che ở
 * bất kỳ thời điểm nào của ván.
 */
export function g1DenseArena(
  stageWidth: number,
  gutterW: number,
  spriteSize: number,
  margin = 8,
): G1DenseArena {
  const playW = stageWidth - gutterW;
  const centerX = gutterW + playW / 2;
  const maxClusterRadius = Math.max(60, playW / 2 - spriteSize / 2 - margin);
  return { centerX, maxClusterRadius };
}

/* ------------------------------------------------------------------ */
/* Tách plate lặp (FIX-V4 Cụm 1+3 — chống chồng TRIỆT ĐỂ)              */
/* ------------------------------------------------------------------ */

export interface G1PlateItem {
  id: string;
  /** Vị trí tâm khởi đầu (= neo đã kẹp sẵn của scene). */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Pass tách plate THUẦN: lặp đẩy các cặp rect giao nhau (đệm `pad`)
 * cho tới khi KHÔNG còn cặp nào giao nhau (hoặc hết `maxRounds` vòng).
 * - Thứ tự mảng = thứ tự ưu tiên (scene truyền theo y neo tăng dần):
 *   plate sau nhường đường — bị đẩy trước; plate trước chỉ di chuyển
 *   khi plate sau tràn biên và phải «dồn cả cặp» về phía còn chỗ.
 * - Ưu tiên đẩy DỌC (đúng ngôn ngữ plate xếp tầng trên đầu); chỉ khi
 *   cặp bị kẹp cứng giữa hai biên dọc mới đẩy NGANG ra xa nhau.
 * - Mọi vị trí luôn bị kẹp trong `bounds` sau mỗi vòng.
 * Áp cho CẢ plate đầy đủ (<6 người) lẫn thẻ rút gọn (≥6 người) — cùng
 * một pass, cùng một luật (panel v4 frame 20b: nhãn rút gọn dồn cục
 * vì pass cũ chỉ lặp 3 vòng rồi kẹp cứng theo neo, chấp nhận chồng).
 */
export function g1SeparatePlates(
  items: readonly G1PlateItem[],
  bounds: G1Rect,
  pad = 4,
  maxRounds = 24,
): Map<string, { x: number; y: number }> {
  const clampX = (v: number, w: number) =>
    Math.min(bounds.x2 - w / 2, Math.max(bounds.x1 + w / 2, v));
  const clampY = (v: number, h: number) =>
    Math.min(bounds.y2 - h / 2, Math.max(bounds.y1 + h / 2, v));
  const pos = items.map((it) => ({
    id: it.id,
    w: it.w,
    h: it.h,
    x: clampX(it.x, it.w),
    y: clampY(it.y, it.h),
  }));
  for (let round = 0; round < maxRounds; round++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i];
        const b = pos[j];
        const overlapX = (a.w + b.w) / 2 + pad - Math.abs(b.x - a.x);
        const overlapY = (a.h + b.h) / 2 + pad - Math.abs(b.y - a.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        // 1) Đẩy dọc plate sau ra xa plate trước.
        const dirY = b.y >= a.y ? 1 : -1;
        b.y += dirY * overlapY;
        moved = true;
        // Tràn biên dọc → dồn cả cặp về phía còn chỗ.
        if (b.y + b.h / 2 > bounds.y2) {
          const excess = b.y + b.h / 2 - bounds.y2;
          b.y -= excess;
          a.y -= excess;
        } else if (b.y - b.h / 2 < bounds.y1) {
          const excess = bounds.y1 - (b.y - b.h / 2);
          b.y += excess;
          a.y += excess;
        }
        // 2) Vẫn giao sau đẩy dọc (cặp kẹp cứng giữa hai biên) → đẩy ngang.
        const stillX = (a.w + b.w) / 2 + pad - Math.abs(b.x - a.x);
        const stillY = (a.h + b.h) / 2 + pad - Math.abs(b.y - a.y);
        if (stillX > 0 && stillY > 0) {
          const dirX = b.x >= a.x ? 1 : -1;
          b.x += dirX * stillX;
          if (b.x + b.w / 2 > bounds.x2) {
            const excess = b.x + b.w / 2 - bounds.x2;
            b.x -= excess;
            a.x -= excess;
          } else if (b.x - b.w / 2 < bounds.x1) {
            const excess = bounds.x1 - (b.x - b.w / 2);
            b.x += excess;
            a.x += excess;
          }
        }
      }
    }
    for (const p of pos) {
      p.x = clampX(p.x, p.w);
      p.y = clampY(p.y, p.h);
    }
    if (!moved) break;
  }
  return new Map(pos.map((p) => [p.id, { x: p.x, y: p.y }]));
}

/* ------------------------------------------------------------------ */
/* Layout plate có THU GỌN khi cụm quá dày (FIX-V4.1 — lane B3)        */
/* ------------------------------------------------------------------ */

/** Đếm số cặp rect còn giao nhau (đệm `pad`) — thước đo sau mỗi pass tách. */
export function g1CountOverlappingPairs(
  rects: readonly { x: number; y: number; w: number; h: number }[],
  pad = 4,
): number {
  let pairs = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      if (
        Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad &&
        Math.abs(a.y - b.y) < (a.h + b.h) / 2 + pad
      ) {
        pairs += 1;
      }
    }
  }
  return pairs;
}

export interface G1PlateLayout {
  x: number;
  y: number;
  /** Tỉ lệ thu gọn đã áp (1 = nguyên cỡ). */
  scale: number;
  /** Kích thước HIỆU DỤNG sau thu gọn (w×h) — scene dùng cho vùng cấm floater. */
  w: number;
  h: number;
}

/**
 * Các mức thu gọn thử theo thứ tự khi pass tách ở cỡ nguyên vẫn còn
 * cặp giao nhau. 0,56 là sàn: dưới nữa chữ trên plate không còn đọc
 * được ở cỡ sân thật — thà giữ mức này với ít cặp giao nhất.
 */
export const G1_PLATE_COMPACT_SCALES: readonly number[] = [1, 0.86, 0.74, 0.64, 0.56];

/**
 * Layout plate THUẦN có lối thoát compact (FIX-V4.1): chạy
 * g1SeparatePlates ở cỡ nguyên trước; nếu sau pass vẫn còn cặp giao
 * nhau (cụm bị kẹp trong hình học hẹp — đo thuần ở probe-b3-before:
 * bounds 300×200, 4 plate 170×44 → pass cũ kẹt 3 cặp, hai plate trùng
 * đúng một điểm), thu CẢ CỤM xuống mức kế tiếp (kích thước hiệu dụng
 * nhỏ lại quanh tâm neo) và tách lại, tới khi 0 cặp giao hoặc hết
 * thang. Mọi mức đều thất bại → giữ kết quả ÍT cặp giao nhất (hoà thì
 * giữ mức to nhất). Scene áp `scale` lên container plate và dùng
 * (w, h) hiệu dụng làm rect cấm cho floater — plate THU GỌN thay vì
 * CHỒNG, đúng luật chốt của vòng vá.
 */
export function g1LayoutPlatesCompact(
  items: readonly G1PlateItem[],
  bounds: G1Rect,
  pad = 4,
): Map<string, G1PlateLayout> {
  let best: Map<string, G1PlateLayout> | null = null;
  let bestPairs = Number.POSITIVE_INFINITY;
  for (const scale of G1_PLATE_COMPACT_SCALES) {
    const scaled = items.map((it) => ({ ...it, w: it.w * scale, h: it.h * scale }));
    const separated = g1SeparatePlates(scaled, bounds, pad);
    const result = new Map<string, G1PlateLayout>();
    for (const it of scaled) {
      const pos = separated.get(it.id)!;
      result.set(it.id, { x: pos.x, y: pos.y, scale, w: it.w, h: it.h });
    }
    const pairs = g1CountOverlappingPairs([...result.values()], pad);
    if (pairs < bestPairs) {
      bestPairs = pairs;
      best = result;
    }
    if (pairs === 0) break;
  }
  return best!;
}

/* ------------------------------------------------------------------ */
/* Hit-stop (FIX-V4 Cụm 1): đóng băng ĐỒNG HỒ GIAO TRANH 90 ms/đòn     */
/* ------------------------------------------------------------------ */

/** Mỗi đòn trúng đóng băng đồng hồ tick 90 ms thời gian thật. */
export const G1_HIT_STOP_MS = 90;
/** Nhiều đòn cùng tick KHÔNG cộng dồn quá 120 ms tính từ đòn gần nhất. */
export const G1_HIT_STOP_MAX_MS = 120;

/**
 * Đồng hồ hit-stop THUẦN: scene gọi request() khi một đòn trúng đích
 * và hỏi frozen(now) ở đầu update() — đang đóng băng thì KHÔNG cộng
 * dồn bộ đếm tick (đồng hồ giao tranh đứng yên), mọi hiệu ứng dưới
 * tick (tween/clip đang chạy) tiếp tục như thường.
 */
export class G1HitStopClock {
  private untilMs = 0;

  request(nowMs: number): number {
    const wanted = Math.max(this.untilMs, nowMs + G1_HIT_STOP_MS);
    this.untilMs = Math.min(wanted, nowMs + G1_HIT_STOP_MAX_MS);
    return this.untilMs;
  }

  frozen(nowMs: number): boolean {
    return nowMs < this.untilMs;
  }

  get until(): number {
    return this.untilMs;
  }

  reset(): void {
    this.untilMs = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Neo đất THEO ACTION (FIX-V4 mục 4 — vòng chân desktop)              */
/* ------------------------------------------------------------------ */

/**
 * Trọng tâm dải chân (chuẩn hoá 0..1 trong ô) đo từ ALPHA của chính
 * atlas đã ship (PIL, trọng tâm dải đáy 8% của từng frame, lấy trung
 * bình theo action — lane B2 đo 2026-10-25, file đo:
 * chiatien-game-v2/tmp/b2-probe/frame-ground.json). Chỉ ghi các
 * (nhân vật, action) lệch ≥0,025 ô so với trọng tâm frame idle của
 * chính nhân vật đó: thân nhân vật DỊCH TRONG Ô khi chạy/né (knight:
 * idle 0,225 → run 0,384) trong khi neo đất cũ là MỘT số tĩnh theo
 * idle — vòng chân vì thế rời chân tới ~30px hiển thị ở các frame
 * động. groundPointOf() của scene dùng bảng này ghi đè groundX khi
 * action hiện tại có mục; ngoài bảng → neo tĩnh như cũ.
 */
export const G1_ACTION_GROUND_X: Readonly<
  Record<string, Readonly<Partial<Record<'run' | 'dodge', number>>>>
> = {
  'adventurers/barbarian': { run: 0.385, dodge: 0.405 },
  'adventurers/barbarian-ice': { run: 0.387, dodge: 0.408 },
  'adventurers/hooded-teal': { dodge: 0.416 },
  'adventurers/knight': { run: 0.384, dodge: 0.411 },
  'adventurers/knight-night': { run: 0.392, dodge: 0.421 },
  'adventurers/knight-red': { run: 0.384, dodge: 0.413 },
  'adventurers/mage': { dodge: 0.393 },
  'adventurers/mage-leaf': { dodge: 0.393 },
  'adventurers/mage-purple': { dodge: 0.443 },
  'adventurers/rogue': { run: 0.375, dodge: 0.413 },
  'adventurers/rogue-orange': { run: 0.385, dodge: 0.428 },
  'adventurers/roguehooded': { dodge: 0.403 },
  'blocky/blocky-a': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-b': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-c': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-d': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-e': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-f': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-g': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-h': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-i': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-j': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-k': { run: 0.418, dodge: 0.347 },
  'blocky/blocky-l': { run: 0.418, dodge: 0.347 },
  'skeletons/skel-minion': { run: 0.39 },
  'skeletons/skel-minion-ember': { run: 0.39 },
  'skeletons/skel-minion-rose': { run: 0.391 },
  'skeletons/skel-rogue': { run: 0.387 },
  'skeletons/skel-rogue-frost': { run: 0.39 },
  'skeletons/skel-rogue-mint': { run: 0.396 },
  'skeletons/skel-warrior': { run: 0.399 },
  'skeletons/skel-warrior-ash': { run: 0.406 },
  'skeletons/skel-warrior-ghost': { run: 0.399 },
};

/** Trọng tâm chân chuẩn hoá của (bộ, nhân vật, action); undefined → dùng neo tĩnh. */
export function g1ActionGroundX(
  setId: string,
  characterKey: string,
  action: string,
): number | undefined {
  if (action !== 'run' && action !== 'dodge') return undefined;
  return G1_ACTION_GROUND_X[`${setId}/${characterKey}`]?.[action];
}

/* ------------------------------------------------------------------ */
/* Idle / run đọc được ở cỡ sprite thật (FIX-V4 mục 5)                  */
/* ------------------------------------------------------------------ */

/**
 * Nửa biên độ bob idle: thân nhún từ +5 tới −5 px → TỔNG biên độ dọc
 * 10px. Bản FIX-V3 dùng ±3px (tổng 3px thực tế vì tween từ 0) — dưới
 * ngưỡng nhìn ở cỡ sprite 150–190px, panel 3 ghế không thấy nhịp.
 */
export const G1_IDLE_BOB_HALF_PX = 5;
/** Thân nghiêng về phía di chuyển khi chạy: ~0,09 rad (≈5,2°). */
export const G1_RUN_LEAN_RAD = 0.09;

/**
 * Tốc độ phát clip `run` TỈ LỆ với tốc độ di chuyển thật (hết trượt
 * chân): 1 chu kỳ run (4 frame @12fps = 3 chu kỳ/giây ở timeScale 1)
 * phủ quãng đường ≈ 1,05 × cỡ hiển thị; timeScale = tốc độ cần / tốc
 * độ gốc, kẹp [0,7 – 2,4] để dash rất nhanh không thành quay cuồng.
 */
export function g1RunAnimTimeScale(speedPxPerMs: number, displaySize: number): number {
  if (!(speedPxPerMs > 0) || !(displaySize > 0)) return 1;
  const stridePx = displaySize * 1.05;
  const cyclesPerSec = (speedPxPerMs * 1000) / stridePx;
  const baseCyclesPerSec = 3; // 12 fps / 4 frame mỗi chu kỳ
  return Math.min(2.4, Math.max(0.7, cyclesPerSec / baseCyclesPerSec));
}

/* ------------------------------------------------------------------ */
/* Tia sao trúng đòn (FIX-V4 Cụm 1 — THAY shockwave)                    */
/* ------------------------------------------------------------------ */

/** Màu tia sao tại điểm trúng: vàng ấm TRUNG TÍNH — cấm màu danh tính, cấm vòng nở. */
export const G1_HIT_STAR_COLOR = 0xffc53d;
/** Bán kính sao 4 cánh (px) — đường kính 26px, nhỏ gọn tại điểm trúng. */
export const G1_HIT_STAR_RADIUS_PX = 13;
/** Đời sống tia sao: ≤250 ms (chốt brief). */
export const G1_HIT_STAR_LIFE_MS = 240;
