// g1-fx.spec.ts — Kiểm chứng logic thuần của lớp FX G1 (đợt FIX-V3,
// lane B): tint giảm trắng, flash trúng đòn KHÔNG trắng xoá, ngưỡng màu
// HP, highlight cột đơn nhất, hàng đợi/làn floater, neo đất đo từ atlas,
// và hình học gutter của chế độ đông. scenes-g1.ts chỉ biến các giá trị
// này thành hiệu ứng Phaser — mọi quyết định số đều chốt ở đây.

import { describe, expect, it } from 'vitest';
import {
  G1_FLOATER_MAX_TOTAL,
  G1_FLOATER_QUEUE_MAX,
  G1_FLOATER_QUEUE_TTL_MS,
  G1_FLOATER_PLATE_PAD,
  G1_FLOATER_STAGGER_MS,
  G1_HIT_FLASH_MIX,
  G1_HIT_FLASH_MIX_CRIT,
  G1_HIT_STAR_COLOR,
  G1_HIT_STAR_LIFE_MS,
  G1_HIT_STAR_RADIUS_PX,
  G1_HIT_STOP_MAX_MS,
  G1_HIT_STOP_MS,
  G1_HP_CRITICAL_RATIO,
  G1_HP_LOW_RATIO,
  G1_IDLE_BOB_HALF_PX,
  G1_PLATE_COMPACT_SCALES,
  G1_SPRITE_ANCHORS,
  G1_TINT_WHITE_MIX,
  G1ColumnHitTracker,
  G1FloaterDirector,
  G1HitStopClock,
  g1ActionGroundX,
  g1CountOverlappingPairs,
  g1DenseArena,
  g1FindNearestSafeSpot,
  g1FloaterSweptRect,
  g1GroundOffset,
  g1HeadOffset,
  g1HitFlashColor,
  g1HpBarColor,
  g1HpTextColor,
  g1HpTone,
  g1LayoutPlatesCompact,
  g1PickFloaterSpot,
  g1RectsOverlap,
  g1RunAnimTimeScale,
  g1SeparatePlates,
  g1SpriteAnchorOf,
  g1TintColorValue,
  mixHexColor,
  parseHexColor,
  type G1FloaterAnchors,
  type G1FloaterEntry,
  type G1Rect,
} from './g1-fx';

