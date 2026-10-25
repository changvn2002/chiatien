// scenes-g1.ts — Scene G1 «Đấu Trường» (SPEC §8): lớp diễn CHỈ diễn lại
// chuỗi sự kiện đã chốt trong MatchLog của tầng engine (lane A). Scene
// không sinh đòn, không quyết trúng/trượt, không dùng Math.random cho bất
// cứ thứ gì ảnh hưởng kết quả — hạt trang trí cũng lấy từ Phaser với biên
// độ cố định theo sự kiện, và kết quả cuối cùng luôn đọc từ log.
//
// Phong cách (SPEC §8.3): chibi, không máu me; đòn trúng có sao băng/chớp
// sao + chữ «BỐP!», chí mạng «CHÍ MẠNG!», né «NÉ!», trượt «HỤT!»; choáng =
// sao quay quanh đầu.
//
// ĐỢT PRES VÒNG 2 (GIỮ NGUYÊN ở đợt REBUILD-C): nameplate TÁCH khỏi
// container thân, sống ở cấp scene (Map theo playerId): mỗi frame tự bám
// theo thân + layout pass chống chồng (AABB, đẩy dọc, leader line khi
// lệch neo > 20px). Số sát thương và chữ nổi spawn tại THÂN, né hẳn vùng
// plate. Ghost HP bar tụt theo sau thanh chính. Snapshot kết ván cho M7
// do stage.tsx chụp frame cuối — scene chỉ cần dừng ở trạng thái kết ván.
//
// ĐỢT REBUILD-C (hướng C — model 3D render trước thành sprite, lane B):
// 1. Nhân vật = SPRITE từ atlas KayKit (CC0) render trước ở
//    public/game/atlas/g1-<model>.webp + .json (Phaser 3 hash, ô 192×192,
//    9 action × 4 frame: idle/punchA/punchB/kick/hitA/hitB/dodge/fall/
//    victory — xem chiatien-game-v2/REBUILD-C-A-ASSETS.md). Toàn bộ art
//    nhân vật Graphics cũ (thân/đầu/tư thế nướng, texture fallen khối,
//    tóc/phụ kiện theo hash) ĐÃ XOÁ. Ánh xạ diễn bám EVENT LOG như cũ:
//    đứng = idle · đòn 'dam' = punchA/punchB luân phiên theo người đánh ·
//    đòn 'da' = kick · trúng = hitA/hitB luân phiên · né = dodge · ngã =
//    fall rồi giữ frame cuối · người đãi (kết quả của log) còn đứng ở
//    nhịp kết = victory. flipX theo hướng mục tiêu (sprite gốc mặt phải).
// 2. Danh tính KHÔNG phụ thuộc tint: tint runtime NHẸ (trộn colorHex với
//    trắng 60% rồi mới tint — công thức ở g1TintColor) + vòng màu danh
//    tính (ellipse viền colorHex) dưới chân + badge/nameplate như cũ.
// 3. Sân + camera: giữ g1HomeRadius theo số người, cụm vị trí NÉN thêm
//    theo mật độ (g1ClusterRadius), nhân vật hiển thị 150–190px tuỳ mật
//    độ (g1DisplaySize); camera pan + zoom NHẸ (1.0–1.35) bám trọng tâm
//    cụm người còn đứng, thiên về cặp đang giao đòn, lerp mượt, kẹp
//    trong sân; degrade bậc 2 TẮT camera motion (về toàn cảnh tĩnh).
// 4. Nameplate theo pattern 1+2 của thư viện reference: < 6 người →
//    plate ngang đầy đủ trên đầu (badge DiceBear initials + tên + thanh
//    HP KÈM SỐ hiện tại/tối đa). ≥ 6 người → cột mép sân TRÁI (mỗi người
//    1 hàng: badge nhỏ + tên + thanh HP + số, highlight người đang bị
//    đánh / sắp ngã / đã ngã), trên đầu chỉ còn vòng màu danh tính +
//    thẻ tên rút gọn (tên gọi cuối). Người ngã: định danh vẫn NGANG,
//    trong sân, đọc được ở cả hai chế độ.
//
// ĐỢT FIX-V3 (lane B — sửa theo panel proto-pack-v3, 5 ghế): logic số
// của lớp FX nằm ở module thuần `g1-fx.ts` (có spec riêng); scene chỉ
// biến giá trị thành hiệu ứng:
// 1. FX trúng đòn (P0.1): XOÁ flash trắng xoá toàn thân — flash mới pha
//    ≤40% từ màu danh tính nạn nhân về tông ấm (g1HitFlashColor) + quầng
//    phát sáng màu danh tính quanh nạn nhân; shockwave chí mạng cũng bỏ
//    trắng, dùng accent. Chữ sự kiện/số sát thương có viền tối + nền tối
//    mờ, sinh theo LÀN lệch riêng từng nạn nhân qua G1FloaterDirector
//    (trần 8 toàn sân / 3 mỗi người / 1 chữ sự kiện mỗi người; đòn dồn
//    thì GỘP số vào floater đang hiển thị), depth 50 < plate 60 < cột 70.
// 2. Chế độ ≥6 (P0.2): sân TỰ DỊCH + THU vào vùng chơi sau gutter trái
//    cố định 222px (g1DenseArena) + camera tĩnh toàn cảnh → cột không
//    che sprite/vòng/plate ở bất kỳ thời điểm nào. Thẻ rút gọn bị KHOÁ
//    lệch tối đa 110px khỏi neo đầu (không trôi giữa sân). Highlight cột
//    = ĐÚNG 1 hàng «vừa trúng đòn» (G1ColumnHitTracker) + chú thích
//    dưới cột; ngã/HP thấp thể hiện bằng NHÃN («Đã ngã»/«Sắp ngã») +
//    màu chữ/thanh — không dùng chung viền cam.
// 3. Vòng danh tính (P0.3): vòng rời container thân, sống ở cấp scene
//    và được đặt MỖI FRAME tại điểm chạm đất THẬT của sprite (bảng neo
//    đo từ alpha bbox atlas trong g1-fx — chân nhân vật không nằm ở
//    giữa-đáy ô). Bỏ hẳn các ellipse «vị trí nhà» rời rạc; vòng nhà
//    trên mặt sàn chỉ còn 1 vòng xám rất mờ, không màu danh tính.
// 4. Chip tiến trình (P1.9): «Còn X người đứng» neo cố định góc trên
//    sân (bù trừ camera như cột), cập nhật ngay khi có người ngã.
// 5. Vật liệu + tint (P1.10): tint trộn trắng 60% → 20%; đĩa sân phủ
//    texture gỗ của lane A2 (`g1-floor`, preload + fallback Graphics
//    khi tải lỗi).
// 6. Nhãn trạng thái (P1.14): thanh HP đổi màu theo ngưỡng (≤30% cam,
//    ≤15% đỏ — g1HpTone) ở cả plate lẫn cột; sao choáng neo theo ĐỈNH
//    ĐẦU THẬT của sprite nạn nhân và đi theo nhân vật mỗi frame.
//
// ĐỢT FIX-V3 — LANE INT (tích hợp cuối):
// 7. Atlas THEO BỘ (A3 + F): preload CHỈ nạp các nhân vật phân biệt
//    thực sự có mặt trong ván từ public/game/atlas/sets/<setId>/
//    (+ anchors.json của bộ đó) theo PlayerView.setId/characterKey —
//    tải lười đúng nghĩa, không nạp cả 3 bộ, không nạp atlas cũ theo
//    mặc định. Texture/anim key scope theo setId+characterKey. Atlas
//    bộ lỗi/thiếu → fallback TỪNG NGƯỜI về atlas cũ g1-* (nạp bổ sung
//    ở create qua loader đang chạy) rồi tới plate-only như contract cũ.
//    Số frame mỗi hành động lấy THẬT theo atlas đang dùng (bộ mới:
//    idle 3, run 4, punchA 5, punchB 4, kick 5, hitA 3, hitB 3,
//    dodge 3, fall 4, victory 3) — thời lượng hành động tính từ số
//    frame thật, không còn hằng 4. Hiển thị: sprite dùng
//    setDisplaySize(displaySize) theo Ô nên ô 96/128 tự phóng đúng
//    kích thước thiết kế như ô 192 cũ (baseScale = displaySize/cell).
//    Vòng chân dùng bảng neo đất ĐO TỪ ALPHA của sheet mới
//    (g1-set-atlas.ts) quy về thang 192 tương đương cho g1-fx.
// 8. Huy hiệu ảnh đầu (N3): neo ƯỚC LƯỢNG cũ được thay bằng
//    anchors.json PER-FRAME của bộ đang dùng — nhân vật đổi frame thì
//    huy hiệu bám đúng neo của frame đó; thiếu anchors/frame lạ thì
//    rơi về neo đầu ước lượng cũ. Vẫn sau cờ G1_HEAD_PHOTO_BADGE.
//    → FIX-V4 (mục 7b) BỎ HẲN huy hiệu này (xem khối FIX-V4 dưới).
//
// ĐỢT FIX-V4 (lane B2 — sửa theo panel proto-pack-v4, cụm 1+3):
// 1. Floater làm lại (g1-fx G1FloaterDirector): TRẦN 2 hiển thị đồng
//    thời TOÀN SÂN, vượt trần → hàng đợi FIFO nhả cách 200 ms, vị trí
//    chọn theo làn ứng viên và né TUYỆT ĐỐI mọi rect plate/cột/
//    floater khác (không vị trí sạch → ở lại hàng đợi). Shockwave
//    XOÁ hẳn — thay bằng tia sao nhỏ #FFC53D tại điểm trúng + HIT-STOP
//    đóng băng đồng hồ tick 90 ms/đòn (G1HitStopClock, update()).
// 2. Plate: pass tách lặp g1SeparatePlates tới khi không còn cặp nào
//    giao nhau (cả plate đầy đủ lẫn thẻ rút gọn ≥6) — bỏ kẹp cứng
//    TAG_MAX_DRIFT sau pass của FIX-V3.
// → FIX-V4.1 (lane B3 — sửa theo tự kiểm pack v5 của lane E2):
// 6. Floater NÉ LIÊN TỤC: pick-spot kiểm rect QUÉT theo quỹ đạo bay
//    lên (g1PickFloaterSpot) + mỗi frame floater đang sống được đối
//    chiếu rect plate HIỆN TẠI (G1FloaterDirector.evade qua
//    evadeFloaters) → trượt tới chỗ sạch gần nhất hoặc mờ sớm; plate
//    luôn thắng. Layout plate + né còn chạy lại ở POST_UPDATE (sau
//    khi tween vị trí của frame đã cập nhật xong).
// 7. Plate THU GỌN khi cụm quá dày: g1LayoutPlatesCompact thu cả cụm
//    (scale < 1) khi pass tách cỡ nguyên còn cặp giao — hết chồng
//    thay vì kẹt ở một điểm như probe-b3-before đo được.
// 8. Hit-glow ellipse viền danh tính: BỎ HẲN (3 vòng chồng nhau đọc
//    như vòng debug — pack v5 multihit f-013). Tia sao/tia lửa sinh
//    ra cũng bị chặn nếu hộp của chúng chạm hộp plate.
// 9. Idle: probe dày của B3 (probe-b3-idle) ĐO ĐƯỢC body.y dao động
//    đủ ±5px (tổng 10px) ở trạng thái nhà trên build local — không
//    có lỗi tween; số 0 của E2 là hệ quả lấy mẫu thô của môi trường
//    chụp (xem handoff REBUILD-C3-B3-G1PATCH).
// 3. Vòng chân desktop (gốc lỗi đo được, xem handoff REBUILD-C3-B2):
//    update() xử lý tick TRƯỚC rồi mới layout (flip đổi trong tick
//    không còn làm vòng stale cả frame) + sync vòng ngay tại mọi
//    điểm setFlipX + neo đất THEO ACTION (run/dodge dịch trong ô).
// 4. Đời sống sprite: bob idle tổng biên độ 10px + vòng co giãn đồng
//    bộ; clip run tỉ lệ vận tốc thật + thân nghiêng 0,09 rad khi
//    chạy; người ngã khử bão hoà (tint xám) + sao choáng to + «Z»
//    bay lặp; glyph initials trên đĩa plate/cột → TRẮNG.
// 5. Huy hiệu ảnh trên đầu: GỠ hẳn (cờ G1_HEAD_PHOTO_BADGE = false,
//    không còn nạp anchors.json) — ảnh chỉ còn ở badge plate/cột.
//
// ĐỢT FIX-V4.2 (lane B4 — vá cuối, sửa theo tồn đọng 3 của E3):
// 10. SPRITE ĐÈ PLATE KHI HỘI TỤ: các depth đã khai CHƯA TỪNG có
//     hiệu lực vì mọi đối tượng đều là con của root Container —
//     renderer của Container vẽ theo thứ tự list, bỏ qua depth của
//     con (probe-b4-platedepth bản before: fighter Dũng-pháp sư,
//     depth ~14, ở list index 15 > plate Bình index 10, đè plate ở
//     trạng thái run/kick/hit; 105 cặp vi phạm / 127 mẫu). Vá cấu
//     trúc: enforceRootLayerOrder() sắp xếp ổn định root theo depth
//     ở cuối create() + cuối layoutPlates() + PRE_RENDER → thang
//     lớp cuối cùng luôn là sân < vòng/sprite < FX/hạt < floater 50
//     < leader 55 < sao choáng 58 < plate + thẻ 60 < cột 70 < chip
//     74 < banner 80, bất kể đối tượng sinh lúc nào. Mọi phép tính
//     vị trí/neo/camera giữ nguyên — chỉ đổi THỨ TỰ VẼ.
//
// Người chơi KHÔNG thao tác được vào nhân vật (SPEC §8.6): scene không gắn
// bất kỳ input nào lên nhân vật/khu vực đấu.

import Phaser from 'phaser';
import type { AttackEvent, GameEvent } from '../engine/types';
import { g1EffectiveParams } from '../engine/events-g1';
import {
  EventBus,
  STAGE_EVENTS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type PlayerView,
  type SceneBootData,
  type StageDegradedPayload,
  type StageProgressPayload,
  type StageSetMutedPayload,
  type StageSetSpeedPayload,
  type StageSpeed,
} from './bridge';
import type { DegradeLevel } from './degrade';
import { initialsOfName, loadAvatarTexture } from './textures';
import {
  G1ColumnHitTracker,
  G1FloaterDirector,
  G1HitStopClock,
  G1_HIT_STAR_COLOR,
  G1_HIT_STAR_LIFE_MS,
  G1_HIT_STAR_RADIUS_PX,
  G1_IDLE_BOB_HALF_PX,
  G1_RUN_LEAN_RAD,
  g1ActionGroundX,
  g1DenseArena,
  g1GroundOffset,
  g1HeadOffset,
  g1HitFlashColor,
  g1HpBarColor,
  g1HpTextColor,
  g1HpTone,
  g1LayoutPlatesCompact,
  g1RectsOverlap,
  g1RunAnimTimeScale,
  g1SpriteAnchorOf,
  g1TintColorValue,
  type G1FloaterAnchors,
  type G1FloaterEntry,
  type G1FloaterShow,
  type G1Rect,
  type G1SpriteAnchor,
} from './g1-fx';
import {
  actionDurationForFrames,
  G1_SET_ACTION_FRAME_COUNTS,
  legacyAtlasKey,
  legacyFallbackModelKey,
  planMatchLoad,
  setGroundAnchorOf,
  type G1MatchLoadPlan,
} from './g1-set-atlas';

export const G1_SCENE_KEY = 'aidai-g1';

/** HP tối đa của profile chính (nhóm ≥ 3). Ván 2 người dùng profile riêng HP 100 — scene tính HP hiệu dụng theo cỡ nhóm qua g1EffectiveParams của engine. */
export const G1_MAX_HP = 350;

/** Tick của engine = 0,5 s ở tốc độ 1× (PROTO-STATE). */
const TICK_MS = 500;
const CENTER_X = STAGE_WIDTH / 2;
const CENTER_Y = STAGE_HEIGHT / 2 + 10;
const ARENA_RADIUS = 318;
const ACCENT = 0xff5722;
const INK = '#1c1917';

/* ------------------------------------------------------------------ */
/* Atlas sprite (REBUILD-C lane A)                                     */
/* ------------------------------------------------------------------ */

/**
 * 5 model KayKit của atlas CŨ — từ đợt INT chỉ còn là đường FALLBACK
 * (khi atlas bộ của một người lỗi/thiếu). Luồng chính dùng atlas bộ
 * theo PlayerView (xem planMatchLoad ở g1-set-atlas.ts).
 */
export const G1_MODEL_KEYS = ['knight', 'barbarian', 'mage', 'rogue', 'roguehooded'] as const;
export type G1ModelKey = (typeof G1_MODEL_KEYS)[number];

/** Key texture atlas cũ của một model: `g1-<model>` (chỉ fallback). */
export function g1AtlasKey(model: G1ModelKey): string {
  return `g1-${model}`;
}

export const G1_ACTIONS = [
  'idle',
  'run',
  'punchA',
  'punchB',
  'kick',
  'hitA',
  'hitB',
  'dodge',
  'fall',
  'victory',
] as const;
export type G1Action = (typeof G1_ACTIONS)[number];

/**
 * frameRate theo action — nhịp tick engine là 500 ms nên đòn phải đọc
 * xong trong ~1 tick: với số frame THẬT của bộ mới, punchA/kick 5 frame
 * @12fps = 417 ms, punchB 4 frame = 333 ms, hit 3 frame @10fps = 300 ms,
 * fall 4 frame @8fps = 500 ms giữ frame cuối, idle @4fps, victory @6fps
 * lặp ăn mừng. (Atlas cũ mọi hành động 4 frame cho cùng các mức này.)
 */
const ACTION_FRAME_RATES: Record<G1Action, number> = {
  idle: 4,
  run: 12,
  punchA: 12,
  punchB: 12,
  kick: 12,
  hitA: 10,
  hitB: 10,
  dodge: 12,
  fall: 8,
  victory: 6,
};
/** Action lặp vô hạn; còn lại chạy 1 lần rồi scene chủ động trả về idle. */
const ACTION_LOOPS: ReadonlySet<G1Action> = new Set(['idle', 'run', 'victory']);

/**
 * Key anim Phaser của (atlasKey, action): `aidai-<atlasKey>-<action>`.
 * Scope theo ATLAS KEY (đã chứa setId+characterKey với atlas bộ, hoặc
 * g1-<model> với atlas cũ) — anims sống theo Game nên scope này tránh
 * đụng key giữa các bộ/ván khác nhau.
 */
function animKeyOf(atlasKey: string, action: G1Action): string {
  return `aidai-${atlasKey}-${action}`;
}

/**
 * Màu tint runtime NHẸ từ colorHex của người chơi.
 * FIX-V3 (P1.10): trộn trắng giảm từ 60% (REBUILD-C — model bạc màu,
 * panel v3 ghế 1/2) xuống **20%** (G1_TINT_WHITE_MIX ở g1-fx): model
 * giữ màu gốc giàu như demo B, tint chỉ ngả tông nhẹ. Công thức thuần
 * ở g1TintColorValue (g1-fx.ts, có spec). Danh tính chắc chắn vẫn do
 * vòng chân + badge + tên đảm nhiệm, không do tint.
 */
