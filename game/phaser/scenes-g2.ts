// scenes-g2.ts — Scene G2 «Mâm Cơm Xoay» (SPEC §7).
//
// Hình tượng: bàn tròn + mâm cơm tròn NHÌN TỪ TRÊN XUỐNG, vị trí ngồi quanh
// mâm (badge vòng màu áo + initials tự vẽ từ initialsOfName + tên — PRES
// vòng 2: seat badge G2 không dùng texture DiceBear nữa, xem buildSeats).
// FIX-V4 (Cụm 5): phần tử quay là MÂM THẬT (lazy Susan) — mâm + món + bóng
// món nằm trong một container `trayGroup` và xoay cùng nhau; ĐÔI ĐŨA thành
// KIM CỐ ĐỊNH ở đỉnh mâm (chỉ lắc/bob nhẹ theo tốc độ), ghế/badge người
// chơi đứng yên ngoài mâm. Hệ màu của app: trắng/xám trung tính, accent
// Deep Orange #FF5722 chỉ tiết chế (tâm gác đũa).
//
// MÓN ĂN (REBUILD-C lane C, 2026-10-25): sprite render trước từ model 3D
// Kenney Food Kit (CC0 — verify tại kenney.nl chính chủ, xem
// game/assets/ASSET-MANIFEST.md) bằng pipeline game/tools/render-food/,
// đóng gói ở public/game/atlas/g2-food.webp + g2-food.json (Phaser hash).
// Đường vector PRES vòng 2 (drawBowl/drawPlate/drawSmallCup) GIỮ làm
// fallback duy nhất khi atlas tải lỗi (vd lần mở đầu offline) — không để
// mâm trống món trong bất kỳ trường hợp nào.
//
// FIX-V3 (lane C, sau panel v3): atlas món lên 8 frame (thêm turkey +
// corn — gán món/gán cỡ ở g2-food.ts: vòng 7 món ghế không trùng kề/đối,
// món TO hơn theo dây cung vòng); mặt mâm có VẬT LIỆU GỐM riêng
// (public/game/atlas/g2-tray.webp, tự sinh — xem ASSET-MANIFEST) phủ
// Ø504 trên Graphics mâm cũ (Graphics giữ làm fallback khi texture tải
// lỗi); vạch chia ô chạy từ đĩa tâm ra mép MÂM, đậm/đặc hơn; ô đang
// dưới kim SÁNG LÊN trực tiếp khi quay + chip chữ trạng thái «Đang qua
// phần của [Tên]» neo trên sân (P1.9-G2/P1.10-G2).
//
// FIX-V4 (Cụm 5, sau panel v4 — ghế 1+2 chê «quạt pie-chart + mâm không
// xoay + món sticker»): (1) XOÁ HẲN cơ chế slice() tô sector — highlight
// mới = vành ghế phát sáng (cung stroke dày màu áo người chơi dọc vành
// tại ghế của ô đang sáng) + ánh sáng radial mềm tại ô trên mặt mâm
// (dưới lớp món, bán kính gói trong ô); (2) mâm XOAY THẬT trong
// trayGroup theo hồ sơ g2-motion (ánh xạ góc ở g2-motion.ts:
// trayRotation = −góc quét, ô dưới kim tính thuần từ góc mâm bằng
// g2TrayCellIndexAtPointer — khớp 100% ô highlight + chip ở mọi thời
// điểm, truy vết 3 kênh giữ nguyên); (3) bóng món chuẩn hoá qua
// foodShadowEllipse của g2-food.ts (alpha 0,18, lệch y +5) cho MỌI món.
//
// CẤM TUYỆT ĐỐI (SPEC §7.1 + ban list D2) — không tồn tại trong file này:
// bánh xe đứng, vòng đèn viền, ô màu xen kẽ roulette, trục phát sáng,
// fake-stop / overshoot / near-miss, âm thanh xu/jackpot.
//
// KẾT QUẢ ĐÃ CHỐT Ở TẦNG ENGINE: scene chỉ đọc `spin` event của log
// (cellIndex, finalAngleDeg, spinSeconds) và diễn đúng tới góc đó bằng
// đường cong ở g2-motion.ts (tăng tốc ngắn → giảm đơn điệu → dừng đúng
// finalAngleDeg; với mô hình mâm xoay, ô của cellIndex dừng đúng dưới
// kim cố định). Scene không chứa RNG quyết kết quả nào.
//
// Âm thanh qua GameSound của P-CORE (bridge.ts): tiếng «tách» qua biên ô
// CHỈ là hàm của vận tốc góc hiện tại (mọi ô cùng công thức âm lượng/cao
// độ — khoảng cách giữa hai tiếng tự giãn theo giảm tốc); trống dồn khoá
// theo THỜI GIAN CÒN LẠI của vòng quay, không khoá theo vị trí ô.

import Phaser from 'phaser';
import {
  EventBus,
  STAGE_EVENTS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type SceneBootData,
  type StageDegradedPayload,
  type StageProgressPayload,
  type StageSetMutedPayload,
  type StageSetSpeedPayload,
  type StageSpeed,
} from './bridge';
import type { DegradeLevel } from './degrade';
import {
  G2_RAMP_RATIO,
  g2AngleDegAt,
  g2AngularVelocityDegPerSec,
  g2TrayCellIndexAtPointer,
  g2TrayRotationDegAt,
  planG2Spin,
  type G2SpinPlan,
} from './g2-motion';
import {
  ALL_FOOD_FRAMES,
  FOOD_RING_RADIUS,
  FOOD_SHADOW_ALPHA,
  assignSeatFoodFrames,
  foodDishDisplaySize,
  foodShadowEllipse,
  sharedFoodFrames,
} from './g2-food';
import { initialsOfName } from './textures';

export const G2_SCENE_KEY = 'aidai-g2';

/** Atlas món ăn thật (Kenney Food Kit CC0, render trước — xem đầu file). */
export const G2_FOOD_ATLAS_KEY = 'g2-food';
const G2_FOOD_TEXTURE_URL = '/game/atlas/g2-food.webp';
const G2_FOOD_ATLAS_URL = '/game/atlas/g2-food.json';
/** Texture vật liệu mâm gốm (tự sinh, đĩa alpha 512×512 — lane A2). */
export const G2_TRAY_KEY = 'g2-tray';
const G2_TRAY_TEXTURE_URL = '/game/atlas/g2-tray.webp';
/**
 * FIX-V4 — thông số highlight thay cho quạt pie (xem drawSeatRimGlow /
 * drawCellGlow): vành ghế = cung stroke dày màu áo người chơi dọc vành
 * tại ghế của ô đang sáng; ánh sáng ô = các vòng tròn đồng tâm alpha
 * tăng dần vào tâm ô (radial mềm), bán kính gói trong ô.
 */
const SEAT_RIM_GLOW_WIDTH = 10;
const SEAT_RIM_GLOW_ALPHA = 0.9;
/** Co hai đầu cung vành theo tỉ lệ ô — cung ôm ghế, không chạm ô kề. */
const SEAT_RIM_GLOW_INSET_RATIO = 0.07;
/** Các lớp vòng đồng tâm của ánh sáng ô: [tỉ lệ bán kính, alpha]. */
const CELL_GLOW_LAYERS: ReadonlyArray<readonly [number, number]> = [
  [1, 0.1],
  [0.74, 0.15],
  [0.5, 0.2],
  [0.28, 0.26],
];

const CENTER = STAGE_WIDTH / 2;
const TABLE_RADIUS = 352;
const TRAY_RADIUS = 252;
const SEAT_RADIUS = 304;
const ACCENT = 0xff5722;
const INK = '#1c1917';

/**
 * Hệ số tốc độ diễn theo prop speed (thời gian ảo tích luỹ theo hệ số này).
 * 'fast' = 4×. Mọi giá trị số được dùng nguyên làm hệ số — gồm cả 0.5 của
 * chế độ xem lại M8 (P-CORE ép kiểu qua StageSpeed, xem m8-replay-screen).
 */
function speedFactor(speed: StageSpeed): number {
  if (speed === 'fast') return 4;
  return speed;
}

/** Góc đo theo chiều kim đồng hồ từ hướng 12 giờ → góc Phaser (0 = hướng 3 giờ). */
function toPhaserRad(degFromTop: number): number {
  return Phaser.Math.DegToRad(degFromTop) - Math.PI / 2;
}