describe('tint thân (P1.10 — giảm trộn trắng)', () => {
  it('độ trộn trắng chốt 20% (không còn 60% như REBUILD-C)', () => {
    expect(G1_TINT_WHITE_MIX).toBe(0.2);
    expect(G1_TINT_WHITE_MIX).toBeLessThanOrEqual(0.2);
  });

  it('đen → xám 51 (20% về trắng), trắng giữ nguyên, kênh tính độc lập', () => {
    expect(g1TintColorValue('#000000')).toBe(0x333333);
    expect(g1TintColorValue('#ffffff')).toBe(0xffffff);
    // #1976D2: r 25→71, g 118→145, b 210→219 ở mức trộn 20%.
    expect(g1TintColorValue('#1976D2')).toBe((71 << 16) | (145 << 8) | 219);
  });

  it('mixHexColor kẹp ratio và parse được dạng #RGB', () => {
    expect(mixHexColor('#000', '#fff', 0.5)).toBe(0x808080);
    expect(mixHexColor('#000000', '#ffffff', 2)).toBe(0xffffff);
    expect(parseHexColor('zzzzzz')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('flash trúng đòn (P0.1 — cấm trắng xoá, pha ≤40% về ấm/danh tính)', () => {
  it('độ pha chốt: thường 30%, chí mạng 40% (trần cứng)', () => {
    expect(G1_HIT_FLASH_MIX).toBeLessThanOrEqual(0.4);
    expect(G1_HIT_FLASH_MIX_CRIT).toBeLessThanOrEqual(0.4);
    expect(G1_HIT_FLASH_MIX_CRIT).toBeGreaterThan(G1_HIT_FLASH_MIX);
  });

  it('không màu danh tính nào flash ra trắng hoặc gần trắng', () => {
    for (const hex of [
      '#FFA000',
      '#1976D2',
      '#0097A7',
      '#E64A19',
      '#512DA8',
      '#388E3C',
      '#C2185B',
    ]) {
      for (const crit of [false, true]) {
        const c = g1HitFlashColor(hex, crit);
        expect(c).not.toBe(0xffffff);
        const { r, g, b } = { r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff };
        // «Gần trắng» = cả 3 kênh ≥ 235 — flash phải giữ màu rõ.
        expect(Math.min(r, g, b)).toBeLessThan(235);
      }
    }
  });

  it('flash giữ hue danh tính: nạn nhân xanh dương vẫn trội kênh B, hồng vẫn trội kênh R', () => {
    const blue = g1HitFlashColor('#1976D2', false);
    expect(blue & 0xff).toBeGreaterThan((blue >> 16) & 0xff);
    const pink = g1HitFlashColor('#C2185B', true);
    expect((pink >> 16) & 0xff).toBeGreaterThan(pink & 0xff);
  });

  it('flash sáng hơn tint nền (đọc được là trúng đòn) nhưng đậm hơn trắng thuần', () => {
    const tint = g1TintColorValue('#1976D2');
    const flash = g1HitFlashColor('#1976D2', false);
    const lum = (c: number) =>
      ((c >> 16) & 0xff) * 0.3 + ((c >> 8) & 0xff) * 0.59 + (c & 0xff) * 0.11;
    // Kênh B (hue chính) của flash đậm hơn tint → màu «đậm lên» khi trúng.
    expect(flash & 0xff).toBeLessThan(tint & 0xff);
    expect(lum(flash)).toBeLessThan(250);
  });
});

describe('ngưỡng màu HP (P1.14 — chốt <30% cam, ≤15% đỏ)', () => {
  it('ngưỡng chốt đúng số đã công bố', () => {
    expect(G1_HP_LOW_RATIO).toBe(0.3);
    expect(G1_HP_CRITICAL_RATIO).toBe(0.15);
  });

  it('tone theo biên: 31% healthy, 30% low, 16% low, 15% critical, ngã → fallen', () => {
    expect(g1HpTone(109, 350, true)).toBe('healthy'); // 31.1%
    expect(g1HpTone(105, 350, true)).toBe('low'); // đúng 30%
    expect(g1HpTone(56, 350, true)).toBe('low'); // 16%
    expect(g1HpTone(52, 350, true)).toBe('critical'); // 14.9%
    expect(g1HpTone(53, 350, true)).toBe('low'); // 15.1% — trên ngưỡng đỏ
    expect(g1HpTone(0, 350, false)).toBe('fallen');
    expect(g1HpTone(0, 350, true)).toBe('fallen');
    expect(g1HpTone(350, 350, true)).toBe('healthy');
  });

  it('màu thanh + chữ khớp tone: xanh → cam #FF5722 → đỏ #DC2626', () => {
    expect(g1HpBarColor('healthy')).toBe(0x16a34a);
    expect(g1HpBarColor('low')).toBe(0xff5722);
    expect(g1HpBarColor('critical')).toBe(0xdc2626);
    expect(g1HpTextColor('critical')).toBe('#dc2626');
    expect(g1HpTextColor('low')).toBe('#c2410c');
    expect(g1HpTextColor('healthy')).toBe('#44403c');
  });
});

describe('highlight cột mép (P0.2 — đúng 1 hàng «vừa trúng đòn»)', () => {
  it('claim mới trả về người giữ trước để scene khôi phục hàng của họ', () => {
    const t = new G1ColumnHitTracker();
    expect(t.claim('an')).toBeNull();
    expect(t.holder).toBe('an');
    expect(t.claim('binh')).toBe('an');
    expect(t.holder).toBe('binh');
  });

  it('claim chính mình không trả về ai; release sai người không giải phóng', () => {
    const t = new G1ColumnHitTracker();
    t.claim('an');
    expect(t.claim('an')).toBeNull();
    expect(t.release('binh')).toBe(false);
    expect(t.holder).toBe('an');
    expect(t.release('an')).toBe(true);
    expect(t.holder).toBeNull();
  });
});

describe('floater FIX-V4: trần 2 toàn sân + FIFO + stagger + né plate tuyệt đối', () => {
  const STAGE: G1Rect = { x1: 8, y1: 8, x2: 892, y2: 892 };
  const anchorsAt = (x: number, y: number): G1FloaterAnchors => ({
    event: { x, y: y - 110 },
    damage: { x, y: y - 62 },
  });
  const ev = (targetId: string, at: number): G1FloaterEntry => ({
    targetId,
    kind: 'event',
    content: 'BỐP!',
    color: '#ffffff',
    damage: 0,
    crit: false,
    w: 96,
    h: 34,
    enqueuedAt: at,
  });
  const dmg = (targetId: string, damage: number, at: number): G1FloaterEntry => ({
    targetId,
    kind: 'damage',
    content: '',
    color: '#ffffff',
    damage,
    crit: false,
    w: 64,
    h: 34,
    enqueuedAt: at,
  });

  it('hằng số chốt: trần 2 toàn sân, stagger 200ms trong dải 150–250, hàng đợi ≤6, TTL 1,5s', () => {
    expect(G1_FLOATER_MAX_TOTAL).toBe(2);
    expect(G1_FLOATER_STAGGER_MS).toBeGreaterThanOrEqual(150);
    expect(G1_FLOATER_STAGGER_MS).toBeLessThanOrEqual(250);
    expect(G1_FLOATER_QUEUE_MAX).toBe(6);
    expect(G1_FLOATER_QUEUE_TTL_MS).toBe(1500);
  });

  it('trần 2: floater thứ ba (bất kỳ loại/nạn nhân nào) phải xếp hàng', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    expect(d.submit(ev('an', 0), 0, [], a, STAGE).type).toBe('show');
    expect(d.submit(dmg('an', 9, 0), 0, [], a, STAGE).type).toBe('show');
    expect(d.total).toBe(2);
    // Đầy 2 slot: đòn lên người khác → hàng đợi, không hiển thị.
    expect(d.submit(ev('binh', 0), 0, [], anchorsAt(600, 400), STAGE).type).toBe('queued');
    expect(d.total).toBe(2);
    expect(d.queued).toBe(1);
  });

  it('số sát thương của nạn nhân đang có số hiện → gộp vào floater đang hiện (merge-visible)', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    expect(d.submit(dmg('an', 9, 0), 0, [], a, STAGE).type).toBe('show');
    expect(d.submit(dmg('an', 7, 10), 10, [], a, STAGE).type).toBe('merge-visible');
    expect(d.total).toBe(1);
  });

  it('mỗi nạn nhân tối đa 1 chữ sự kiện đang hiện — chữ thứ hai xếp hàng, không đè', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    expect(d.submit(ev('an', 0), 0, [], a, STAGE).type).toBe('show');
    const second = d.submit(ev('an', 5), 5, [], a, STAGE);
    expect(second.type).toBe('queued');
    expect(d.hasEventLabel('an')).toBe(true);
    expect(d.activeFor('an')).toBe(1);
  });

  it('hàng đợi FIFO + stagger: nhả đúng thứ tự, cách nhau ≥200ms, chỉ khi có slot trống', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    const b = anchorsAt(620, 420);
    const first = d.submit(ev('an', 0), 0, [], a, STAGE);
    if (first.type !== 'show') throw new Error('kỳ vọng show');
    d.submit(dmg('an', 5, 0), 0, [], a, STAGE); // slot 2
    d.submit(ev('binh', 1), 1, [], b, STAGE); // chờ 1
    d.submit(dmg('binh', 12, 2), 2, [], b, STAGE); // chờ 2
    expect(d.queued).toBe(2);
    // Chưa ai tắt → pump không nhả gì.
    expect(d.pump(100, [], () => b, STAGE)).toEqual([]);
    // Tắt 1 floater: pump nhả ĐÚNG mục đầu hàng (sự kiện của Bình).
    d.release(first.show.id);
    const p1 = d.pump(300, [], (id) => (id === 'binh' ? b : a), STAGE);
    expect(p1).toHaveLength(1);
    expect(p1[0].type).toBe('show');
    if (p1[0].type === 'show') expect(p1[0].show.entry.content).toBe('BỐP!');
    expect(d.queued).toBe(1);
    // Trong nhịp stagger (300+200) pump không nhả tiếp dù còn slot.
    const shown = [...d.pump(350, [], () => b, STAGE)];
    expect(shown.filter((x) => x.type === 'show')).toHaveLength(0);
    // Hết stagger + có slot → nhả mục kế (số của Bình).
    const p2 = d.pump(500, [], () => b, STAGE);
    // total đang là 2 (dmg an + ev binh) → chưa có slot: pump không nhả.
    expect(p2.filter((x) => x.type === 'show')).toHaveLength(0);
  });

  it('hàng đợi: số sát thương chờ của cùng nạn nhân GỘP dồn; đầy 6 thì rớt yêu cầu mới', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    d.submit(ev('an', 0), 0, [], a, STAGE);
    d.submit(ev('binh', 0), 0, [], anchorsAt(620, 420), STAGE);
    // Đầy 2 slot hiển thị — mọi thứ sau vào hàng đợi.
    expect(d.submit(dmg('chi', 5, 0), 0, [], anchorsAt(450, 600), STAGE).type).toBe('queued');
    expect(d.submit(dmg('chi', 8, 10), 10, [], anchorsAt(450, 600), STAGE).type).toBe(
      'merged-queued',
    );
    expect(d.queued).toBe(1); // vẫn 1 mục, số đã gộp 5+8
    // Điền đầy hàng đợi tới 6 mục phân biệt.
    const ids = ['d1', 'd2', 'd3', 'd4', 'd5'];
    for (const id of ids) d.submit(ev(id, 20), 20, [], anchorsAt(200, 200), STAGE);
    expect(d.queued).toBe(6);
    expect(d.submit(ev('overflow', 30), 30, [], anchorsAt(200, 200), STAGE).type).toBe('dropped');
  });

  it('TTL: mục chờ quá 1,5s bị rớt; số sát thương hết hạn GỘP vào floater đang hiện của nạn nhân', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    const s1 = d.submit(dmg('an', 9, 0), 0, [], a, STAGE);
    if (s1.type !== 'show') throw new Error('kỳ vọng show');
    d.submit(ev('binh', 0), 0, [], anchorsAt(620, 420), STAGE); // slot 2
    d.submit(dmg('an', 100, 10), 10, [], a, STAGE); // an đã có số hiện → merge-visible ngay
    // Tạo mục chờ của Chi lúc t=20, để quá TTL.
    d.submit(ev('chi', 20), 20, [], anchorsAt(450, 600), STAGE);
    expect(d.queued).toBe(1);
    const acts = d.pump(2000, [], () => a, STAGE);
    expect(acts).toEqual([]); // sự kiện hết hạn → rớt thẳng, không merge
    expect(d.queued).toBe(0);
  });

  it('né plate: rect plate phủ vị trí mặc định → floater chọn LÀN KHÁC không giao plate', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(450, 460); // neo sự kiện (450, 350)
    // Plate phủ đúng làn mặc định (tâm 450,350, floater 96×34 + pad 4).
    const plate: G1Rect = { x1: 390, y1: 322, x2: 510, y2: 378 };
    const r = d.submit(ev('an', 0), 0, [plate], a, STAGE);
    expect(r.type).toBe('show');
    if (r.type === 'show') {
      const rect: G1Rect = {
        x1: r.show.x - 48,
        y1: r.show.y - 17,
        x2: r.show.x + 48,
        y2: r.show.y + 17,
      };
      expect(g1RectsOverlap(rect, plate, G1_FLOATER_PLATE_PAD)).toBe(false);
      expect(r.show.x === 450 && r.show.y === 350).toBe(false); // đã rời làn mặc định
    }
  });

  it('né plate tuyệt đối: MỌI làn đều bị plate phủ → floater Ở LẠI hàng đợi, không hiển thị', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(450, 460);
    const wall: G1Rect = { x1: 300, y1: 240, x2: 600, y2: 480 }; // phủ mọi làn quanh neo
    const r = d.submit(ev('an', 0), 0, [wall], a, STAGE);
    expect(r.type).toBe('queued');
    expect(d.total).toBe(0);
    // Plate dời đi → pump ở nhịp sau thả floater ra đúng vị trí sạch.
    const acts = d.pump(50, [], () => a, STAGE);
    expect(acts.some((x) => x.type === 'show')).toBe(true);
    expect(d.total).toBe(1);
  });

  it('hai floater đang hiện cũng là vật cản của nhau (rect giữ chỗ chừa quãng bay lên)', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(450, 460);
    const r1 = d.submit(ev('an', 0), 0, [], a, STAGE);
    const r2 = d.submit(ev('binh', 0), 0, [], a, STAGE); // cùng neo — phải sang làn khác
    expect(r1.type).toBe('show');
    expect(r2.type).toBe('show');
    if (r1.type === 'show' && r2.type === 'show') {
      expect(r1.show.x === r2.show.x && r1.show.y === r2.show.y).toBe(false);
    }
  });

  it('release trả slot: tổng giảm đúng, id lạ không phá trạng thái', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    const s = d.submit(ev('an', 0), 0, [], a, STAGE);
    if (s.type !== 'show') throw new Error('kỳ vọng show');
    d.release(9999);
    expect(d.total).toBe(1);
    d.release(s.show.id);
    expect(d.total).toBe(0);
    expect(d.hasEventLabel('an')).toBe(false);
  });
});