export function g1TintColor(colorHex: string): number {
  return g1TintColorValue(colorHex);
}

/**
 * Kích thước hiển thị của sprite (px HIỂN THỊ, độc lập ô nguồn 96/128/192) theo mật độ:
 * nhóm nhỏ nhân vật to (190), nhóm đông thu dần tới 150 để sân không vỡ.
 */
export function g1DisplaySize(playerCount: number): number {
  if (playerCount <= 3) return 190;
  if (playerCount <= 5) return 178;
  if (playerCount <= 8) return 164;
  return 150;
}

/* ------------------------------------------------------------------ */
/* Bố cục sân                                                          */
/* ------------------------------------------------------------------ */

/** Plate đầy đủ: chiều cao hộp thật (badge Ø30 + tên + thanh HP + số). */
const PLATE_H = 44;
/** Thẻ tên rút gọn (chế độ đông người): chiều cao hộp. */
const TAG_H = 22;
/** Lệch neo quá ngưỡng này thì vẽ leader line nối plate về đầu nhân vật. */
const LEADER_LINE_THRESHOLD = 20;
/** Ngưỡng chuyển chế độ định danh (pattern 2): ≥ 6 người → cột mép sân. */
export const G1_DENSE_THRESHOLD = 6;
/** Cột mép sân (toạ độ màn hình đích, trước khi camera bù trừ). */
const COLUMN_X = 14;
const COLUMN_TOP = 118;
const COLUMN_W = 198;
const ROW_H = 46;
const ROW_GAP = 6;
/** Chiều cao dải chú thích dưới cột («Viền cam = vừa trúng đòn»). */
const COLUMN_LEGEND_H = 20;
/**
 * Gutter trái CỐ ĐỊNH của chế độ đông (FIX-V3 P0.2): cột + lề phải 10px.
 * Vùng chơi của sân nằm trọn bên phải đường này ở mọi thời điểm.
 */
const COLUMN_GUTTER_W = COLUMN_X + COLUMN_W + 10;
/** Chip «Còn X người đứng» (FIX-V3 P1.9): lề trên màn hình đích. */
const CHIP_TOP = 14;
/** Depth lớp FX: floater (50) LUÔN dưới plate (60) và cột (70) — plate là lớp trên cùng (FIX-V3 P0.1). */
const FLOATER_DEPTH = 50;
/** Depth plate đầy đủ + thẻ rút gọn (FIX-V4.2: hằng đặt tên thay số trần 60 ở 2 nơi dựng). */
const PLATE_DEPTH = 60;
/** Depth cột mép sân chế độ đông. */
const COLUMN_DEPTH = 70;
/** Depth leader line nối plate về đầu nhân vật — dưới plate, trên floater. */
const LEADER_DEPTH = 55;
const CHIP_DEPTH = 74;

/* ------------------------------------------------------------------ */
/* N3 — Avatar ảnh chụp của người chơi (view-only, ngoài log/engine)   */
/* ------------------------------------------------------------------ */

/**
 * Huy hiệu ảnh tròn trên đầu sprite (thử nghiệm N3): ĐÃ BỎ HẲN ở đợt
 * FIX-V4 (panel v4: ảnh hiện HAI LẦN — plate + huy hiệu đầu — gây
 * nhiễu). Cờ giữ ở mức `false` để vết tích quyết định còn đọc được;
 * đường render huy hiệu đã gỡ khỏi buildFighters. Badge ảnh trong
 * plate/cột (thay thế badge initials chính thức của N3) KHÔNG đổi.
 */
export const G1_HEAD_PHOTO_BADGE = false;
/** Cạnh canvas nướng texture ảnh tròn (px) — hiển thị 28–36px nên 96 là dư nét. */
const PHOTO_TEX_SIZE = 96;
/** Tint xám khử bão hoà của người ĐÃ NGÃ (FIX-V4 mục 6 — hết đọc như vệt máu). */
const G1_FALLEN_TINT = 0xbfbfbf;

/** Ảnh avatar của người chơi theo contract bridge (view-only, tuỳ chọn — vắng thì initials như cũ). */
function photoDataUrlOf(player: PlayerView): string | undefined {
  const url = player.photoDataUrl;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}

/** Key texture ảnh tròn đã nướng của một người chơi (khoá theo player id). */
function photoTextureKey(playerId: string): string {
  return `aidai-photo-${playerId}`;
}

/**
 * Bán kính vòng vị trí nhà theo số người n — nội suy tuyến tính:
 * n=2 → 150, n=12 → 318 (mỗi người thêm +16,8). Nhóm nhỏ đấu gần tâm,
 * sân không còn trống 2/3 như bản cũ; nhóm đông dùng trọn sân.
 * (GIỮ NGUYÊN từ PRES vòng 2.)
 */
export function g1HomeRadius(playerCount: number): number {
  const n = Phaser.Math.Clamp(playerCount, 2, 12);
  return Math.round(150 + ((ARENA_RADIUS - 150) * (n - 2)) / 10);
}

/**
 * Bán kính CỤM hiển thị thật = homeRadius × hệ số nén theo mật độ.
 * Sân vật lý (đĩa 318) không đổi; nhóm nhỏ co cụm vào giữa (0.85 /
 * 0.92) để giao đòn dồn ở tâm, cộng camera zoom nhẹ → hết cảnh sân
 * trống 2/3–80% mà panel v2 kết luận LỚN 5/5.
 */
export function g1ClusterRadius(playerCount: number): number {
  const base = g1HomeRadius(playerCount);
  const factor = playerCount <= 4 ? 0.85 : playerCount <= 6 ? 0.92 : 1;
  return Math.round(base * factor);
}

/** Tên rút gọn cho thẻ trên đầu ở chế độ đông: tên gọi CUỐI (từ cuối của tên đầy đủ); quá dài → initials. */
export function shortNameOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const last = words[words.length - 1];
  return last.length <= 10 ? last : initialsOfName(name);
}

interface FighterView {
  player: PlayerView;
  /**
   * Định danh atlas ĐANG DÙNG của người này: với luồng chính là
   * characterKey trong bộ setId (atlasKey = set-<setId>-<characterKey>);
   * khi rơi về fallback atlas cũ, model = model cũ tương ứng và
   * atlasKey = g1-<model> (setId/characterKey vẫn giữ giá trị gốc để
   * tra anchors/neo đúng nguồn).
   */
  model: string;
  setId: string;
  characterKey: string;
  atlasKey: string;
  /** Đang dùng atlas cũ g1-* (fallback) hay atlas bộ mới. */
  usingLegacyAtlas: boolean;
  /** Cạnh ô nguồn của atlas đang dùng (bộ mới 96/128, cũ 192). */
  cell: number;
  /**
   * Neo đất/đầu của model đang dùng, quy về THANG 192 tương đương
   * (g1-fx tính theo ô 192): bộ mới lấy từ bảng đo alpha ở
   * g1-set-atlas ×192, atlas cũ lấy bảng g1-fx như trước.
   */
  spriteAnchor: G1SpriteAnchor;
  /** Hành động + frame hiện tại của body (để tra neo đầu per-frame cho huy hiệu N3). */
  currentAction: string;
  currentFrameIndex: number;
  tintColor: number;
  displaySize: number;
  /** Hệ số scale của sprite = displaySize / cell (ô nguồn của atlas đang dùng). */
  baseScale: number;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  /**
   * Vòng màu danh tính dưới chân (viền colorHex) — danh tính không phụ
   * thuộc tint. FIX-V3: vòng sống ở CẤP SCENE (con của root, KHÔNG còn
   * trong container thân) và được syncGroundRing() đặt mỗi frame tại
   * điểm chạm đất thật của sprite (g1GroundOffset) — thân lao/giật/lật
   * thế nào vòng cũng ôm đúng chân.
   */
  ring: Phaser.GameObjects.Ellipse;
  /** Plate/thẻ ở CẤP SCENE (con của root, không còn là con của container thân). */
  plate: Phaser.GameObjects.Container;
  plateW: number;
  plateH: number;
  hpBarX: number;
  hpBarW: number;
  hpBar: Phaser.GameObjects.Graphics;
  ghostBar: Phaser.GameObjects.Graphics;
  /** Số HP «hiện tại/tối đa» trên plate đầy đủ (null ở chế độ đông — số nằm ở cột mép). */
  hpText: Phaser.GameObjects.Text | null;
  /** Hàng ở cột mép sân (chỉ chế độ ≥ 6 người). */
  row: {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    bar: Phaser.GameObjects.Graphics;
    ghost: Phaser.GameObjects.Graphics;
    hpText: Phaser.GameObjects.Text;
    /** Nhãn trạng thái chữ («Đã ngã» / «Sắp ngã») — tín hiệu ngã/HP thấp của cột, tách khỏi viền cam «vừa trúng đòn». */
    statusText: Phaser.GameObjects.Text;
    nameText: Phaser.GameObjects.Text;
    /** Tên đã co vừa hàng khi KHÔNG có nhãn trạng thái — để khôi phục khi nhãn tắt. */
    nameLabel: string;
  } | null;
  rowState: 'normal' | 'hit' | 'low' | 'fallen';
  hp: number;
  /** Mức HP «bóng ma» đang hiển thị phía sau thanh chính (tụt theo sau). */
  ghostHp: number;
  ghostTween: Phaser.Tweens.Tween | null;
  alive: boolean;
  homeX: number;
  homeY: number;
  /** Vị trí neo plate của frame hiện tại (trên đầu / trên thân ngã). */
  anchorX: number;
  anchorY: number;
  /** Vị trí plate ĐÃ giải quyết chống chồng của frame hiện tại. */
  plateX: number;
  plateY: number;
  /**
   * Tỉ lệ thu gọn plate của frame hiện tại (FIX-V4.1): 1 ở cụm thưa;
   * cụm quá dày không tách hết ở cỡ nguyên → layout thu cả cụm
   * (g1LayoutPlatesCompact) thay vì để plate chồng nhau.
   */
  plateScale: number;
  /** Lệch ngang nhỏ khi plate bị rung lúc trúng đòn (tween trên field này). */
  plateShakeX: number;
  dizzyStars: Phaser.GameObjects.Container | null;
  /** Sao choáng đang bám theo ai: 'hit' = trên đầu người bị choáng, 'fallen' = quanh thân nằm. */
  stunMode: 'hit' | 'fallen' | null;
  /** Tween nghiêng thân khi chạy (FIX-V4 mục 5) — huỷ khi dừng/đánh/ngã để không tranh với follow-through. */
  leanTween: Phaser.Tweens.Tween | null;
  /** Token chống đua cho flash trúng đòn: flash mới ghi đè lịch trả tint của flash cũ. */
  flashToken: number;
  /** Token chống đua: đòn ra (atk) và phản ứng trúng/né (react) riêng nhau. */
  atkToken: number;
  reactToken: number;
  /** Token chống đua cho CHUỖI DI CHUYỂN ra đòn (anticipation → chạy áp sát → trả đòn → chạy về) — ngã giữa đường huỷ cả chuỗi. */
  moveToken: number;
  /** Bộ đếm luân phiên punchA/punchB và hitA/hitB của chính người này. */
  punchCount: number;
  hitCount: number;
}

interface TickBucket {
  tick: number;
  attacks: AttackEvent[];
  falls: string[];
  phases: Array<'sudden' | 'sub'>;
}

export class G1Scene extends Phaser.Scene {
  private boot!: SceneBootData;
  private root!: Phaser.GameObjects.Container;
  private fighters = new Map<string, FighterView>();
  private buckets: TickBucket[] = [];
  private bucketIndex = 0;
  private tickTimerMs = 0;
  private running = false;
  private endScheduled = false;
  private finishedEmitted = false;
  private appliedDegrade: DegradeLevel = 0;
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private banner: Phaser.GameObjects.Text | null = null;
  /** Graphics DUY NHẤT vẽ mọi leader line của plate (clear + vẽ lại mỗi frame). */
  private leaderGraphics: Phaser.GameObjects.Graphics | null = null;
  /** Cặp giao đòn gần nhất (trọng tâm + hạn dùng) để camera thiên về hành động. */
  private lastActionFocus: { x: number; y: number; until: number } | null = null;
  /** Cột mép sân ở chế độ đông (con của root, vị trí bù trừ camera mỗi frame). */
  private column: Phaser.GameObjects.Container | null = null;
  /** Highlight cột «vừa trúng đòn» — đúng 1 hàng tại một thời điểm (FIX-V3 P0.2). */
  private columnHitTracker = new G1ColumnHitTracker();
  /** Điều phối chữ nổi: TRẦN 2 toàn sân + hàng đợi FIFO + né plate tuyệt đối (FIX-V4 Cụm 1). */
  private floaterDirector = new G1FloaterDirector();
  /** Đồng hồ hit-stop: đóng băng bộ đếm tick 90 ms mỗi đòn trúng (FIX-V4 Cụm 1). */
  private hitStop = new G1HitStopClock();
  /** Floater sát thương đang hiển thị theo nạn nhân — đích GỘP số (theo id của director). */
  private activeDamageFloaters = new Map<
    string,
    { id: number; text: Phaser.GameObjects.Text; damage: number }
  >();
  /**
   * Mọi floater đang sống theo id của director (FIX-V4.1) — sổ theo
   * dõi cho vòng NÉ LIÊN TỤC mỗi frame (evadeFloaters): Text thật,
   * mốc sinh + tuổi thọ để tính phần đời còn lại khi phải khởi động
   * lại tween bay/mờ sau một lần trượt né, cờ đang-mờ-sớm chống lặp.
   */
  private activeFloaters = new Map<
    number,
    {
      text: Phaser.GameObjects.Text;
      kind: 'event' | 'damage';
      targetId: string;
      bornAt: number;
      lifeMs: number;
      /** Tổng quãng bay lên của floater này trong cả đời nó (px). */
      risePx: number;
      fading: boolean;
    }
  >();
  /** Chip «Còn X người đứng» (FIX-V3 P1.9) — HUD bù trừ camera như cột. */
  private aliveChip: {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
  } | null = null;
  /** Hàng chờ nạp texture ảnh (N3) theo player id — gộp nhiều nơi cùng xin 1 ảnh. */
  private photoPending = new Map<string, Array<(key: string) => void>>();
  /** Kế hoạch nạp theo ván (lane INT): chỉ các nhân vật phân biệt có mặt trong ván. */
  private loadPlan: G1MatchLoadPlan | null = null;
  /** Số frame THẬT đã thăm theo `${atlasKey}|${action}` — nguồn tính thời lượng hành động. */
  private animFrameCounts = new Map<string, number>();
  /** Các model atlas cũ đang được nạp bổ sung cho đường fallback (tránh nạp trùng). */
  private pendingLegacy = new Set<string>();

  private speed: StageSpeed = 1;
  private maxHp = G1_MAX_HP;
  private muted = false;
  private homeRadius = ARENA_RADIUS;
  /** Tâm vòng vị trí nhà: chế độ đông dời +70px sang phải để cụm không bị cột mép sân nuốt. */
  private homeCX = CENTER_X;
  private homeCY = CENTER_Y;
  /** Hệ số co của root container (degrade bậc 2 thu game size còn 75%). */
  private rootScale = 1;
  private camZoom = 1;
  private camCX = CENTER_X;
  private camCY = CENTER_Y;
  /** Đang rung màn hình (chí mạng) thì tạm không re-center camera. */
  private camHoldUntil = 0;

  private onSetSpeed = (payload: StageSetSpeedPayload) => {
    this.speed = payload.speed;
  };
  private onSetMuted = (payload: StageSetMutedPayload) => {
    this.muted = payload.muted;
  };

  /**
   * Pass plate + né floater ở POST_UPDATE (FIX-V4.1, giả thuyết (d) của
   * brief — ĐÃ xác nhận bằng đọc vòng đời Phaser): pass trong update()
   * chạy TRƯỚC khi TweenManager cập nhật vị trí container của frame
   * đó, nên frame render có thể mang plate giải quyết theo neo TRƯỚC
   * tween. POST_UPDATE phát SAU mọi cập nhật vị trí của frame → chạy
   * lại layout + né ở đây thì vị trí plate/floater được render là vị
   * trí đã giải quyết trên neo CUỐI CÙNG của frame.
   */
  private onPostUpdate = () => {
    if (!this.scene.isActive() || this.fighters.size === 0) return;
    this.layoutPlates();
    this.evadeFloaters();
  };

  /**
   * Ép thứ tự lớp vẽ ở PRE_RENDER (FIX-V4.2) — hook CUỐI CÙNG của
   * scene trước khi camera vẽ frame (vòng đời Phaser: PRE_UPDATE →
   * UPDATE → POST_UPDATE → PRE_RENDER → RENDER). Mọi đối tượng sinh
   * ra ở bất kỳ thời điểm nào trong frame (tick, delayedCall, tween)
   * đều đã nằm trong root trước mốc này → một lần sắp xếp ở đây là
   * bảo đảm cho MỌI frame được vẽ, không phụ thuộc đường sinh.
   */
  private onPreRender = () => {
    this.enforceRootLayerOrder();
  };

  constructor() {
    super(G1_SCENE_KEY);
  }

  /**
   * THỨ TỰ LỚP VẼ = DEPTH, ép theo CẤU TRÚC (FIX-V4.2 — đóng lỗi
   * «sprite đè plate khi hội tụ», bằng chứng proto-pack-v5 frame
   * 12/14c + probe-b4-platedepth bản before: 105 cặp vi phạm/127 mẫu).
   *
   * Nguyên nhân gốc ĐO ĐƯỢC: mọi đối tượng của scene đều là con của
   * `root` (một Phaser Container), mà renderer của Container vẽ con
   * theo THỨ TỰ TRONG LIST (thứ tự thêm vào) và BỎ QUA depth của con
   * — depth chỉ có hiệu lực với đối tượng nằm thẳng trên DisplayList
   * của scene (chính tài liệu Container của Phaser 3.90 cũng ghi:
   * con của Container «lose the ability to set the display depth»).
   * Các depth đã khai (fighter 10–18 < floater 50 < leader 55 <
   * sao choáng 58 < plate 60 < cột 70 < chip 74 < banner 80) vì thế
   * CHƯA TỪNG có hiệu lực: thứ tự thật là thứ tự dựng interleaved
   * theo người chơi (ring → fighter → plate của từng người, rồi
   * fighter của người sau chèn SAU plate của người trước) cộng mọi
   * hiệu ứng sinh giữa ván luôn appended cuối list. Hệ quả: fighter
   * ở chỉ số người chơi cao hơn (vd pháp sư của Dũng, container
   * depth ~14) vẽ ĐÈ plate của mọi người đứng trước trong thứ tự
   * dựng mỗi khi thân lao/đánh/trúng đòn hội tụ vào vùng plate đó.
   *
   * Cách ép: sắp xếp ỔN ĐỊNH (StableSort của Phaser) list con của
   * root theo `depth` tăng dần. Depth bằng nhau giữ nguyên thứ tự
   * chèn cũ (plate↔plate cùng 60 không đổi hành vi — chúng đã được
   * tách hình học bởi layoutPlates; nền/vành cùng dưới 1 giữ nguyên).
   * Gọi ở 3 mốc: cuối create() (khung đầu đúng ngay), cuối
   * layoutPlates() (mọi pass update/post-update kết thúc ở trạng
   * thái đã sắp) và PRE_RENDER (mốc chặn cuối trước khi vẽ — xem
   * onPreRender). Bất kỳ đối tượng root nào sinh sau này chỉ cần
   * khai depth đúng thang trên là tự nằm đúng lớp — không cần nhớ
   * «thêm vào sau plate» ở từng điểm sinh.
   */
  private enforceRootLayerOrder(): void {
    if (!this.root) return;
    this.root.sort('depth');
  }