/** Vị trí tại góc (độ, chiều kim đồng hồ từ 12 giờ) và bán kính r quanh tâm mâm. */
function polar(degFromTop: number, r: number): { x: number; y: number } {
  const rad = Phaser.Math.DegToRad(degFromTop);
  return { x: CENTER + r * Math.sin(rad), y: CENTER - r * Math.cos(rad) };
}

/**
 * Như polar() nhưng theo toạ độ CỤC BỘ của trayGroup (gốc tại tâm mâm):
 * dùng cho mọi phần tử nằm TRONG mâm xoay (mặt mâm, vạch chia, món, bóng).
 */
function polarLocal(degFromTop: number, r: number): { x: number; y: number } {
  const rad = Phaser.Math.DegToRad(degFromTop);
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
}

interface SeatView {
  container: Phaser.GameObjects.Container;
  initialsText: Phaser.GameObjects.Text;
  playerId: string;
}

export class G2Scene extends Phaser.Scene {
  private boot!: SceneBootData;
  private root!: Phaser.GameObjects.Container;
  /**
   * FIX-V4 — container MÂM XOAY THẬT: chứa mặt mâm + vật liệu gốm + vạch
   * chia ô + đĩa tâm + ánh sáng ô + bóng món + món. Ghế/badge, bàn và
   * kim đũa đứng NGOÀI container này (người ngồi yên, mâm xoay).
   */
  private trayGroup!: Phaser.GameObjects.Container;
  /** Kim đũa CỐ ĐỊNH ở đỉnh mâm — không còn là phần tử quay chính. */
  private pointer!: Phaser.GameObjects.Container;
  /** Vệt cung đứt đoạn sau hướng quay khi tốc độ cao (trang trí — xem update). */
  private streaks: Phaser.GameObjects.Graphics | null = null;
  private plan: G2SpinPlan | null = null;
  private cellDeg = 0;
  private cellIndex = -1;
  /** Ánh sáng ô trực tiếp TRONG trayGroup (dưới lớp món, trên mặt mâm). */
  private liveGlow: Phaser.GameObjects.Graphics | null = null;
  /** Vành ghế phát sáng trực tiếp trong root (tĩnh, tại ghế của ô sáng). */
  private liveRim: Phaser.GameObjects.Graphics | null = null;
  /** Ô hiện tại của highlight trực tiếp — chỉ vẽ lại khi kim qua ô mới. */
  private liveCellIndex = -1;
  /** Chip chữ trạng thái neo trên sân («Đang qua phần của …»). */
  private statusText: Phaser.GameObjects.Text | null = null;
  /** Vị trí chèn ánh sáng kết quả trong trayGroup (ngay dưới lớp món). */
  private foodLayerIndex = 0;

  private spinning = false;
  private virtualElapsedMs = 0;
  private lastBoundaryIndex = 0;
  private drumCooldownMs = 0;
  private progressCooldownMs = 0;
  private finishedEmitted = false;
  private appliedDegrade: DegradeLevel = 0;

  private speed: StageSpeed = 1;
  private muted = false;

  private onSetSpeed = (payload: StageSetSpeedPayload) => {
    this.speed = payload.speed;
  };
  private onSetMuted = (payload: StageSetMutedPayload) => {
    this.muted = payload.muted;
  };

  constructor() {
    super(G2_SCENE_KEY);
  }

  init(data: SceneBootData): void {
    this.boot = data;
    this.speed = data.speed;
    this.muted = data.muted;
    this.spinning = false;
    this.virtualElapsedMs = 0;
    this.lastBoundaryIndex = 0;
    this.finishedEmitted = false;
    this.appliedDegrade = 0;
    this.plan = null;
    this.liveGlow = null;
    this.liveRim = null;
    this.liveCellIndex = -1;
    this.statusText = null;
  }

  preload(): void {
    // Nạp atlas món TRƯỚC create (stage.tsx không thuộc lane này). Lỗi tải
    // (offline lần đầu, SW chưa kịp cache) không chặn scene: create() kiểm
    // frame thật và rơi về món vector nếu thiếu — xem buildFood.
    this.load.atlas(G2_FOOD_ATLAS_KEY, G2_FOOD_TEXTURE_URL, G2_FOOD_ATLAS_URL);
    // Vật liệu mâm gốm — lỗi tải cũng không chặn scene: buildTray kiểm
    // texture thật và giữ nguyên Graphics mâm cũ làm fallback.
    this.load.image(G2_TRAY_KEY, G2_TRAY_TEXTURE_URL);
  }