describe('tách plate lặp (FIX-V4 — chống chồng triệt để, ưu tiên đẩy dọc)', () => {
  const BOUNDS: G1Rect = { x1: 6, y1: 6, x2: 894, y2: 894 };
  const overlaps = (
    a: { x: number; y: number },
    aw: number,
    ah: number,
    b: { x: number; y: number },
    bw: number,
    bh: number,
  ) => Math.abs(a.x - b.x) < (aw + bw) / 2 + 4 && Math.abs(a.y - b.y) < (ah + bh) / 2 + 4;

  it('hai plate trùng tâm: tách dọc hoàn toàn, plate trước giữ nguyên chỗ', () => {
    const out = g1SeparatePlates(
      [
        { id: 'a', x: 450, y: 300, w: 150, h: 44 },
        { id: 'b', x: 450, y: 300, w: 150, h: 44 },
      ],
      BOUNDS,
    );
    const pa = out.get('a')!;
    const pb = out.get('b')!;
    expect(pa).toEqual({ x: 450, y: 300 });
    expect(overlaps(pa, 150, 44, pb, 150, 44)).toBe(false);
    expect(pb.y).toBeGreaterThan(pa.y); // đẩy dọc xuống
  });

  it('cụm 4 plate cùng một neo (pha hội tụ): sau pass KHÔNG còn cặp nào giao nhau', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ id, x: 450, y: 300, w: 160, h: 44 }));
    const out = g1SeparatePlates(items, BOUNDS);
    const pts = items.map((it) => ({ it, p: out.get(it.id)! }));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(overlaps(pts[i].p, 160, 44, pts[j].p, 160, 44)).toBe(false);
      }
    }
  });

  it('7 thẻ rút gọn (≥6 người) dồn một điểm: cùng pass, tách hết, vẫn trong sân', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      id: `t${i}`,
      x: 500,
      y: 260,
      w: 84,
      h: 22,
    }));
    const out = g1SeparatePlates(items, BOUNDS);
    const pts = items.map((it) => out.get(it.id)!);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(overlaps(pts[i], 84, 22, pts[j], 84, 22)).toBe(false);
      }
      expect(pts[i].y - 11).toBeGreaterThanOrEqual(BOUNDS.y1);
      expect(pts[i].y + 11).toBeLessThanOrEqual(BOUNDS.y2);
    }
  });

  it('chồng ở đáy sân: dồn cả cụm LÊN thay vì đẩy ra ngoài sân', () => {
    const items = [
      { id: 'a', x: 450, y: 880, w: 150, h: 44 },
      { id: 'b', x: 450, y: 884, w: 150, h: 44 },
    ];
    const out = g1SeparatePlates(items, BOUNDS);
    const pa = out.get('a')!;
    const pb = out.get('b')!;
    expect(overlaps(pa, 150, 44, pb, 150, 44)).toBe(false);
    expect(pb.y + 22).toBeLessThanOrEqual(BOUNDS.y2);
    expect(pa.y - 22).toBeGreaterThanOrEqual(BOUNDS.y1);
  });

  it('đã tách sẵn → giữ nguyên từng vị trí (pass là đồng nhất)', () => {
    const items = [
      { id: 'a', x: 200, y: 200, w: 150, h: 44 },
      { id: 'b', x: 600, y: 500, w: 150, h: 44 },
    ];
    const out = g1SeparatePlates(items, BOUNDS);
    expect(out.get('a')).toEqual({ x: 200, y: 200 });
    expect(out.get('b')).toEqual({ x: 600, y: 500 });
  });
});