  init(data: SceneBootData): void {
    this.boot = data;
    this.speed = data.speed;
    this.muted = data.muted;
    this.fighters.clear();
    this.buckets = [];
    this.bucketIndex = 0;
    this.tickTimerMs = 0;
    this.running = false;
    this.endScheduled = false;
    this.finishedEmitted = false;
    this.appliedDegrade = 0;
    this.sparkEmitter = null;
    this.dustEmitter = null;
    this.banner = null;
    this.leaderGraphics = null;
    this.lastActionFocus = null;
    this.column = null;
    this.columnHitTracker = new G1ColumnHitTracker();
    this.floaterDirector = new G1FloaterDirector();
    this.hitStop = new G1HitStopClock();
    this.activeDamageFloaters = new Map();
    this.activeFloaters = new Map();
    this.aliveChip = null;
    this.photoPending = new Map();
    this.loadPlan = null;
    this.animFrameCounts = new Map();
    this.pendingLegacy = new Set();
    this.homeCX = CENTER_X;
    this.homeCY = CENTER_Y;
    this.rootScale = 1;
    this.camZoom = 1;
    this.camCX = CENTER_X;
    this.camCY = CENTER_Y;
    this.camHoldUntil = 0;
  }

  preload(): void {
    // TẢI LƯỜI THEO VÁN (lane INT): kế hoạch nạp dựng từ PlayerView —
    // CHỈ các nhân vật phân biệt thực sự có mặt trong ván, từ thư mục
    // bộ của họ, + anchors.json của (các) bộ đó. Không nạp cả 3 bộ,
    // không nạp atlas cũ g1-* ở đây (atlas cũ chỉ nạp bổ sung ở
    // create() cho đúng người nào có atlas bộ lỗi — xem modelFor).
    // Lỗi tải một atlas không chặn scene: modelFor rơi về atlas cũ
    // cho người đó, rồi tới plate-only như contract cũ.
    const plan = planMatchLoad(this.boot?.players ?? []);
    this.loadPlan = plan;
    for (const ref of plan.refs) {
      this.load.atlas(ref.atlasKey, ref.imageUrl, ref.jsonUrl);
    }
    // FIX-V4: không nạp anchors.json nữa — neo đầu per-frame chỉ phục
    // vụ huy hiệu ảnh trên đầu, mà huy hiệu đã bị bỏ hẳn (mục 7b).
    // Texture đĩa gỗ của lane A2 (FIX-V3 P1.10): đĩa đầy 512×512 gồm
    // vành nâu. Tải lỗi → buildBackdrop giữ đĩa Graphics làm fallback.
    this.load.image('g1-floor', '/game/atlas/g1-floor.webp');
  }

  /**
   * Số frame THẬT của một action trong atlas (thăm `<action>_0..11`).
   * Bộ mới: idle 3, run 4, punchA 5, punchB 4, kick 5, hitA 3, hitB 3,
   * dodge 3, fall 4, victory 3; atlas cũ: 4/action và không có run.
   * Action thiếu frame thì bỏ qua hẳn thay vì tạo anim rỗng/hỏng.
   */
  private frameCountOf(atlasKey: string, action: G1Action): number {
    if (!this.textures.exists(atlasKey)) return 0;
    const texture = this.textures.get(atlasKey);
    let n = 0;
    while (n < 12 && texture.has(`${action}_${n}`)) n += 1;
    return n;
  }

  /** Thời lượng 1 lần chạy của action theo số frame THẬT của atlas đang dùng (không còn hằng 4). */
  private durationOf(view: FighterView, action: G1Action): number {
    const probed = this.animFrameCounts.get(`${view.atlasKey}|${action}`);
    const tabled = view.usingLegacyAtlas
      ? undefined
      : G1_SET_ACTION_FRAME_COUNTS[action as keyof typeof G1_SET_ACTION_FRAME_COUNTS];
    return actionDurationForFrames(probed ?? tabled ?? 4, ACTION_FRAME_RATES[action]);
  }

  /** Tên frame cuối của một action theo số frame THẬT của atlas (fall bộ mới/cũ đều 4 frame → fall_3, nhưng không cứng số). */
  private lastFrameName(view: FighterView, action: G1Action): string {
    const probed = this.animFrameCounts.get(`${view.atlasKey}|${action}`);
    const count = probed ?? (view.usingLegacyAtlas ? 4 : G1_SET_ACTION_FRAME_COUNTS[action]) ?? 4;
    return `${action}_${Math.max(0, count - 1)}`;
  }

  /** Ô nguồn của atlas: suy từ frame idle_0 thật của texture; không có → 192 (atlas cũ). */
  private cellOf(atlasKey: string): number {
    if (!this.textures.exists(atlasKey)) return 192;
    const frame = this.textures.get(atlasKey).get('idle_0');
    return frame && frame.width > 0 ? frame.width : 192;
  }

  /**
   * Tạo anims cho một atlas đã nạp được × action CÓ frame (bỏ qua nếu
   * đã có — anims sống theo Game, key scope theo atlasKey nên các
   * bộ/ván khác nhau không đụng nhau). Đồng thời ghi lại số frame
   * thật để tính thời lượng hành động.
   */
  private createAnimsFor(atlasKey: string): void {
    if (!this.textures.exists(atlasKey)) return;
    for (const action of G1_ACTIONS) {
      const frames = this.frameCountOf(atlasKey, action);
      if (frames > 0) this.animFrameCounts.set(`${atlasKey}|${action}`, frames);
      const key = animKeyOf(atlasKey, action);
      if (this.anims.exists(key)) continue;
      if (frames === 0) continue; // vd `run` không có trong atlas cũ — playRun() tự fallback idle.
      this.anims.create({
        key,
        frames: this.anims.generateFrameNames(atlasKey, {
          prefix: `${action}_`,
          start: 0,
          end: frames - 1,
        }),
        frameRate: ACTION_FRAME_RATES[action],
        repeat: ACTION_LOOPS.has(action) ? -1 : 0,
      });
    }
  }

  /** Tạo anims cho mọi atlas bộ trong kế hoạch nạp của ván + mọi atlas cũ đã có sẵn. */
  private createAnims(): void {
    for (const ref of this.loadPlan?.refs ?? []) this.createAnimsFor(ref.atlasKey);
    for (const model of G1_MODEL_KEYS) this.createAnimsFor(g1AtlasKey(model));
  }

  /**
   * Atlas cho người chơi thứ i (lane INT):
   * 1. Atlas BỘ theo (setId, characterKey) của người đó — đường chính.
   * 2. Atlas bộ lỗi/thiếu → model atlas CŨ tương ứng (legacyFallback-
   *    ModelKey); atlas cũ chưa nạp thì ensureLegacyAtlas() nạp bổ
   *    sung và fighter được nâng cấp khi nạp xong (applyAtlasUpgrade).
   * 3. Không atlas nào dùng được → giữ key bộ muốn dùng: sprite vô
   *    hình nhưng plate/cột vẫn định danh được người (contract cũ).
   */
  private modelFor(index: number): {
    model: string;
    setId: string;
    characterKey: string;
    atlasKey: string;
    usingLegacyAtlas: boolean;
    cell: number;
    spriteAnchor: G1SpriteAnchor;
  } {
    const assignment = this.loadPlan?.assignments[index];
    const setId = assignment?.setId ?? 'adventurers';
    const characterKey = assignment?.characterKey ?? 'knight';
    const setKey = assignment?.atlasKey ?? `set-${setId}-${characterKey}`;
    if (assignment && this.textures.exists(setKey)) {
      const norm = setGroundAnchorOf(setId, characterKey);
      return {
        model: characterKey,
        setId,
        characterKey,
        atlasKey: setKey,
        usingLegacyAtlas: false,
        cell: this.cellOf(setKey),
        // Neo đo từ alpha sheet mới, quy về thang 192 tương đương cho
        // các hàm neo của g1-fx; nhân vật lạ chưa đo → neo mặc định.
        spriteAnchor: norm
          ? {
              groundX: norm.groundX * 192,
              groundY: norm.groundY * 192,
              fallX: norm.fallX * 192,
              fallY: norm.fallY * 192,
              headTopY: norm.headTopY * 192,
            }
          : g1SpriteAnchorOf(characterKey),
      };
    }
    const legacyModel = legacyFallbackModelKey(characterKey, index);
    this.ensureLegacyAtlas(legacyModel);
    return {
      model: legacyModel,
      setId,
      characterKey,
      atlasKey: legacyAtlasKey(legacyModel),
      usingLegacyAtlas: true,
      cell: 192,
      spriteAnchor: g1SpriteAnchorOf(legacyModel),
    };
  }

  /**
   * Nạp bổ sung MỘT atlas cũ cho đường fallback (chỉ khi thật cần):
   * loader của scene vẫn chạy được sau create() — nạp xong thì tạo
   * anims + nâng cấp mọi fighter đang chờ đúng model đó.
   */
  private ensureLegacyAtlas(model: string): void {
    const key = legacyAtlasKey(model);
    if (this.textures.exists(key) || this.pendingLegacy.has(model)) return;
    this.pendingLegacy.add(model);
    this.load.atlas(key, `/game/atlas/g1-${model}.webp`, `/game/atlas/g1-${model}.json`);
    // MultiFile atlas của Phaser phát sự kiện hoàn tất dạng
    // `filecomplete-atlasjson-<key>` (đã đối chiếu source phaser
    // 3.90: AtlasJSONFile đăng ký type 'atlasjson'); kèm dự phòng
    // sự kiện 'complete' của cả hàng đợi — finish() chỉ chạy 1 lần
    // nhờ cờ pendingLegacy, và chỉ nâng cấp khi texture thật có mặt
    // (nạp lỗi → fighter giữ trạng thái plate-only, không crash).
    const finish = () => {
      if (!this.pendingLegacy.has(model)) return;
      this.pendingLegacy.delete(model);
      if (!this.scene.isActive() || !this.textures.exists(key)) return;
      this.createAnimsFor(key);
      for (const view of this.fighters.values()) {
        if (view.usingLegacyAtlas && view.atlasKey === key) this.applyAtlasUpgrade(view);
      }
    };
    this.load.once(`filecomplete-atlasjson-${key}`, finish);
    this.load.once(Phaser.Loader.Events.COMPLETE, finish);
    if (!this.load.isLoading()) this.load.start();
  }

  /** Nâng cấp một fighter từ trạng thái chờ fallback sang atlas (cũ) vừa nạp xong. */
  private applyAtlasUpgrade(view: FighterView): void {
    if (!this.textures.exists(view.atlasKey)) return;
    view.body.setTexture(view.atlasKey, 'idle_0');
    view.body.setDisplaySize(view.displaySize, view.displaySize);
    view.body.setTint(view.tintColor);
    this.syncGroundRing(view);
    if (view.alive) this.playIdle(view);
    else if (this.textures.exists(view.atlasKey))
      view.body.setFrame(this.lastFrameName(view, 'fall'));
  }

