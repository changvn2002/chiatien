'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { assignIdentityColors, initialsOf } from '@/lib/identity';
import { formatVND } from '@/lib/money';
import type { Member, Session, Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from './ui-bits';
import { loadOpenedSlips, saveOpenedSlips, SLIP_GRID_ANIMATED_MAX } from './phieu';

/**
 * PHIẾU GẤP — HƯỚNG A «GIẤY THẬT» (REDESIGN R2, mock thắng A +
 * R1-SYNTHESIS thắng mock ở mọi điểm xung đột): phiếu là một TỜ GIẤY
 * thật đặt trên mặt bàn xám trung tính — bóng đổ mềm nhiều lớp bám
 * silhouette (kể cả rìa xé răng cưa rất nhẹ ở chân phiếu), hạt giấy
 * nhẹ, nếp gấp ĐÚNG 50% là dải bóng gấp nhìn rõ ở mobile. Thân phiếu
 * KHÔNG kẻ ngang kiểu vở học sinh (sửa bắt buộc #4): giấy trắng có hạt,
 * tối đa các kẻ đôi ở đầu/chân phiếu như trang sổ. TUYỆT ĐỐI không yếu
 * tố phong bì (không nắp, không seam chéo, không miệng bì).
 *
 * Dấu mực cam #FF5722: vòng KÉP mép mực hơi gồ (feTurbulence +
 * feDisplacementMap). R5 (mục 1+2): dấu NIÊM vắt qua nếp gấp — phiếu
 * đóng: nguyên dấu, tâm nằm đúng trên đường nếp 50% ở phía phải
 * phiếu; phiếu mở: dấu XÉ ĐÔI tại đường nếp. R6 (mục 1+2): phương
 * sai của dấu đóng PHẢI sống ở cỡ thumbnail (góc ±26°, lệch ngang
 * ±14px, lệch dọc ±10px, mực 0.60–0.95, tỉ lệ 0.85–1.15, seed mực
 * riêng từng phiếu; xem sealVariant) và dấu KHÔNG chạm ký tự nào —
 * cột chữ của phiếu đóng được bố cục lại để vùng nếp/dấu là giấy
 * trống thật (xem ghi chú mặt phiếu đóng). Phiếu mở bỏ hẳn nắp
 * nghiêng phối cảnh: nắp nằm PHẲNG trên mặt trong (flat-lay), hai
 * cạnh gặp nhau tại nếp là CẠNH XÉ XƠ bất quy tắc theo member.id,
 * nửa dấu trên nắp LỆCH ngang 3–5px + xoay thêm 4–7° so với nửa
 * dưới nên hai nửa KHÔNG hợp thành vòng hoàn hảo — đó là dấu xé.
 * Mực dấu bị kẹp trong đĩa dấu (clipPath r=58 + hình học thu nhỏ)
 * nên không chấm mực nào lạc ra ngoài vòng.
 * Seed chỉ ở: (i) đoạn seed ngắn trên kẻ đôi đầu phiếu, (ii) vòng dấu,
 * (iii) cạnh phiếu đang mở.
 *
 * MINOR-3 (Panel #07): TOÀN BỘ thẻ phiếu là vùng chạm mở phiếu — thẻ
 * là một vùng bấm thống nhất (onClick trên toàn thẻ, con trỏ pointer);
 * nút đầu phiếu giữ vai trò bàn phím/screen-reader và chặn lan truyền
 * để không bấm đúp; nút QR trong phiếu cũng chặn lan truyền.
 *
 * Mở phiếu (§1.4/§5): 1 chạm, 240ms khoá cứng, --ease-lock, overshoot
 * 0, không xoay; nội dung (tên + lệnh + số chính xác + nút VietQR từng
 * lệnh) có trong DOM và hiển thị từ frame đầu — lớp gấp chỉ là vệt
 * sáng chạy trên bề mặt, chạm lần nữa -> frame cuối ngay;
 * reduced-motion -> hiện thẳng tĩnh. Avatar TĨNH tuyệt đối (C8).
 */

export type SlipQrRequest = { transferIndex: number };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Cuộn phiếu vào sân khấu của vùng chứa cuộn gần nhất (dùng chung
    cho chuyển trạng thái mở + dàn lại sau khi sửa phiên, việc 6 R9).
    Nuốt mọi lỗi của môi trường không hỗ trợ (jsdom). */
function scrollSlipIntoStage(el: HTMLElement | null) {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  const scroll = () => {
    try {
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
    } catch {
      /* môi trường không hỗ trợ cuộn lập trình — phiếu vẫn mở đúng */
    }
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(scroll);
  } else {
    scroll();
  }
}

/** Kẻ đôi đầu phiếu: đoạn seed ngắn (i) + vệt mực đậm, vệt hai xám. */
function SlipTopRule() {
  return (
    <div aria-hidden>
      <div className="flex items-center">
        <span className="h-[3px] w-8 shrink-0 bg-brand-500" />
        <span className="h-[2.5px] flex-1 bg-grey-800" />
      </div>
      <div className="mt-[3px] h-px bg-grey-500" />
    </div>
  );
}

/* R3 (panel R2 mục 7): chân phiếu KHÔNG còn hai đường kẻ đôi lặp y hệt
   ở mọi phiếu (đọc như placeholder/wireframe) — danh tính chân phiếu là
   rìa xé răng cưa ở dưới cùng thẻ. */

/* Băm tất định theo (memberId, salt): FNV-1a trên chuỗi + salt, chốt
   bằng splitmix32 finalizer. Lý do giữ từ R5: không xáo, các id liên
   tiếp (m1/m2/m3…) cho hash cách nhau đúng 1 nên mọi trường trích
   theo modulo đều gần như trùng nhau — gốc của «dấu clone ở cấp
   lưới». Mỗi trường của biến thể lấy một salt riêng nên các trường
   độc lập nhau. Mọi trích dùng >>> (không dấu): >> trên số 32-bit có
   bit cao sẽ cho dư ÂM và đẩy giá trị ra khỏi khoảng kê đơn. */
function rand32(memberId: string, salt: number): number {
  let h = 2166136261 >>> 0;
  const s = `${memberId}#${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let x = (h ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

/* R6 (mục 2a): dấu niêm VẮT QUA NẾP GẤP — tâm dấu nằm ĐÚNG trên đường
   nếp ngang 50% của phiếu đóng, phía phải phiếu.
   R10 (việc 3 — MỘT ẤN BẢN NGUYÊN RỒI MỚI XẺ): panel R9 bắt hai lỗi
   cùng một gốc «biến thiên sinh theo từng mảnh»: (ii) vật ngắt giữa
   hai nửa dấu mở ĐỔI ĐỘ DÀY giữa các phiếu (tearGap 3–6px theo hạt
   giống ở R8/R9) và tick hai mẩu lệch đường thẳng; (iii) dấu đóng
   thành HAI HỌ hình học vì phương sai biến hình còn quá tay. R10
   thu hình học về đúng biên độ của MỘT con dấu vật lý đóng nhiều
   lần: góc ±5°, tỉ lệ 0.96–1.04, dy ±2px, dx ±3px (right = 16+dx);
   tearGap thành HẰNG SỐ 4px cho mọi thành viên — độ dày vật ngắt
   giống hệt trên mọi phiếu. GIỮ NGUYÊN: seed, mực tổng 0.60–0.95,
   paperTilt, toàn bộ hệ mực xốp (sealInk/ringInk/tickInk, filter
   vòng theo seed thành viên, filter tick seed cố định 7). Dấu mở
   không còn hai nửa dựng riêng: xem SealImprint + overlay ở
   SlipCard — MỘT ấn bản duy nhất trong hệ toạ độ khung phiếu mở,
   bị hai đa giác giấy (nắp / mặt trong) xẻ ra. */
function sealVariant(memberId: string): {
  angle: number;
  seed: number;
  dx: number;
  dy: number;
  scale: number;
  opacity: number;
  /** Lệch ngang của dấu tính từ mép phải (16px gốc + dx −3..+3). */
  right: number;
  /** R10 (việc 3): khe giấy xé tại nếp của phiếu mở — HẰNG SỐ 4px
      cho MỌI thành viên (R8/R9: 3–6px theo hạt giống → vật ngắt
      đổi độ dày giữa các phiếu, panel R9 kết tội). Độ dày vật ngắt
      là tính chất của VẾT XÉ GIẤY, không phải của lần đóng dấu. */
  tearGap: number;
  /** Xoay CỘNG THÊM của nửa dấu trên: giữ ở 0 từ R9 — từ R10 dấu
      mở là một ấn bản nguyên bị xẻ (overlay), không còn nửa riêng
      để cộng góc; trường này chỉ còn ghi lại luật đó. */
  tearRot: number;
  /** R4 (mục 4): phương sai GIẤY — mỗi tờ đặt trên bàn lệch ±0,5°. */
  paperTilt: number;
} {
  const dx = (rand32(memberId, 3) % 7) - 3;
  return {
    // R10 (việc 3): hình học thu về biên độ một con dấu vật lý —
    // góc ±5°, dy ±2px, dx ±3px, tỉ lệ 0.96–1.04 (xem docblock trên).
    angle: (rand32(memberId, 1) % 11) - 5,
    seed: (rand32(memberId, 2) % 89) + 7,
    dx,
    dy: (rand32(memberId, 4) % 5) - 2,
    scale: 0.96 + (rand32(memberId, 5) % 9) / 100,
    opacity: 0.6 + (rand32(memberId, 6) % 36) / 100,
    right: 16 + dx,
    // R10 (việc 3): tearGap = HẰNG SỐ 4 cho mọi thành viên.
    tearGap: 4,
    tearRot: 0,
    paperTilt: ((rand32(memberId, 11) % 11) - 5) / 10,
  };
}

/* R6 (mục 1b + 4): SILHOUETTE XÉ bất quy tắc theo member.id — dãy
   lệch px tại 13 điểm trải đều bề ngang (bước 0,1px, biên độ ±3px
   cho cạnh nếp, sâu 3,0–5,8 cho chân phiếu). Hai cạnh đối nhau qua
   đường nếp dùng CHUNG một dãy lệch (cùng salt) nên chúng là hai
   phía của MỘT vết xé duy nhất; chân phiếu dùng salt khác. */
const TEAR_POINTS = 13;
function tornOffsets(memberId: string, salt: number): number[] {
  return Array.from(
    { length: TEAR_POINTS },
    (_, i) => ((rand32(memberId, salt * 100 + i) % 61) - 30) / 10,
  );
}
function tornDepths(memberId: string): number[] {
  return Array.from({ length: 15 }, (_, i) => (30 + (rand32(memberId, 900 + i) % 29)) / 10);
}
const tearX = (i: number, n: number) => Math.round((i / (n - 1)) * 1000) / 10;
const tearCalc = (o: number) => `calc(100% ${o < 0 ? '-' : '+'} ${Math.abs(o)}px)`;

/**
 * R6 (mục 4): CHÂN PHIẾU = cạnh xé bất quy tắc theo member.id (SVG
 * silhouette riêng từng phiếu, biên độ nhỏ 3,0–5,8/6px) — thay sóng
 * tam giác đều của R2–R5 mà panel R5 kết tội «răng cưa đồng loạt =
 * tín hiệu xé vé». Bóng .slip-shadow ở phần tử cha bám theo alpha
 * của SVG như bám theo div .torn-edge cũ.
 */
function TornEdge({ memberId, fill }: { memberId: string; fill: string }) {
  const depths = tornDepths(memberId);
  const n = depths.length;
  const bottom = depths
    .map((d, i) => `L ${tearX(i, n)} ${d}`)
    .reverse()
    .join(' ');
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      className="block h-[6px] w-full"
    >
      <path d={`M 0 0 L 100 0 L 100 ${depths[n - 1]} ${bottom} L 0 ${depths[0]} Z`} fill={fill} />
    </svg>
  );
}

/* R7 (mục 1): NGÔN NGỮ MỰC XỐP cho dấu nhỏ — cùng hệ mực với dấu lớn
   «ĐÃ CHỐT» trên thẻ hoàn tất. Panel R6 chẩn đoán gốc: phương sai
   BIẾN HÌNH (góc/vị trí/tỉ lệ/mực tổng) đã có nhưng mắt vẫn đọc
   «icon verified đúc khuôn» vì HÌNH NÉT quá sạch — vòng liền nét đều,
   tick hoàn hảo. R7 thêm phương sai MỰC (hình dạng nét) theo hạt
   giống member.id (salt riêng, không đụng các trường biến hình cũ):
   - vòng NGOÀI + vòng TRONG không còn là đường tròn liền: mỗi vòng
     gãy thành các cung bởi 1–3 (ngoài) / 1–2 (trong) KHOẢNG MẤT MỰC
     ở vị trí + độ dài riêng từng phiếu;
   - mỗi cung mang nét dày/mỏng và độ đậm RIÊNG (mực đóng tay chỗ
     đậm chỗ nhạt dọc vòng);
   - tick gãy thành 2–3 đoạn bởi 1–2 khoảng đứt nhỏ theo hạt giống,
     mỗi đoạn nét + đậm riêng — không còn tick «hoàn hảo».
   Cộng với lọc displacement tăng hiệu lực ở cỡ 44px (xem SealStamp:
   baseFrequency 0,085→0,12, octaves 3→4, scale 5,2→5,6, hình học
   thu nhẹ r 50→48,5 / 37→36 để mép mực + displacement vẫn nằm
   trong đĩa clip r=58), 12 dấu của nhóm 12 không có hai dấu nào là
   cùng một «lần đóng». */
type InkSeg = { d: string; w: number; o: number };

function polarPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polarPoint(cx, cy, r, startDeg);
  const e = polarPoint(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const f = (n: number) => Math.round(n * 100) / 100;
  return `M ${f(s.x)} ${f(s.y)} A ${r} ${r} 0 ${large} 1 ${f(e.x)} ${f(e.y)}`;
}

/** Một vòng dấu = các cung còn mực sau khi trừ các khoảng mất mực. */
function ringInk(
  memberId: string,
  salt: number,
  r: number,
  gapCount: number,
  baseW: number,
  wSwing: number,
): InkSeg[] {
  const gaps = Array.from({ length: gapCount }, (_, i) => ({
    start: rand32(memberId, salt + i * 3) % 360,
    len: 9 + (rand32(memberId, salt + 40 + i * 3) % 15), // mất mực 9–23°
  })).sort((a, b) => a.start - b.start);
  const segs: InkSeg[] = [];
  for (let i = 0; i < gaps.length; i++) {
    const start = gaps[i].start + gaps[i].len;
    let end = gaps[(i + 1) % gaps.length].start;
    if (i === gaps.length - 1) end += 360;
    if (end - start < 14) continue; // vụn cung quá ngắn — bỏ, đọc như mất mực thêm
    segs.push({
      d: arcPath(60, 60, r, start, end),
      w:
        Math.round(
          (baseW + (((rand32(memberId, salt + 80 + i * 7) % 25) - 12) / 10) * (wSwing / 1.2)) * 10,
        ) / 10,
      o: Math.round(58 + (rand32(memberId, salt + 120 + i * 7) % 42)) / 100, // đậm cung 0,58–0,99
    });
  }
  return segs;
}

/** Tick = các đoạn còn mực sau khi trừ 1–2 khoảng đứt dọc thân tick. */
function tickInk(memberId: string, salt: number): InkSeg[] {
  const pts = [
    { x: 40, y: 62 },
    { x: 53, y: 75 },
    { x: 81, y: 45 },
  ];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = cum[cum.length - 1];
  const pointAt = (d: number): { x: number; y: number } => {
    for (let i = 1; i < cum.length; i++) {
      if (d <= cum[i] || i === cum.length - 1) {
        const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
        return {
          x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * Math.min(1, Math.max(0, t)),
          y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * Math.min(1, Math.max(0, t)),
        };
      }
    }
    return pts[pts.length - 1];
  };
  const pathFor = (d0: number, d1: number): string => {
    const f = (n: number) => Math.round(n * 100) / 100;
    const chain = [pointAt(d0)];
    for (let i = 1; i < pts.length - 1; i++) {
      if (cum[i] > d0 && cum[i] < d1) chain.push(pts[i]);
    }
    chain.push(pointAt(d1));
    return chain.map((p, i) => `${i === 0 ? 'M' : 'L'} ${f(p.x)} ${f(p.y)}`).join(' ');
  };
  const gapCount = 1 + (rand32(memberId, salt) % 2);
  const gaps = Array.from({ length: gapCount }, (_, i) => {
    const start = total * (0.24 + i * 0.34 + (rand32(memberId, salt + 10 + i * 5) % 10) / 100);
    const len = total * (0.07 + (rand32(memberId, salt + 30 + i * 5) % 5) / 100); // đứt 7–11% thân tick
    return { start, len };
  }).sort((a, b) => a.start - b.start);
  const segs: InkSeg[] = [];
  let cursor = 0;
  const intervals: { from: number; to: number }[] = [];
  for (const g of gaps) {
    if (g.start > cursor) intervals.push({ from: cursor, to: g.start });
    cursor = Math.max(cursor, g.start + g.len);
  }
  if (cursor < total) intervals.push({ from: cursor, to: total });
  intervals.forEach((iv, i) => {
    if (iv.to - iv.from < 2) return;
    segs.push({
      d: pathFor(iv.from, iv.to),
      // R9 (việc 4): ĐÓNG BĂNG hình tick — nét tick CỐ ĐỊNH 6,8 cho
      // MỌI thành viên/đoạn; hạt giống CHỈ biến MỰC của tick (khoảng
      // đứt ở trên + độ đậm đoạn ở dưới), không biến bề rộng nét.
      w: 6.8,
      o: Math.round(78 + (rand32(memberId, salt + 90 + i * 7) % 23)) / 100, // đậm đoạn 0,78–1,00
    });
  });
  return segs;
}

function sealInk(memberId: string): { outer: InkSeg[]; inner: InkSeg[]; tick: InkSeg[] } {
  return {
    outer: ringInk(memberId, 210, 48.5, 1 + (rand32(memberId, 21) % 3), 5.5, 1.2),
    inner: ringInk(memberId, 320, 36, 1 + (rand32(memberId, 22) % 2), 2.4, 0.6),
    tick: tickInk(memberId, 430),
  };
}

/* R10 (việc 4 — NẮP ĐỔI CHẤT LIỆU): panel R9 phán thớ vẽ tay của
   R8/R9 vẫn 0 sợi đếm được ở cận 2× («vệt cong như tóc vẽ») — XOÁ
   HẲN fibers + blotches. Chất giấy của nắp nay do TRƯỜNG HẠT MỊN
   (.slip-flap-grain trong globals.css, feTurbulence fractalNoise)
   gánh — hạt đếm được ở 2× như giấy thật. Hàm này chỉ còn tính
   GHOST: độ đậm xuyên của từng glyph lấy theo MẬT ĐỘ MỰC THẬT của
   mặt trước (R10 hiệu chuẩn lại: tên 0.27 đậm nhất — chữ lớn mực
   đen đặc; đoạn seed cam kẻ đầu 0.22; kẻ đôi đen 0.15; wordmark
   0.11 — mực xám 500 nhỏ; kẻ mảnh 0.06 nhạt nhất) + jitter ±0,02
   theo hạt giống thành viên. Avatar ghost KHÔNG còn đĩa đặc: vòng
   tròn 0.10 + initials 0.12 (cố định, xem JSX nắp). */
function flapGhost(memberId: string): {
  word: number;
  seed: number;
  rule: number;
  ruleThin: number;
  name: number;
} {
  const jitter = (salt: number) => ((rand32(memberId, salt) % 5) - 2) / 100; // ±0,02
  return {
    word: 0.11 + jitter(850),
    seed: 0.22 + jitter(852),
    rule: 0.15 + jitter(854),
    ruleThin: 0.06 + jitter(856),
    name: 0.27 + jitter(860),
  };
}

/**
 * Vòng dấu chốt (ii): vòng kép mực cam mép gồ. R7 (mục 1): nét
 * không còn là vòng liền — sealInk gãy mỗi vòng thành các cung bởi
 * khoảng mất mực theo hạt giống, tick cũng đứt đoạn (xem khối
 * sealInk ở trên); lọc displacement tăng hiệu lực (0,12 / 4 octaves
 * / scale 5,6).
 * R6 (mục 1d) + R7: mực bị KẸP TRONG ĐĨA DẤU — hình học vòng ngoài
 * r=48,5 (mép mực xa nhất = 48,5 + 3,35 + displacement 5,6 =
 * 57,45) và nhóm mực còn bị clip bằng đĩa r=58 trong viewBox 120;
 * vùng lọc thu về đúng khung svg (100%) nên không cơ chế nào sơn
 * mực ra ngoài khung dấu được nữa.
 *
 * R10 (việc 3 — MỘT ẤN BẢN NGUYÊN RỒI MỚI XẺ): thân SVG của dấu
 * tách thành component nội bộ DÙNG CHUNG SealImprint — defs/filter/
 * mực/transform rotate(angle) scale(scale) theo sealVariant; vị
 * trí + opacity do props quyết định. Hai thể dùng:
 * - phiếu ĐÓNG (44px): SealStamp bọc SealImprint, nguyên dấu, tâm
 *   nằm trên nếp gấp 50% (top = 50% − 22px + dy) ở phía phải phiếu
 *   (right theo biến thể), mực tổng theo biến thể đóng.
 * - phiếu MỞ (56px): KHÔNG còn hai nửa part="top"/"bottom" neo ở
 *   hai cha khác nhau (cơ chế R6–R9: hai nửa dựng độc lập nên khe
 *   ngắt đổi độ dày và tick hai mẩu lệch đường thẳng — panel R9).
 *   SlipCard dựng MỘT overlay trong hệ toạ độ KHUNG phiếu mở: hai
 *   bản sao SealImprint TRÙNG vị trí tuyệt đối (tâm tại giữa khe
 *   xé: top = 128 + tearGap/2 − 28, right = openRight), mỗi bản bị
 *   clip bởi đúng đa giác GIẤY của phía nó (nắp / mặt trong). Ở
 *   mọi x, vật ngắt = đúng tearGap 4px; hai mẩu tick là hai mảnh
 *   của MỘT bản vẽ nên nối thẳng qua khe.
 * Cơ chế dấu-bóc-gạt-góc của R4 đã XOÁ hẳn từ R5.
 */
function SealImprint({
  memberId,
  size,
  opacity,
  style,
  className,
  sealPart,
}: {
  memberId: string;
  size: number;
  opacity: number;
  style?: CSSProperties;
  className?: string;
  sealPart?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { angle, seed, scale } = sealVariant(memberId);
  const ink = sealInk(memberId);
  return (
    <svg
      aria-hidden
      data-seal-part={sealPart}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{
        opacity,
        // Toàn bộ dấu xoay như MỘT vật cứng theo `angle` + tỉ lệ
        // theo biến thể — không chi tiết nào xoay/biến dạng độc lập.
        transform: `rotate(${angle}deg) scale(${scale})`,
        ...style,
      }}
    >
      <defs>
        {/* R7 (mục 1): tăng hiệu lực displacement ở cỡ nhỏ — nhiễu
            mịn hơn (0,085→0,12, octaves 3→4) và biên độ 5,2→5,6;
            hình học vòng thu về r=48,5/36 nên mép mực xa nhất
            48,5 + 3,35 + 5,6 = 57,45 vẫn trong đĩa clip r=58. */}
        <filter id={`ink-${uid}`} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.12"
            numOctaves="4"
            seed={seed}
            result="n"
          />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5.6" />
        </filter>
        {/* R9 (việc 4): filter RIÊNG cho tick với hạt giống CỐ ĐỊNH
            7 cho MỌI thành viên — độ sờn mép mực của tick giống hệt
            nhau ở mọi lần đóng; hạt giống theo thành viên chỉ còn
            biến MỰC của tick (khoảng đứt + độ đậm đoạn trong
            tickInk), không biến HÌNH tick nữa. */}
        <filter id={`inktick-${uid}`} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.12"
            numOctaves="4"
            seed={7}
            result="n"
          />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5.6" />
        </filter>
        <clipPath id={`sealclip-${uid}`}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
      </defs>
      <g
        filter={`url(#ink-${uid})`}
        clipPath={`url(#sealclip-${uid})`}
        fill="none"
        stroke="#FF5722"
        strokeLinecap="round"
      >
        {ink.outer.map((s, i) => (
          <path key={`o${i}`} d={s.d} strokeWidth={s.w} strokeOpacity={s.o} />
        ))}
        {ink.inner.map((s, i) => (
          <path key={`i${i}`} d={s.d} strokeWidth={s.w} strokeOpacity={s.o} />
        ))}
      </g>
      <g
        filter={`url(#inktick-${uid})`}
        clipPath={`url(#sealclip-${uid})`}
        fill="none"
        stroke="#FF5722"
        strokeLinecap="round"
      >
        {ink.tick.map((s, i) => (
          <path
            key={`t${i}`}
            d={s.d}
            strokeWidth={s.w}
            strokeOpacity={s.o}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}

/** Dấu ĐÓNG (phiếu đóng, 44px): nguyên ấn bản qua SealImprint —
    tâm trên nếp gấp 50%, phía phải phiếu, mực theo biến thể. */
function SealStamp({ memberId }: { memberId: string }) {
  const { dy, opacity, right } = sealVariant(memberId);
  return (
    <SealImprint
      memberId={memberId}
      size={44}
      opacity={opacity}
      sealPart="whole"
      className="pointer-events-none absolute z-[3] mix-blend-multiply"
      style={{ top: `calc(50% - 22px + ${dy}px)`, right: `${right}px` }}
    />
  );
}

export function SlipCard({
  session,
  member,
  colorIndex,
  balances,
  transfers,
  open,
  opening,
  staticMode,
  onToggle,
  onOpenQr,
  closedMaxW = 'max-w-[300px]',
}: {
  session: Session;
  member: Member;
  colorIndex: number;
  balances: Record<string, number>;
  transfers: Transfer[];
  open: boolean;
  opening: boolean;
  /** Chế độ tĩnh (nhóm đông vượt ngưỡng / reduced-motion): không lớp gấp. */
  staticMode: boolean;
  onToggle: () => void;
  onOpenQr: (transferIndex: number) => void;
  /** R8 (việc 5c): bề rộng tối đa của phiếu ĐÓNG — lớp 1 desktop nới
      lên 340px trong lưới 3 cột 1100px; mặc định giữ 300px như R2–R7. */
  closedMaxW?: string;
}) {
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const balance = balances[member.id] ?? 0;
  const outgoing = transfers
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => t.fromId === member.id);
  // MINOR-4: chiều nhận trình bày INLINE đúng mẫu §4, thứ tự GIẢM DẦN
  // theo số tiền giữ nguyên (sắp xếp bản sao, không đụng transfers).
  const incoming = transfers
    .filter((t) => t.toId === member.id)
    .sort((a, b) => b.amount - a.amount);

  const { paperTilt, tearGap, dx } = sealVariant(member.id);
  const ghost = flapGhost(member.id);
  /* R10 (việc 3): vị trí ngang của ấn bản mở — cùng công thức kẹp
     của SealStamp bản R6–R9 cho part mở (right ≥4px, cách mép phải
     ≥28px tính từ tâm): right = 16 + dx (dx ±3) rồi kẹp 4..44. */
  const openRight = Math.min(44, Math.max(4, 16 + dx));

  /* R8 (việc 2 — SÂN KHẤU PHIẾU MỞ): phiếu VỪA chuyển sang MỞ phải
     TỰ CUỘN TRỌN vào vùng chứa cuộn của nó (sheet quyết toán trên
     mobile / trang ở lớp 1): sau frame mở, scrollIntoView block
     'start' + scroll-margin ở cả hai đầu của phiếu mở (class ở gốc
     thẻ) đưa toàn bộ phiếu mở vào vùng nhìn thấy của sheet, cách
     mép sheet một khoảng thở — phiếu mở không còn bị hàng xóm/dock
     cắt dở bao quanh. Chỉ chạy ở chuyển trạng thái đóng→mở SAU khi
     mount (phiếu đã mở sẵn lúc nạp lại không giật trang), và nuốt
     mọi lỗi của môi trường không hỗ trợ (jsdom). */
  const rootRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(open);
  useEffect(() => {
    const was = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || was) return;
    scrollSlipIntoStage(rootRef.current);
    return undefined;
  }, [open]);

  /* R9 (việc 6 — MINOR1-AFTER-EDIT): sau khi SỬA phiên (updatedAt
     đổi) trong lúc một phiếu đang MỞ, vị trí cuộn của sheet bị quy
     trình sửa (mở/đóng editor, khôi phục focus) cuốn đi — phiếu
     đóng của HÀNG TRÊN (An) kẹt lại, bị mép sheet cắt giữa thân
     ngay phía trên phiếu đang mở (ảnh minor1-after-edit R8). Dàn
     lại sân khấu: phiếu đang mở tự cuộn trọn về đúng vị trí sân
     khấu (như lúc vừa mở) sau khi editor đã đóng hẳn (280ms >
     125ms exit của sheet editor) — trong khung sau-sửa chỉ còn
     phiếu đang mở, không mảnh phiếu nào kẹt giữa dải thành viên
     và phiếu mở. Không chạy lúc mount (phiếu mở sẵn khi nạp lại
     không giật trang, giữ luật R8). */
  const sessionStampRef = useRef(session.updatedAt);
  useEffect(() => {
    const prev = sessionStampRef.current;
    sessionStampRef.current = session.updatedAt;
    if (!open || prev === session.updatedAt) return undefined;
    const timer = window.setTimeout(() => scrollSlipIntoStage(rootRef.current), 280);
    return () => window.clearTimeout(timer);
  }, [open, session.updatedAt]);

  /* R6 (mục 1b): hai cạnh XÉ tại đường nếp của phiếu mở dùng CHUNG
     dãy lệch tornOffsets (salt 61) — cạnh dưới của nắp và cạnh trên
     của mặt trong là hai phía của một vết xé. clip-path đa giác:
     nắp giữ mọi điểm trên đường xé, mặt trong giữ mọi điểm dưới
     đường xé; khe hở |lệch| ≤ 3px giữa hai cạnh (tông đáy khung
     phiếu mở) đọc như bóng của vết xé khi trải phẳng. */
  const tear = tornOffsets(member.id, 61);
  const flapClip = `polygon(0px 0px, 100% 0px, ${tear
    .map((o, i) => `${tearX(i, TEAR_POINTS)}% ${tearCalc(o)}`)
    .reverse()
    .join(', ')}, 0px ${tearCalc(tear[0])})`;
  const surfaceClip = `polygon(${tear
    .map((o, i) => `${tearX(i, TEAR_POINTS)}% ${o}px`)
    .join(', ')}, 100% 100%, 0px 100%)`;
  /* R10 (việc 3): hai đa giác GIẤY của ấn bản mở, trong hệ toạ độ
     KHUNG phiếu mở (nắp chiếm y 0..128+o, mặt trong bắt đầu ở
     y 128 + tearGap + o) — bản song sinh theo khung của flapClip /
     surfaceClip ở trên: nắp giữ mọi điểm TRÊN đường xé, mặt trong
     giữ mọi điểm DƯỚI đường xé + tearGap. Overlay dấu (xem JSX)
     clip MỘT ấn bản nguyên bằng đúng hai đa giác này. */
  const flapRegion = `polygon(0px 0px, 100% 0px, ${tear
    .map((o, i) => `${tearX(i, TEAR_POINTS)}% ${128 + o}px`)
    .reverse()
    .join(', ')}, 0px ${128 + tear[0]}px)`;
  const surfaceRegion = `polygon(${tear
    .map((o, i) => `${tearX(i, TEAR_POINTS)}% ${128 + tearGap + o}px`)
    .join(', ')}, 100% 100%, 0px 100%)`;

  const nameButton = (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`Phần của ${member.name}`}
      onClick={(e) => {
        // Thẻ đã là vùng chạm thống nhất (MINOR-3): nút đầu phiếu
        // chỉ gọi đúng một lần, không để sự kiện lan ra thẻ.
        e.stopPropagation();
        onToggle();
      }}
      className="relative z-[1] flex min-h-11 w-full items-center gap-2.5 text-left"
    >
      <Avatar name={member.name} colorIndex={colorIndex} size={40} />
      <span className="min-w-0">
        {/* Tên KHÔNG truncate: mặt phiếu là bề mặt định danh — tên
            dài wrap xuống dòng thay vì bị cụt. R7 (mục 4d):
            text-balance CÂN các dòng wrap — ở cột hẹp lớp 1
            (390px) bản cũ gãy «Phần của / An» để tên một mình một
            dòng (mồ côi); cân dòng chia lại thành các dòng có độ
            dài tương đương («Phần / của An», «Phần của / Người
            01»), không đổi nội dung chữ, không đổi bề rộng cột. */}
        <span className="block text-base leading-snug font-semibold break-words text-balance text-ink">
          Phần của {member.name}
        </span>
      </span>
    </button>
  );

  const transferContent = (
    <div className="relative z-[1] grid gap-2">
      {balance === 0 && outgoing.length === 0 && incoming.length === 0 ? (
        <p className="text-base text-ink">{member.name} đã gọn phần của mình.</p>
      ) : (
        <>
          {outgoing.map(({ t, index }) => (
            <div key={`${t.fromId}-${t.toId}-${index}`} className="grid gap-1.5">
              <p className="text-base font-medium text-ink">
                {nameOf(t.fromId)} → {nameOf(t.toId)}:{' '}
                <span className="font-figure font-bold">{formatVND(t.amount)}</span>
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQr(index);
                }}
                className="inline-flex min-h-11 items-center justify-center justify-self-start rounded-lg bg-brand px-4 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600"
              >
                Mã QR của lệnh này
              </button>
            </div>
          ))}
          {incoming.length > 0 && (
            <p className="text-base font-medium text-ink">
              {member.name} nhận từ:{' '}
              {incoming.map((t, i) => (
                <span key={`${t.fromId}-${t.toId}-${i}`}>
                  {i > 0 && ' · '}
                  {nameOf(t.fromId)}{' '}
                  <span className="font-figure font-bold">{formatVND(t.amount)}</span>
                </span>
              ))}
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      ref={rootRef}
      data-slip={member.id}
      data-slip-open={open || undefined}
      onClick={onToggle}
      // R3 (mục 1/2): phiếu ĐÓNG giữ tỉ lệ giấy tự nhiên ở mọi bề
      // rộng — ô lưới rộng hơn 300px thì phiếu dừng ở 300px và tự căn
      // giữa ô, không bị kéo bè ngang thành banner.
      // R4 (mục 3): phiếu MỞ bung TOÀN HÀNG ngang của lưới
      // (col-span-full, hết cap 300px) — tờ giấy mở ra chiếm trọn
      // hàng, không còn ô trống mồ côi cạnh phiếu mở.
      // R4 (mục 4): phiếu đóng đặt lệch ±0,5° khác nhau nhẹ như giấy
      // đặt tay trên bàn; phiếu mở nằm PHẲNG (0°) vì đã mở ra.
      style={open ? undefined : { transform: `rotate(${paperTilt}deg)` }}
      className={cn(
        'slip-shadow relative w-full snap-start cursor-pointer justify-self-center',
        // R8 (việc 2): phiếu MỞ mang scroll-margin ở CẢ HAI ĐẦU
        // (trên 12px / dưới 24px) — cơ chế tự cuộn trọn vào sheet
        // (effect ở trên) neo theo các margin này.
        open ? 'col-span-full max-w-none scroll-mt-3 scroll-mb-6' : closedMaxW,
      )}
    >
      {open ? (
        /* R6 (mục 1): phiếu MỞ = FLAT-LAY. Thay hẳn cơ chế nắp
           nghiêng rotateX/phối cảnh của R5 (panel R5: «khối be
           placeholder trơn»). Khung phiếu mở gồm hai phần gặp nhau
           tại đường nếp cũ, cách nhau đúng khe giấy xé tearGap —
           R10 (việc 3): tearGap là HẰNG SỐ 4px cho mọi thành viên:
           (a) NẮP PHẲNG ở đỉnh: dải ngang cao 128px = đúng nửa trên
           của phiếu đóng tối thiểu (256px, nếp ở 50%), nằm PHẲNG
           ngay trên mặt trong như phiếu đã mở trải phẳng nhìn từ
           trên xuống, hiện MẶT SAU giấy (.slip-flap-back), KHÔNG
           transform/phối cảnh. Cạnh dưới của nắp là CẠNH XÉ XƠ bất
           quy tắc (clip-path theo tornOffsets của member).
           (b) MẶT TRONG (.slip-open-surface) nằm dưới nắp đúng
           tearGap (margin-top): cạnh trên là phía còn lại của CÙNG
           vết xé (clip-path bù theo đúng dãy lệch của nắp); vùng
           dấu cao 44px ở đỉnh để TRỐNG làm đệm bố cục; nội dung
           lệnh inline §4 + nút QR nằm dưới vùng dấu.
           (c) R10: DẤU MỞ là OVERLAY một ấn bản nguyên (SealImprint)
           dựng SAU mặt trong, trong hệ toạ độ khung — hai bản sao
           trùng vị trí, mỗi bản clip theo đa giác giấy của phía nó
           (flapRegion / surfaceRegion). Đáy khung mở (#cec09e, sâu
           hơn cả hai mặt giấy) lộ qua khe xé 4px giữa hai cạnh và
           các góc bo — đọc như bóng của vết xé khi trải phẳng. */
        <div className="paper-grain relative flex min-h-[176px] flex-col overflow-hidden rounded-t-[4px] bg-[#cec09e] shadow-[inset_0_0_0_1px_rgba(23,24,28,0.09)]">
          {opening && !staticMode && (
            <div
              aria-hidden
              className="phieu-fold-band pointer-events-none absolute inset-x-0 top-0 z-10"
            />
          )}
          {/* (a) NẮP PHẲNG — mặt sau của nửa trên tờ giấy, cạnh
              dưới là cạnh xé. R7 (mục 2a+2b): nắp có BỀ MẶT — chữ
              in của mặt trước XUYÊN qua giấy (ghost mirror) + shading
              cong giấy (.slip-flap-back: sáng ở cạnh trên, sâu dần
              về đường nếp + bóng inset ở chân nắp). */}
          <div aria-hidden className="relative z-[2] h-[128px] shrink-0">
            <div
              data-slip-flap
              // R9 (việc 2): BỎ bóng inset chân nắp — băng bóng đó
              // phủ lên đoạn giữa của dấu mở, làm khe xé không còn
              // là vật ngắt duy nhất giữa hai nửa ấn bản.
              className="slip-flap-back absolute inset-0 overflow-hidden"
              style={{ clipPath: flapClip }}
            >
              {/* R10 (việc 4): TRƯỜNG HẠT MỊN là con đầu tiên của
                  nắp (dưới ghost) — fibers/blotches vẽ tay của
                  R8/R9 ĐÃ XOÁ HẲN (0 sợi đếm được ở cận 2×). Hạt
                  feTurbulence (.slip-flap-grain) đếm được như giấy
                  thật và không mang hướng nét vẽ nào. */}
              <div aria-hidden data-flap-grain className="slip-flap-grain absolute inset-0" />
              {/* R7 (mục 2a): GHOST IN XUYÊN GIẤY — bóng của mặt
                  trước phiếu in xuyên qua mặt sau: kẻ đôi + chữ
                  «CHIA TIỀN» LẬT NGANG (scaleX -1 trên cả khối nên
                  đoạn seed cam cũng lật sang phía đối diện như nhìn
                  xuyên giấy thật), cộng vòng avatar + tên ghost ở
                  đúng vị trí mặt trước.
                  R10 (việc 4): ghost theo MẬT ĐỘ MỰC THẬT (flapGhost,
                  jitter ±0,02 theo thành viên): tên 0.27 đậm nhất >
                  seed 0.22 > kẻ đôi 0.15 > wordmark 0.11 > kẻ mảnh
                  0.06; avatar KHÔNG còn đĩa đặc — vòng tròn 0.10 +
                  initials 0.12 ở tâm; cả khối mang blur 0.5px khuếch
                  tán như nhìn xuyên giấy. Nửa dấu KHÔNG còn nằm
                  trong nắp: ấn bản mở là overlay toàn khung (dưới). */}
              <div
                data-flap-ghost
                className="absolute inset-x-3.5 top-3 blur-[0.5px]"
                style={{ transform: 'scaleX(-1)' }}
              >
                <span
                  className="block text-[10px] leading-[12px] font-bold tracking-[0.22em]"
                  style={{ color: `rgba(66, 66, 66, ${ghost.word})` }}
                >
                  CHIA TIỀN
                </span>
                <div className="mt-1">
                  <div className="flex items-center">
                    <span
                      className="h-[3px] w-8 shrink-0"
                      style={{ background: `rgba(191, 54, 12, ${ghost.seed})` }}
                    />
                    <span
                      className="h-[2.5px] flex-1"
                      style={{ background: `rgba(33, 33, 33, ${ghost.rule})` }}
                    />
                  </div>
                  <div
                    className="mt-[3px] h-px"
                    style={{ background: `rgba(33, 33, 33, ${ghost.ruleThin})` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold"
                    style={{
                      border: '2px solid rgba(33, 33, 33, 0.10)',
                      color: 'rgba(33, 33, 33, 0.12)',
                    }}
                  >
                    {initialsOf(member.name)}
                  </span>
                  <span
                    className="block text-base leading-snug font-semibold"
                    style={{ color: `rgba(33, 33, 33, ${ghost.name})` }}
                  >
                    Phần của {member.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* (b) MẶT TRONG — dưới nắp đúng tearGap (khe giấy xé
              3–6px tại nếp, việc 4), cạnh trên là cạnh xé bù. Đáy
              khung #cec09e lộ qua khe đọc như bóng vết xé. */}
          <div
            className="slip-open-surface relative flex flex-1 flex-col pb-3 shadow-[inset_0_2px_12px_rgba(23,24,28,0.05)]"
            style={{ clipPath: surfaceClip, marginTop: tearGap }}
          >
            {/* R9 (việc 2): BỎ dải bóng nắp đổ xuống mặt trong —
                cùng với bóng inset chân nắp, nó tạo thành băng
                ngang dày nuốt đoạn giữa của dấu mở. Tại cột x của
                dấu, đoạn giữa nay CHỈ bị ngắt bởi khe xé 3–6px. */}
            {/* Vùng đệm dấu mở: GIỮ NGUYÊN cao 44px làm đệm bố
                cục ở đỉnh mặt trong nhưng để TRỐNG — ấn bản mở nay
                là overlay toàn khung dựng sau mặt trong (dưới),
                không còn nửa dấu neo trong vùng này. */}
            <div aria-hidden className="relative h-[44px] shrink-0 overflow-hidden" />
            {/* Nội dung dưới vùng đệm dấu mang đệm ngang riêng.
                (R10: ấn bản mở là overlay toàn khung nên không còn
                ràng buộc khớp toạ độ hai nửa như cơ chế R5–R9; đệm
                ngang riêng của nội dung giữ nguyên như bố cục cũ.) */}
            <div className="px-3.5">
              <div className="mt-1">{nameButton}</div>
              {/* Nội dung phiếu: có trong DOM và hiển thị từ frame
                  đầu của trạng thái mở (kể cả lúc vệt gấp chạy). */}
              <div className="mt-3">{transferContent}</div>
              <p className="relative z-[1] mt-2.5 text-xs text-ink-2">Chia Tiền</p>
              <div aria-hidden className="mt-1.5" />
            </div>
          </div>
          {/* (c) R10 (việc 3): OVERLAY ẤN BẢN MỞ — MỘT ấn bản
              nguyên (SealImprint 56px, tâm tại giữa khe xé:
              top = 128 + tearGap/2 − 28, right = openRight) dựng
              trong hệ toạ độ KHUNG phiếu mở; hai bản sao trùng vị
              trí, mỗi bản bị clip bởi đa giác giấy của phía nó
              (nắp trên / mặt trong dưới). Ở mọi x vật ngắt = đúng
              tearGap 4px; hai mẩu tick là hai mảnh của MỘT bản vẽ
              nên nối thẳng qua khe. Mực: phía nắp 0.90, phía mặt
              trong 0.80 như luật R7–R9. */}
          <div
            aria-hidden
            data-open-seal-overlay
            className="pointer-events-none absolute inset-0 z-[3]"
          >
            <div className="absolute inset-0" style={{ clipPath: flapRegion }}>
              <SealImprint
                memberId={member.id}
                size={56}
                opacity={0.9}
                className="absolute"
                style={{ top: 128 + tearGap / 2 - 28, right: openRight }}
              />
            </div>
            <div className="absolute inset-0" style={{ clipPath: surfaceRegion }}>
              <SealImprint
                memberId={member.id}
                size={56}
                opacity={0.8}
                className="absolute"
                style={{ top: 128 + tearGap / 2 - 28, right: openRight }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'paper-grain slip-face-closed relative flex min-h-[256px] flex-col overflow-hidden rounded-t-[4px] bg-card px-3.5 pt-3 pb-3',
            'shadow-[inset_0_0_0_1px_rgba(23,24,28,0.05)]',
          )}
        >
          {/* Nếp gấp NGANG đúng 50% của phiếu ĐÓNG — dải bóng gấp phủ
              trên giấy (sửa bắt buộc #5). Phiếu mở KHÔNG còn nếp này:
              nếp đã thành cạnh gặp của nắp phẳng và mặt trong (R6). */}
          <div aria-hidden className="slip-crease z-[2]" />
          {/* R6 (mục 2): dấu niêm VẮT QUA NẾP GẤP — nguyên dấu, tâm
              nằm trên đường nếp 50% ở phía phải phiếu, trong VÙNG
              GIẤY TRỐNG THẬT quanh nếp: mặt phiếu cao tối thiểu
              256px và cột chữ được nén ở hai đầu (đầu phiếu + tên ở
              trên, gợi ý + chân ở dưới) để hộp bao của dấu (tâm 50%
              ± dy 10px ± bán kính tối đa 25,3px ở tỉ lệ 1,15) không
              giao với hộp bao của BẤT KỲ phần tử chữ nào — panel R5
              bắt dấu đè ký tự cuối của tên và che chữ số «Người
              01/02/11/12». Đo DOM ở pack R6 (bảng vùng cấm). */}
          <SealStamp memberId={member.id} />

          {/* Vùng đầu phiếu: wordmark + kẻ đôi (không còn dấu ở đây). */}
          <div className="relative z-[1]">
            <span
              aria-hidden
              className="block text-[10px] leading-[12px] font-bold tracking-[0.22em] text-grey-500"
            >
              CHIA TIỀN
            </span>
            <div className="mt-1">
              <SlipTopRule />
            </div>
          </div>

          <div className="mt-2">{nameButton}</div>

          {/* Khoảng giấy trống quanh nếp gấp: nếp gấp và dấu niêm đi
              qua vùng này — không chữ nào được vào đây (mục 2b). */}
          <div aria-hidden className="flex-1" />
          <p className="relative z-[1] mt-2 flex items-center justify-between gap-2 text-[13px] font-bold text-brand-deep">
            <span>Chạm để xem phần của bạn</span>
            <span aria-hidden className="text-[17px] leading-none font-extrabold">
              →
            </span>
          </p>
          <p className="relative z-[1] mt-2 text-xs text-ink-2">Chia Tiền</p>
          {/* R3 mục 7: không kẻ đôi ở chân phiếu — rìa xé dưới đây là
              danh tính chân phiếu. */}
          <div aria-hidden className="mt-1.5" />
        </div>
      )}
      {/* R6 (mục 4): chân phiếu = cạnh xé BẤT QUY TẮC theo member
          (SVG TornEdge) — bóng của .slip-shadow bám theo alpha. */}
      <TornEdge memberId={member.id} fill={open ? '#FFFBF4' : '#FFFFFF'} />
    </div>
  );
}

/**
 * Lưới phiếu dùng chung cho thẻ hoàn tất + lớp 1 người nhận:
 * - Mặt rút gọn (avatar + tên) cho phiếu chưa mở.
 * - Trạng thái đã mở lưu local theo sessionId (khoá riêng, không vào link).
 * - Nhóm đông: trên SLIP_GRID_ANIMATED_MAX phiếu -> danh sách phiếu TĨNH
 *   (cùng nội dung, không lớp gấp) — ngưỡng chốt ở MODE-PHIEU-IMPL-STATE.
 * - R3 (mục 1): lưới KHÔNG bao giờ cuộn nội bộ trong khay phiếu — trang /
 *   vùng cuộn chứa nó cuộn thay thế (bỏ hẳn max-h + overflow của R2).
 * - wideCols: desktop ≥1024 dàn 4 cột theo bề ngang (mỗi phiếu vẫn bị
 *   cap 300px ở SlipCard nên giữ tỉ lệ giấy) thay vì kéo giãn 2 cột.
 * - roomyCols (R8 việc 5c, CHỈ lớp 1 desktop): desktop ≥1024 dàn 3
 *   cột trong container ~1100px, phiếu nới cap lên 340px — giảm
 *   khoảng trắng chết của lưới lớp 1. Không dùng cho thẻ hoàn tất.
 */
/**
 * R9 (việc 5): số cột desktop của lưới LỚP 1 theo SỐ PHIẾU THẬT
 * (tổng quát 1..12+, không hardcode 4):
 * - n ≤ 4: dàn đúng n cột — một hàng duy nhất lấp đầy bề ngang,
 *   không hàng hai mồ côi, không ô trống (n=4: 4 ngang trong khay
 *   1100px, mỗi phiếu ~252px — dưới cap 340 nên không bè ngang;
 *   chiều cao lưới còn 1 hàng nên footer lớp 1 trở lại trong khung
 *   1440×900).
 * - n ≥ 5: chọn trong {2,3,4} cột sao cho (theo thứ tự ưu tiên)
 *   số ô trống ở hàng cuối ÍT nhất, lưới gần chữ nhật nhất
 *   (|cột − hàng| nhỏ nhất), rồi tới số cột lớn hơn.
 */
export function layer1DesktopCols(n: number): 1 | 2 | 3 | 4 {
  if (n <= 1) return 1;
  if (n <= 4) return n as 1 | 2 | 3 | 4;
  let best: 2 | 3 | 4 = 3;
  let bestKey: [number, number, number] | null = null;
  for (const c of [2, 3, 4] as const) {
    const rows = Math.ceil(n / c);
    const empty = rows * c - n;
    const key: [number, number, number] = [empty, Math.abs(c - rows), -c];
    if (
      !bestKey ||
      key[0] < bestKey[0] ||
      (key[0] === bestKey[0] && key[1] < bestKey[1]) ||
      (key[0] === bestKey[0] && key[1] === bestKey[1] && key[2] < bestKey[2])
    ) {
      best = c;
      bestKey = key;
    }
  }
  return best;
}

const LAYER1_COL_CLASS: Record<number, string> = {
  1: 'min-[1024px]:grid-cols-1',
  2: 'min-[1024px]:grid-cols-2',
  3: 'min-[1024px]:grid-cols-3',
  4: 'min-[1024px]:grid-cols-4',
};

export function SlipGrid({
  session,
  balances,
  transfers,
  onOpenQr,
  wideCols = false,
  roomyCols = false,
}: {
  session: Session;
  balances: Record<string, number>;
  transfers: Transfer[];
  onOpenQr: (transferIndex: number) => void;
  wideCols?: boolean;
  roomyCols?: boolean;
}) {
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const [openedIds, setOpenedIds] = useState<string[]>(() => loadOpenedSlips(session.id));
  const [openingId, setOpeningId] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const staticMode = session.members.length > SLIP_GRID_ANIMATED_MAX || prefersReducedMotion();

  function toggle(memberId: string) {
    if (openedIds.includes(memberId)) {
      if (openingId === memberId) {
        // Chạm trong lúc vệt gấp 240ms đang chạy -> frame cuối ngay,
        // giữ trạng thái đã mở tĩnh (hành vi §5 gốc).
        window.clearTimeout(timerRef.current);
        setOpeningId(null);
        return;
      }
      // R4 (mục 3): chạm vào phiếu ĐÃ mở yên -> ĐÓNG lại về nguyên
      // trạng đóng (bung hàng thu về ô, dấu niêm trở lại, nếp gấp
      // trở lại) và ghi trạng thái đã đóng theo phiên như lúc mở.
      const next = openedIds.filter((id) => id !== memberId);
      setOpenedIds(next);
      saveOpenedSlips(session.id, next);
      window.clearTimeout(timerRef.current);
      setOpeningId(null);
      return;
    }
    const next = [...openedIds, memberId];
    setOpenedIds(next);
    saveOpenedSlips(session.id, next);
    if (staticMode) {
      setOpeningId(null);
      return;
    }
    setOpeningId(memberId);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpeningId(null), 240);
  }

  return (
    <div
      data-slip-grid
      data-slip-static={staticMode || undefined}
      className={cn(
        // Sàn hàng 266px (= mặt phiếu đóng 256px theo vùng cấm chữ
        // R6 mục 2b + cạnh xé chân 6px + 4px lỏng): thiếu sàn này,
        // hàng bị ép co xuống dưới chiều cao nội dung (đo render
        // 12/16 phiếu đợt trước: mặt phiếu bị nén, tên bị clip bởi
        // overflow-hidden). Có sàn, lưới cao tự nhiên và TRANG cuộn
        // thay thế (R3 mục 1).
        // R4 (mục 4): khoảng thở giữa các phiếu tăng hẳn (ngang 20px,
        // dọc 28px) — mỗi phiếu là một đảo bóng riêng trên mặt bàn,
        // khay không còn đọc thành một băng vé liền.
        'grid grid-cols-2 gap-x-5 gap-y-7 [grid-auto-rows:minmax(266px,auto)]',
        wideCols && !roomyCols && 'min-[1024px]:grid-cols-4',
        // R9 (việc 5): số cột desktop theo số phiếu thật (xem
        // layer1DesktopCols) thay cho 3 cột cố định của R8 — lưới
        // 3+1 để 2/3 hàng hai là khay xám trống đã bị panel kết tội.
        roomyCols && LAYER1_COL_CLASS[layer1DesktopCols(session.members.length)],
      )}
    >
      {session.members.map((m, idx) => (
        <SlipCard
          key={m.id}
          session={session}
          member={m}
          colorIndex={colors[idx] ?? 0}
          balances={balances}
          transfers={transfers}
          open={openedIds.includes(m.id)}
          opening={openingId === m.id}
          staticMode={staticMode}
          onToggle={() => toggle(m.id)}
          onOpenQr={onOpenQr}
          closedMaxW={roomyCols ? 'max-w-[340px]' : undefined}
        />
      ))}
    </div>
  );
}