describe('hit-stop (FIX-V4 — 90ms/đòn, cộng dồn tối đa 120ms)', () => {
  it('một đòn: đóng băng đúng 90ms', () => {
    const c = new G1HitStopClock();
    c.request(1000);
    expect(c.frozen(1000)).toBe(true);
    expect(c.frozen(1089)).toBe(true);
    expect(c.frozen(1090)).toBe(false);
  });

  it('nhiều đòn cùng tick không cộng dồn quá 120ms từ đòn gần nhất', () => {
    const c = new G1HitStopClock();
    c.request(1000);
    c.request(1010);
    c.request(1020);
    expect(c.until).toBeLessThanOrEqual(1020 + G1_HIT_STOP_MAX_MS);
    expect(c.until).toBe(1020 + G1_HIT_STOP_MS); // đòn cuối vẫn được trọn 90ms của nó
    // Đòn nối tiếp khi cửa sổ cũ chưa hết hẳn: không kéo dài vô hạn.
    const c2 = new G1HitStopClock();
    c2.request(0);
    c2.request(80); // còn 10ms của cửa sổ cũ
    expect(c2.until).toBeLessThanOrEqual(80 + G1_HIT_STOP_MAX_MS);
  });

  it('reset xoá cửa sổ đóng băng', () => {
    const c = new G1HitStopClock();
    c.request(500);
    c.reset();
    expect(c.frozen(510)).toBe(false);
  });
});