  create(): void {
    const { log, players } = this.boot;
    const spin = log.events.find((e) => e.type === 'spin');
    if (!spin || spin.type !== 'spin' || players.length === 0) {
      // Log không hợp lệ cho G2 — không tự bịa kết quả; báo finished để
      // React không treo ở màn chơi (việc xử lý log hỏng thuộc P-CORE).
      this.emitFinished();
      return;
    }
    this.cellIndex = spin.cellIndex;
    this.cellDeg = 360 / players.length;
    this.plan = planG2Spin(spin.finalAngleDeg, spin.spinSeconds);

    this.root = this.add.container(0, 0);
    this.buildTable();
    // Mâm xoay thật: container tại tâm sân khấu, mọi phần tử «thuộc
    // mâm» vẽ theo toạ độ cục bộ quanh (0,0) và xoay cùng container.
    this.trayGroup = this.add.container(CENTER, CENTER);
    this.root.add(this.trayGroup);
    this.buildTray(players.length);
    // Ánh sáng ô trực tiếp nằm TRONG trayGroup, trên mặt mâm nhưng DƯỚI
    // bóng + món — tạo TRƯỚC buildFood để thứ tự lớp đúng ngay từ đầu;
    // ánh sáng kết quả chèn tại foodLayerIndex (ngay dưới lớp món).
    this.liveGlow = this.add.graphics();
    this.trayGroup.add(this.liveGlow);
    this.foodLayerIndex = this.trayGroup.list.length;
    this.buildFood(players.length);
    this.buildSeats();
    // Vành ghế phát sáng: tạo SAU ghế để cung vành vẽ đè lên vành bàn
    // (bán kính vành đi qua tâm badge — phần cung dưới badge bị badge
    // che tự nhiên, hai đầu cung lộ ra hai bên ghế như hào quang vành).
    this.liveRim = this.add.graphics();
    this.root.add(this.liveRim);
    this.buildPointer();
    this.buildStatusChip();

    EventBus.on(STAGE_EVENTS.SET_SPEED, this.onSetSpeed as never);
    EventBus.on(STAGE_EVENTS.SET_MUTED, this.onSetMuted as never);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(STAGE_EVENTS.SET_SPEED, this.onSetSpeed as never);
      EventBus.off(STAGE_EVENTS.SET_MUTED, this.onSetMuted as never);
      this.tweens.killAll();
      this.time.removeAllEvents();
    });
    this.scale.on('resize', this.onResize, this);

    // Nghỉ một nhịp ngắn cho cả nhóm nhìn mâm trước khi quay.
    this.time.delayedCall(350, () => {
      this.spinning = true;
      this.statusText?.setVisible(true);
    });
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    if (this.root) {
      this.root.setScale(gameSize.width / STAGE_WIDTH, gameSize.height / STAGE_HEIGHT);
    }
  }

  /**
   * BÀN TĨNH (không thuộc mâm xoay) — toàn tông trung tính: vùng bàn bao
   * ngoài TABLE_RADIUS + vành ghế ngồi + bóng đổ của mâm lên mặt bàn
   * (hình tròn đối xứng nên đứng yên trong khi mâm xoay bên trên vẫn
   * đúng vật lý). MỤC 9 (PRES vòng 2) giữ nguyên: bàn có độ sâu, không
   * vàng kim, không phát sáng. Mặt mâm + vạch chia + đĩa tâm nằm ở
   * buildTray (trong trayGroup).
   */
  private buildTable(): void {
    const g = this.add.graphics();
    // Vùng BÀN bao ngoài bàn tròn: nền tông bàn trung tính nhạt để mâm
    // «đặt trên bàn» thay vì trôi trên nền trắng. Bán kính TABLE+26 vẫn
    // nằm gọn trong sân khấu (CENTER ± 378).
    g.fillStyle(0xebe9e7, 1);
    g.fillCircle(CENTER, CENTER, TABLE_RADIUS + 26);
    g.lineStyle(2, 0xd6d3d1, 1);
    g.strokeCircle(CENTER, CENTER, TABLE_RADIUS + 26);
    // Vệt sáng rất nhẹ ở phía trên-trái của mặt bàn (bóng đổ giả một hướng).
    g.lineStyle(10, 0xffffff, 0.35);
    g.beginPath();
    g.arc(CENTER, CENTER, TABLE_RADIUS + 18, Math.PI * 0.85, Math.PI * 1.35, false);
    g.strokePath();
    // Bàn tròn (vành ghế ngồi).
    g.fillStyle(0xf5f5f4, 1);
    g.fillCircle(CENTER, CENTER, TABLE_RADIUS);
    g.lineStyle(2, 0xd6d3d1, 1);
    g.strokeCircle(CENTER, CENTER, TABLE_RADIUS);
    // Bóng đổ của mâm lên mặt bàn: vòng tối alpha thấp lệch xuống-phải.
    g.fillStyle(0x292524, 0.1);
    g.fillCircle(CENTER + 5, CENTER + 8, TRAY_RADIUS);
    this.root.add(g);
  }

  /**
   * MÂM XOAY (FIX-V4): mọi phần tử vẽ theo toạ độ CỤC BỘ của trayGroup
   * (gốc = tâm mâm) để xoay cùng container: vành mâm 2 lớp + mặt mâm +
   * bóng trong giả ở rìa (MỤC 9, PRES vòng 2 — độ sâu giữ nguyên), vật
   * liệu gốm Ø504 (FIX-V3, P1.10-G2 — Graphics bên dưới làm FALLBACK khi
   * texture tải lỗi), vạch chia ô + đĩa tâm.
   *
   * VẠCH CHIA Ô: nay chạy từ đĩa tâm (r=58) ra MÉP MÂM (r=TRAY_RADIUS)
   * — đoạn ngoài mâm của bản cũ (mâm → mép bàn) thuộc mặt bàn tĩnh, nếu
   * để trong mâm xoay sẽ quét thành nan hoa trên mặt bàn khi quay; nếu
   * để tĩnh sẽ lệch khỏi vạch trên mâm ở góc nghỉ. Bỏ đoạn ngoài: ô được
   * định nghĩa trọn trên mặt mâm, ghế tĩnh ở ngoài khớp tâm ô tại thời
   * điểm mở màn (góc xoay 0). Nét 2px stone-400 alpha 0,95 như FIX-V3 —
   * một màu duy nhất cho mọi ô, không luân phiên, không số trên ô.
   */
  private buildTray(playerCount: number): void {
    const g = this.add.graphics();
    // Lớp vành NGOÀI đậm hơn (kim loại xám mờ / tre sơn xám — trung tính).
    g.fillStyle(0xc9c5c1, 1);
    g.fillCircle(0, 0, TRAY_RADIUS);
    g.lineStyle(2, 0xa8a29e, 1);
    g.strokeCircle(0, 0, TRAY_RADIUS);
    // Lớp vành TRONG sáng.
    g.fillStyle(0xeceae8, 1);
    g.fillCircle(0, 0, TRAY_RADIUS - 9);
    // Mặt mâm trắng.
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, TRAY_RADIUS - 19);
    // Bóng TRONG giả ở rìa trong mặt mâm: nét xám dày alpha vừa ôm sát
    // vành trong, mạnh hơn ở phía dưới (nguồn sáng từ trên).
    g.lineStyle(7, 0xd6d3d1, 0.55);
    g.strokeCircle(0, 0, TRAY_RADIUS - 22);
    g.lineStyle(5, 0xffffff, 0.9);
    g.beginPath();
    g.arc(0, 0, TRAY_RADIUS - 24, Math.PI * 0.9, Math.PI * 1.45, false);
    g.strokePath();
    // Đĩa giữa mâm / đế trục xoay (trung tính, có 2 lớp vành) — đối xứng
    // tâm nên xoay cùng mâm không đổi hình.
    g.fillStyle(0x292524, 0.07);
    g.fillCircle(3, 4, 92);
    g.fillStyle(0xe7e5e4, 1);
    g.fillCircle(0, 0, 92);
    g.fillStyle(0xfafaf9, 1);
    g.fillCircle(0, 0, 84);
    g.lineStyle(1, 0xd6d3d1, 1);
    g.strokeCircle(0, 0, 84);
    g.strokeCircle(0, 0, 64);
    g.fillStyle(0xf5f5f4, 1);
    g.fillCircle(0, 0, 56);
    this.trayGroup.add(g);

    // VẬT LIỆU MÂM GỐM (FIX-V3, P1.10-G2): đĩa gốm tự sinh 512×512 alpha
    // phủ đúng mặt mâm Ø504 — G2 từ đây có vật liệu RIÊNG (gốm) khác hẳn
    // sân gỗ G1. Graphics mâm vừa vẽ ở trên giữ nguyên bên dưới làm
    // FALLBACK: texture tải lỗi (offline lần đầu) thì mâm cũ hiện lại,
    // mâm không bao giờ trống.
    const hasTrayTexture = this.textures.exists(G2_TRAY_KEY);
    if (hasTrayTexture) {
      const tray = this.add.image(0, 0, G2_TRAY_KEY);
      tray.setDisplaySize(TRAY_RADIUS * 2, TRAY_RADIUS * 2);
      this.trayGroup.add(tray);
    }

    // Lớp phủ TRÊN mặt mâm (vẫn trong trayGroup): vạch chia ô + đĩa tâm
    // (vẽ lại phần đĩa tâm không trong suốt khi texture gốm che mất bản
    // Graphics bên dưới).
    const overlay = this.add.graphics();
    overlay.lineStyle(2, 0xa8a29e, 0.95);
    for (let i = 0; i < playerCount; i++) {
      const a = i * this.cellDeg;
      const p1 = polarLocal(a, 58);
      const p2 = polarLocal(a, TRAY_RADIUS);
      overlay.beginPath();
      overlay.moveTo(p1.x, p1.y);
      overlay.lineTo(p2.x, p2.y);
      overlay.strokePath();
    }
    // Đĩa tâm vẽ SAU vạch để đầu trong của vạch kết thúc gọn ở mép đĩa.
    // Chỉ các lớp ĐẶC (không vẽ lại bóng 0,07 — bản Graphics bên dưới đã
    // có khi fallback; khi có texture gốm thì bóng đó bị che là chấp
    // nhận được vì lòng gốm đã có shading lõm riêng trong texture).
    overlay.fillStyle(0xe7e5e4, 1);
    overlay.fillCircle(0, 0, 92);
    overlay.fillStyle(0xfafaf9, 1);
    overlay.fillCircle(0, 0, 84);
    overlay.lineStyle(1, 0xd6d3d1, 1);
    overlay.strokeCircle(0, 0, 84);
    overlay.strokeCircle(0, 0, 64);
    overlay.fillStyle(0xf5f5f4, 1);
    overlay.fillCircle(0, 0, 56);
    this.trayGroup.add(overlay);
  }

  /**
   * Món ăn vector Graphics (CHỈ dùng cho fallback khi atlas tải lỗi —
   * xem buildFoodVectorFallback): tông màu thật của món nhưng giảm bão
   * hoà; nền mâm vẫn trắng/xám trung tính. Bố cục fallback giữ nguyên
   * vòng cũ bán kính 175 — mỗi người một món tại góc giữa ô của họ,
   * luân phiên xác định theo chỉ số: bát → đĩa → chén nhỏ + đũa gác.
   * Gần tâm (bán kính 118) thêm hai món chung đối nhau. (Đường sprite
   * chính dùng vòng 186 + cỡ theo g2-food.ts — xem buildFood.)
   */
  /**
   * Bóng đổ ellipse dưới mỗi món (MỤC 6 + FIX-V3 + FIX-V4 Cụm 5): MỌI
   * món dùng cùng một công thức của foodShadowEllipse (g2-food.ts) —
   * alpha FOOD_SHADOW_ALPHA = 0,18 (khoảng chốt 0,16–0,20, đậm hơn mức
   * 0,14 cũ để đọc được trên mặt mâm gốm sáng) và lệch (+3,+5) — sprite
   * atlas lẫn fallback vector đều qua hàm này/lớp bóng chung này,
   * không món nào «có bóng món không» như panel v3 chê (ghế 2), và hết
   * cảm giác sticker dán nổi mà panel v4 chê.
   */
  private foodShadow(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    g.fillStyle(0x292524, FOOD_SHADOW_ALPHA);
    g.fillEllipse(x + 3, y + 5, w, h);
  }

  /**
   * Đũa gác trên vành (MỤC 6): hai vạch SONG SONG dọc tiếp tuyến, đặt LỆCH
   * TÂM ở phía vành ngoài của món (không đi qua tâm món, không bắt chéo —
   * kiểu hai vạch chéo cũ + vòng tròn bị panel đọc thành ký hiệu «cấm»).
   * Có bóng nhẹ lệch xuống-phải dưới hai vạch.
   */
  private restingChopsticks(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    angleDeg: number,
    rimOffset: number,
    halfLength: number,
  ): void {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const tangent = { x: Math.cos(rad), y: Math.sin(rad) };
    const radial = { x: Math.sin(rad), y: -Math.cos(rad) };
    for (const pass of [
      { dxy: 2, width: 4, color: 0x292524, alpha: 0.16 },
      { dxy: 0, width: 3, color: 0x92400e, alpha: 0.95 },
    ]) {
      g.lineStyle(pass.width, pass.color, pass.alpha);
      for (const off of [-3, 3]) {
        const cx = x + radial.x * (rimOffset + off) + pass.dxy;
        const cy = y + radial.y * (rimOffset + off) + pass.dxy;
        g.beginPath();
        g.moveTo(cx - tangent.x * halfLength, cy - tangent.y * halfLength);
        g.lineTo(cx + tangent.x * halfLength, cy + tangent.y * halfLength);
        g.strokePath();
      }
    }
  }

  /**
   * Bát nhìn từ trên (MỤC 6): vành ellipse sứ 2 lớp + mặt trong + thức ăn
   * CÓ HÌNH theo biến thể xác định: 0 = cơm (cụm gồ ghề trắng), 1 = canh
   * (mặt vàng + chấm rau xanh + miếng cam), 2 = rau (cụm sọc cong xanh).
   */
  private drawBowl(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number,
    variant: number,
    angleDeg: number,
  ): void {
    this.foodShadow(g, x, y, 70 * scale, 58 * scale);
    // Vành sứ ngoài + mặt trong.
    g.fillStyle(0xc9c5c1, 1);
    g.fillEllipse(x, y, 68 * scale, 56 * scale);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(x, y, 58 * scale, 47 * scale);
    g.lineStyle(1, 0xd6d3d1, 1);
    g.strokeEllipse(x, y, 58 * scale, 47 * scale);
    // Mặt thức ăn.
    if (variant === 1) {
      // Canh: mặt vàng dịu.
      g.fillStyle(0xe7c27d, 1);
      g.fillEllipse(x, y, 46 * scale, 36 * scale);
      // Miếng cam (cà rốt) — khối tròn + lát ellipse.
      g.fillStyle(0xd97706, 0.85);
      g.fillCircle(x + 9 * scale, y - 4 * scale, 5.5 * scale);
      g.fillStyle(0xd99a4e, 1);
      g.fillEllipse(x - 11 * scale, y + 6 * scale, 13 * scale, 9 * scale);
      // Chấm rau xanh.
      g.fillStyle(0x6f8f5f, 1);
      for (const p of [
        { dx: -6, dy: -8 },
        { dx: 3, dy: 7 },
        { dx: 14, dy: 5 },
        { dx: -15, dy: -2 },
      ]) {
        g.fillCircle(x + p.dx * scale, y + p.dy * scale, 3 * scale);
      }
      // Vệt sáng mặt canh.
      g.lineStyle(2, 0xffffff, 0.5);
      g.beginPath();
      g.arc(x, y, 14 * scale, Math.PI * 1.05, Math.PI * 1.45, false);
      g.strokePath();
    } else if (variant === 2) {
      // Rau: nền xanh rất nhạt + cụm lá ellipse + sọc cong xanh đậm hơn.
      g.fillStyle(0xdce8d2, 1);
      g.fillEllipse(x, y, 46 * scale, 36 * scale);
      g.fillStyle(0x93b08a, 1);
      for (const p of [
        { dx: -10, dy: -5, w: 16, h: 10 },
        { dx: 9, dy: -7, w: 15, h: 9 },
        { dx: 0, dy: 7, w: 17, h: 10 },
        { dx: -13, dy: 7, w: 12, h: 8 },
      ]) {
        g.fillEllipse(x + p.dx * scale, y + p.dy * scale, p.w * scale, p.h * scale);
      }
      g.lineStyle(2.5, 0x5f7d4f, 0.9);
      for (const p of [
        { dx: -8, dy: -4, r: 8 },
        { dx: 8, dy: 2, r: 9 },
        { dx: -2, dy: 8, r: 7 },
      ]) {
        g.beginPath();
        g.arc(
          x + p.dx * scale,
          y + p.dy * scale,
          p.r * scale,
          Math.PI * 0.15,
          Math.PI * 0.85,
          false,
        );
        g.strokePath();
      }
    } else {
      // Cơm: mặt kem + cụm gồ ghề nhiều vòng trắng chồng nhau (không phải
      // một vòng tròn phẳng) + vài hạt điểm nhấn.
      g.fillStyle(0xf5f0e6, 1);
      g.fillEllipse(x, y, 46 * scale, 36 * scale);
      g.fillStyle(0xffffff, 1);
      for (const p of [
        { dx: -11, dy: -4, r: 7 },
        { dx: 0, dy: -9, r: 8 },
        { dx: 11, dy: -4, r: 7 },
        { dx: -6, dy: 5, r: 8 },
        { dx: 7, dy: 6, r: 7 },
        { dx: 0, dy: -1, r: 7 },
      ]) {
        g.fillCircle(x + p.dx * scale, y + p.dy * scale, p.r * scale);
      }
      g.fillStyle(0xe8dfc8, 1);
      for (const p of [
        { dx: -4, dy: -6 },
        { dx: 6, dy: 1 },
        { dx: -9, dy: 6 },
      ]) {
        g.fillCircle(x + p.dx * scale, y + p.dy * scale, 2 * scale);
      }
    }
    this.restingChopsticks(g, x, y, angleDeg, 19 * scale, 15 * scale);
  }

  /**
   * Đĩa nhìn từ trên (MỤC 6): ellipse dẹt 2 lớp + miếng thịt/gà dạng KHỐI
   * bo góc có điểm nhấn (vệt sáng + chấm hành/xanh), không phải chấm tròn.
   */
  private drawPlate(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number,
    angleDeg: number,
  ): void {
    this.foodShadow(g, x, y, 68 * scale, 54 * scale);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(x, y, 66 * scale, 52 * scale);
    g.lineStyle(2, 0xd6d3d1, 1);
    g.strokeEllipse(x, y, 66 * scale, 52 * scale);
    g.fillStyle(0xfafaf9, 1);
    g.fillEllipse(x, y, 52 * scale, 40 * scale);
    g.lineStyle(1, 0xe7e5e4, 1);
    g.strokeEllipse(x, y, 52 * scale, 40 * scale);
    // Ba miếng thịt/gà khối bo góc, lệch nhau như xếp trên đĩa.
    const chunks: Array<{ dx: number; dy: number; w: number; h: number; color: number }> = [
      { dx: -11, dy: -6, w: 20, h: 15, color: 0xb08968 },
      { dx: 9, dy: -8, w: 18, h: 14, color: 0xa67c52 },
      { dx: 0, dy: 7, w: 21, h: 15, color: 0xb08968 },
    ];
    for (const c of chunks) {
      g.fillStyle(c.color, 1);
      g.fillRoundedRect(
        x + (c.dx - c.w / 2) * scale,
        y + (c.dy - c.h / 2) * scale,
        c.w * scale,
        c.h * scale,
        5 * scale,
      );
      // Điểm nhấn trên mặt miếng: vệt sáng ngắn + chấm tiêu/hành.
      g.fillStyle(0xd9b48c, 0.9);
      g.fillEllipse(x + (c.dx - 3) * scale, y + (c.dy - 2) * scale, 8 * scale, 4 * scale);
    }
    g.fillStyle(0x6f8f5f, 1);
    for (const p of [
      { dx: -14, dy: 8 },
      { dx: 14, dy: 3 },
      { dx: 4, dy: -13 },
    ]) {
      g.fillCircle(x + p.dx * scale, y + p.dy * scale, 2.6 * scale);
    }
    // Lát cam/cà rốt cạnh đĩa.
    g.fillStyle(0xd99a4e, 1);
    g.fillCircle(x + 16 * scale, y + 11 * scale, 4.5 * scale);
    g.fillStyle(0xf5f5f4, 1);
    g.fillCircle(x + 16 * scale, y + 11 * scale, 1.8 * scale);
    this.restingChopsticks(g, x, y, angleDeg, 17 * scale, 14 * scale);
  }

  /**
   * Chén nhỏ (MỤC 6): ellipse sứ nhỏ 2 lớp + mặt nước/canh có vệt sáng +
   * chấm xanh; đũa gác song song lệch tâm trên vành (xem restingChopsticks).
   */
  private drawSmallCup(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number,
    angleDeg: number,
  ): void {
    this.foodShadow(g, x, y, 50 * scale, 42 * scale);
    g.fillStyle(0xc9c5c1, 1);
    g.fillEllipse(x, y, 48 * scale, 40 * scale);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(x, y, 39 * scale, 32 * scale);
    g.fillStyle(0xe7c27d, 1);
    g.fillEllipse(x, y, 29 * scale, 22 * scale);
    g.fillStyle(0x6f8f5f, 1);
    g.fillCircle(x - 4 * scale, y - 2 * scale, 2.6 * scale);
    g.fillCircle(x + 5 * scale, y + 3 * scale, 2.2 * scale);
    g.lineStyle(2, 0xffffff, 0.55);
    g.beginPath();
    g.arc(x, y, 9 * scale, Math.PI * 1.05, Math.PI * 1.5, false);
    g.strokePath();
    this.restingChopsticks(g, x, y, angleDeg, 13 * scale, 12 * scale);
  }

  /** Atlas món có đủ 8 frame để dùng không (texture + từng frame phải có thật). */
  private hasFoodAtlas(): boolean {
    if (!this.textures.exists(G2_FOOD_ATLAS_KEY)) return false;
    const texture = this.textures.get(G2_FOOD_ATLAS_KEY);
    return ALL_FOOD_FRAMES.every((frame) => texture.has(frame));
  }

  /**
   * Món ăn TRÊN mâm bằng SPRITE THẬT (REBUILD-C + FIX-V3): ảnh render từ
   * model Kenney Food Kit CC0. FIX-V4: món nằm TRONG trayGroup (toạ độ
   * cục bộ quanh tâm mâm) và XOAY CÙNG MÂM như mâm xoay thật — sprite
   * không tự xoay quanh tâm của chính nó (góc nhìn của từng món giữ
   * nguyên, cả mâm mang món đi như đĩa đặt trên mâm xoay).
   *
   * FIX-V3 (P1.10-G2, logic thuần ở g2-food.ts + g2-food.spec.ts):
   * - Vòng món dịch ra bán kính 186 (cũ 175) và món TO hơn: cỡ theo số
   *   ghế từ foodDishDisplaySize — trần 112 ở ván ≤10 ghế, 110 ở 11 ghế,
   *   101 ở 12 ghế. Ràng buộc cứng không chồng ở 12 ghế: dây cung vòng
   *   2×186×sin(π/12) ≈ 96,28 ≥ đường kính thị giác 0,91×101 ≈ 91,9 +
   *   khe 4. Mép ngoài món ở cỡ trần: 186 + 112/2 = 242 < 252 (mép mâm).
   * - Gán món: vòng 7 món ghế (bowl-broth, bowl-soup, salad,
   *   plate-dinner, plate-sauerkraut, turkey, corn) qua
   *   assignSeatFoodFrames — không trùng khi còn món phân biệt chưa
   *   dùng; ghế kề + ghế đối không bao giờ trùng ở mọi cỡ ván 2–12.
   * - Tâm mâm giữ bố cục cũ (bán kính 118, đối nhau): pot-stew cỡ 104 +
   *   món chung thứ hai cỡ 84 từ sharedFoodFrames (món ghế chưa dùng khi
   *   ván ≤6 ghế → toàn mâm không trùng; ≥7 ghế rơi về bowl-soup).
   * - Bóng đổ (FIX-V4 chuẩn hoá): MỌI món (vòng + tâm) có ellipse bóng
   *   RIÊNG vẽ trước trên một lớp Graphics chung trong trayGroup, theo
   *   đúng foodShadowEllipse (alpha 0,18, lệch (+3,+5), rộng 0,88 × cỡ
   *   món — ôm sát chân món 0,91) — thống nhất tuyệt đối, không phụ
   *   thuộc bóng nướng sẵn trong từng sprite.
   * Atlas thiếu/hỏng → buildFoodVectorFallback (đường PRES vòng 2).
   */
  private buildFood(playerCount: number): void {
    if (!this.hasFoodAtlas()) {
      this.buildFoodVectorFallback(playerCount);
      return;
    }
    interface Dish {
      frame: string;
      x: number;
      y: number;
      size: number;
    }
    const dishes: Dish[] = [];
    const seatFrames = assignSeatFoodFrames(playerCount);
    const ringSize = foodDishDisplaySize(playerCount);
    for (let i = 0; i < playerCount; i++) {
      const angleDeg = i * this.cellDeg + this.cellDeg / 2;
      const pos = polarLocal(angleDeg, FOOD_RING_RADIUS);
      dishes.push({ frame: seatFrames[i], x: pos.x, y: pos.y, size: ringSize });
    }
    // Hai món chung gần tâm, đối nhau qua tâm (bán kính 118) — đĩa tâm
    // r=92 đã vẽ ở buildTray giữ nguyên làm nền ở giữa.
    const [potFrame, secondFrame] = sharedFoodFrames(playerCount);
    const sharedPot = polarLocal(90, 118);
    dishes.push({ frame: potFrame, x: sharedPot.x, y: sharedPot.y, size: 104 });
    const sharedSecond = polarLocal(270, 118);
    dishes.push({ frame: secondFrame, x: sharedSecond.x, y: sharedSecond.y, size: 84 });

    // Lớp bóng chung dưới mọi món, TRONG trayGroup (bóng xoay cùng món)
    // — vẽ TRƯỚC mọi sprite món, kích thước/lệch qua foodShadowEllipse.
    const shadows = this.add.graphics();
    for (const dish of dishes) {
      const shadow = foodShadowEllipse(dish.size);
      shadows.fillStyle(0x292524, shadow.alpha);
      shadows.fillEllipse(
        dish.x + shadow.offsetX,
        dish.y + shadow.offsetY,
        shadow.width,
        shadow.height,
      );
    }
    this.trayGroup.add(shadows);
    for (const dish of dishes) {
      const img = this.add.image(dish.x, dish.y, G2_FOOD_ATLAS_KEY, dish.frame);
      img.setDisplaySize(dish.size, dish.size);
      this.trayGroup.add(img);
    }
  }

  /**
   * FALLBACK vector (PRES vòng 2, MỤC 6): chỉ chạy khi atlas món tải lỗi.
   * Món vẽ bằng Graphics — bát/đĩa/chén có vành + thức ăn có hình khối,
   * đũa gác song song lệch tâm (bỏ hẳn món «hai vạch chéo» đọc như ký
   * hiệu cấm của vòng đầu). FIX-V4: vẽ theo toạ độ CỤC BỘ trong
   * trayGroup như đường sprite — fallback cũng xoay cùng mâm, và bóng
   * trong từng món (qua foodShadow) dùng chung alpha/lệch đã chuẩn hoá.
   */
  private buildFoodVectorFallback(playerCount: number): void {
    const g = this.add.graphics();

    for (let i = 0; i < playerCount; i++) {
      const angleDeg = i * this.cellDeg + this.cellDeg / 2;
      const pos = polarLocal(angleDeg, 175);
      const kind = i % 3;
      if (kind === 0) {
        // Bát — biến thể món luân phiên xác định theo vòng món (cơm/canh/rau).
        this.drawBowl(g, pos.x, pos.y, 1, Math.floor(i / 3) % 3, angleDeg);
      } else if (kind === 1) {
        this.drawPlate(g, pos.x, pos.y, 1, angleDeg);
      } else {
        this.drawSmallCup(g, pos.x, pos.y, 1, angleDeg);
      }
    }

    // Hai món chung gần tâm, đối nhau qua tâm (bán kính 118) — đĩa tâm
    // r=92 đã vẽ ở buildTray giữ nguyên làm nền ở giữa.
    const sharedPlate = polarLocal(90, 118);
    this.drawPlate(g, sharedPlate.x, sharedPlate.y, 1.05, 90);
    const sharedBowl = polarLocal(270, 118);
    this.drawBowl(g, sharedBowl.x, sharedBowl.y, 0.78, 1, 270);

    this.trayGroup.add(g);
  }

  /**
   * Ghế ngồi quanh mâm (MỤC 7, PRES vòng 2): badge KHÔNG dùng texture
   * DiceBear nữa — DiceBear tự suy initials từ seed nên đã cắt «Dũng»
   * thành «DŨ», «Bình» thành «BÌ» trên ảnh panel. Badge giờ là đường
   * DUY NHẤT: vòng Graphics nền = màu áo người chơi + Text initials từ
   * `initialsOfName` (hàm cục bộ của textures.ts), cỡ chữ co theo số ký
   * tự và được kiểm tra bề rộng thật so với vòng trước khi chốt.
   * (Avatar DiceBear ở các nơi khác ngoài G2 seat giữ nguyên trạng.)
   */
  private buildSeats(): void {
    const seats: SeatView[] = [];
    this.boot.players.forEach((player, i) => {
      const angleDeg = i * this.cellDeg + this.cellDeg / 2;
      const pos = polar(angleDeg, SEAT_RADIUS);
      const container = this.add.container(pos.x, pos.y);

      const circle = this.add.graphics();
      circle.fillStyle(Phaser.Display.Color.HexStringToColor(player.colorHex).color, 1);
      circle.fillCircle(0, 0, 27);
      circle.lineStyle(2, 0xffffff, 1);
      circle.strokeCircle(0, 0, 27);

      const initials = initialsOfName(player.name);
      // 1 ký tự → lớn (22px); 2 ký tự → 16px; dài hơn → 13px. Sau đó vòng
      // kiểm tra bề rộng: text phải vừa trong vòng Ø54 trừ lề 2×6 (=42px),
      // còn rộng hơn thì giảm cỡ tiếp tới sàn 9px.
      let fontSize = initials.length <= 1 ? 22 : initials.length === 2 ? 16 : 13;
      const initialsText = this.add
        .text(0, 0, initials, {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: `${fontSize}px`,
          fontStyle: 'bold',
          color: '#212121',
        })
        .setOrigin(0.5);
      while (initialsText.width > 42 && fontSize > 9) {
        fontSize -= 1;
        initialsText.setFontSize(fontSize);
      }

      // Tên đầy đủ dưới badge: chữ lớn hơn (18px), mực đầy đủ, nền pill
      // trắng bán trong phía sau để không bị nền bàn nuốt chữ.
      // KIỂM CHỨNG LẠI REBUILD-C ở bề rộng canvas 358px CSS (hệ số co
      // 358/900 ≈ 0,398): bản PRES2 để tên MỘT dòng không giới hạn bề
      // rộng — tên «Nguyễn Văn Trường» ở 18px bold rộng ~182px sân khấu,
      // trong khi dây cung giữa hai ghế kề ở ván 12 người chỉ ~157px
      // (2 × SEAT_RADIUS × sin(π/12)) → pill của hai ghế kề CHỒNG nhau,
      // và ghế ở mép phải/trái có nguy cơ tràn sân khấu với tên dài hơn.
      // Sửa dứt điểm: bề rộng gói chữ = min(205, 96% dây cung ghế kề) —
      // tên dài TỰ NGẮT XUỐNG DÒNG (tối đa theo từ, giữ nguyên cỡ 18px
      // để còn đọc được ở 358px) thay vì tràn; từ đơn dài hơn cả khổ gói
      // thì co cỡ chữ tiếp tới sàn 12px. Tên đầy đủ vẫn hiện nguyên ở
      // các màn React quanh sân khấu (M3/M5/M7) nên không mất thông tin.
      const seatChord = 2 * SEAT_RADIUS * Math.sin(Math.PI / this.boot.players.length);
      const nameWrapWidth = Math.max(110, Math.min(205, Math.floor(seatChord * 0.96)));
      let nameFontSize = 18;
      const nameText = this.add
        .text(0, 34, player.name, {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: `${nameFontSize}px`,
          fontStyle: 'bold',
          color: INK,
          backgroundColor: 'rgba(255,255,255,0.88)',
          align: 'center',
          wordWrap: { width: nameWrapWidth, useAdvancedWrap: true },
          lineSpacing: 2,
        })
        .setOrigin(0.5, 0)
        .setPadding(7, 3, 7, 3);
      while (nameText.width > nameWrapWidth + 14 && nameFontSize > 12) {
        nameFontSize -= 1;
        nameText.setFontSize(nameFontSize);
      }

      container.add([circle, initialsText, nameText]);
      this.root.add(container);
      seats.push({ container, initialsText, playerId: player.id });
    });
  }

  /**
   * Vẽ đôi đũa (chỉ hai thanh) vào một Graphics ở toạ độ cục bộ quanh tâm
   * với alpha cho trước — dùng cho đũa kim chính (alpha 1) và bản sao
   * bóng đổ của chính nó. Thân rộng 7px ở gốc, thu về 1,6px ở đầu nhọn
   * (hướng lên = hướng kim cố định, 12 giờ).
   */
  private drawChopsticks(
    g: Phaser.GameObjects.Graphics,
    alpha: number,
    opts: { shadow?: boolean; edge?: boolean } = {},
  ): void {
    const sticks: Array<{ offset: number; color: number }> = opts.shadow
      ? [
          { offset: -6, color: 0x292524 },
          { offset: 6, color: 0x292524 },
        ]
      : [
          { offset: -6, color: 0x92400e },
          { offset: 6, color: 0xb45309 },
        ];
    for (const stick of sticks) {
      // Đũa THẬT (edge=true): vẽ thêm lớp viền đậm rộng hơn 1,1px mỗi phía
      // bên dưới thân chính để nét đũa dứt khoát, đọc rõ là KIM (MỤC 8c).
      if (opts.edge) {
        g.fillStyle(0x451a03, alpha);
        g.fillPoints(
          [
            new Phaser.Math.Vector2(stick.offset - 4.6, -26),
            new Phaser.Math.Vector2(stick.offset + 4.6, -26),
            new Phaser.Math.Vector2(stick.offset + 1.6, -234),
            new Phaser.Math.Vector2(stick.offset - 1.6, -234),
          ],
          true,
        );
      }
      g.fillStyle(stick.color, alpha);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(stick.offset - 3.5, -26),
          new Phaser.Math.Vector2(stick.offset + 3.5, -26),
          new Phaser.Math.Vector2(stick.offset + 0.8, -234),
          new Phaser.Math.Vector2(stick.offset - 0.8, -234),
        ],
        true,
      );
    }
  }

  /**
   * Đôi đũa = KIM CỐ ĐỊNH ở đỉnh mâm (FIX-V4): hai thanh song song đầu
   * nhọn hướng 12 giờ + tâm gác đũa, KHÔNG quay — mâm xoay bên dưới nó.
   * Chỉ còn lắc/bob nhẹ theo tốc độ trong update (nghiêng theo chiều
   * chuyển động bề mặt mâm + nhịp rung nhỏ). Vệt tốc độ (streaks) nằm
   * DƯỚI kim trong root; bản sao ghost kéo theo đũa của mô hình cũ bị
   * BỎ — kim đứng yên thì không có vệt đũa, vệt thuộc về mâm (xem
   * updateSpeedDecoration).
   */
  private buildPointer(): void {
    this.streaks = this.add.graphics();
    this.streaks.setPosition(0, 0);
    this.root.add(this.streaks);

    this.pointer = this.add.container(CENTER, CENTER);
    // Bóng đổ của đũa: bản sao xám đậm alpha 0,18 lệch (+4,+5), nằm dưới
    // đũa chính trong cùng container (MỤC 8c).
    const shadow = this.add.graphics();
    shadow.setPosition(4, 5);
    this.drawChopsticks(shadow, 0.18, { shadow: true });
    const g = this.add.graphics();
    // Trục xoay ở tâm (MỤC 9): đĩa gác 2 lớp + vòng chi tiết + điểm tâm.
    g.fillStyle(0xc9c5c1, 1);
    g.fillCircle(0, 0, 26);
    g.fillStyle(0xe7e5e4, 1);
    g.fillCircle(0, 0, 21);
    g.lineStyle(1, 0xa8a29e, 1);
    g.strokeCircle(0, 0, 21);
    // Đũa kim: alpha 1 nguyên + viền đậm (edge) — nét kim phải dứt khoát.
    this.drawChopsticks(g, 1, { edge: true });
    // Tâm gác đũa — điểm accent duy nhất trên mâm khi đang quay.
    g.fillStyle(ACCENT, 1);
    g.fillCircle(0, 0, 12);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(0, 0, 12);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, 3.5);
    this.pointer.add([shadow, g]);
    this.pointer.setRotation(0);
    this.root.add(this.pointer);
  }

  /**
   * Chip chữ trạng thái neo trên sân (FIX-V3, P1.9-G2): một Text duy
   * nhất ở mép trên sân khấu (y=40, trên vành bàn r=378 nên không đè
   * ghế/mâm), cùng ngôn ngữ chip của mode — nền trắng bán trong, mực
   * INK, padding như pill tên ở vành. Hiện «Đang quay…» từ lúc bắt đầu
   * quay, chuyển thành «Đang qua phần của [Tên]» theo ô dưới kim (xem
   * updateLiveHighlight), và thành «Đũa dừng ở phần của [Tên]» khi dừng.
   * Không thêm chữ nào khác lên sân.
   */
  private buildStatusChip(): void {
    this.statusText = this.add
      .text(CENTER, 40, 'Đang quay…', {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: INK,
        backgroundColor: 'rgba(255,255,255,0.92)',
        align: 'center',
      })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setVisible(false);
    this.root.add(this.statusText);
  }

  /**
   * Vành ghế phát sáng cho ô `cellIdx`: một cung stroke DÀY màu áo của
   * người chơi đó (strongHex nguyên văn từ boot data) dọc theo vành tại
   * bán kính ghế (SEAT_RADIUS), ôm đúng khoảng góc của ô nhưng co hai
   * đầu theo SEAT_RIM_GLOW_INSET_RATIO để không chạm ô kề. Ghế tĩnh nên
   * vẽ ở toạ độ thế giới trong root. TUYỆT ĐỐI không dùng slice()/sector
   * — đây là thay thế trực tiếp cho quạt pie cũ (FIX-V4 Cụm 5 mục 1a).
   */
  private drawSeatRimGlow(
    g: Phaser.GameObjects.Graphics,
    cellIdx: number,
    color: number,
    alphaScale = 1,
  ): void {
    const inset = this.cellDeg * SEAT_RIM_GLOW_INSET_RATIO;
    const startDeg = cellIdx * this.cellDeg + inset;
    const endDeg = (cellIdx + 1) * this.cellDeg - inset;
    g.lineStyle(SEAT_RIM_GLOW_WIDTH, color, SEAT_RIM_GLOW_ALPHA * alphaScale);
    g.beginPath();
    g.arc(CENTER, CENTER, SEAT_RADIUS, toPhaserRad(startDeg), toPhaserRad(endDeg), false);
    g.strokePath();
  }

  /**
   * Ánh sáng mềm tại ô `cellIdx` trên mặt mâm: các vòng tròn ĐỒNG TÂM
   * alpha tăng dần vào trong (CELL_GLOW_LAYERS) tại tâm vòng món của ô,
   * vẽ theo toạ độ CỤC BỘ của trayGroup — nằm DƯỚI lớp bóng + món nhưng
   * TRÊN mặt mâm, và xoay cùng mâm nên luôn ôm đúng ô đó. Bán kính gói
   * trong ô: min(60, nửa dây cung vòng món − 2) — ô đông nhất (12 ghế)
   * cho ≈46px, vẫn nhỏ hơn nửa cỡ món nên ánh sáng chỉ lọt ra quanh
   * chân món như hào quang mềm, không phủ qua món/vành như pie cũ
   * (FIX-V4 Cụm 5 mục 1b).
   */
  private drawCellGlow(
    g: Phaser.GameObjects.Graphics,
    cellIdx: number,
    color: number,
    alphaScale = 1,
  ): void {
    const n = this.boot.players.length;
    const centerDeg = cellIdx * this.cellDeg + this.cellDeg / 2;
    const pos = polarLocal(centerDeg, FOOD_RING_RADIUS);
    const radius = Math.min(60, FOOD_RING_RADIUS * Math.sin(Math.PI / Math.max(2, n)) - 2);
    for (const [ratio, alpha] of CELL_GLOW_LAYERS) {
      g.fillStyle(color, alpha * alphaScale);
      g.fillCircle(pos.x, pos.y, radius * ratio);
    }
  }

  /**
   * Ô DƯỚI KIM SÁNG TRỰC TIẾP KHI QUAY (FIX-V3 P1.9-G2, làm lại ở
   * FIX-V4): ô được tính THUẦN TỪ GÓC MÂM HIỆN TẠI
   * (g2TrayCellIndexAtPointer — spec ở g2-motion chứng minh khớp 100%
   * với ô highlight + chip ở mọi thời điểm, truy vết 3 kênh giữ nguyên).
   * Chỉ vẽ lại khi kim SANG Ô MỚI. Highlight = vành ghế phát sáng (màu
   * áo người của ô) + ánh sáng radial mềm tại ô trong trayGroup; đồng
   * thời cập nhật chip trạng thái sang tên người của ô đó. Một ô sáng
   * duy nhất tại một thời điểm, không luân phiên/không nhấp nháy kiểu
   * casino.
   */
  private updateLiveHighlight(trayRotationDeg: number): void {
    if (!this.liveGlow || !this.liveRim) return;
    const idx = g2TrayCellIndexAtPointer(trayRotationDeg, this.boot.players.length);
    if (idx < 0 || idx === this.liveCellIndex) return;
    this.liveCellIndex = idx;
    const player = this.boot.players[idx];
    if (!player) return;
    const color = Phaser.Display.Color.HexStringToColor(player.colorHex).color;
    this.liveRim.clear();
    this.drawSeatRimGlow(this.liveRim, idx, color);
    this.liveGlow.clear();
    this.drawCellGlow(this.liveGlow, idx, color);
    this.statusText?.setText(`Đang qua phần của ${player.name}`);
  }

  /** Xoá highlight trực tiếp — gọi ngay khi mâm dừng (finishSpin). */
  private clearLiveHighlight(): void {
    this.liveGlow?.clear();
    this.liveRim?.clear();
    this.liveCellIndex = -1;
  }

  /**
   * Trang trí theo vận tốc (SPEC §7.4 vẫn nguyên: hồ sơ quay không đổi;
   * vệt chỉ là hình trang trí suy từ velocity01 — áp dụng GIỐNG NHAU
   * cho mọi ô, không highlight ô nào, không near-miss):
   * - FIX-V4: kim CỐ ĐỊNH nên không còn ghost đũa. Vệt cung bám RÌA mâm
   *   (r = 244/262/226 so với TRAY_RADIUS 252) ở PHÍA SAU hướng chuyển
   *   động của bề mặt mâm tại đỉnh: mâm xoay ngược chiều kim đồng hồ
   *   nên tại đỉnh mâm bề mặt chạy về phía trái (góc âm) — vệt kéo về
   *   phía góc DƯƠNG sau kim, đối xứng gương với công thức mô hình cũ.
   * - Vệt hiện ngay từ velocity01 ≥ 0,05 (frame đầu vòng quay vẫn có
   *   vệt), alpha là HÀM của velocity01: đỉnh của vệt chính = 0,17 +
   *   0,33 × velocity01 (0,50 ở đỉnh tốc độ, ~0,20 ở 0,1), màu xám đá
   *   0x78716c để đọc được trên cả mặt mâm trắng lẫn vành bàn xám nhạt.
   *   Thêm vạch tốc độ ngắn ở rìa phía sau kim làm dấu hiệu phụ.
   * - Kim lắc/bob nhẹ theo tốc độ: nghiêng −3,5° × velocity01 (ngả theo
   *   chiều bề mặt mâm chạy qua dưới kim) + rung sin biên độ 1,2° ×
   *   velocity01 theo thời gian thực — thuần trang trí, kim vẫn chỉ
   *   quanh vị trí cố định ở đỉnh, không tham gia quyết định ô.
   */
  private updateSpeedDecoration(timeMs: number, velocity01: number): void {
    if (velocity01 < 0.05) {
      this.pointer.setRotation(0);
    } else {
      const leanDeg = -3.5 * velocity01;
      const bobDeg = Math.sin(timeMs / 90) * 1.2 * velocity01;
      this.pointer.setRotation(Phaser.Math.DegToRad(leanDeg + bobDeg));
    }

    if (!this.streaks) return;
    if (velocity01 < 0.05) {
      this.streaks.clear();
      return;
    }
    const startDeg = 14;
    const endDeg = 14 + (20 + 110 * velocity01);
    this.streaks.clear();
    const mainAlpha = 0.17 + 0.33 * velocity01;
    const arcs: Array<{ r: number; width: number; alpha: number }> = [
      { r: TRAY_RADIUS - 8, width: 11, alpha: mainAlpha },
      { r: TRAY_RADIUS + 10, width: 7, alpha: mainAlpha * 0.65 },
      { r: TRAY_RADIUS - 26, width: 6, alpha: mainAlpha * 0.5 },
    ];
    for (const arc of arcs) {
      this.streaks.lineStyle(arc.width, 0x78716c, arc.alpha);
      this.streaks.beginPath();
      this.streaks.arc(CENTER, CENTER, arc.r, toPhaserRad(startDeg), toPhaserRad(endDeg), false);
      this.streaks.strokePath();
    }
    // Dấu hiệu chuyển động phụ: vạch tốc độ NGẮN hướng tâm ở rìa mâm,
    // phía sau kim (góc dương — ngược hướng bề mặt mâm chạy), alpha
    // giảm dần theo khoảng lag — thấy được cả khi velocity01 thấp.
    for (let i = 0; i < 5; i++) {
      const tickDeg = 20 + i * (9 + 10 * velocity01);
      const tickAlpha = mainAlpha * (1 - i * 0.16);
      const p1 = polar(tickDeg, TRAY_RADIUS - 20);
      const p2 = polar(tickDeg, TRAY_RADIUS + 2);
      this.streaks.lineStyle(4, 0x78716c, tickAlpha);
      this.streaks.beginPath();
      this.streaks.moveTo(p1.x, p1.y);
      this.streaks.lineTo(p2.x, p2.y);
      this.streaks.strokePath();
    }
  }

  /** Xoá mọi trang trí tốc độ — gọi ngay khi mâm dừng (finishSpin). */
  private clearSpeedDecoration(): void {
    this.streaks?.clear();
    this.pointer.setRotation(0);
  }

  update(time: number, delta: number): void {
    this.feedDegrade(delta);
    if (!this.spinning || !this.plan) return;

    this.virtualElapsedMs += delta * speedFactor(this.speed);
    const durationMs = this.plan.durationMs;
    const t01 = Math.min(1, this.virtualElapsedMs / durationMs);
    // Góc QUÉT (hồ sơ cũ, không đổi) + góc MÂM thật suy ra từ nó: mâm
    // xoay ngược chiều kim đồng hồ đúng bằng góc quét (g2-motion.ts).
    const angleDeg = g2AngleDegAt(t01, this.plan.totalAngleDeg);
    const trayRotationDeg = g2TrayRotationDegAt(t01, this.plan.totalAngleDeg);
    this.trayGroup.setRotation(Phaser.Math.DegToRad(trayRotationDeg));

    // Vận tốc góc hiện tại chuẩn hoá theo đỉnh của chính vòng quay này —
    // tham số DUY NHẤT cho tiếng «tách» và cho trang trí tốc độ (vệt
    // cung + lắc kim): mọi ô như nhau, mù trước danh tính người chơi.
    const peak = g2AngularVelocityDegPerSec(
      G2_RAMP_RATIO,
      this.plan.totalAngleDeg,
      durationMs / 1000,
    );
    const velocity = g2AngularVelocityDegPerSec(t01, this.plan.totalAngleDeg, durationMs / 1000);
    const velocity01 = peak > 0 ? Phaser.Math.Clamp(velocity / peak, 0, 1) : 0;
    this.updateSpeedDecoration(time, velocity01);
    // Ô dưới kim sáng trực tiếp + chip trạng thái theo ô (P1.9-G2) — ô
    // tính từ GÓC MÂM THẬT, khớp 100% với ô dưới kim nhìn thấy.
    this.updateLiveHighlight(trayRotationDeg);

    // Tiếng «tách» qua biên ô.
    const boundaryIndex = Math.floor(angleDeg / this.cellDeg);
    if (boundaryIndex !== this.lastBoundaryIndex && angleDeg > 0) {
      this.lastBoundaryIndex = boundaryIndex;
      if (!this.muted) {
        this.boot.sound?.tick?.(velocity01);
      }
    }

    // Trống dồn khoá theo THỜI GIAN CÒN LẠI (không theo vị trí ô).
    this.drumCooldownMs += delta;
    if (this.drumCooldownMs >= 280) {
      this.drumCooldownMs = 0;
      if (!this.muted) this.boot.sound?.drum?.(1 - t01);
    }

    this.progressCooldownMs += delta;
    if (this.progressCooldownMs >= 300) {
      this.progressCooldownMs = 0;
      EventBus.emit(STAGE_EVENTS.PROGRESS, { ratio: t01 } satisfies StageProgressPayload);
    }

    if (t01 >= 1) {
      this.spinning = false;
      this.finishSpin();
    }
  }

  private finishSpin(): void {
    if (!this.plan) return;
    // Mâm dừng ĐÚNG góc đích suy ra từ log: trayTotalRotationDeg =
    // −(số vòng × 360 + finalAngleDeg) nên ô của cellIndex nằm đúng
    // dưới kim cố định (f(1) = 1 — khớp giải tích, xem g2-motion).
    // Kim trở về thẳng đứng tuyệt đối.
    this.trayGroup.setRotation(Phaser.Math.DegToRad(this.plan.trayTotalRotationDeg));
    this.pointer.setRotation(0);
    // Mâm đã dừng: xoá vệt cung ngay, không để trang trí tốc độ sót lại
    // trên khung hình đứng yên.
    this.clearSpeedDecoration();
    // Highlight trực tiếp cũng tắt ngay khi dừng — sau nhịp nghỉ,
    // highlight kết quả (drawHighlight) là lớp sáng DUY NHẤT trên mâm.
    // Chip đổi sang câu dừng theo đúng ô kết quả của log (cellIndex).
    this.clearLiveHighlight();
    const winner = this.boot.players[this.cellIndex];
    if (winner) {
      this.statusText?.setText(`Đũa dừng ở phần của ${winner.name}`);
    }
    if (!this.muted) this.boot.sound?.stop?.();
    EventBus.emit(STAGE_EVENTS.PROGRESS, { ratio: 1 } satisfies StageProgressPayload);
    // Giữ nguyên trạng thái đứng yên ≥ ~1,2 s cho cả nhóm nhìn (SPEC §7.4),
    // rồi mới highlight ô được chọn và báo kết thúc.
    this.time.delayedCall(1200, () => {
      this.drawHighlight();
      this.time.delayedCall(650, () => this.emitFinished());
    });
  }

  /**
   * Highlight ô KẾT QUẢ (FIX-V4 — thay wedge pie cũ): cùng ngôn ngữ với
   * highlight trực tiếp nhưng đậm hơn một bậc — (a) vành ghế của người
   * thắng phát sáng trong root, (b) ánh sáng radial mềm tại ô thắng
   * TRONG trayGroup. Không lát cắt hình học, không hiệu ứng casino.
   * Ô thắng là cellIndex nguyên văn của log; lúc này mâm đã dừng ở
   * trayTotalRotationDeg nên ô đó đang nằm đúng dưới kim — ánh sáng vẽ
   * theo toạ độ cục bộ của ô sẽ hiện đúng tại vị trí ô trên sân.
   */
  private drawHighlight(): void {
    if (this.cellIndex < 0) return;
    const winner = this.boot.players[this.cellIndex];
    if (!winner) return;
    const color = Phaser.Display.Color.HexStringToColor(winner.colorHex).color;
    // (a) Vành ghế thắng — vẽ trong root, trên vành bàn.
    const rim = this.add.graphics();
    this.drawSeatRimGlow(rim, this.cellIndex, color);
    this.root.add(rim);
    // (b) Ánh sáng ô thắng — trong trayGroup, dưới lớp món nhưng trên
    // mặt mâm (kể cả texture gốm): chèn tại foodLayerIndex đã ghi ở
    // create (ngay sau liveGlow, trước buildFood).
    const glow = this.add.graphics();
    this.drawCellGlow(glow, this.cellIndex, color, 1.35);
    this.trayGroup.add(glow);
    this.trayGroup.moveTo(glow, Math.min(this.foodLayerIndex, this.trayGroup.list.length - 1));
  }

  private feedDegrade(delta: number): void {
    const level = this.boot.degrade.push(delta);
    if (level !== this.appliedDegrade) {
      this.appliedDegrade = level;
      // G2 không có particles/rung để cắt; bậc 1/2 ở G2 chỉ ghi nhận (bậc 2
      // hạ độ phân giải do stage.tsx thực thi qua Scale Manager). Việc ghi
      // bậc vào bản ghi ván là của P-CORE qua sự kiện này.
      EventBus.emit(STAGE_EVENTS.DEGRADED, { level } satisfies StageDegradedPayload);
    }
  }

  private emitFinished(): void {
    if (this.finishedEmitted) return;
    this.finishedEmitted = true;
    EventBus.emit(STAGE_EVENTS.FINISHED);
  }
}
