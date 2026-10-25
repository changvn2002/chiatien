#!/usr/bin/env python3
"""
gen-surfaces.py — sinh texture bề mặt TỰ CODE (dự án tự sinh, không asset ngoài)
cho game mode «Ai Đãi», đợt FIX-V3 lane A2:

  g1-floor.webp — đĩa sàn gỗ ấm trung tính cho G1 (theo demo B mà user khen:
                  mặt gỗ sáng ấm + vành nâu đậm), vẽ thủ tục bằng PIL.
  g2-tray.webp  — mặt mâm gốm cho G2 (vành men + lòng mâm có chiều sâu),
                  khác hẳn sàn gỗ G1, vẫn gam trung tính ấm.
  g2-cloth.webp — (tùy chọn) đĩa khăn bàn dưới mâm G2, dệt chéo trung tính.

Mọi ảnh là đĩa tròn nền TRONG SUỐT (alpha) để lane B/C đặt lên Graphics hiện
có. Vẽ ở độ phân giải 2x rồi hạ Lanczos chống răng cưa. Seed cố định →
chạy lại ra file giống hệt.

Dùng: python3 game/tools/gen-surfaces.py [out_dir] [size_floor] [size_tray]
Mặc định out_dir = public/game/atlas cạnh repo, size 768 / 640 / 768.
Số byte in ra cuối là số đo thật trên đĩa sau khi ghi.
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

SS = 2  # supersample


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def disc_mask(size):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([0, 0, size - 1, size - 1], fill=255)
    return m


# ---------------------------------------------------------------- G1 floor
def make_wood_floor(size):
    """Đĩa sàn gỗ: ván ngang sáng ấm, vân gỗ cong mảnh, mắt gỗ thưa,
    vành ngoài nâu đậm như cạnh đĩa demo B (0x6d5136)."""
    rng = random.Random(20261025)
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(base)
    cx = cy = S / 2
    R = S / 2

    # --- trường ván: các dải ngang phủ kín hình vuông, cắt đĩa sau
    plank_h = S / 7.0
    tones = [(219, 196, 152), (211, 186, 140), (223, 201, 158),
             (207, 182, 136), (216, 193, 148), (213, 188, 142),
             (220, 198, 155)]
    y = 0.0
    row = 0
    seams = []
    while y < S:
        tone = tones[row % len(tones)]
        bd.rectangle([0, y, S, y + plank_h], fill=tone + (255,))
        seams.append(y)
        # khe ván dọc so le (đầu nối ván)
        joint_x = rng.uniform(0.15, 0.85) * S
        bd.line([joint_x, y, joint_x, y + plank_h], fill=(138, 111, 77, 160), width=max(2, S // 512))
        y += plank_h
        row += 1
    for sy in seams[1:]:
        bd.line([0, sy, S, sy], fill=(138, 111, 77, 200), width=max(2, S // 384))

    # --- vân gỗ: đường cong sin mảnh, đậm/nhạt xen kẽ, chỉ trong từng ván
    grain = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grain)
    for r in range(row):
        top = r * plank_h
        n_lines = rng.randint(2, 3)
        for _ in range(n_lines):
            gy = top + rng.uniform(0.12, 0.88) * plank_h
            amp = rng.uniform(1.5, 4.5) * SS
            per = rng.uniform(S * 0.5, S * 1.1)
            phase = rng.uniform(0, math.tau)
            dark = rng.random() < 0.62
            col = (150, 120, 80, rng.randint(34, 62)) if dark else (238, 222, 182, rng.randint(26, 48))
            wdt = max(2, int(rng.uniform(1.6, 3.0) * SS))
            pts = []
            for x in range(0, S + 8, 8):
                pts.append((x, gy + math.sin(x / per * math.tau + phase) * amp))
            gd.line(pts, fill=col, width=wdt)
    # làm mềm vân trước khi ghép: vân mềm nén WebP tốt hơn nhiều, mắt thường
    # ở cỡ hiển thị (đĩa ~250px CSS) không phân biệt được
    grain = grain.filter(ImageFilter.GaussianBlur(S * 0.0032))
    # mắt gỗ thưa: vòng đồng tâm nhỏ
    for _ in range(5):
        kx, ky = rng.uniform(0.12, 0.88) * S, rng.uniform(0.12, 0.88) * S
        if math.hypot(kx - cx, ky - cy) > R * 0.92:
            continue
        for rr in range(5, 1, -1):
            gd.ellipse([kx - rr * SS * 1.7, ky - rr * SS, kx + rr * SS * 1.7, ky + rr * SS],
                       outline=(146, 116, 76, 60), width=max(1, SS))
    base = Image.alpha_composite(base, grain)

    # --- chiều sâu: tâm sáng nhẹ, mép tối dần (radial)
    shade = Image.new("L", (S, S), 0)
    sd = ImageDraw.Draw(shade)
    for i in range(160, 0, -1):
        t = i / 160
        sd.ellipse([cx - R * t, cy - R * t, cx + R * t, cy + R * t],
                   fill=int(255 * (1 - t) ** 1.6))
    shade = shade.filter(ImageFilter.GaussianBlur(S * 0.02))
    dark = Image.new("RGBA", (S, S), (74, 54, 30, 255))
    # shade L: tâm ~252, mép 0 → composite lấy `base` ở tâm (mask 255) và
    # bản tối ở mép (mask 0): vignette tối DẦN RA MÉP. (Bản đầu viết ngược
    # điểm đảo làm tâm bị tối — đã sửa sau khi đo pixel tâm (174,...) so
    # với mép (217,...).)
    base = Image.composite(base, Image.blend(base, dark, 0.34), shade)
    light = Image.new("RGBA", (S, S), (255, 246, 224, 255))
    ctr = Image.new("L", (S, S), 0)
    cd = ImageDraw.Draw(ctr)
    cd.ellipse([cx - R * 0.55, cy - R * 0.55, cx + R * 0.55, cy + R * 0.55], fill=70)
    ctr = ctr.filter(ImageFilter.GaussianBlur(S * 0.08))
    base = Image.composite(Image.blend(base, light, 0.35), base, ctr)

    # --- vành đĩa: vòng nâu đậm ở mép + vòng bevel sáng ngay trong.
    # Lớp vòng vẽ ở 2x rồi hạ cỡ: vòng tròn là chi tiết mắt nhạy nhất với
    # răng cưa; chỉ supersample riêng lớp này (tông trung gian chỉ nằm
    # trong vành mỏng) nên byte tăng ít — đã đo so với vẽ thẳng 1x.
    S2 = S * 2
    ring = Image.new("RGBA", (S2, S2), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    c2 = S2 / 2
    R2 = S2 / 2
    rim_w = R2 * 0.045
    rd.ellipse([c2 - R2, c2 - R2, c2 + R2, c2 + R2], outline=(109, 81, 54, 255),
               width=int(rim_w))
    rd.ellipse([c2 - R2 + rim_w, c2 - R2 + rim_w, c2 + R2 - rim_w, c2 + R2 - rim_w],
               outline=(238, 224, 192, 110), width=max(2, S2 // 340))
    # bóng trong sát vành (đĩa có thành)
    rd.ellipse([c2 - R2 * 0.965, c2 - R2 * 0.965, c2 + R2 * 0.965, c2 + R2 * 0.965],
               outline=(120, 92, 58, 66), width=int(R2 * 0.05))
    ring = ring.resize((S, S), Image.LANCZOS)
    base = Image.alpha_composite(base, ring)

    base.putalpha(Image.composite(base.getchannel("A"), Image.new("L", (S, S), 0),
                                  disc_mask(S)))
    out = base.resize((size, size), Image.LANCZOS)
    return out


# ---------------------------------------------------------------- G2 tray
def make_ceramic_tray(size):
    """Mặt mâm gốm: vành men ấm (vòng men + 1 vòng chỉ đất nung trầm),
    lòng mâm lõm có chiều sâu (radial tối dần vào tâm), đốm men li ti."""
    rng = random.Random(20261026)
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = S / 2
    R = S / 2

    # thân mâm: radial từng vòng — vành sáng, lòng sâu tối hơn ở tâm lõm
    steps = 220
    rim_col = (238, 232, 220)
    mid_col = (228, 221, 206)
    well_col = (206, 196, 178)
    deep_col = (188, 176, 156)
    for i in range(steps, 0, -1):
        t = i / steps  # 1 = mép, 0 = tâm
        if t > 0.86:
            col = lerp(mid_col, rim_col, (t - 0.86) / 0.14)
        elif t > 0.30:
            col = lerp(well_col, mid_col, (t - 0.30) / 0.56)
        else:
            col = lerp(deep_col, well_col, t / 0.30)
        d.ellipse([cx - R * t, cy - R * t, cx + R * t, cy + R * t], fill=col + (255,))

    # loang men mềm (blob mờ tương phản thấp thay đốm pixel — đốm nhiễu
    # tần số cao làm WebP phình nhiều lần, blob mềm nén gần như miễn phí)
    mottle = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    md = ImageDraw.Draw(mottle)
    for _ in range(26):
        a = rng.uniform(0, math.tau)
        rr = R * math.sqrt(rng.random()) * 0.9
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        rad = rng.uniform(R * 0.03, R * 0.10)
        tone = (196, 186, 168, rng.randint(14, 30)) if rng.random() < 0.5 \
            else (246, 242, 232, rng.randint(14, 26))
        md.ellipse([x - rad, y - rad, x + rad, y + rad], fill=tone)
    mottle = mottle.filter(ImageFilter.GaussianBlur(S * 0.012))
    img = Image.alpha_composite(img, mottle)
    d = ImageDraw.Draw(img)

    ov = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    # vòng men ở vành: vòng rộng sáng + 1 chỉ đất nung trầm + 1 chỉ mảnh trong
    od.ellipse([cx - R * 0.995, cy - R * 0.995, cx + R * 0.995, cy + R * 0.995],
               outline=(176, 160, 132, 255), width=int(R * 0.018))
    od.ellipse([cx - R * 0.955, cy - R * 0.955, cx + R * 0.955, cy + R * 0.955],
               outline=(248, 244, 234, 200), width=int(R * 0.045))
    od.ellipse([cx - R * 0.905, cy - R * 0.905, cx + R * 0.905, cy + R * 0.905],
               outline=(168, 128, 96, 150), width=max(2, int(R * 0.008)))
    od.ellipse([cx - R * 0.875, cy - R * 0.875, cx + R * 0.875, cy + R * 0.875],
               outline=(196, 184, 164, 130), width=max(2, int(R * 0.006)))
    # bóng lõm: vòng tối mềm ở chân lòng mâm (bán kính ~0.62R)
    od.ellipse([cx - R * 0.66, cy - R * 0.66, cx + R * 0.66, cy + R * 0.66],
               outline=(120, 108, 88, 60), width=int(R * 0.09))
    # vệt sáng men phía trên-trái (highlight cong)
    od.arc([cx - R * 0.80, cy - R * 0.80, cx + R * 0.80, cy + R * 0.80],
           start=140, end=215, fill=(255, 252, 244, 110), width=int(R * 0.05))
    ov = ov.filter(ImageFilter.GaussianBlur(S * 0.007))
    img = Image.alpha_composite(img, ov)

    img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", (S, S), 0),
                                 disc_mask(S)))
    return img.resize((size, size), Image.LANCZOS)


# ---------------------------------------------------------------- G2 cloth
def make_table_cloth(size):
    """Đĩa khăn bàn: nền dệt chéo ấm trung tính (sáng hơn mâm để mâm nổi),
    viền khăn thêu vòng trầm. Đặt DƯỚI mâm (bán kính bàn)."""
    rng = random.Random(20261027)
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = S / 2
    R = S / 2
    d.ellipse([0, 0, S - 1, S - 1], fill=(233, 226, 212, 255))
    # loang vải mềm thay sọc dệt (sọc tần số cao làm WebP phình ~10 lần;
    # ở cỡ hiển thị khăn chỉ là nền dưới mâm nên loang mềm là đủ đọc "vải")
    mottle = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    md = ImageDraw.Draw(mottle)
    for _ in range(60):
        x, y = rng.uniform(0, S), rng.uniform(0, S)
        rad = rng.uniform(R * 0.04, R * 0.13)
        tone = (219, 209, 190, rng.randint(16, 34)) if rng.random() < 0.5 \
            else (242, 236, 224, rng.randint(16, 30))
        md.ellipse([x - rad, y - rad, x + rad, y + rad], fill=tone)
    mottle = mottle.filter(ImageFilter.GaussianBlur(S * 0.014))
    img = Image.alpha_composite(img, mottle)
    d = ImageDraw.Draw(img)
    ov = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    od.ellipse([cx - R * 0.94, cy - R * 0.94, cx + R * 0.94, cy + R * 0.94],
               outline=(172, 140, 108, 170), width=int(R * 0.012))
    od.ellipse([cx - R * 0.90, cy - R * 0.90, cx + R * 0.90, cy + R * 0.90],
               outline=(196, 172, 140, 120), width=int(R * 0.006))
    od.ellipse([cx - R * 0.985, cy - R * 0.985, cx + R * 0.985, cy + R * 0.985],
               outline=(160, 138, 112, 255), width=int(R * 0.02))
    img = Image.alpha_composite(img, ov)
    img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", (S, S), 0),
                                 disc_mask(S)))
    return img.resize((size, size), Image.LANCZOS)


def save_webp(img, path, quality):
    img.save(path, "WEBP", quality=quality, method=6, alpha_quality=100)
    return os.path.getsize(path)


def main():
    # CẤU HÌNH SẢN XUẤT (đợt FIX-V3 lane A2, đã đo nén thật):
    # vẽ TRỰC TIẾP ở cỡ đích (SS=1, không supersample) — supersample 2x +
    # Lanczos tạo tông trung gian trên mọi cạnh làm WebP phình ~2 lần
    # (đo: sàn 512 q65 = 6.638 B ở SS1 so với 12.416 B ở SS2). Cạnh đĩa
    # cứng ở mức pixel được bộ lọc tuyến tính của WebGL làm mềm khi hạ
    # cỡ hiển thị (đĩa ~250px CSS trên mobile). Quality 60 là điểm cân
    # bằng đã đo cho tranh phẳng ít chi tiết tần số cao.
    global SS
    SS = 1
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out_dir, exist_ok=True)
    jobs = [
        ("g1-floor.webp", make_wood_floor(512), 60),
        ("g2-tray.webp", make_ceramic_tray(512), 60),
    ]
    for name, im, q in jobs:
        p = os.path.join(out_dir, name)
        n = save_webp(im, p, q)
        print(f"{p}  q{q}  {n} B  ({im.size[0]}x{im.size[1]})")
    # Khăn bàn: CHỈ sinh bản ứng viên để coordinator quyết (không ship
    # kèm ở đợt này vì trần dòng B) — xem handoff REBUILD-C2-A2-ASSETS.
    if "--with-cloth-candidate" in sys.argv:
        im = make_table_cloth(512)
        p = os.path.join(out_dir, "g2-cloth-candidate.webp")
        n = save_webp(im, p, 60)
        print(f"{p}  q60  {n} B  (candidate, NOT shipped)")


if __name__ == "__main__":
    main()