describe('chọn vị trí floater thuần (g1PickFloaterSpot)', () => {
  const STAGE: G1Rect = { x1: 8, y1: 8, x2: 892, y2: 892 };
  it('không vật cản → làn đầu tiên (trên đầu, giữa)', () => {
    expect(g1PickFloaterSpot({ x: 450, y: 350 }, 96, 34, [], STAGE)).toEqual({ x: 450, y: 350 });
  });
  it('làn đầu bị chặn → làn lệch trái; mọi làn bị chặn → null (chờ)', () => {
    const block: G1Rect = { x1: 400, y1: 330, x2: 500, y2: 370 };
    const spot = g1PickFloaterSpot({ x: 450, y: 350 }, 96, 34, [block], STAGE);
    expect(spot).not.toBeNull();
    // Đã rời làn mặc định (450,350) sang một làn sạch (ở đây: trên cụm).
    expect(spot!.x === 450 && spot!.y === 350).toBe(false);
    const rect: G1Rect = { x1: spot!.x - 48, y1: spot!.y - 17, x2: spot!.x + 48, y2: spot!.y + 17 };
    expect(g1RectsOverlap(rect, block, G1_FLOATER_PLATE_PAD)).toBe(false);
    const wall: G1Rect = { x1: 280, y1: 220, x2: 620, y2: 500 };
    expect(g1PickFloaterSpot({ x: 450, y: 350 }, 96, 34, [wall], STAGE)).toBeNull();
  });
  it('vị trí tràn sân bị loại (không chọn làn đẩy floater ra ngoài)', () => {
    const spot = g1PickFloaterSpot({ x: 30, y: 350 }, 96, 34, [], STAGE);
    expect(spot).not.toBeNull();
    expect(spot!.x - 48).toBeGreaterThanOrEqual(STAGE.x1);
  });
});