  create(): void {
    this.maxHp = g1EffectiveParams(this.boot.players.length).hp;
    this.homeRadius = g1ClusterRadius(this.boot.players.length);
    if (this.dense) {
      // FIX-V3 (P0.2): sân TỰ DỊCH + THU vào vùng chơi sau gutter trái
      // cố định — tâm sân = giữa vùng chơi (561 với sân 900/gutter 222),
      // bán kính cụm kẹp theo g1DenseArena để mép sprite ngoài cùng
      // không bao giờ chui dưới cột. Kèm camera tĩnh toàn cảnh ở chế
      // độ này (updateCamera) → cột không che bất cứ thứ gì, ở bất kỳ
      // thời điểm nào của ván.
      const arena = g1DenseArena(
        STAGE_WIDTH,
        COLUMN_GUTTER_W,
        g1DisplaySize(this.boot.players.length),
      );
      this.homeCX = arena.centerX;
      this.homeRadius = Math.min(this.homeRadius, arena.maxClusterRadius);
    }
    this.root = this.add.container(0, 0);
    this.createAnims();
    this.buildBackdrop();
    this.buildSparkTexture();
    this.buildFighters();
    this.buildColumn();
    this.buildAliveChip();
    this.leaderGraphics = this.add.graphics().setDepth(LEADER_DEPTH);
    this.root.add(this.leaderGraphics);
    // Thứ tự dựng thô ở trên là interleaved (sân → hiệu ứng → từng
    // fighter kèm plate của họ → cột → chip → leader) — ép về thang
    // depth ngay từ khung đầu tiên (FIX-V4.2, xem enforceRootLayerOrder).
    this.enforceRootLayerOrder();
    this.buckets = this.groupEvents(this.boot.log.events);
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(CENTER_X, CENTER_Y);

    EventBus.on(STAGE_EVENTS.SET_SPEED, this.onSetSpeed as never);
    EventBus.on(STAGE_EVENTS.SET_MUTED, this.onSetMuted as never);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate);
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, this.onPreRender);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(STAGE_EVENTS.SET_SPEED, this.onSetSpeed as never);
      EventBus.off(STAGE_EVENTS.SET_MUTED, this.onSetMuted as never);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate);
      this.events.off(Phaser.Scenes.Events.PRE_RENDER, this.onPreRender);
      this.tweens.killAll();
      this.time.removeAllEvents();
    });
    this.scale.on('resize', this.onResize, this);

    if (this.buckets.length === 0) {
      // Log rỗng — không tự bịa diễn biến; giữ 1 s rồi báo kết thúc.
      this.time.delayedCall(1000, () => this.emitFinished());
      return;
    }
    // Nghỉ một nhịp cho cả nhóm vào vị trí trước tick đầu tiên.
    this.time.delayedCall(400, () => {
      this.running = true;
    });
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.rootScale = gameSize.width / STAGE_WIDTH;
    if (this.root) {
      this.root.setScale(this.rootScale);
    }
  }

  private get dense(): boolean {
    return this.boot.players.length >= G1_DENSE_THRESHOLD;
  }

  /**
   * Mặt sàn (FIX-V3 P1.10 + P0.2/P0.3):
   * - Đĩa sân phủ TEXTURE GỖ của lane A2 (`g1-floor`, đĩa đầy gồm vành
   *   nâu) khi nạp được; đĩa Graphics xám bên dưới là FALLBACK khi
   *   texture tải lỗi (đúng mẫu fallback atlas của G2).
   * - Chế độ đông: đĩa DỊCH tâm theo sân đã dịch (homeCX) và thu về
   *   Ø664 để vành nâu nằm trọn trong vùng chơi sau gutter; chế độ
   *   thường Ø688 tại tâm sân — vành texture nằm trong vành sân cũ
   *   (Ø728), depth dưới sprite + vòng chân (mọi thứ thêm sau đều trên).
   * - Dấu «vị trí nhà» DUY NHẤT còn lại: 1 vòng tròn xám RẤT MỜ theo
   *   bán kính cụm — không còn ellipse nhà rời rạc, không màu danh tính.
   */
  private buildBackdrop(): void {
    const discCX = this.dense ? this.homeCX : CENTER_X;
    const floorSize = this.dense ? 664 : 688;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    // Đĩa fallback (chỉ lộ ra khi texture gỗ tải lỗi): tông đá ấm-nhạt.
    g.fillStyle(0xefeeeb, 1);
    g.fillCircle(discCX, CENTER_Y, ARENA_RADIUS + 46);
    g.fillStyle(0xf7f6f3, 1);
    g.fillCircle(discCX, CENTER_Y, ARENA_RADIUS);
    this.root.add(g);

    const hasFloor = this.textures.exists('g1-floor');
    if (hasFloor) {
      const floor = this.add
        .image(discCX, CENTER_Y, 'g1-floor')
        .setDisplaySize(floorSize, floorSize)
        .setDepth(0.5);
      this.root.add(floor);
    }

    const overlay = this.add.graphics().setDepth(0.6);
    if (!hasFloor) {
      // Chi tiết đĩa xám (chỉ ở đường fallback): vòng tâm + nan hoa.
      overlay.fillStyle(0xffffff, 0.75);
      overlay.fillCircle(discCX, CENTER_Y, 118);
      overlay.lineStyle(2, 0xe2e0dc, 0.75);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        overlay.lineBetween(
          discCX + Math.cos(a) * 46,
          CENTER_Y + Math.sin(a) * 46,
          discCX + Math.cos(a) * (ARENA_RADIUS - 52),
          CENTER_Y + Math.sin(a) * (ARENA_RADIUS - 52),
        );
      }
      overlay.lineStyle(2, 0xe0ded9, 1);
      overlay.strokeCircle(discCX, CENTER_Y, 118);
    }
    // Vòng vị trí nhà: MỘT vòng xám rất mờ (không màu danh tính).
    overlay.lineStyle(1, 0x78716c, hasFloor ? 0.22 : 0.4);
    overlay.strokeCircle(this.homeCX, this.homeCY, this.homeRadius);
    // Viền sân 2 lớp quanh đĩa (trên gỗ chỉ còn vòng mảnh ôm vành nâu).
    overlay.lineStyle(3, 0xd0cdc7, hasFloor ? 0.55 : 1);
    overlay.strokeCircle(discCX, CENTER_Y, ARENA_RADIUS + 46);
    overlay.lineStyle(1, 0xdfdcd6, hasFloor ? 0.5 : 1);
    overlay.strokeCircle(discCX, CENTER_Y, ARENA_RADIUS + 36);
    this.root.add(overlay);
  }

  private buildSparkTexture(): void {
    if (!this.textures.exists('aidai-spark')) {
      const g = this.add.graphics();
      g.fillStyle(0xffb020, 1);
      // Sao 5 cánh bằng đa giác tự tính (Graphics của Phaser 3.90 không có fillStar).
      const starPoints: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? 11 : 5;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        starPoints.push({ x: 12 + Math.cos(a) * radius, y: 12 + Math.sin(a) * radius });
      }
      g.fillPoints(starPoints, true);
      g.generateTexture('aidai-spark', 24, 24);
      g.destroy();
    }
    this.sparkEmitter = this.add.particles(0, 0, 'aidai-spark', {
      speed: { min: 60, max: 180 },
      lifespan: 320,
      quantity: 0,
      scale: { start: 1, end: 0 },
      emitting: false,
    });
    this.sparkEmitter.setDepth(19);
    this.root.add(this.sparkEmitter);
    this.buildHitStarTexture();
    this.buildDustTexture();
  }

  /**
   * Texture tia sao 4 cánh (FIX-V4 Cụm 1 — thay shockwave): sao nhỏ
   * màu vàng ấm TRUNG TÍNH #FFC53D (G1_HIT_STAR_COLOR), bán kính
   * 13px, nướng 28×28. Không màu danh tính, không vòng nở — phản hồi
   * trúng đòn nằm gọn tại điểm trúng và chết trong ≤250 ms.
   */
  private buildHitStarTexture(): void {
    if (this.textures.exists('aidai-hitstar')) return;
    const g = this.add.graphics();
    g.fillStyle(G1_HIT_STAR_COLOR, 1);
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    const R = G1_HIT_STAR_RADIUS_PX;
    const r = 3.4;
    const c = 14;
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: c + Math.cos(a) * rad, y: c + Math.sin(a) * rad });
    }
    g.fillPoints(pts, true);
    g.generateTexture('aidai-hitstar', 28, 28);
    g.destroy();
  }

  /** Hạt bụi đất mềm: vòng tròn xám với vài vòng alpha chồng nhau (gradient giả). */
  private buildDustTexture(): void {
    if (!this.textures.exists('aidai-dust')) {
      const g = this.add.graphics();
      g.fillStyle(0xa8a29e, 0.16);
      g.fillCircle(12, 12, 11);
      g.fillStyle(0xa8a29e, 0.28);
      g.fillCircle(12, 12, 8);
      g.fillStyle(0xa8a29e, 0.45);
      g.fillCircle(12, 12, 5);
      g.generateTexture('aidai-dust', 24, 24);
      g.destroy();
    }
    this.dustEmitter = this.add.particles(0, 0, 'aidai-dust', {
      speed: { min: 24, max: 84 },
      lifespan: 480,
      quantity: 0,
      scale: { start: 0.7, end: 1.7 },
      alpha: { start: 0.65, end: 0 },
      emitting: false,
    });
    this.dustEmitter.setDepth(9);
    this.root.add(this.dustEmitter);
  }

  /* ---------------------------------------------------------------- */
  /* Sprite: phát action + trả về idle theo token chống đua            */
  /* ---------------------------------------------------------------- */

  /** Hệ số tốc độ anim: bám tốc độ diễn (0.5× chậm, 2× nhanh); 'fast' đứng hình. */
  private animTimeScale(): number {
    if (this.speed === 'fast') return 1;
    return Phaser.Math.Clamp(this.speed, 0.5, 2);
  }

  private playIdle(view: FighterView): void {
    view.currentAction = 'idle';
    if (!view.alive) return;
    // Trả thân THẲNG sau pha chạy (FIX-V4 mục 5): huỷ tween nghiêng
    // đang chạy và tween góc về 0 — người dừng là đứng thẳng.
    view.leanTween?.destroy();
    view.leanTween = null;
    if (Math.abs(view.body.angle) > 0.5) {
      view.leanTween = this.tweens.add({
        targets: view.body,
        angle: 0,
        duration: 130,
        ease: 'Quad.easeOut',
      });
    }
    if (this.speed === 'fast') {
      view.body.anims.stop();
      if (this.textures.exists(view.atlasKey)) view.body.setFrame('idle_0');
      return;
    }
    view.body.anims.timeScale = this.animTimeScale();
    view.body.play(animKeyOf(view.atlasKey, 'idle'), true);
  }

  /**
   * Phát một action 1-lần (punch/kick/hit/dodge) rồi tự trả về idle sau
   * đúng thời lượng anim. Token theo vai (atk/react) để đòn chồng trong
   * cùng tick không huỷ nhầm lịch trả của nhau; người đã ngã không về idle.
   */
  private playAction(view: FighterView, action: G1Action, role: 'atk' | 'react'): void {
    if (this.speed === 'fast' || !this.textures.exists(view.atlasKey)) return;
    const token = role === 'atk' ? ++view.atkToken : ++view.reactToken;
    view.currentAction = action;
    view.body.anims.timeScale = this.animTimeScale();
    // Không ignoreIfPlaying: cùng một action lặp lại ở tick sau phải
    // chạy lại từ frame đầu, không nối tiếp vòng cũ.
    view.body.play(animKeyOf(view.atlasKey, action));
    // Thời lượng theo số frame THẬT của (atlas, hành động) này:
    // punchA/kick của bộ mới 5 frame → 417ms thay vì 333ms của hằng 4.
    const wait = this.durationOf(view, action) / this.animTimeScale() + 30;
    this.time.delayedCall(wait, () => {
      if (!this.scene.isActive() || !view.alive) return;
      const current = role === 'atk' ? view.atkToken : view.reactToken;
      if (current !== token) return;
      this.playIdle(view);
    });
  }

  /**
   * Chạy áp sát / chạy về (FIX-V3 N1a): phát clip `run` khi atlas có
   * frame run (lane A3 bổ sung — createAnims chỉ tạo anim khi frame
   * thật tồn tại). FALLBACK an toàn theo contract A3: atlas chưa có
   * run → giữ anim idle đang chạy trong lúc thân di chuyển (không
   * crash, không đứng hình — thân vẫn chạy bằng tween container).
   * Mặt nhân vật luôn hướng theo chiều di chuyển.
   * FIX-V4 (mục 4+5): đổi flip xong thì SYNC VÒNG CHÂN NGAY (không chờ
   * layout pass); nhịp clip run TỈ LỆ tốc độ di chuyển thật
   * (g1RunAnimTimeScale — hết trượt chân); thân NGHIÊNG ~0,09 rad về
   * phía di chuyển, trả thẳng ở playIdle/playAttack.
   */
  private playRun(view: FighterView, faceLeft: boolean, speedPxPerMs = 0): void {
    if (!view.alive || this.speed === 'fast') return;
    view.body.setFlipX(faceLeft);
    this.syncGroundRing(view);
    view.currentAction = 'run';
    const runKey = animKeyOf(view.atlasKey, 'run');
    if (this.anims.exists(runKey) && this.textures.exists(view.atlasKey)) {
      view.body.anims.timeScale = g1RunAnimTimeScale(speedPxPerMs, view.displaySize);
      view.body.play(runKey, true);
    } else if (!view.body.anims.isPlaying) {
      this.playIdle(view);
      return;
    }
    view.leanTween?.destroy();
    view.leanTween = this.tweens.add({
      targets: view.body,
      angle: Phaser.Math.RadToDeg(G1_RUN_LEAN_RAD) * (faceLeft ? -1 : 1),
      duration: 110,
      ease: 'Quad.easeOut',
    });
  }

  /* ---------------------------------------------------------------- */
  /* Dựng fighter + plate/thẻ + hàng cột mép                           */
  /* ---------------------------------------------------------------- */

  private colorOf(player: PlayerView): number {
    return Phaser.Display.Color.HexStringToColor(player.colorHex).color;
  }

  /**
   * Nạp texture ẢNH TRÒN của người chơi (N3) từ photoDataUrl:
   * ảnh nguồn → canvas 96×96, clip hình tròn + cover-crop về tâm →
   * `textures.addCanvas` với key khoá theo player id. Nướng tròn vào
   * texture (như đường DiceBear của textures.ts) để badge đi theo
   * plate/container mà không cần mask — mask của Phaser không bám
   * container di chuyển. Mọi lỗi (ảnh hỏng, canvas lỗi, dataURL rác)
   * → IM LẶNG rơi về badge initials sẵn có: không crash, không frame
   * trắng, không chặn scene. Ảnh chỉ sống ở runtime của scene — không
   * vào log/engine/lưu trữ (đúng contract view-only của lane F).
   */
  private loadPhotoTexture(player: PlayerView, onReady: (key: string) => void): void {
    const dataUrl = photoDataUrlOf(player);
    if (!dataUrl) return;
    const key = photoTextureKey(player.id);
    if (this.textures.exists(key)) {
      onReady(key);
      return;
    }
    const pending = this.photoPending.get(player.id);
    if (pending) {
      pending.push(onReady);
      return;
    }
    this.photoPending.set(player.id, [onReady]);
    const settle = (ok: boolean) => {
      const callbacks = this.photoPending.get(player.id) ?? [];
      this.photoPending.delete(player.id);
      if (!ok || !this.textures.exists(key)) return; // fallback initials — không gọi onReady
      for (const cb of callbacks) cb(key);
    };
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = PHOTO_TEX_SIZE;
          canvas.height = PHOTO_TEX_SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            settle(false);
            return;
          }
          ctx.beginPath();
          ctx.arc(PHOTO_TEX_SIZE / 2, PHOTO_TEX_SIZE / 2, PHOTO_TEX_SIZE / 2, 0, Math.PI * 2);
          ctx.clip();
          const side = Math.min(img.width, img.height);
          if (side <= 0) {
            settle(false);
            return;
          }
          ctx.drawImage(
            img,
            (img.width - side) / 2,
            (img.height - side) / 2,
            side,
            side,
            0,
            0,
            PHOTO_TEX_SIZE,
            PHOTO_TEX_SIZE,
          );
          if (!this.textures.exists(key)) this.textures.addCanvas(key, canvas);
          settle(true);
        } catch {
          settle(false);
        }
      };
      img.onerror = () => settle(false);
      img.src = dataUrl;
    } catch {
      settle(false);
    }
  }

  private plateMetricsFor(
    nameWidth: number,
    hpNumWidth: number,
  ): { plateW: number; hpBarX: number; hpBarW: number; badgeX: number } {
    // Hàng trên: tên (trái) + số HP (phải) không được chạm nhau → bề
    // rộng vùng phải ít nhất tên + 8 + số; thanh HP dùng trọn vùng đó.
    const rightW = Math.max(84, Math.ceil(nameWidth) + 8 + Math.ceil(hpNumWidth));
    const plateW = 38 + rightW + 8;
    return { plateW, hpBarX: -plateW / 2 + 38, hpBarW: rightW, badgeX: -plateW / 2 + 17 };
  }

  private buildFighters(): void {
    const players = this.boot.players;
    const n = players.length;
    const displaySize = g1DisplaySize(n);
    players.forEach((player, i) => {
      const resolved = this.modelFor(i);
      const { model, atlasKey } = resolved;
      const tintColor = g1TintColor(player.colorHex);
      // Vị trí xuất phát trên vòng sàn — thuần trình diễn, engine không
      // dùng vị trí (SPEC §8.1: không lợi thế theo vị trí).
      const angleRad = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      const x = this.homeCX + Math.cos(angleRad) * this.homeRadius;
      const y = this.homeCY + Math.sin(angleRad) * this.homeRadius;
      // Container neo tại GIỮA-ĐÁY Ô sprite (origin 0.5, 1). LƯU Ý
      // FIX-V3: điểm này KHÔNG phải điểm chạm đất thật — chân nhân vật
      // trong ô atlas nằm trên đáy ô và lệch trái tuỳ model (đo alpha
      // bbox: atlas cũ ở g1-fx, sheet mới ở g1-set-atlas — fighter giữ
      // bảng neo của đúng atlas đang dùng). Vòng chân vì thế không
      // nằm trong container nữa (xem ring dưới đây). Kích thước hiển
      // thị: sprite được setDisplaySize(displaySize) THEO Ô nên ô
      // nguồn 96 (adventurers/skeletons) hay 128 (blocky) đều phóng
      // về đúng displaySize thiết kế như ô 192 cũ — không đổi cỡ sân.
      const container = this.add.container(x, y).setDepth(10 + (y / STAGE_HEIGHT) * 8);

      // Vòng màu danh tính dưới chân: nền colorHex mờ + viền colorHex
      // đậm — nhận ra người ngay cả khi tint sprite rất nhẹ. FIX-V3
      // (P0.3): vòng là con của ROOT, vị trí do syncGroundRing() đặt
      // MỖI FRAME tại điểm chạm đất thật của sprite → ôm chân khi
      // nhân vật chạy/lao/giật/lật, không ở lại vị trí nhà.
      const ring = this.add.ellipse(x, y, displaySize * 0.56, 16, this.colorOf(player), 0.16);
      ring.setStrokeStyle(2, this.colorOf(player), 0.9);
      ring.setDepth(container.depth - 0.5);
      this.root.add(ring);
      const body = this.add
        .sprite(0, 0, atlasKey, 'idle_0')
        .setOrigin(0.5, 1)
        .setDisplaySize(displaySize, displaySize)
        .setTint(tintColor);
      container.add([body]);
      this.root.add(container);
      // Nhịp thở idle: bob TỔNG biên độ dọc 10px (FIX-V4 mục 5 — bản
      // FIX-V3 ±3px dưới ngưỡng nhìn ở cỡ sprite thật, panel không
      // thấy nhịp): thân nhún từ +5 xuống −5px (G1_IDLE_BOB_HALF_PX),
      // lệch pha theo chỉ số, cộng anim idle 4fps thì nhân vật không
      // bao giờ «đứng tượng». Tween trên body.y (không tranh với
      // angle/scaleY/flip); playFall killTweensOf(body) + setY(0) nên
      // người ngã hết bob tự nhiên.
      body.setY(G1_IDLE_BOB_HALF_PX);
      this.tweens.add({
        targets: body,
        y: -G1_IDLE_BOB_HALF_PX,
        duration: 820 + (i % 3) * 90,
        delay: (i % 4) * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Vòng/bóng dưới chân co giãn ĐỒNG BỘ NHẸ với nhịp bob (cùng
      // thời lượng + lệch pha): thân nhún xuống → vòng nở nhẹ, thân
      // nhấc lên → vòng thu lại. playFall killTweensOf(ring) trước
      // khi nới vòng theo thân nằm.
      this.tweens.add({
        targets: ring,
        scaleX: 0.93,
        scaleY: 0.9,
        duration: 820 + (i % 3) * 90,
        delay: (i % 4) * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const built = this.dense ? this.buildMiniTag(player) : this.buildFullPlate(player);
      built.plate.setPosition(x, y - displaySize - 12);
      this.root.add(built.plate);

      const view: FighterView = {
        player,
        model,
        setId: resolved.setId,
        characterKey: resolved.characterKey,
        atlasKey,
        usingLegacyAtlas: resolved.usingLegacyAtlas,
        cell: resolved.cell,
        spriteAnchor: resolved.spriteAnchor,
        currentAction: 'idle',
        currentFrameIndex: 0,
        tintColor,
        displaySize,
        baseScale: displaySize / resolved.cell,
        container,
        body,
        ring,
        plate: built.plate,
        plateW: built.plateW,
        plateH: built.plateH,
        hpBarX: built.hpBarX,
        hpBarW: built.hpBarW,
        hpBar: built.hpBar,
        ghostBar: built.ghostBar,
        hpText: built.hpText,
        row: null,
        rowState: 'normal',
        hp: this.maxHp,
        ghostHp: this.maxHp,
        ghostTween: null,
        alive: true,
        homeX: x,
        homeY: y,
        anchorX: x,
        anchorY: y - displaySize - 12,
        plateX: x,
        plateY: y - displaySize - 12,
        plateScale: 1,
        plateShakeX: 0,
        dizzyStars: null,
        stunMode: null,
        leanTween: null,
        flashToken: 0,
        atkToken: 0,
        reactToken: 0,
        moveToken: 0,
        punchCount: 0,
        hitCount: 0,
      };
      this.fighters.set(player.id, view);
      this.syncGroundRing(view);
      this.drawHp(view);
      this.drawGhost(view);
      this.playIdle(view);
      // Theo dõi (hành động, frame) hiện tại của body để huy hiệu đầu
      // N3 tra đúng neo per-frame trong anchors.json: Phaser phát
      // 'animationupdate' trên sprite mỗi lần anim đổi frame.
      body.on('animationupdate', (...args: unknown[]) => {
        const anim = args[0] as { key?: string } | undefined;
        const frame = args[1] as { index?: number; name?: string } | undefined;
        if (anim?.key) {
          const prefix = `aidai-${view.atlasKey}-`;
          if (anim.key.startsWith(prefix)) view.currentAction = anim.key.slice(prefix.length);
        }
        if (typeof frame?.index === 'number') {
          view.currentFrameIndex = Math.max(0, frame.index - 1);
        } else if (typeof frame?.name === 'string') {
          const m = /_(\d+)$/.exec(frame.name);
          if (m) view.currentFrameIndex = Number.parseInt(m[1], 10);
        }
      });
      // FIX-V4 (mục 7b): huy hiệu ảnh trên đầu ĐÃ GỠ — ảnh chụp chỉ
      // còn hiện trong badge của plate/cột (đường chính của N3).
    });
  }

  /** Plate ĐẦY ĐỦ (chế độ < 6 người): badge DiceBear initials + tên + thanh HP kèm số HP. */
  private buildFullPlate(player: PlayerView): {
    plate: Phaser.GameObjects.Container;
    plateW: number;
    plateH: number;
    hpBarX: number;
    hpBarW: number;
    hpBar: Phaser.GameObjects.Graphics;
    ghostBar: Phaser.GameObjects.Graphics;
    hpText: Phaser.GameObjects.Text;
  } {
    const nameText = this.add
      .text(0, -11, player.name, {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: INK,
      })
      .setOrigin(0, 0.5);
    const hpText = this.add
      .text(0, -11, `${this.maxHp}/${this.maxHp}`, {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#44403c',
      })
      .setOrigin(1, 0.5);
    const metrics = this.plateMetricsFor(nameText.width, hpText.width);
    nameText.setX(metrics.hpBarX);
    hpText.setX(metrics.plateW / 2 - 8);
    const plate = this.add.container(0, 0).setDepth(PLATE_DEPTH);
    const plateBg = this.add.graphics();
    plateBg.fillStyle(0xffffff, 0.92);
    plateBg.fillRoundedRect(-metrics.plateW / 2, -PLATE_H / 2, metrics.plateW, PLATE_H, 11);
    plateBg.lineStyle(1, 0xd6d3d1, 0.9);
    plateBg.strokeRoundedRect(-metrics.plateW / 2, -PLATE_H / 2, metrics.plateW, PLATE_H, 11);
    const badgeCircle = this.add.graphics();
    badgeCircle.fillStyle(this.colorOf(player), 1);
    badgeCircle.fillCircle(metrics.badgeX, 0, 15);
    badgeCircle.lineStyle(2, 0xffffff, 1);
    badgeCircle.strokeCircle(metrics.badgeX, 0, 15);
    const badgeInitials = this.add
      .text(metrics.badgeX, 0, initialsOfName(player.name), {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        // FIX-V4 (mục 7a): glyph TRẮNG trên đĩa strongHex — đồng bộ
        // quyết định tông mạnh toàn game (DOM do lane ID2 xử lý).
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const hpBack = this.add.graphics();
    hpBack.fillStyle(0xe7e5e4, 1);
    hpBack.fillRoundedRect(metrics.hpBarX, 5, metrics.hpBarW, 8, 4);
    // Ghost bar nằm giữa nền và thanh chính: giữ mức HP cũ một nhịp rồi
    // mới rút theo (xem applyHpFromLog) — chỉ phần vượt thanh chính lộ ra.
    const ghostBar = this.add.graphics();
    const hpBar = this.add.graphics();
    // Viền strongHex cho badge ẢNH (N3) — ẩn cho tới khi ảnh sẵn sàng;
    // badge initials/DiceBear dùng viền trắng sẵn có của badgeCircle.
    const photoRing = this.add.graphics();
    photoRing.lineStyle(2.5, this.colorOf(player), 1);
    photoRing.strokeCircle(metrics.badgeX, 0, 15);
    photoRing.setVisible(false);
    plate.add([
      plateBg,
      badgeCircle,
      badgeInitials,
      nameText,
      hpText,
      hpBack,
      ghostBar,
      hpBar,
      photoRing,
    ]);

    loadAvatarTexture(this, player, (key) => {
      if (!this.scene.isActive() || !this.textures.exists(key)) return;
      const badge = this.add.image(metrics.badgeX, 0, key).setDisplaySize(30, 30);
      plate.addAt(badge, 2);
      badgeInitials.setVisible(false);
    });
    // N3: có ảnh chụp → badge TRÒN bằng ảnh (trên lớp DiceBear, kèm
    // viền strongHex) thay initials. Không ảnh/lỗi nạp → giữ nguyên
    // đường initials/DiceBear hiện tại.
    this.loadPhotoTexture(player, (key) => {
      if (!this.scene.isActive() || !this.textures.exists(key)) return;
      const badge = this.add.image(metrics.badgeX, 0, key).setDisplaySize(30, 30);
      plate.addAt(badge, 3);
      badgeInitials.setVisible(false);
      photoRing.setVisible(true);
    });
    return {
      plate,
      plateW: metrics.plateW,
      plateH: PLATE_H,
      hpBarX: metrics.hpBarX,
      hpBarW: metrics.hpBarW,
      hpBar,
      ghostBar,
      hpText,
    };
  }

  /**
   * Thẻ RÚT GỌN trên đầu (chế độ ≥ 6 người): chấm màu danh tính + tên
   * gọi cuối, một dòng — plate đầy đủ (HP + số) sống ở cột mép sân.
   * hpBar/ghostBar là Graphics rỗng để layout/draw dùng chung một đường.
   */
  private buildMiniTag(player: PlayerView): {
    plate: Phaser.GameObjects.Container;
    plateW: number;
    plateH: number;
    hpBarX: number;
    hpBarW: number;
    hpBar: Phaser.GameObjects.Graphics;
    ghostBar: Phaser.GameObjects.Graphics;
    hpText: null;
  } {
    const label = shortNameOf(player.name);
    const nameText = this.add
      .text(0, 0, label, {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: INK,
      })
      .setOrigin(0, 0.5);
    const plateW = Math.ceil(nameText.width) + 30;
    nameText.setX(-plateW / 2 + 20);
    const plate = this.add.container(0, 0).setDepth(PLATE_DEPTH);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(-plateW / 2, -TAG_H / 2, plateW, TAG_H, 8);
    bg.lineStyle(1, 0xd6d3d1, 0.9);
    bg.strokeRoundedRect(-plateW / 2, -TAG_H / 2, plateW, TAG_H, 8);
    const dot = this.add.graphics();
    dot.fillStyle(this.colorOf(player), 1);
    dot.fillCircle(-plateW / 2 + 11, 0, 5);
    dot.lineStyle(1.5, 0xffffff, 1);
    dot.strokeCircle(-plateW / 2 + 11, 0, 5);
    const hpBar = this.add.graphics();
    const ghostBar = this.add.graphics();
    plate.add([bg, dot, nameText, ghostBar, hpBar]);
    return { plate, plateW, plateH: TAG_H, hpBarX: 0, hpBarW: 0, hpBar, ghostBar, hpText: null };
  }

  /** Cột mép sân TRÁI (chế độ ≥ 6): mỗi người 1 hàng badge + tên + HP + số. Vị trí do layoutColumn() bù trừ camera mỗi frame. */
  private buildColumn(): void {
    if (!this.dense) return;
    const column = this.add.container(COLUMN_X, COLUMN_TOP).setDepth(COLUMN_DEPTH);
    this.root.add(column);
    this.column = column;
    let rowIndex = 0;
    for (const view of this.fighters.values()) {
      const idx = rowIndex;
      rowIndex += 1;
      const rowContainer = this.add.container(0, idx * (ROW_H + ROW_GAP));
      const bg = this.add.graphics();
      const player = view.player;
      const badgeCircle = this.add.graphics();
      badgeCircle.fillStyle(this.colorOf(player), 1);
      badgeCircle.fillCircle(23, ROW_H / 2, 14);
      badgeCircle.lineStyle(2, 0xffffff, 1);
      badgeCircle.strokeCircle(23, ROW_H / 2, 14);
      const badgeInitials = this.add
        .text(23, ROW_H / 2, initialsOfName(player.name), {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          // FIX-V4 (mục 7a): glyph TRẮNG trên đĩa strongHex như plate.
          color: '#ffffff',
        })
        .setOrigin(0.5);
      const nameText = this.add
        .text(42, 14, player.name, {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: INK,
        })
        .setOrigin(0, 0.5);
      // Tên dài: co chữ tới 10px, vẫn tràn thì rút về tên gọi cuối.
      let size = 13;
      while (nameText.width > COLUMN_W - 42 - 8 && size > 10) {
        size -= 1;
        nameText.setFontSize(size);
      }
      if (nameText.width > COLUMN_W - 42 - 8) nameText.setText(shortNameOf(player.name));
      const barBack = this.add.graphics();
      barBack.fillStyle(0xe7e5e4, 1);
      barBack.fillRoundedRect(42, 29, 94, 7, 3);
      const ghost = this.add.graphics();
      const bar = this.add.graphics();
      const hpText = this.add
        .text(COLUMN_W - 8, 32, `${this.maxHp}/${this.maxHp}`, {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#44403c',
        })
        .setOrigin(1, 0.5);
      // Nhãn trạng thái («Đã ngã» / «Sắp ngã») — góc phải-trên của hàng,
      // hiện theo tone HP ở drawHp/redrawRow (FIX-V3 P0.2: ngã/HP thấp
      // đọc bằng NHÃN + MÀU, không dùng chung tín hiệu viền cam).
      const statusText = this.add
        .text(COLUMN_W - 8, 14, '', {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#dc2626',
        })
        .setOrigin(1, 0.5);
      // Viền strongHex cho badge ẢNH ở cột (N3) — ẩn tới khi ảnh sẵn sàng.
      const rowPhotoRing = this.add.graphics();
      rowPhotoRing.lineStyle(2.5, this.colorOf(player), 1);
      rowPhotoRing.strokeCircle(23, ROW_H / 2, 14);
      rowPhotoRing.setVisible(false);
      rowContainer.add([
        bg,
        badgeCircle,
        badgeInitials,
        nameText,
        statusText,
        barBack,
        ghost,
        bar,
        hpText,
        rowPhotoRing,
      ]);
      column.add(rowContainer);
      view.row = {
        container: rowContainer,
        bg,
        bar,
        ghost,
        hpText,
        statusText,
        nameText,
        nameLabel: nameText.text,
      };
      this.redrawRow(view);
      this.drawHp(view);
      this.drawGhost(view);

      loadAvatarTexture(this, player, (key) => {
        if (!this.scene.isActive() || !this.textures.exists(key)) return;
        const badge = this.add.image(23, ROW_H / 2, key).setDisplaySize(28, 28);
        rowContainer.addAt(badge, 2);
        badgeInitials.setVisible(false);
      });
      // N3: badge ảnh tròn thay initials ở cột (trên lớp DiceBear,
      // viền strongHex) — không ảnh/lỗi nạp thì giữ initials.
      this.loadPhotoTexture(player, (key) => {
        if (!this.scene.isActive() || !this.textures.exists(key)) return;
        const badge = this.add.image(23, ROW_H / 2, key).setDisplaySize(28, 28);
        rowContainer.addAt(badge, 3);
        badgeInitials.setVisible(false);
        rowPhotoRing.setVisible(true);
      });
    }
    // Chú thích nghĩa của highlight NGAY DƯỚI cột (FIX-V3 P0.2 — panel
    // v3: viền cam không chú thích thì mất nghĩa). Chỉ MỘT tín hiệu cam
    // duy nhất tồn tại trong cột: hàng của người vừa trúng đòn.
    const legend = this.add
      .text(2, this.fighters.size * (ROW_H + ROW_GAP) + 4, 'Viền cam = vừa trúng đòn', {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#78716c',
      })
      .setOrigin(0, 0.5);
    column.add(legend);
  }

  /**
   * Vẽ nền + nhãn trạng thái của hàng cột theo trạng thái (FIX-V3 P0.2):
   * - 'hit' (vừa trúng đòn): DUY NHẤT tín hiệu viền cam — nền cam nhạt
   *   + viền accent dày 2. Chỉ 1 hàng giữ trạng thái này (tracker).
   * - 'low' (HP ≤30%): nền đỏ RẤT nhạt, viền xám thường + NHÃN chữ
   *   «Sắp ngã» màu theo tone (cam đậm/đỏ) — không viền cam, không
   *   viền đỏ, để không lẫn với tín hiệu «vừa trúng đòn».
   * - 'fallen': hàng mờ + NHÃN «Đã ngã».
   */
  private redrawRow(view: FighterView): void {
    const row = view.row;
    if (!row) return;
    row.bg.clear();
    let fill = 0xffffff;
    let fillAlpha = 0.94;
    let stroke = 0xd6d3d1;
    let strokeW = 1;
    if (!view.alive || view.rowState === 'fallen') {
      fillAlpha = 0.55;
    } else if (view.rowState === 'hit') {
      fill = 0xfff7ed;
      stroke = ACCENT;
      strokeW = 2;
    } else if (view.rowState === 'low') {
      fill = 0xfef2f2;
    }
    row.bg.fillStyle(fill, fillAlpha);
    row.bg.fillRoundedRect(0, 0, COLUMN_W, ROW_H, 10);
    row.bg.lineStyle(strokeW, stroke, 0.95);
    row.bg.strokeRoundedRect(0, 0, COLUMN_W, ROW_H, 10);
    row.container.setAlpha(view.alive ? 1 : 0.6);
    // Nhãn trạng thái chữ + màu theo tone HP hiện tại.
    const tone = g1HpTone(view.hp, this.maxHp, view.alive);
    const status = !view.alive ? 'Đã ngã' : view.rowState === 'low' ? 'Sắp ngã' : '';
    row.statusText.setText(status);
    row.statusText.setColor(g1HpTextColor(tone));
    // Tên dài nhường chỗ cho nhãn: rút về tên gọi cuối khi nhãn hiện.
    const wanted =
      status && row.nameText.width > COLUMN_W - 42 - 8 - 58
        ? shortNameOf(view.player.name)
        : row.nameLabel;
    if (row.nameText.text !== wanted) row.nameText.setText(wanted);
  }

  /** Trạng thái hàng suy từ HP/sống chết hiện tại (khi không giữ highlight «hit»). */
  private rowStateFromHp(view: FighterView): 'normal' | 'low' | 'fallen' {
    if (!view.alive) return 'fallen';
    return g1HpTone(view.hp, this.maxHp, view.alive) === 'healthy' ? 'normal' : 'low';
  }

  /**
   * Đánh dấu hàng của người vừa trúng đòn trong ~320 ms (chế độ cột).
   * FIX-V3: tracker đảm bảo ĐÚNG 1 hàng cam — người giữ highlight
   * trước được khôi phục về trạng thái theo HP NGAY khi có đòn mới.
   */
  private flashRow(view: FighterView): void {
    if (!view.row) return;
    const prevId = this.columnHitTracker.claim(view.player.id);
    if (prevId) {
      const prev = this.fighters.get(prevId);
      if (prev && prev.rowState === 'hit') {
        prev.rowState = this.rowStateFromHp(prev);
        this.redrawRow(prev);
      }
    }
    view.rowState = 'hit';
    this.redrawRow(view);
    this.time.delayedCall(320, () => {
      if (!this.scene.isActive()) return;
      if (!this.columnHitTracker.release(view.player.id)) return; // đã bị đòn mới hơn chiếm
      if (view.rowState !== 'hit') return;
      view.rowState = this.rowStateFromHp(view);
      this.redrawRow(view);
    });
  }

  private drawHp(view: FighterView): void {
    const ratio = Phaser.Math.Clamp(view.hp / this.maxHp, 0, 1);
    // FIX-V3 (P1.14): màu thanh + số HP theo TONE ngưỡng thống nhất
    // (g1HpTone: >30% xanh · ≤30% cam · ≤15% đỏ · ngã xám) — áp cho
    // CẢ plate lẫn cột mép, thay quy tắc cũ «>30% xanh, còn lại cam».
    const tone = g1HpTone(view.hp, this.maxHp, view.alive);
    const barColor = g1HpBarColor(tone);
    view.hpBar.clear();
    if (!this.dense) {
      view.hpBar.fillStyle(barColor, 1);
      if (ratio > 0) {
        view.hpBar.fillRoundedRect(view.hpBarX, 5, Math.max(4, view.hpBarW * ratio), 8, 4);
      }
      view.hpText?.setText(`${view.hp}/${this.maxHp}`);
      view.hpText?.setColor(g1HpTextColor(tone));
    }
    if (view.row) {
      view.row.bar.clear();
      view.row.bar.fillStyle(barColor, 1);
      if (ratio > 0) {
        view.row.bar.fillRoundedRect(42, 29, Math.max(3, 94 * ratio), 7, 3);
      }
      view.row.hpText.setText(`${view.hp}/${this.maxHp}`);
      view.row.hpText.setColor(g1HpTextColor(tone));
      if (view.rowState !== 'hit' && view.rowState !== 'fallen') {
        const next = this.rowStateFromHp(view);
        if (next !== view.rowState) {
          view.rowState = next;
          this.redrawRow(view);
        } else if (next === 'low') {
          // Cùng trạng thái 'low' nhưng tone có thể vừa trượt low→critical:
          // vẽ lại để nhãn/màu chữ cập nhật đúng ngưỡng đỏ.
          this.redrawRow(view);
        }
      }
    }
  }

  private drawGhost(view: FighterView): void {
    const ratio = Phaser.Math.Clamp(view.ghostHp / this.maxHp, 0, 1);
    view.ghostBar.clear();
    if (!this.dense && ratio > 0) {
      view.ghostBar.fillStyle(0xfdba74, 1);
      view.ghostBar.fillRoundedRect(view.hpBarX, 5, Math.max(4, view.hpBarW * ratio), 8, 4);
    }
    if (view.row) {
      view.row.ghost.clear();
      if (ratio > 0) {
        view.row.ghost.fillStyle(0xfdba74, 1);
        view.row.ghost.fillRoundedRect(42, 29, Math.max(3, 94 * ratio), 7, 3);
      }
    }
  }

  /**
   * HP luôn lấy đúng `targetHpAfter` của log — hàm này chỉ lo PHẦN DIỄN:
   * thanh chính tụt ngay tới mức của log; ghost giữ mức đang hiển thị rồi
   * rút theo sau ~450 ms. Degrade bậc 2 hoặc tốc độ 'fast' → ghost về tức
   * thì (kỷ luật degrade/tốc độ như các hiệu ứng khác).
   */
  private applyHpFromLog(view: FighterView, hpAfter: number): void {
    const dropped = hpAfter < view.hp;
    const ghostStart = Math.max(view.ghostHp, view.hp);
    view.hp = hpAfter;
    this.drawHp(view);
    view.ghostTween?.destroy();
    view.ghostTween = null;
    if (!dropped) {
      view.ghostHp = hpAfter;
      this.drawGhost(view);
      return;
    }
    if (this.appliedDegrade >= 2 || this.speed === 'fast') {
      view.ghostHp = hpAfter;
      this.drawGhost(view);
      return;
    }
    view.ghostHp = ghostStart;
    this.drawGhost(view);
    const state = { v: ghostStart };
    view.ghostTween = this.tweens.add({
      targets: state,
      v: hpAfter,
      duration: 450,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        view.ghostHp = state.v;
        this.drawGhost(view);
      },
      onComplete: () => {
        view.ghostHp = view.hp;
        view.ghostTween = null;
        this.drawGhost(view);
      },
    });
  }

  /* ---------------------------------------------------------------- */
  /* Vòng chân + sao choáng: neo theo sprite THẬT, sync mỗi frame      */
  /* ---------------------------------------------------------------- */

  /**
   * Điểm chạm đất THẬT của sprite trong toạ độ root: neo container +
   * lệch theo bảng neo của model (g1-fx), đã tính lật/nghiêng/squash
   * và neo ngã khi đã ngã. Đây là nguồn toạ độ duy nhất cho vòng chân
   * và quầng sáng trúng đòn.
   */
  private groundPointOf(view: FighterView): { x: number; y: number } {
    // Neo của ĐÚNG atlas đang dùng (fighter.spriteAnchor): sheet mới
    // dùng bảng đo alpha của sheet mới (g1-set-atlas, quy về thang
    // 192 tương đương), atlas cũ dùng bảng g1-fx — không lẫn nguồn.
    let anchor = view.spriteAnchor;
    // Neo THEO ACTION (FIX-V4 mục 4): thân nhân vật DỊCH TRONG Ô khi
    // chạy/né (knight idle 0,225 → run 0,384 ô) — neo tĩnh theo idle
    // làm vòng rời chân tới ~30px ở frame động. Bảng g1ActionGroundX
    // (đo từ alpha atlas đã ship) ghi đè groundX cho đúng action
    // đang phát; action ngoài bảng giữ neo tĩnh.
    if (view.alive && !view.usingLegacyAtlas) {
      let action = view.currentAction;
      const liveKey = view.body.anims?.currentAnim?.key;
      if (liveKey) {
        const prefix = `aidai-${view.atlasKey}-`;
        if (liveKey.startsWith(prefix)) action = liveKey.slice(prefix.length);
      }
      const gx = g1ActionGroundX(view.setId, view.characterKey, action);
      if (gx !== undefined) anchor = { ...anchor, groundX: gx * 192 };
    }
    const off = g1GroundOffset(anchor, view.displaySize, {
      fallen: !view.alive,
      flipX: view.body.flipX,
      scaleYRatio: view.baseScale > 0 ? view.body.scaleY / view.baseScale : 1,
      angleDeg: view.body.angle,
    });
    return { x: view.container.x + off.x, y: view.container.y + off.y };
  }

  /**
   * Đặt vòng danh tính ôm đúng chân sprite (FIX-V3 P0.3). Chạy mỗi
   * frame trong layoutPlates → nhân vật chạy/lao/giật thế nào vòng
   * cũng đi theo; vòng KHÔNG còn là ellipse «vị trí nhà» đứng yên.
   */
  private syncGroundRing(view: FighterView): void {
    const ground = this.groundPointOf(view);
    view.ring.setPosition(ground.x, ground.y + 2);
    view.ring.setDepth(view.container.depth - 0.5);
    view.ring.setAlpha(view.alive ? 1 : 0.62);
  }

  /**
   * Sao choáng bám ĐÚNG đỉnh đầu sprite của nạn nhân (FIX-V3 P1.14):
   * sao sống ở cấp scene, mỗi frame được đặt lại theo neo đầu thật
   * (g1HeadOffset — đỉnh alpha của model, x theo trọng tâm chân) nên
   * đi cùng nhân vật khi chạy/giật; thân nằm thì sao quanh điểm đất
   * của thân nằm, lệch về phía đầu frame fall.
   */
  private syncDizzyStars(view: FighterView): void {
    const stars = view.dizzyStars;
    if (!stars) return;
    if (view.stunMode === 'fallen' || !view.alive) {
      const ground = this.groundPointOf(view);
      stars.setPosition(ground.x - view.displaySize * 0.3, ground.y - view.displaySize * 0.34);
      return;
    }
    const head = g1HeadOffset(view.spriteAnchor, view.displaySize, view.body.flipX);
    stars.setPosition(view.container.x + head.x, view.container.y + head.y - 4);
  }

  /* ---------------------------------------------------------------- */
  /* Plate: layout chống chồng + leader line, chạy mỗi frame           */
  /* (GIỮ NGUYÊN cơ chế PRES vòng 2; plateH theo từng người để dùng    */
  /*  chung cho plate đầy đủ 44px và thẻ rút gọn 22px.)                */
  /* ---------------------------------------------------------------- */

  /** Kẹp tâm plate sao cho cả hộp plate nằm trong vòng sân (trừ lề). */
  private clampPlateToArena(view: FighterView, x: number, y: number): { x: number; y: number } {
    const dx = x - CENTER_X;
    const dy = y - CENTER_Y;
    const dist = Math.hypot(dx, dy) || 1;
    // Bán kính cho phép: bán kính sân trừ nửa đường chéo plate + lề 6px.
    const allowed = ARENA_RADIUS + 46 - Math.hypot(view.plateW / 2, view.plateH / 2) - 6;
    if (dist <= allowed) return { x, y };
    return { x: CENTER_X + (dx / dist) * allowed, y: CENTER_Y + (dy / dist) * allowed };
  }

  /**
   * Layout pass mỗi frame:
   * - Neo: người đứng = chân + chiều cao sprite + 12; người ngã = trên
   *   thân nằm (thấp hơn hẳn vì sprite ngã nằm ngang trong cùng ô).
   * - TÁCH CHỒNG TRIỆT ĐỂ (FIX-V4 Cụm 1+3): pass thuần
   *   g1SeparatePlates lặp đẩy (ưu tiên dọc) tới khi KHÔNG còn hai
   *   rect nào giao nhau — áp cho cả plate đầy đủ lẫn thẻ rút gọn ở
   *   chế độ ≥6 (cùng một pass). Bản FIX-V3 chỉ lặp 3 vòng rồi KẸP
   *   CỨNG theo neo (TAG_MAX_DRIFT) — chính kẹp đó tái tạo chồng ở
   *   cụm dày (panel v4 frame 20b + clip s-0060/s-0180) nên FIX-V4
   *   bỏ kẹp sau pass: lệch neo xa được leader line xử lý như cũ.
   *   FIX-V4.1: pass chạy qua g1LayoutPlatesCompact — cụm nào ở cỡ
   *   nguyên vẫn còn cặp giao (hình học bị kẹp) thì THU GỌN cả cụm
   *   rồi tách lại, không còn đường nào kết thúc bằng chồng.
   * - Người ngã: neo bị kẹp vào vòng sân TRƯỚC pass → định danh
   *   người ngã luôn NGANG, trong sân, đọc được.
   * - Lệch neo > 20px → leader line mảnh nối plate về đầu nhân vật.
   */
  private layoutPlates(): void {
    if (this.fighters.size === 0) return;
    const views = [...this.fighters.values()];
    // Vòng chân + sao choáng bám sprite trước mọi tính toán plate —
    // chúng là lớp neo thị giác, phải đúng ở MỌI frame (kể cả frame
    // thân đang tween chạy/lao giữa hai tick).
    for (const view of views) {
      this.syncGroundRing(view);
      this.syncDizzyStars(view);
    }
    for (const view of views) {
      view.anchorX = view.container.x;
      view.anchorY =
        view.container.y + (view.alive ? -view.displaySize - 12 : -view.displaySize * 0.5 - 26);
    }
    const ordered = [...views].sort(
      (a, b) => a.anchorY - b.anchorY || a.player.id.localeCompare(b.player.id),
    );
    const start = new Map<string, { x: number; y: number }>();
    for (const view of ordered) {
      let pos = { x: view.anchorX, y: view.anchorY };
      if (!view.alive) pos = this.clampPlateToArena(view, pos.x, pos.y);
      start.set(view.player.id, pos);
    }
    // Chế độ cột: thẻ rút gọn nào đè lên hộp cột mép (quy về thế giới
    // theo camera của frame trước) thì bị đẩy sang phải cột trước
    // pass tách — leader line sẽ nối thẻ về đầu nhân vật.
    if (this.column) {
      const box = this.columnWorldBox();
      for (const view of ordered) {
        const pos = start.get(view.player.id)!;
        const overlaps =
          pos.x + view.plateW / 2 > box.x1 &&
          pos.x - view.plateW / 2 < box.x2 &&
          pos.y + view.plateH / 2 > box.y1 &&
          pos.y - view.plateH / 2 < box.y2;
        if (overlaps) pos.x = box.x2 + view.plateW / 2 + 6;
      }
    }
    // FIX-V4.1: layout có lối thoát THU GỌN — cụm nào pass tách ở cỡ
    // nguyên vẫn còn cặp giao nhau thì cả cụm thu xuống (scale < 1)
    // và tách lại ở kích thước hiệu dụng, thay vì chấp nhận chồng.
    const separated = g1LayoutPlatesCompact(
      ordered.map((view) => {
        const pos = start.get(view.player.id)!;
        return { id: view.player.id, x: pos.x, y: pos.y, w: view.plateW, h: view.plateH };
      }),
      { x1: 6, y1: 6, x2: STAGE_WIDTH - 6, y2: STAGE_HEIGHT - 6 },
      4,
    );
    for (const view of views) {
      const pos = separated.get(view.player.id)!;
      view.plateX = pos.x;
      view.plateY = pos.y;
      view.plateScale = pos.scale;
      view.plate.setScale(pos.scale);
      view.plate.setPosition(pos.x + view.plateShakeX, pos.y);
    }
    // Leader line: 1 Graphics duy nhất, clear + vẽ lại mỗi frame.
    const lg = this.leaderGraphics;
    if (lg) {
      lg.clear();
      lg.lineStyle(1, 0x78716c, 0.55);
      for (const view of views) {
        const dx = view.plateX - view.anchorX;
        const dy = view.plateY - view.anchorY;
        if (Math.hypot(dx, dy) <= LEADER_LINE_THRESHOLD) continue;
        const headX = view.alive ? view.container.x : view.container.x - view.displaySize * 0.28;
        const headY = view.alive
          ? view.container.y - view.displaySize * 0.92
          : view.container.y - view.displaySize * 0.25;
        const edgeY =
          view.plateY +
          (headY > view.plateY
            ? (view.plateH * view.plateScale) / 2
            : -(view.plateH * view.plateScale) / 2);
        lg.lineBetween(view.plateX, edgeY, headX, headY);
      }
    }
    // FIX-V4.2: layout là pass cuối của update/post-update — kết
    // thúc pass ở trạng thái list đã sắp theo depth để mọi lần đọc
    // thứ tự vẽ (và khung vẽ ngay sau, qua PRE_RENDER) đều thấy
    // plate/thẻ/cột nằm trên sprite/FX như thang depth đã khai.
    this.enforceRootLayerOrder();
  }

  /**
   * Hộp plate (đã giải quyết) của mọi người + cột — vùng cấm của floater.
   * FIX-V4.1: dùng kích thước HIỆU DỤNG (đã nhân plateScale) — plate
   * thu gọn chiếm ít chỗ thật hơn hộp danh nghĩa, floater được dùng
   * đúng phần sân đã giải phóng; thẻ rút gọn ≥6 cũng qua đây (plateW/H
   * của thẻ chính là hộp thẻ) nên không còn «thiếu thẻ» như nghi vấn (c).
   */
  private plateBoxes(): G1Rect[] {
    const boxes = [...this.fighters.values()].map((view) => {
      const w = view.plateW * view.plateScale;
      const h = view.plateH * view.plateScale;
      return {
        x1: view.plateX - w / 2,
        y1: view.plateY - h / 2,
        x2: view.plateX + w / 2,
        y2: view.plateY + h / 2,
      };
    });
    // Chế độ cột: cột mép là vùng HUD cố định theo camera — quy về toạ
    // độ thế giới của frame hiện tại để chữ nổi cũng né cả cột.
    if (this.column) boxes.push(this.columnWorldBox());
    return boxes;
  }

  /** Hộp cột mép sân trong toạ độ thế giới theo camera hiện tại. */
  private columnWorldBox(): G1Rect {
    const z = this.camZoom;
    const x1 = this.camCX - STAGE_WIDTH / (2 * z) + COLUMN_X / z;
    const y1 = this.camCY - STAGE_HEIGHT / (2 * z) + COLUMN_TOP / z;
    return {
      x1,
      y1,
      x2: x1 + COLUMN_W / z,
      // + dải chú thích dưới cột: chữ nổi cũng phải né cả chú thích.
      y2: y1 + (this.fighters.size * (ROW_H + ROW_GAP) - ROW_GAP + COLUMN_LEGEND_H) / z,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Camera bám cụm + cột mép bù trừ camera                            */
  /* ---------------------------------------------------------------- */

  /**
   * Mỗi frame: bbox của các fighter CÒN ĐỨNG (cộng đệm thân + plate);
   * zoom = clamp(tỉ lệ vừa bbox, 1.0, 1.35) — zoom NHẸ theo hợp đồng
   * REBUILD-C (bản PRES cũ 1.9 làm vỡ tỉ lệ sprite/plate), tâm = trọng
   * tâm bbox thiên 35% về cặp đang giao đòn khi còn trong hạn, lerp
   * mượt theo delta. Mở màn (chưa chạy tick nào) = toàn cảnh zoom 1.
   * Khi chỉ còn ≤ 1 người đứng hoặc ván đã chốt kết thúc: bbox tính cả
   * người ngã để frame kết ván chứa tất cả.
   * DEGRADE bậc 2: TẮT camera motion — mục tiêu khoá ở toàn cảnh tĩnh
   * (zoom 1, tâm sân) để máy yếu không tốn thêm cho chuyển động khung.
   */
  private updateCamera(delta: number, timeNow: number): void {
    if (this.fighters.size === 0) return;
    const all = [...this.fighters.values()];
    const alive = all.filter((v) => v.alive);
    const started = this.running || this.bucketIndex > 0;
    const endFocus = this.endScheduled || alive.length <= 1;
    let targetZoom = 1;
    let targetCX = CENTER_X;
    let targetCY = CENTER_Y;
    // FIX-V3 (P0.2): chế độ đông GIỮ camera tĩnh toàn cảnh — sân đã
    // dịch/thu vào vùng chơi sau gutter (create) nên khung tĩnh này
    // đảm bảo cột không bao giờ trùm lên sprite/vòng/plate khi camera
    // pan/zoom như chế độ thường.
    if (started && this.appliedDegrade < 2 && !this.dense) {
      const focus = endFocus ? all : alive.length > 0 ? alive : all;
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const view of focus) {
        const anchorY =
          view.container.y + (view.alive ? -view.displaySize - 12 : -view.displaySize * 0.5 - 26);
        minX = Math.min(
          minX,
          view.container.x - view.displaySize / 2,
          view.container.x - view.plateW / 2,
        );
        maxX = Math.max(
          maxX,
          view.container.x + view.displaySize / 2,
          view.container.x + view.plateW / 2,
        );
        minY = Math.min(minY, view.container.y - view.displaySize, anchorY - view.plateH / 2);
        maxY = Math.max(maxY, view.container.y + 12, anchorY + view.plateH / 2);
      }
      const pad = 30;
      const bw = maxX - minX + pad * 2;
      const bh = maxY - minY + pad * 2;
      targetZoom = Phaser.Math.Clamp(Math.min(STAGE_WIDTH / bw, STAGE_HEIGHT / bh), 1.0, 1.35);
      targetCX = (minX + maxX) / 2;
      targetCY = (minY + maxY) / 2;
      // Thiên về hành động: cặp giao đòn gần nhất còn trong hạn 700 ms
      // kéo trọng tâm khung về phía chúng (đòn luôn ở giữa khung đọc).
      if (!endFocus && this.lastActionFocus && timeNow < this.lastActionFocus.until) {
        targetCX = targetCX * 0.65 + this.lastActionFocus.x * 0.35;
        targetCY = targetCY * 0.65 + this.lastActionFocus.y * 0.35;
      }
      // Kẹp tâm để khung zoom không lộ ra ngoài sân khấu.
      const halfW = STAGE_WIDTH / (2 * targetZoom);
      const halfH = STAGE_HEIGHT / (2 * targetZoom);
      targetCX = Phaser.Math.Clamp(targetCX, halfW, STAGE_WIDTH - halfW);
      targetCY = Phaser.Math.Clamp(targetCY, halfH, STAGE_HEIGHT - halfH);
      // FIX-UX-GAME (F9, chơi thử live mobile 2026-10-25): kẹp tâm THÊM
      // theo chính bbox trọng tâm — độ thiên về cặp giao đòn ở trên
      // KHÔNG được đẩy bất kỳ fighter nào trong bbox ra khỏi khung.
      // Trước đây tâm lệch tới 35% về điểm giao đòn trong khi khung ở
      // zoom 1.35 chỉ dư ~30px mỗi phía so với bbox → plate + nhân vật
      // ở phía đối diện (đỉnh sân) bị cắt mất nửa trên mobile, và frame
      // kết ván chụp ở M7 cũng cắt theo. Nay: tâm sau khi thiên bị kẹp
      // vào khoảng mà TOÀN BỘ bbox + đệm vẫn nằm trong khung; khoảng
      // rỗng (bbox to hơn khung) thì giữ tâm bbox.
      const loX = maxX + pad - halfW;
      const hiX = minX - pad + halfW;
      if (loX <= hiX) targetCX = Phaser.Math.Clamp(targetCX, loX, hiX);
      const loY = maxY + pad - halfH;
      const hiY = minY - pad + halfH;
      if (loY <= hiY) targetCY = Phaser.Math.Clamp(targetCY, loY, hiY);
    }
    // FIX-UX-GAME (F9): khi ván chốt kết thúc (endFocus), camera hội tụ
    // NHANH hơn hẳn về toàn cảnh — frame cuối được chụp ngay lúc sự
    // kiện FINISHED phát ra, lerp chậm như giữa ván làm ảnh kết ván ở
    // M7 vẫn còn zoom/cắt như ảnh chơi thử live.
    const endFocusNow = this.endScheduled || alive.length <= 1;
    const k = Math.min(1, delta * (endFocusNow && started ? 0.012 : 0.004));
    this.camZoom += (targetZoom - this.camZoom) * k;
    this.camCX += (targetCX - this.camCX) * k;
    this.camCY += (targetCY - this.camCY) * k;
    if (timeNow < this.camHoldUntil) return; // đang rung chí mạng — giữ khung
    this.cameras.main.setZoom(this.camZoom);
    this.cameras.main.centerOn(this.camCX * this.rootScale, this.camCY * this.rootScale);
  }

  /**
   * Cột mép sân là HUD cố định theo MÀN HÌNH nhưng sống trong root (thế
   * giới): mỗi frame đặt lại vị trí theo góc trên-trái của khung camera
   * hiện tại + scale nghịch zoom → cột đứng yên ở mép trái, kích thước
   * không đổi bất kể camera pan/zoom.
   */
  private layoutColumn(): void {
    if (!this.column) return;
    const z = this.camZoom;
    this.column.setScale(1 / z);
    this.column.setPosition(
      this.camCX - STAGE_WIDTH / (2 * z) + COLUMN_X / z,
      this.camCY - STAGE_HEIGHT / (2 * z) + COLUMN_TOP / z,
    );
  }

  /* ---------------------------------------------------------------- */
  /* Chip tiến trình «Còn X người đứng» (FIX-V3 P1.9)                  */
  /* ---------------------------------------------------------------- */

  /** Dựng chip: pill trắng mờ + chữ đậm, neo giữa-trên sân. */
  private buildAliveChip(): void {
    const container = this.add.container(0, 0).setDepth(CHIP_DEPTH);
    const bg = this.add.graphics();
    const text = this.add
      .text(0, 0, '', {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: INK,
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    this.root.add(container);
    this.aliveChip = { container, bg, text };
    this.updateAliveChip();
    this.layoutChip();
  }

  /** Cập nhật số người còn đứng — gọi khi dựng scene và NGAY khi có người ngã (playFall). */
  private updateAliveChip(): void {
    if (!this.aliveChip) return;
    const alive = [...this.fighters.values()].filter((v) => v.alive).length;
    const label = `Còn ${alive} người đứng`;
    if (this.aliveChip.text.text !== label) this.aliveChip.text.setText(label);
    const w = Math.ceil(this.aliveChip.text.width) + 28;
    const h = 30;
    this.aliveChip.bg.clear();
    this.aliveChip.bg.fillStyle(0xffffff, 0.94);
    this.aliveChip.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 15);
    this.aliveChip.bg.lineStyle(1, 0xd6d3d1, 0.9);
    this.aliveChip.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 15);
  }

  /** Chip là HUD cố định theo MÀN HÌNH (góc trên, giữa sân) — bù trừ camera mỗi frame như cột mép. */
  private layoutChip(): void {
    if (!this.aliveChip) return;
    const z = this.camZoom;
    this.aliveChip.container.setScale(1 / z);
    this.aliveChip.container.setPosition(
      this.camCX - STAGE_WIDTH / (2 * z) + STAGE_WIDTH / (2 * z),
      this.camCY - STAGE_HEIGHT / (2 * z) + (CHIP_TOP + 15) / z,
    );
  }

  /** Gom event log thành các «thùng tick» theo đúng thứ tự log. */
  private groupEvents(events: GameEvent[]): TickBucket[] {
    const byTick = new Map<number, TickBucket>();
    for (const event of events) {
      if (event.type === 'spin') continue; // G1 không có spin; bỏ qua an toàn.
      let bucket = byTick.get(event.tick);
      if (!bucket) {
        bucket = { tick: event.tick, attacks: [], falls: [], phases: [] };
        byTick.set(event.tick, bucket);
      }
      if (event.type === 'attack') bucket.attacks.push(event);
      else if (event.type === 'fall') bucket.falls.push(event.playerId);
      else if (event.type === 'phase' && event.phase !== 'main') bucket.phases.push(event.phase);
    }
    return [...byTick.values()].sort((a, b) => a.tick - b.tick);
  }

  /** Thời lượng một tick theo tốc độ hiện tại; 'fast' rút gọn toàn ván ≤ ~5 s. */
  private tickDurationMs(): number {
    if (this.speed === 'fast') {
      const totalTicks = Math.max(1, this.buckets.length);
      return Phaser.Math.Clamp(Math.floor(4800 / totalTicks), 30, 140);
    }
    return TICK_MS / this.speed;
  }

  update(time: number, delta: number): void {
    this.feedDegrade(delta);
    // THỨ TỰ FRAME (FIX-V4 — sửa nguyên nhân gốc vòng chân desktop):
    // xử lý TICK trước (processBucket đổi flip/vị trí người đánh qua
    // playAttack), layout plate/vòng SAU. Bản cũ layout TRƯỚC tick
    // nên flip đổi trong tick làm vòng chân «đóng băng» sai phía suốt
    // cả frame render kế — máy 60fps thật chỉ lệch 16 ms, nhưng ở
    // môi trường chụp/headless (layout cách nhau ~280 ms đo được)
    // nó thành ảnh tĩnh vòng rời sprite (panel v4 frame 26b).
    // HIT-STOP: đang đóng băng thì bộ đếm tick KHÔNG tích luỹ —
    // đồng hồ giao tranh đứng yên 90 ms mỗi đòn trúng (không cộng
    // dồn quá 120 ms, luật ở G1HitStopClock).
    if (this.running && !this.endScheduled) {
      if (!this.hitStop.frozen(time)) this.tickTimerMs += delta;
      const tickMs = this.tickDurationMs();
      if (this.tickTimerMs >= tickMs) {
        this.tickTimerMs = 0;
        if (this.bucketIndex >= this.buckets.length) {
          this.scheduleEnd();
        } else {
          const bucket = this.buckets[this.bucketIndex];
          this.bucketIndex += 1;
          this.processBucket(bucket, tickMs);
          EventBus.emit(STAGE_EVENTS.PROGRESS, {
            ratio: this.buckets.length > 0 ? this.bucketIndex / this.buckets.length : 1,
          } satisfies StageProgressPayload);
          if (this.bucketIndex >= this.buckets.length) {
            this.scheduleEnd();
          }
        }
      }
    }
    // Plate + camera chạy MỖI frame, kể cả khi tick chưa chạy / ván đã
    // chốt — thân còn tween (lao đòn, ngã) thì plate và khung phải bám theo.
    // FIX-V4.1: ngay sau layout, floater đang sống được kiểm lại với
    // rect plate CỦA FRAME NÀY (evadeFloaters) — plate đã thắng từ
    // vòng vá này, floater phải trượt né hoặc mờ sớm. Cả hai pass còn
    // chạy lại ở POST_UPDATE (sau tween vị trí) — xem onPostUpdate.
    this.layoutPlates();
    this.evadeFloaters();
    this.pumpFloaters();
    this.updateCamera(delta, time);
    this.layoutColumn();
    this.layoutChip();
  }

  private processBucket(bucket: TickBucket, tickMs: number): void {
    for (const phase of bucket.phases) {
      this.showPhaseBanner(phase);
      if (!this.muted) this.boot.sound?.phase?.();
    }
    for (const attack of bucket.attacks) {
      this.playAttack(attack, tickMs);
    }
    // Ngã áp dụng ở CUỐI tick (đúng định nghĩa «cùng tick» của engine):
    // các đòn trong tick diễn trước, ngã diễn ở nửa sau của tick.
    if (bucket.falls.length > 0) {
      this.time.delayedCall(Math.floor(tickMs * 0.55), () => {
        for (const playerId of bucket.falls) this.playFall(playerId);
      });
    }
  }

  /**
   * Biên đạo ra đòn (FIX-V3 N1 — «animation phải SỐNG»): nhân vật
   * KHÔNG còn đứng tại ô nhà vung tay từ xa. Chuỗi diễn trong 1 tick:
   *   1. ANTICIPATION (~12% tick): cúi người lấy đà (scaleY 0.92) +
   *      lùi nhẹ 10px NGƯỢC hướng mục tiêu.
   *   2. CHẠY ÁP SÁT (~34% tick): clip `run` (fallback idle — playRun)
   *      + container chạy tới điểm dừng cách tâm mục tiêu ~118px.
   *   3. RA ĐÒN tại cự ly gần (punch/kick như cũ) + FOLLOW-THROUGH:
   *      thân vượt đà thêm 14px về phía mục tiêu rồi thu về điểm dừng,
   *      nghiêng thân ±9° rồi trả 0.
   *   4. CHẠY VỀ (~30% tick, bắt đầu ~16% tick sau khi đòn chạm):
   *      clip `run` hướng về ô nhà, tới nơi trả flip + idle.
   * Tổng chuỗi ≈ 92% tick — đòn sau không bị chuỗi trước nuốt. Mọi
   * pha đều qua moveToken: người đánh ngã giữa đường (playFall tăng
   * token + kill tween) thì chuỗi tự huỷ. Kết quả/thứ tự đòn KHÔNG
   * đổi — hiệu ứng + HP vẫn áp đúng tại thời điểm đòn chạm (cuối pha
   * chạy áp sát ≈ 46% tick, trước mốc ngã 55% của bucket).
   * Vòng chân/plate/sao choáng bám theo suốt chuỗi nhờ sync mỗi frame
   * trong layoutPlates (FIX-V3 N1d).
   */
  private playAttack(attack: AttackEvent, tickMs: number): void {
    const attacker = this.fighters.get(attack.attackerId);
    const target = this.fighters.get(attack.targetId);
    if (!attacker || !target || !attacker.alive) return;
    const fast = this.speed === 'fast';

    // Điểm dừng áp sát: cách tâm mục tiêu ~118px theo hướng
    // home→target (sprite hiển thị 150–190px nhưng thân profile trong
    // ô hẹp hơn nhiều — dừng 118px thì nắm đấm/chân vươn tới mục tiêu
    // mà hai thân không nuốt nhau; kẹp không vượt qua mục tiêu).
    const dx = target.container.x - attacker.homeX;
    const dy = target.container.y - attacker.homeY;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const travel = Math.max(0, dist - 118);
    const stopX = attacker.homeX + ux * travel;
    const stopY = attacker.homeY + uy * travel;
    // Camera ghi nhớ cặp giao đòn này để thiên khung về hành động.
    this.lastActionFocus = {
      x: (attacker.homeX + target.homeX) / 2,
      y: (attacker.homeY + target.homeY) / 2 - attacker.displaySize * 0.4,
      until: this.time.now + 700,
    };
    if (fast) {
      this.time.delayedCall(10, () => {
        if (!this.scene.isActive()) return;
        this.applyAttackEffect(attack, attacker, target, fast);
        this.applyHpFromLog(target, attack.targetHpAfter);
      });
      return;
    }

    const moveToken = ++attacker.moveToken;
    const stillMine = () =>
      this.scene.isActive() && attacker.alive && attacker.moveToken === moveToken;
    const antiMs = Math.max(30, Math.floor(tickMs * 0.12));
    const runMs = Math.max(60, Math.floor(tickMs * 0.34));
    const ftMs = Math.max(40, Math.floor(tickMs * 0.14));
    const backMs = Math.max(60, Math.floor(tickMs * 0.3));
    const arriveMs = antiMs + runMs;
    const flip = dx < 0;

    // 1) Anticipation: cúi lấy đà + lùi nhẹ ngược hướng mục tiêu.
    attacker.body.setFlipX(flip);
    // Đổi flip → sync vòng chân NGAY trong cùng nhịp (FIX-V4 mục 4).
    this.syncGroundRing(attacker);
    this.tweens.add({
      targets: attacker.body,
      scaleY: attacker.baseScale * 0.92,
      duration: antiMs,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: attacker.container,
      x: attacker.homeX - ux * 10,
      y: attacker.homeY - uy * 10,
      duration: antiMs,
      ease: 'Quad.easeOut',
    });

    // 2) Chạy áp sát bằng clip run (fallback idle), thân hết cúi khi chạy.
    this.time.delayedCall(antiMs, () => {
      if (!stillMine()) return;
      // Tốc độ chạy THẬT (quãng chạy + lùi đà) / thời gian chạy — đầu
      // vào cho nhịp clip run tỉ lệ vận tốc (FIX-V4 mục 5).
      this.playRun(attacker, flip, (travel + 10) / Math.max(1, runMs));
      this.tweens.add({
        targets: attacker.body,
        scaleY: attacker.baseScale,
        duration: Math.min(120, runMs),
        ease: 'Quad.easeOut',
      });
      this.tweens.add({
        targets: attacker.container,
        x: stopX,
        y: stopY,
        duration: runMs,
        ease: 'Quad.easeInOut',
      });
    });

    // 3) Đòn chạm ở cuối pha chạy: tư thế đòn + follow-through vượt đà.
    this.time.delayedCall(arriveMs, () => {
      if (!this.scene.isActive()) return;
      if (attacker.alive) {
        // Tư thế ra đòn theo loại đòn của log: 'da' = kick; 'dam' =
        // punchA/punchB LUÂN PHIÊN theo chính người đánh.
        const action: G1Action =
          attack.attack === 'da' ? 'kick' : attacker.punchCount++ % 2 === 0 ? 'punchA' : 'punchB';
        attacker.body.setFlipX(flip);
        this.syncGroundRing(attacker);
        // Hết chạy: huỷ tween nghiêng thân của playRun — follow-through
        // dưới đây là chủ duy nhất của góc thân từ đây.
        attacker.leanTween?.destroy();
        attacker.leanTween = null;
        this.playAction(attacker, action, 'atk');
        this.tweens.add({
          targets: attacker.body,
          angle: flip ? -9 : 9,
          duration: Math.max(40, Math.floor(ftMs * 0.6)),
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: attacker.body,
              angle: 0,
              duration: 120,
              ease: 'Quad.easeOut',
            });
          },
        });
        // Follow-through: thân vượt thêm 14px về phía mục tiêu rồi thu về.
        this.tweens.add({
          targets: attacker.container,
          x: stopX + ux * 14,
          y: stopY + uy * 14,
          duration: ftMs,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
      this.applyAttackEffect(attack, attacker, target, fast);
      // HP giảm ĐÚNG targetHpAfter của log — không tự tính sát thương.
      this.applyHpFromLog(target, attack.targetHpAfter);
    });

    // 4) Chạy về ô nhà sau khi đòn đã đọc xong một nhịp.
    this.time.delayedCall(arriveMs + Math.floor(tickMs * 0.16), () => {
      if (!stillMine()) return;
      this.tweens.killTweensOf(attacker.container);
      const backDist = Math.hypot(
        attacker.homeX - attacker.container.x,
        attacker.homeY - attacker.container.y,
      );
      this.playRun(attacker, attacker.homeX < attacker.container.x, backDist / Math.max(1, backMs));
      this.tweens.add({
        targets: attacker.container,
        x: attacker.homeX,
        y: attacker.homeY,
        duration: backMs,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          if (!stillMine()) return;
          attacker.body.setFlipX(false);
          this.playIdle(attacker);
        },
      });
    });
  }

  private applyAttackEffect(
    attack: AttackEvent,
    attacker: FighterView,
    target: FighterView,
    fast: boolean,
  ): void {
    const { x, y } = target.container;
    const ds = target.displaySize;
    // Chữ nổi: neo tại THÂN nạn nhân, vị trí hiển thị do
    // G1FloaterDirector chốt (trần 2 toàn sân + né plate tuyệt đối —
    // xem floatText/damageText). FIX-V4 thay cơ chế FIX-V3.
    if (attack.outcome === 'dodge') {
      this.floatText('NÉ!', '#7dd3fc', target);
      if (!fast) {
        // Né: sprite lùi/ngả bằng anim dodge + thân lách ra xa người đánh.
        // Mặt quay về phía người đánh (người đánh ở phải → lật).
        target.body.setFlipX(attacker.container.x > target.container.x);
        this.syncGroundRing(target);
        this.playAction(target, 'dodge', 'react');
      }
      const awayDir = target.homeX >= attacker.homeX ? 1 : -1;
      this.tweens.add({
        targets: target.container,
        x: target.homeX + 14 * awayDir,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
      if (!this.muted) this.boot.sound?.dodge?.();
      return;
    }
    if (attack.outcome === 'miss') {
      this.floatText('HỤT!', '#e7e5e4', target);
      if (!this.muted) this.boot.sound?.miss?.();
      return;
    }
    // hit / crit.
    const crit = attack.outcome === 'crit';
    this.floatText(crit ? 'CHÍ MẠNG!' : 'BỐP!', crit ? '#fca5a5' : '#ffffff', target);
    // Số sát thương của log bật tại điểm trúng — cảnh đánh nhau phải đọc
    // được cả trên ảnh tĩnh (số + tư thế + tia sao cùng một khung hình).
    this.damageText(attack.damage, crit, target);
    this.flashRow(target);
    // HIT-STOP (FIX-V4): đòn trúng đóng băng đồng hồ giao tranh 90 ms
    // (update() ngừng tích luỹ tick) — «khựng» đọc được ở cỡ sprite.
    if (!fast) this.hitStop.request(this.time.now);
    const hitPointY = y - ds * 0.55;
    if (!fast && this.appliedDegrade === 0) {
      // FIX-V4.1: tia lửa cũng phải né plate — điểm trúng nằm SÂU trong
      // hộp plate (cụm dày, plate bị tách xuống sát thân) thì không nổ
      // hạt từ trong plate ra; tia sao được kiểm TỪNG tia ở spawnHitStars.
      const hitInsidePlate = this.plateBoxes().some((b) =>
        g1RectsOverlap({ x1: x - 2, y1: hitPointY - 2, x2: x + 2, y2: hitPointY + 2 }, b, 10),
      );
      if (!hitInsidePlate) this.sparkEmitter?.explode(crit ? 14 : 8, x, hitPointY);
      // Tia sao NHỎ tại điểm trúng thay shockwave (FIX-V4 — shockwave
      // nở to màu danh tính đọc như vòng debug, đã XOÁ hẳn).
      this.spawnHitStars(x, hitPointY, crit);
      if (crit) {
        this.camHoldUntil = this.time.now + 160;
        this.cameras.main.shake(140, 0.005);
      }
    } else if (!fast && this.appliedDegrade === 1) {
      const hitInsidePlate = this.plateBoxes().some((b) =>
        g1RectsOverlap({ x1: x - 2, y1: hitPointY - 2, x2: x + 2, y2: hitPointY + 2 }, b, 10),
      );
      if (!hitInsidePlate) this.sparkEmitter?.explode(4, x, hitPointY);
    }
    if (!fast) {
      // Trúng đòn: hitA/hitB luân phiên theo chính người trúng (bộ
      // blocky dùng đúng cặp clip hitA/hitB đã map trong atlas của
      // nó), mặt quay về phía người đánh (sprite gốc mặt phải; người
      // đánh ở trái → không lật, ở phải → lật).
      target.body.setFlipX(attacker.container.x > target.container.x);
      this.syncGroundRing(target);
      const hitAction: G1Action = target.hitCount++ % 2 === 0 ? 'hitA' : 'hitB';
      this.playAction(target, hitAction, 'react');
      // Squash nhẹ khi trúng đòn (scaleY về 88% base rồi đàn hồi lại) —
      // tính theo baseScale vì sprite đã scale từ ô nguồn xuống cỡ hiển thị.
      // Plate rung ~60 ms qua plateShakeX — layout pass cộng lệch này.
      this.tweens.add({
        targets: target.body,
        scaleY: target.baseScale * 0.88,
        duration: 60,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: target.body,
            scaleY: target.baseScale,
            duration: 180,
            ease: 'Back.easeOut',
          });
        },
      });
      this.tweens.add({
        targets: target,
        plateShakeX: 2,
        duration: 30,
        yoyo: true,
        ease: 'Linear',
        onComplete: () => {
          target.plateShakeX = 0;
        },
      });
    }
    // Giật lùi khi trúng đòn (giữ như cũ).
    const awayX = target.homeX + (target.homeX - this.homeCX) * 0.03;
    const awayY = target.homeY + (target.homeY - this.homeCY) * 0.03;
    this.tweens.add({
      targets: target.container,
      x: awayX,
      y: awayY,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    // Flash trúng đòn (FIX-V3 P0.1 — XOÁ hẳn flash trắng xoá toàn
    // thân của v3, ở cả live lẫn replay vì dùng chung scene này):
    // tint pha ≤40% từ màu DANH TÍNH của nạn nhân về tông ấm — model
    // vẫn giữ màu/chi tiết, không thành «bóng ma trắng». flashToken
    // chống đua: đòn sau ghi đè lịch trả tint của đòn trước. Hết
    // flash trả ĐÚNG tint danh tính nền.
    // FIX-V4.1 (LỖI 2): quầng ellipse viền danh tính (spawnHitGlow cũ)
    // ĐÃ BỎ HẲN — 3 đòn đồng thời = 3 vòng màu chồng nhau đọc đúng
    // như «vòng debug» mà panel v4 đã phê (pack v5 multihit f-013 xác
    // nhận lại). Phản hồi trúng đòn còn lại đã đủ: tia sao tại điểm
    // trúng + flash ≤40% + knockback + hit-stop 90 ms.
    const flashToken = ++target.flashToken;
    target.body.setTint(g1HitFlashColor(target.player.colorHex, crit));
    this.time.delayedCall(120, () => {
      if (!this.scene.isActive() || target.flashToken !== flashToken) return;
      target.body.clearTint();
      target.body.setTint(target.tintColor);
    });
    if (crit || attack.damage >= 16) {
      this.showStun(target);
    }
    if (!this.muted) this.boot.sound?.hit?.(crit);
  }

  /**
   * Choáng: sao quay quanh đầu sprite trong chốc lát. FIX-V3 (P1.14):
   * sao là con của ROOT (không còn con của container thân) và được
   * syncDizzyStars() đặt MỖI FRAME theo đỉnh đầu THẬT của sprite nạn
   * nhân (bảng neo alpha ở g1-fx) — nhân vật chạy/giật thế nào sao
   * cũng ở đúng đầu người đó, không trôi sang người khác/xác khác.
   */
  private showStun(view: FighterView): void {
    if (view.dizzyStars) view.dizzyStars.destroy();
    const stars = this.add.container(0, 0).setDepth(58);
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(0, 0, 'aidai-spark').setScale(0.55);
      const a = (i / 3) * Math.PI * 2;
      star.setPosition(Math.cos(a) * 16, Math.sin(a) * 5);
      stars.add(star);
    }
    this.root.add(stars);
    view.dizzyStars = stars;
    view.stunMode = 'hit';
    this.syncDizzyStars(view);
    this.tweens.add({ targets: stars, angle: 360, duration: 700, ease: 'Linear' });

    this.time.delayedCall(650, () => {
      if (!this.scene.isActive()) return;
      stars.destroy();
      if (view.dizzyStars === stars) {
        view.dizzyStars = null;
        view.stunMode = null;
      }
    });
  }

  /**
   * Ngã: phát anim fall 1 lần rồi GIỮ frame cuối (anim repeat 0 tự dừng
   * ở frame cuối; chế độ 'fast' nhảy thẳng tới frame cuối). Container
   * giữ nguyên góc 0 và neo chân — sprite ngã nằm ngang ngay trong ô,
   * đầu gắn liền thân theo bản render. Plate/thẻ ở cấp scene tự giữ
   * ngang, bị layout pass kẹp vào vòng sân + leader line khi bị kéo
   * vào; hàng cột chuyển trạng thái «đã ngã». Sao choáng quay chậm
   * quanh đầu của thân nằm; bụi đất bắn tại điểm chân chạm đất.
   */
  private playFall(playerId: string): void {
    const view = this.fighters.get(playerId);
    if (!view || !view.alive) return;
    view.alive = false;
    view.hp = 0;
    view.ghostHp = 0;
    view.ghostTween?.destroy();
    view.ghostTween = null;
    view.rowState = 'fallen';
    this.redrawRow(view);
    this.drawHp(view);
    this.drawGhost(view);
    // Chip tiến trình cập nhật NGAY khi có người ngã (FIX-V3 P1.9).
    this.updateAliveChip();
    // Đã ngã: huỷ mọi lịch trả idle + trả sprite về transform trung
    // tính trước khi phát fall (đòn đang diễn dở không để lại góc /
    // lật / scale lạ). Token tăng cả hai vai để delayedCall cũ tự huỷ;
    // moveToken tăng → chuỗi chạy áp sát/chạy về (N1) huỷ giữa đường.
    view.atkToken += 1;
    view.reactToken += 1;
    view.moveToken += 1;
    view.flashToken += 1;
    this.tweens.killTweensOf(view.body);
    view.leanTween = null;
    if (view.dizzyStars) {
      view.dizzyStars.destroy();
      view.dizzyStars = null;
    }
    view.body.setFlipX(false);
    view.body.setAngle(0);
    view.body.setScale(view.baseScale, view.baseScale);
    // Hết bob idle: thân nằm phải chạm đất đúng neo ngã.
    view.body.setY(0);
    view.body.clearTint();
    // KHỬ BÃO HOÀ người ngã (FIX-V4 mục 6): tint xám ~0xBFBFBF để
    // mảng màu gốc của model (vd áo choàng HỒNG/ĐỎ của mage — panel
    // v4 đọc như vệt máu) chết màu theo thân; danh tính vẫn còn ở
    // vòng chân + plate/cột.
    view.body.setTint(G1_FALLEN_TINT);
    if (this.speed === 'fast' || !this.textures.exists(view.atlasKey)) {
      view.body.anims.stop();
      if (this.textures.exists(view.atlasKey)) view.body.setFrame(this.lastFrameName(view, 'fall'));
    } else {
      view.body.anims.timeScale = this.animTimeScale();
      view.currentAction = 'fall';
      view.body.play(animKeyOf(view.atlasKey, 'fall'), true);
    }
    // Vòng danh tính nới rộng theo thân nằm — người ngã vẫn nhận ra ngay.
    // Dừng nhịp co giãn bob của vòng trước khi đổi cỡ (FIX-V4 mục 5).
    this.tweens.killTweensOf(view.ring);
    view.ring.setDisplaySize(view.displaySize * 0.8, 20);
    view.plateShakeX = 0;
    this.tweens.killTweensOf(view.container);
    view.container.setAngle(0);
    view.container.setPosition(view.homeX, view.homeY);
    this.tweens.add({
      targets: view.container,
      y: view.homeY + 6,
      alpha: 0.62,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (!this.scene.isActive()) return;
        // Thân chạm đất: bắn cụm bụi TẠI CHÂN sprite (bậc 1 giảm hạt,
        // bậc 2/'fast' tắt) + nảy nhẹ một nhịp rồi nằm yên.
        if (this.speed !== 'fast' && this.appliedDegrade === 0) {
          this.dustEmitter?.explode(10, view.homeX, view.homeY + 4);
        } else if (this.speed !== 'fast' && this.appliedDegrade === 1) {
          this.dustEmitter?.explode(5, view.homeX, view.homeY + 4);
        }
        this.tweens.add({
          targets: view.container,
          y: view.homeY + 2,
          duration: 80,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      },
    });
    // Sao choáng quanh ĐẦU của thân nằm: cấp scene như sao trúng đòn,
    // syncDizzyStars() (chế độ 'fallen') đặt theo điểm đất của frame
    // fall mỗi frame — neo đo từ atlas, không đoán theo ô sprite.
    // FIX-V4 (mục 6): sao TO HƠN bản trúng đòn (0,9 thay 0,55, quỹ
    // đạo rộng 22px) + thêm ký tự «Z» bay lên LẶP trên đầu — tín
    // hiệu «đã gục» đọc ngay ở cỡ sprite thật. Container KHÔNG quay
    // nữa để các chữ «Z» bay thẳng lên thay vì bị cuốn vòng tròn.
    const stars = this.add.container(0, 0).setDepth(58);
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(0, 0, 'aidai-spark').setScale(0.9);
      const a = (i / 3) * Math.PI * 2;
      star.setPosition(Math.cos(a) * 22, Math.sin(a) * 7);
      stars.add(star);
    }
    for (let i = 0; i < 3; i++) {
      const z = this.add
        .text(8 + i * 10, -16 - i * 5, 'Z', {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: `${13 + i * 3}px`,
          fontStyle: 'bold',
          color: '#78716c',
        })
        .setOrigin(0.5)
        .setAlpha(0.9);
      stars.add(z);
      this.tweens.add({
        targets: z,
        y: z.y - 16,
        alpha: 0,
        duration: 1300,
        delay: i * 430,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }
    this.root.add(stars);
    view.dizzyStars = stars;
    view.stunMode = 'fallen';
    this.syncDizzyStars(view);
    if (!this.muted) this.boot.sound?.fall?.();
  }

  /** Tuyên bố luật đúng nguyên văn SPEC §8.5 khi vào đột tử / ván phụ. */
  private showPhaseBanner(phase: 'sudden' | 'sub'): void {
    if (this.banner) this.banner.destroy();
    const text =
      phase === 'sudden'
        ? 'Hiệp phụ đột tử — ai trúng đòn đầu tiên sẽ ngã'
        : 'HOÀ — ván phụ: ai trúng đòn đầu tiên sẽ ngã';
    const banner = this.add
      .text(CENTER_X, CENTER_Y, text, {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: INK,
        backgroundColor: '#ffffff',
        padding: { x: 16, y: 10 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(80);
    this.root.add(banner);
    this.banner = banner;
    this.tweens.add({
      targets: banner,
      alpha: 0,
      delay: 2100,
      duration: 400,
      onComplete: () => banner.destroy(),
    });
  }

  /** Rect sân khấu (lề 8px) cho luật vị trí floater. */
  private floaterStageRect(): G1Rect {
    return { x1: 8, y1: 8, x2: STAGE_WIDTH - 8, y2: STAGE_HEIGHT - 8 };
  }

  /** Neo spawn floater của một nạn nhân, tính từ vị trí thân HIỆN TẠI của họ. */
  private floaterAnchorsOf(view: FighterView): G1FloaterAnchors {
    const { x, y } = view.container;
    const ds = view.displaySize;
    return {
      event: { x, y: y - ds * 0.62 },
      damage: { x, y: y - ds * 0.35 },
    };
  }

  /**
   * Chữ sự kiện («BỘP!» / «CHÍ MẠNG!» / «NÉ!» / «HỤT!») — FIX-V4:
   * nộp cho G1FloaterDirector (TRẦN 2 toàn sân, né plate tuyệt đối,
   * vượt trần → hàng đợi FIFO). Director bảo 'show' mới sinh Text —
   * tại vị trí director đã chốt (không bao giờ trong vùng plate/cột).
   * Style giữ như FIX-V3: NỀN TỐI MỜ (rgba(28,25,23,0.72)) + chữ
   * sáng; depth 50 < plate 60 < cột 70.
   */
  private floatText(content: string, color: string, target: FighterView): void {
    const entry: G1FloaterEntry = {
      targetId: target.player.id,
      kind: 'event',
      content,
      color,
      damage: 0,
      crit: false,
      w: Math.round(30 + content.length * 12.5),
      h: 36,
      enqueuedAt: this.time.now,
    };
    const decision = this.floaterDirector.submit(
      entry,
      this.time.now,
      this.plateBoxes(),
      this.floaterAnchorsOf(target),
      this.floaterStageRect(),
    );
    if (decision.type === 'show') this.spawnEventFloater(decision.show);
  }

  private spawnEventFloater(show: G1FloaterShow): void {
    const text = this.add
      .text(show.x, show.y, show.entry.content, {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: show.entry.color,
        backgroundColor: 'rgba(28,25,23,0.72)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(FLOATER_DEPTH);
    this.root.add(text);
    // FIX-V4.1: đăng ký vào sổ né liên tục — từ đây evadeFloaters()
    // canh floater này với rect plate của TỪNG frame tới hết đời nó.
    this.activeFloaters.set(show.id, {
      text,
      kind: 'event',
      targetId: show.entry.targetId,
      bornAt: this.time.now,
      lifeMs: 620,
      risePx: 26,
      fading: false,
    });
    this.tweens.add({
      targets: text,
      y: show.y - 26,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishFloater(show.id),
    });
  }

  /**
   * Số sát thương «−{damage}»: pop scale 0.6→1.15→1, bay lên mờ dần
   * ~700 ms; chữ TRẮNG viền tối dày (đỏ nhạt khi chí mạng). FIX-V4:
   * đi qua director như chữ sự kiện — nạn nhân đã có số đang hiện thì
   * director trả 'merge-visible' và số GỘP vào floater đó (cộng dồn
   * + pop lại) thay vì sinh thêm.
   */
  private damageText(damage: number, crit: boolean, target: FighterView): void {
    const entry: G1FloaterEntry = {
      targetId: target.player.id,
      kind: 'damage',
      content: '',
      color: crit ? '#fca5a5' : '#ffffff',
      damage,
      crit,
      w: crit ? 92 : 72,
      h: crit ? 42 : 36,
      enqueuedAt: this.time.now,
    };
    const decision = this.floaterDirector.submit(
      entry,
      this.time.now,
      this.plateBoxes(),
      this.floaterAnchorsOf(target),
      this.floaterStageRect(),
    );
    if (decision.type === 'show') this.spawnDamageFloater(decision.show);
    else if (decision.type === 'merge-visible') {
      this.mergeDamageFloater(target.player.id, damage);
    }
  }

  private spawnDamageFloater(show: G1FloaterShow): void {
    const { entry } = show;
    const text = this.add
      .text(show.x, show.y, `−${entry.damage}`, {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: entry.crit ? '28px' : '22px',
        fontStyle: 'bold',
        color: entry.color,
        stroke: '#1c1917',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(FLOATER_DEPTH)
      .setScale(0.6);
    this.root.add(text);
    const active = { id: show.id, text, damage: entry.damage };
    this.activeDamageFloaters.set(entry.targetId, active);
    // FIX-V4.1: đăng ký vào sổ né liên tục như floater chữ (xem
    // spawnEventFloater) — số sát thương cũng bị plate đuổi kịp khi
    // cụm hội tụ (pack v5: «−7» chạm nhãn Em, «−6» chạm plate Chi).
    this.activeFloaters.set(show.id, {
      text,
      kind: 'damage',
      targetId: entry.targetId,
      bornAt: this.time.now,
      lifeMs: 700,
      risePx: 30,
      fading: false,
    });
    this.tweens.add({
      targets: text,
      scale: 1.15,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: text, scale: 1, duration: 90, ease: 'Quad.easeOut' });
      },
    });
    this.tweens.add({
      targets: text,
      y: show.y - 30,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishFloater(show.id),
    });
  }

  /**
   * Kết thúc MỘT floater (FIX-V4.1): đường dọn duy nhất cho cả hết đời
   * tự nhiên lẫn mờ sớm vì né — huỷ tween còn treo, huỷ Text, dọn sổ
   * gộp số (nếu chính floater này đang giữ), trả slot cho director.
   * Gọi lặp vô hại (không còn trong sổ → thôi).
   */
  private finishFloater(id: number): void {
    const active = this.activeFloaters.get(id);
    if (!active) return;
    this.activeFloaters.delete(id);
    const dmg = this.activeDamageFloaters.get(active.targetId);
    if (dmg && dmg.id === id) this.activeDamageFloaters.delete(active.targetId);
    this.tweens.killTweensOf(active.text);
    active.text.destroy();
    this.floaterDirector.release(id);
  }

  /**
   * NÉ LIÊN TỤC (FIX-V4.1 — cơ chế chính đóng LỖI 1): chạy mỗi frame
   * SAU layoutPlates (ở update() và ở POST_UPDATE). Đồng bộ vị trí
   * THẬT của từng floater vào director, hỏi director với rect plate
   * HIỆN TẠI: floater bị plate đuổi kịp → 'move' (huỷ tween bay cũ,
   * đặt lại vị trí sạch, khởi động lại tween bay/mờ cho phần đời còn
   * lại) hoặc 'fade' (hết chỗ sạch → mờ trong 110 ms rồi dọn). Plate
   * luôn thắng — floater không bao giờ được ở lại trong hộp plate.
   */
  private evadeFloaters(): void {
    if (this.activeFloaters.size === 0) return;
    for (const [id, active] of this.activeFloaters) {
      if (!active.fading && active.text.active) {
        this.floaterDirector.syncCenter(id, active.text.x, active.text.y);
      }
    }
    const actions = this.floaterDirector.evade(this.plateBoxes(), this.floaterStageRect());
    if (actions.length === 0) return;
    const now = this.time.now;
    for (const action of actions) {
      const active = this.activeFloaters.get(action.id);
      if (!active || active.fading || !active.text.active) continue;
      const remaining = Math.max(90, active.lifeMs - (now - active.bornAt));
      this.tweens.killTweensOf(active.text);
      if (action.type === 'fade') {
        active.fading = true;
        this.tweens.add({
          targets: active.text,
          alpha: 0,
          duration: 110,
          ease: 'Linear',
          onComplete: () => this.finishFloater(action.id),
        });
      } else {
        active.text.setPosition(action.x, action.y);
        if (active.kind === 'damage') active.text.setScale(1);
        const riseLeft = active.risePx * (remaining / active.lifeMs);
        this.tweens.add({
          targets: active.text,
          y: action.y - riseLeft,
          alpha: 0,
          duration: remaining,
          ease: 'Quad.easeOut',
          onComplete: () => this.finishFloater(action.id),
        });
      }
    }
  }

  /** Cộng dồn sát thương vào floater số đang hiện của nạn nhân + pop lại. */
  private mergeDamageFloater(targetId: string, damage: number): void {
    const active = this.activeDamageFloaters.get(targetId);
    if (!active || !active.text.active) return;
    active.damage += damage;
    active.text.setText(`−${active.damage}`);
    active.text.setScale(0.6);
    this.tweens.add({
      targets: active.text,
      scale: 1.15,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: active.text,
          scale: 1,
          duration: 90,
          ease: 'Quad.easeOut',
        });
      },
    });
  }

  /**
   * Nhả hàng đợi floater (FIX-V4): gọi mỗi frame SAU layoutPlates —
   * director xét trần 2 + nhịp stagger 200 ms + vị trí sạch theo
   * plate/cột của frame hiện tại; mục hết hạn được gộp/rớt theo luật
   * của director. Không có hàng đợi → trả ngay, không tốn gì.
   */
  private pumpFloaters(): void {
    if (this.floaterDirector.queued === 0) return;
    const actions = this.floaterDirector.pump(
      this.time.now,
      this.plateBoxes(),
      (targetId) => {
        const view = this.fighters.get(targetId);
        return view ? this.floaterAnchorsOf(view) : undefined;
      },
      this.floaterStageRect(),
    );
    for (const action of actions) {
      if (action.type === 'show') {
        if (action.show.entry.kind === 'event') this.spawnEventFloater(action.show);
        else this.spawnDamageFloater(action.show);
      } else {
        this.mergeDamageFloater(action.targetId, action.damage);
      }
    }
  }

  /**
   * Tia sao tại điểm trúng (FIX-V4 Cụm 1 — THAY shockwave đã xoá):
   * 3 tia sao 4 cánh nhỏ (chí mạng 5), màu vàng ấm trung tính
   * #FFC53D nướng sẵn trong texture, nở nhẹ + xoay + mờ trong
   * ≤240 ms. Không vòng nở, không màu danh tính (mã màu vòng chân là
   * của danh tính — shockwave cũ cướp mã đó và đọc như vòng debug).
   * Chỉ gọi ở degrade bậc 0 như shockwave cũ.
   */
  private spawnHitStars(x: number, y: number, crit: boolean): void {
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: -15, dy: -7 },
      { dx: 14, dy: -10 },
      { dx: -9, dy: 11 },
      { dx: 11, dy: 8 },
    ];
    const count = crit ? 5 : 3;
    // FIX-V4.1: tia sao nào có hộp (Ø≈30px ở scale tối đa) chạm hộp
    // plate (đệm 4px) thì BỎ tia đó — pack v5 ghi nhận tia lửa FX chạm
    // mép plate thường xuyên khi cụm dày đẩy plate xuống sát điểm trúng.
    const boxes = this.plateBoxes();
    for (let i = 0; i < count; i++) {
      const o = offsets[i];
      const starRect: G1Rect = {
        x1: x + o.dx - 15,
        y1: y + o.dy - 15,
        x2: x + o.dx + 15,
        y2: y + o.dy + 15,
      };
      if (boxes.some((b) => g1RectsOverlap(starRect, b, 4))) continue;
      const star = this.add
        .image(x + o.dx, y + o.dy, 'aidai-hitstar')
        .setDepth(19)
        .setScale(0.45)
        .setAngle(i * 24 - 24);
      this.root.add(star);
      this.tweens.add({
        targets: star,
        scale: crit ? 1.05 : 0.9,
        alpha: 0,
        angle: star.angle + (i % 2 === 0 ? 38 : -38),
        duration: G1_HIT_STAR_LIFE_MS - (i % 3) * 30,
        ease: 'Quad.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  private scheduleEnd(): void {
    if (this.endScheduled) return;
    this.endScheduled = true;
    this.running = false;
    // Nhịp kết ván: người ĐÃI theo kết quả của log (engine chốt: người
    // đứng cuối = người đãi) mà còn đứng thì ăn mừng bằng anim victory
    // trong ~1 s giữ khung trước khi báo kết thúc — frame giữ lại cho
    // M7 (stage.tsx snapshot) bắt đúng khoảnh khắc này. Người đãi đã
    // ngã (nhánh hoà tuyệt đối của engine) giữ nguyên tư thế ngã.
    const result = this.boot.log.result;
    const payerIds = result.kind === 'single' ? [result.payerId] : result.payerIds;
    for (const payerId of payerIds) {
      const view = this.fighters.get(payerId);
      if (!view || !view.alive || !this.textures.exists(view.atlasKey)) continue;
      view.atkToken += 1;
      view.reactToken += 1;
      view.leanTween?.destroy();
      view.leanTween = null;
      view.body.setFlipX(false);
      view.body.setAngle(0);
      this.syncGroundRing(view);
      view.body.anims.timeScale = 1;
      view.currentAction = 'victory';
      view.body.play(animKeyOf(view.atlasKey, 'victory'), true);
    }
    // Giữ khung hình kết ván ~1 s (SPEC: cả nhóm nhìn kết quả) rồi mới
    // báo kết thúc.
    this.time.delayedCall(1000, () => this.emitFinished());
  }

  private feedDegrade(delta: number): void {
    const level = this.boot.degrade.push(delta);
    if (level !== this.appliedDegrade) {
      this.appliedDegrade = level;
      // Bậc 1: giảm particles (áp trong applyAttackEffect) + tắt rung màn
      // hình. Bậc 2: cắt tiếp hiệu ứng + tắt camera motion (updateCamera
      // khoá toàn cảnh) + hạ độ phân giải render — phần độ phân giải do
      // stage.tsx thực thi qua Scale Manager khi nhận sự kiện.
      EventBus.emit(STAGE_EVENTS.DEGRADED, { level } satisfies StageDegradedPayload);
    }
  }

  private emitFinished(): void {
    if (this.finishedEmitted) return;
    this.finishedEmitted = true;
    EventBus.emit(STAGE_EVENTS.FINISHED);
  }
}