describe('neo đất theo action + nhịp chạy/idle (FIX-V4 mục 4+5)', () => {
  it('knight: trọng tâm run/dodge lệch hẳn idle (đo từ atlas thật) — có mục ghi đè', () => {
    const run = g1ActionGroundX('adventurers', 'knight', 'run');
    const dodge = g1ActionGroundX('adventurers', 'knight', 'dodge');
    expect(run).toBeCloseTo(0.384, 3);
    expect(dodge).toBeCloseTo(0.411, 3);
    // Action không lệch (punch) và nhân vật lạ → undefined (dùng neo tĩnh).
    expect(g1ActionGroundX('adventurers', 'knight', 'punchA')).toBeUndefined();
    expect(g1ActionGroundX('adventurers', 'mage', 'run')).toBeUndefined();
    expect(g1ActionGroundX('bo-la', 'knight', 'run')).toBeUndefined();
  });

  it('bob idle: tổng biên độ dọc = 2 × nửa biên độ = 10px', () => {
    expect(G1_IDLE_BOB_HALF_PX * 2).toBe(10);
  });

  it('run timeScale tỉ lệ với tốc độ di chuyển và bị kẹp [0,7 – 2,4]', () => {
    const slow = g1RunAnimTimeScale(0.4, 178);
    const fast = g1RunAnimTimeScale(0.8, 178);
    expect(fast).toBeCloseTo(slow * 2, 5); // gấp đôi tốc độ → gấp đôi nhịp chân
    expect(g1RunAnimTimeScale(0.01, 178)).toBe(0.7);
    expect(g1RunAnimTimeScale(9, 178)).toBe(2.4);
    expect(g1RunAnimTimeScale(0, 178)).toBe(1);
  });

  it('tia sao trúng đòn: màu ấm trung tính #FFC53D, bán kính ≤26px đường kính, sống ≤250ms', () => {
    expect(G1_HIT_STAR_COLOR).toBe(0xffc53d);
    expect(G1_HIT_STAR_RADIUS_PX * 2).toBeLessThanOrEqual(26);
    expect(G1_HIT_STAR_LIFE_MS).toBeLessThanOrEqual(250);
  });
});

describe('neo đất sprite (P0.3 — đo từ alpha bbox atlas thật)', () => {
  it('bảng neo đủ 5 model, chân KHÔNG ở đáy ô và lệch trái so với tâm ô (gốc lỗi vòng lệch)', () => {
    for (const model of ['knight', 'barbarian', 'mage', 'rogue', 'roguehooded']) {
      const a = G1_SPRITE_ANCHORS[model];
      expect(a).toBeDefined();
      expect(a.groundY).toBeLessThan(192); // chân trên đáy ô 30–38px
      expect(a.groundY).toBeGreaterThanOrEqual(154);
      expect(a.groundX).toBeLessThan(96); // lệch trái tâm ô
      expect(a.headTopY).toBeLessThan(a.groundY);
    }
    expect(g1SpriteAnchorOf('knight').groundX).toBe(56);
    expect(g1SpriteAnchorOf('model-la').groundY).toBe(161); // fallback
  });

  it('điểm đất ở trạng thái đứng yên: knight lệch (−40, −30)px ở cỡ 192', () => {
    const off = g1GroundOffset(g1SpriteAnchorOf('knight'), 192, {
      fallen: false,
      flipX: false,
      scaleYRatio: 1,
      angleDeg: 0,
    });
    expect(off.x).toBeCloseTo(-40, 5);
    expect(off.y).toBeCloseTo(-30, 5);
  });

  it('flipX gương điểm đất qua trục neo; ngã dùng neo fall (dịch phải + thấp hơn)', () => {
    const a = g1SpriteAnchorOf('knight');
    const stand = g1GroundOffset(a, 192, {
      fallen: false,
      flipX: false,
      scaleYRatio: 1,
      angleDeg: 0,
    });
    const flipped = g1GroundOffset(a, 192, {
      fallen: false,
      flipX: true,
      scaleYRatio: 1,
      angleDeg: 0,
    });
    expect(flipped.x).toBeCloseTo(-stand.x, 5);
    expect(flipped.y).toBeCloseTo(stand.y, 5);
    const fallen = g1GroundOffset(a, 192, {
      fallen: true,
      flipX: false,
      scaleYRatio: 1,
      angleDeg: 0,
    });
    expect(fallen.x).toBeGreaterThan(stand.x); // thân nằm dịch về +x
    expect(fallen.y).toBeGreaterThan(stand.y); // đáy thân nằm sát đất hơn
  });

  it('squash thân (scaleY 0.88) kéo điểm đất lên theo đúng tỉ lệ; nghiêng 0° là đồng nhất', () => {
    const a = g1SpriteAnchorOf('mage');
    const base = g1GroundOffset(a, 178, {
      fallen: false,
      flipX: false,
      scaleYRatio: 1,
      angleDeg: 0,
    });
    const squashed = g1GroundOffset(a, 178, {
      fallen: false,
      flipX: false,
      scaleYRatio: 0.88,
      angleDeg: 0,
    });
    expect(squashed.y).toBeCloseTo(base.y * 0.88, 5);
    expect(squashed.x).toBeCloseTo(base.x, 5);
  });

  it('đỉnh đầu: knight ở (groundX, 21) → lệch y ≈ −171px ở cỡ 192, trên điểm đất', () => {
    const head = g1HeadOffset(g1SpriteAnchorOf('knight'), 192, false);
    const ground = g1GroundOffset(g1SpriteAnchorOf('knight'), 192, {
      fallen: false,
      flipX: false,
      scaleYRatio: 1,
      angleDeg: 0,
    });
    expect(head.y).toBeCloseTo(-171, 5);
    expect(head.y).toBeLessThan(ground.y);
    expect(head.x).toBeCloseTo(ground.x, 5);
  });
});

describe('floater FIX-V4.1: quỹ đạo quét khi sinh + NÉ LIÊN TỤC khi đang sống', () => {
  const STAGE: G1Rect = { x1: 8, y1: 8, x2: 892, y2: 892 };
  const anchorsAt = (x: number, y: number): G1FloaterAnchors => ({
    event: { x, y: y - 110 },
    damage: { x, y: y - 62 },
  });
  const ev = (targetId: string, at: number): G1FloaterEntry => ({
    targetId,
    kind: 'event',
    content: 'BỐP!',
    color: '#ffffff',
    damage: 0,
    crit: false,
    w: 96,
    h: 34,
    enqueuedAt: at,
  });
  const dmg = (targetId: string, damage: number, at: number): G1FloaterEntry => ({
    targetId,
    kind: 'damage',
    content: '',
    color: '#ffffff',
    damage,
    crit: false,
    w: 64,
    h: 34,
    enqueuedAt: at,
  });

  it('quỹ đạo quét: plate cách điểm sinh 10px phía trên → làn mặc định bị loại (bản cũ chọn đúng làn này rồi bay vào plate)', () => {
    // Bằng chứng probe-b3-before: spawn (450,350) sạch tại điểm sinh,
    // bay lên 26px thì GIAO plate {390,276–510,320}. Sau vá: làn
    // (450,350) phải bị loại vì rect QUÉT của nó giao plate.
    const plate: G1Rect = { x1: 390, y1: 276, x2: 510, y2: 320 };
    const spot = g1PickFloaterSpot({ x: 450, y: 350 }, 96, 34, [plate], STAGE);
    expect(spot).not.toBeNull();
    expect(spot!.x === 450 && spot!.y === 350).toBe(false);
    const swept = g1FloaterSweptRect(spot!.x, spot!.y, 96, 34);
    expect(g1RectsOverlap(swept, plate, G1_FLOATER_PLATE_PAD)).toBe(false);
  });

  it('plate di chuyển VÀO floater đang sống → evade trả move tới chỗ sạch gần nhất, director cập nhật tâm', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400); // neo sự kiện (300, 290)
    const shown = d.submit(ev('an', 0), 0, [], a, STAGE);
    if (shown.type !== 'show') throw new Error('kỳ vọng show');
    expect(d.centerOf(shown.show.id)).toEqual({ x: 300, y: 290 });
    // Chưa có đe doạ → evade không làm gì.
    expect(d.evade([], STAGE)).toEqual([]);
    // Plate của frame SAU trượt xuống phủ đúng tâm floater.
    const plate: G1Rect = { x1: 240, y1: 262, x2: 360, y2: 318 };
    const actions = d.evade([plate], STAGE);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('move');
    if (actions[0].type === 'move') {
      expect(actions[0].id).toBe(shown.show.id);
      const swept = g1FloaterSweptRect(actions[0].x, actions[0].y, 96, 34);
      expect(g1RectsOverlap(swept, plate, G1_FLOATER_PLATE_PAD)).toBe(false);
      expect(d.centerOf(shown.show.id)).toEqual({ x: actions[0].x, y: actions[0].y });
      // Đã sạch → nhịp evade kế tiếp đứng yên (không nhảy loạn).
      expect(d.evade([plate], STAGE)).toEqual([]);
    }
  });

  it('né liên tục áp cho CẢ số sát thương (ca «−6»/«−7» chạm plate của pack v5)', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(500, 500); // neo số (500, 438)
    const shown = d.submit(dmg('chi', 6, 0), 0, [], a, STAGE);
    if (shown.type !== 'show') throw new Error('kỳ vọng show');
    const plate: G1Rect = { x1: 430, y1: 410, x2: 570, y2: 466 };
    const actions = d.evade([plate], STAGE);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('move');
  });

  it('hết chỗ sạch trong bán kính tìm → fade (plate thắng, không ở lại trong hộp plate)', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(450, 560); // neo sự kiện (450, 450)
    const shown = d.submit(ev('an', 0), 0, [], a, STAGE);
    if (shown.type !== 'show') throw new Error('kỳ vọng show');
    // Tường plate phủ trọn vùng ±250px quanh floater — mọi vị trí
    // trong bán kính tìm 192px đều nằm trong tường.
    const wall: G1Rect = { x1: 200, y1: 200, x2: 700, y2: 700 };
    const actions = d.evade([wall], STAGE);
    expect(actions).toEqual([{ type: 'fade', id: shown.show.id }]);
  });

  it('syncCenter: vị trí thật do tween bay lên được director dùng làm điểm né (không né theo điểm sinh cũ)', () => {
    const d = new G1FloaterDirector();
    const a = anchorsAt(300, 400);
    const shown = d.submit(ev('an', 0), 0, [], a, STAGE);
    if (shown.type !== 'show') throw new Error('kỳ vọng show');
    // Tween đã đưa floater lên (300, 268); plate chỉ phủ vùng MỚI này.
    d.syncCenter(shown.show.id, 300, 268);
    const plate: G1Rect = { x1: 240, y1: 240, x2: 360, y2: 296 };
    const actions = d.evade([plate], STAGE);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('move');
  });

  it('g1FindNearestSafeSpot: chỗ hiện tại sạch → giữ nguyên; bị chặn → điểm sạch gần nhất theo quét', () => {
    expect(g1FindNearestSafeSpot({ x: 450, y: 350 }, 96, 34, [], STAGE)).toEqual({
      x: 450,
      y: 350,
    });
    const block: G1Rect = { x1: 400, y1: 322, x2: 500, y2: 378 };
    const spot = g1FindNearestSafeSpot({ x: 450, y: 350 }, 96, 34, [block], STAGE);
    expect(spot).not.toBeNull();
    expect(
      g1RectsOverlap(g1FloaterSweptRect(spot!.x, spot!.y, 96, 34), block, G1_FLOATER_PLATE_PAD),
    ).toBe(false);
  });
});

describe('layout plate compact (FIX-V4.1 — cụm quá dày thì THU GỌN, không chồng)', () => {
  it('g1CountOverlappingPairs: trùng tâm = 1 cặp, tách sẵn = 0', () => {
    expect(
      g1CountOverlappingPairs([
        { x: 100, y: 100, w: 100, h: 40 },
        { x: 100, y: 100, w: 100, h: 40 },
      ]),
    ).toBe(1);
    expect(
      g1CountOverlappingPairs([
        { x: 100, y: 100, w: 100, h: 40 },
        { x: 400, y: 400, w: 100, h: 40 },
      ]),
    ).toBe(0);
  });

  it('cụm 4 plate KHÔNG đủ chỗ ở cỡ nguyên (bounds hẹp 300×200 — ca kẹt của probe-b3-before) → compact, 0 cặp giao', () => {
    const bounds: G1Rect = { x1: 228, y1: 200, x2: 528, y2: 400 };
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ id, x: 380, y: 300, w: 170, h: 44 }));
    // Đối chứng: pass cũ ở cỡ nguyên còn 3 cặp giao (hai plate trùng điểm).
    const raw = g1SeparatePlates(items, bounds, 4);
    const rawRects = items.map((it) => ({ ...raw.get(it.id)!, w: it.w, h: it.h }));
    expect(g1CountOverlappingPairs(rawRects, 4)).toBeGreaterThan(0);
    const out = g1LayoutPlatesCompact(items, bounds, 4);
    const rects = items.map((it) => out.get(it.id)!);
    expect(g1CountOverlappingPairs(rects, 4)).toBe(0);
    for (const r of rects) {
      expect(r.scale).toBeLessThan(1);
      expect(r.scale).toBeGreaterThanOrEqual(
        G1_PLATE_COMPACT_SCALES[G1_PLATE_COMPACT_SCALES.length - 1],
      );
      expect(r.w).toBeCloseTo(170 * r.scale, 5);
      expect(r.h).toBeCloseTo(44 * r.scale, 5);
      // Vẫn nằm trong bounds ở kích thước hiệu dụng.
      expect(r.x - r.w / 2).toBeGreaterThanOrEqual(bounds.x1);
      expect(r.x + r.w / 2).toBeLessThanOrEqual(bounds.x2);
    }
  });

  it('cụm thường đủ chỗ → scale 1 (không thu oan), vị trí khớp pass tách gốc', () => {
    const bounds: G1Rect = { x1: 6, y1: 6, x2: 894, y2: 894 };
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ id, x: 450, y: 300, w: 160, h: 44 }));
    const out = g1LayoutPlatesCompact(items, bounds, 4);
    const raw = g1SeparatePlates(items, bounds, 4);
    for (const it of items) {
      const r = out.get(it.id)!;
      expect(r.scale).toBe(1);
      expect(r.x).toBe(raw.get(it.id)!.x);
      expect(r.y).toBe(raw.get(it.id)!.y);
    }
    expect(g1CountOverlappingPairs([...out.values()], 4)).toBe(0);
  });

  it('7 thẻ rút gọn dồn một điểm ở sân đầy đủ → scale 1, tách hết (không regress ca FIX-V4)', () => {
    const bounds: G1Rect = { x1: 6, y1: 6, x2: 894, y2: 894 };
    const items = Array.from({ length: 7 }, (_, i) => ({
      id: `t${i}`,
      x: 500,
      y: 260,
      w: 84,
      h: 22,
    }));
    const out = g1LayoutPlatesCompact(items, bounds, 4);
    expect(g1CountOverlappingPairs([...out.values()], 4)).toBe(0);
    for (const r of out.values()) expect(r.scale).toBe(1);
  });
});

describe('bố cục chế độ đông (P0.2 — gutter trái cố định)', () => {
  it('sân 900, gutter 222, sprite 164 → tâm 561 và mép sprite trái nhất ≥ gutter + lề', () => {
    const arena = g1DenseArena(900, 222, 164);
    expect(arena.centerX).toBe(561);
    const leftVisualEdge = arena.centerX - arena.maxClusterRadius - 164 / 2;
    expect(leftVisualEdge).toBeGreaterThanOrEqual(222);
    const rightVisualEdge = arena.centerX + arena.maxClusterRadius + 164 / 2;
    expect(rightVisualEdge).toBeLessThanOrEqual(900);
  });

  it('sprite nhỏ hơn thì cụm được phép rộng hơn (trần tăng)', () => {
    expect(g1DenseArena(900, 222, 150).maxClusterRadius).toBeGreaterThan(
      g1DenseArena(900, 222, 164).maxClusterRadius,
    );
  });
});
